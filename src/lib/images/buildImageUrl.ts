import { supabase } from '@/integrations/supabase/client';

/**
 * Build a public URL for an image stored in a Supabase public bucket.
 *
 * NOTE: Supabase image transformations (`/storage/v1/render/image`) are NOT
 * enabled on this project (verified: 403 on render endpoint). The width/height
 * /quality params are accepted but currently ignored — passthrough to
 * `getPublicUrl`. When the Pro add-on is enabled in the future, this is the
 * single place to switch to `getPublicUrl(path, { transform: ... })`.
 */
export interface BuildImageUrlArgs {
  bucket: string;
  path: string;
  /** Reserved for future transform support. Ignored today. */
  width?: number;
  /** Reserved for future transform support. Ignored today. */
  height?: number;
  /** Reserved for future transform support. Ignored today. */
  quality?: number;
  /** Optional cache-buster appended as ?v= */
  cacheBust?: string | number | null;
}

export function buildImageUrl({ bucket, path, cacheBust }: BuildImageUrlArgs): string {
  const cleanPath = path.replace(/^\/+/, '').replace(/^public\//, '');
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  const url = data?.publicUrl ?? '';
  if (cacheBust !== undefined && cacheBust !== null && cacheBust !== '') {
    return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(cacheBust))}`;
  }
  return url;
}

export function isSvgPath(path?: string | null): boolean {
  if (!path) return false;
  return /\.svg(\?|$)/i.test(path);
}
