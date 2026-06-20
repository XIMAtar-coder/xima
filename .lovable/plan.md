## Disponibilità trasformazione Supabase

Verificato: `/storage/v1/render/image/public/...` risponde 403 su asset reali, `/object/public/...` 200. La trasformazione immagini **non è attiva**. Niente `transform`/srcset: l'unico punto futuro da toccare sarà `buildImageUrl`.

Bucket in scope (pubblici): `avatars`, `business-logos`, `mentor-avatars`, `ximatar`. Privati (`cv-uploads`, `challenge-videos`, `job_posts_pdfs`, `eligibility-docs`) **non toccati**. Nessuna modifica a RLS, tabelle, edge function.

Peso attuale (verificato): `avatars` 6 file, media ~1MB, max ~2MB → è lì il guadagno. `business-logos` ~19KB → nessun backfill. `mentor-avatars` e `ximatar` vuoti.

## 1) Util + componente

`src/lib/images/buildImageUrl.ts`
- `buildImageUrl({ bucket, path, width?, height?, quality? })` → oggi passthrough `getPublicUrl(path).publicUrl`. Parametri accettati ma ignorati: in futuro lo switch a transform è qui.
- Helper `isSvgPath(path)`.

`src/lib/images/prepareImageForUpload.ts`
- Input `File`. Se `image/svg+xml` → passthrough.
- Altrimenti: `createImageBitmap(file, { imageOrientation: 'from-image' })` per rispettare EXIF e non ruotare le foto da smartphone. Fallback: `<img>` + draw su canvas se `imageOrientation` non supportato.
- Ridimensiona su `<canvas>` mantenendo aspect, lato lungo configurabile per bucket (avatars/mentor/business default 512).
- Output: `canvas.toBlob('image/webp', 0.8)`; fallback JPEG 0.82 se webp non supportato.
- Ritorna `{ file: File, ext: 'webp'|'jpg' }`.

`src/components/ui/OptimizedImage.tsx`
- Props: `src` o `{ bucket, path }`, `alt`, `width`, `height` (intrinseci, obbligatori → no CLS), `className`, `objectFit`, `fallback?`, `priority?` (default false → `loading="lazy" decoding="async"`; true → `loading="eager" fetchpriority="high"`).
- Stati `loaded`/`errored`: skeleton (`bg-muted animate-pulse`) finché non `onLoad`; `onError` → render `fallback`.
- SVG passthrough; nessuna nuova dipendenza.

## 2) Sostituzioni `<img>` / `<AvatarImage>`

Solo dove l'immagine viene dai 4 bucket pubblici o dagli archetipi XIMAtar statici. Lascio invariati asset marketing (`/images/...`, `LandingHeader/Footer`, `Logo.tsx`) e le preview locali (blob) negli uploader.

Avatar utente/mentor:
- `src/components/profile/XimatarHeroCard.tsx` (avatar + immagine ximatar)
- `src/components/profile/MentorSection.tsx`
- `src/pages/candidate/SessionDetail.tsx`
- `src/components/business/CandidateEngagement.tsx`
- `src/components/signals/CandidateComparisonView.tsx`
- `src/components/feed/FeedItemCard.tsx`
- `src/components/feed/FeedChatThreadCard.tsx`
- `src/pages/Messages.tsx`, `src/pages/XimaChat.tsx`

Loghi azienda:
- `src/components/business/CompanyIdentityCard.tsx`
- `src/components/business/LogoUploader.tsx` (display corrente)

XIMAtar (bucket o `/ximatars/*.png`):
- `XimatarDisplay`, `XimaAvatar`, `XimatarCandidateCard` (×2), `SubmissionDetailDrawer`, `PipelineView`, `PipelineChatView`, `MakeOfferModal`, `CompanyIdentityCard` (lista archetipi), `XimatarProfileCard`, `RecommendationDebugPanel`, `AvatarExplanation` (×3), `AssessmentGuide` (×2).

Dimensioni intrinseche per contesto (lista 48px, ximatar inline 24–40px, logo lista 56px, hero 192–256px). `priority` solo su hero sopra la fold (es. `XimatarHeroCard`).

## 3) Upload: downscale + cacheControl

Call site aggiornati ai 4 bucket pubblici, sempre tramite `prepareImageForUpload`:
- `src/components/ProfilePhotoUpload.tsx` (avatars, 512)
- `src/components/profile/XimatarHeroCard.tsx` (avatars, 512)
- `src/components/mentor/MentorAvatarUpload.tsx` (mentor-avatars, 512)
- `src/components/business/LogoUploader.tsx` (business-logos, 512, svg invariato)

Tutti gli `.upload(...)` di questi bucket: `{ upsert: true, cacheControl: '604800', contentType: file.type }`. Il path adotta la nuova `ext` restituita dall'util.

Out of scope upload: `StandingVideoSession`, `StandingUploadMode`, `useCandidateEligibility`, `useJobPostPdfImport` (privati/video).

## 4) Backfill una‑tantum bucket `avatars`

Visto che la trasformazione lato server non è disponibile e i 6 avatar esistenti pesano ~1MB l'uno, serve un'azione admin manuale per rigenerarli.

Implementazione: pulsante **"Ottimizza avatar esistenti"** dentro `XimaManager` (tab admin già esistente, gated da `has_role('admin')`), in una nuova subsection "Manutenzione media".
- Client-side, niente edge function, niente migration.
- Flusso: `supabase.storage.from('avatars').list('', { limit: 1000 })` ricorsivamente sulle sottocartelle utente → per ogni oggetto non‑placeholder e non‑svg: `download()` → `prepareImageForUpload(blob, 512)` → `.upload(path, file, { upsert: true, cacheControl: '604800', contentType })`.
- Mantiene lo **stesso path** (nessuna modifica a `profiles.avatar_url`); cambia solo il contenuto e l'estensione del contenuto resta quella del path originale (per evitare URL stale uso `contentType: 'image/webp'` ma path invariato — i browser usano il `Content-Type` reale, non l'estensione).
- UI: progress "X / N", log per riga (ok / skipped svg / error), tasto disabilitato durante l'esecuzione, conferma prima di partire. Esegue solo sul bucket `avatars`. Idempotente: se già webp piccolo, ricomprime comunque (operazione una tantum, costo trascurabile su 6 file).
- Audit: insert in `audit_events` (`actor_type='admin'`, `action='media.avatars_backfill'`, metadata con counts) via service role tramite una piccola edge function dedicata? — **No**, evito di aggiungere edge: i log restano in UI; l'azione è osservabile dal pannello e ripetibile. Se in futuro serve traccia DB, la aggiungeremo separatamente.

Per `business-logos` non viene fatto backfill (già leggeri). `mentor-avatars`/`ximatar` vuoti → niente da fare.

## 5) Comportamenti trasversali

- `width`/`height` HTML attributes sempre → no CLS.
- `loading="lazy" decoding="async"` ovunque tranne `priority`.
- Fallback avatar = iniziali (riuso util esistente di `XimaAvatar`/`anonymousDisplay`).
- Nessun nuovo bucket, nessun secret, nessuna policy.

## Verifica post-build

1. Network: nuovi upload tornano `image/webp` + `cache-control: max-age=604800`.
2. Dopo backfill: i 6 avatar passano da ~1MB a <100KB.
3. Smoke `/profile`, `/jobs`, `/business/*`, `/admin?tab=roles` — nessuna regressione.
4. Lighthouse: calo "Properly size images" e LCP sulla home post‑login.