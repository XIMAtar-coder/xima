import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ImageIcon, AlertTriangle, CheckCircle2, FileImage } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForUpload } from '@/lib/images/prepareImageForUpload';
import { toast } from 'sonner';

type RowStatus = 'ok' | 'skipped' | 'error';

interface BackfillRow {
  path: string;
  status: RowStatus;
  beforeBytes?: number;
  afterBytes?: number;
  reason?: string;
}

const BUCKET = 'avatars';
const LONG_SIDE = 512;
const QUALITY = 0.8;

async function listAllAvatarFiles(): Promise<string[]> {
  // Avatars are stored as <user_id>/<file>. List root, recurse into folders.
  const out: string[] = [];
  const { data: rootEntries, error: rootErr } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (rootErr) throw rootErr;
  for (const entry of rootEntries ?? []) {
    if (!entry || entry.name === '.emptyFolderPlaceholder') continue;
    // A file at root (legacy) — entry.id is non-null for actual objects on Supabase JS.
    const looksLikeFolder = !('metadata' in entry) || !entry.metadata;
    if (!looksLikeFolder) {
      out.push(entry.name);
      continue;
    }
    // Folder: list inside
    const { data: childEntries, error: childErr } = await supabase.storage
      .from(BUCKET)
      .list(entry.name, { limit: 1000 });
    if (childErr) continue;
    for (const c of childEntries ?? []) {
      if (!c || c.name === '.emptyFolderPlaceholder') continue;
      if (!('metadata' in c) || !c.metadata) continue;
      out.push(`${entry.name}/${c.name}`);
    }
  }
  return out;
}

export function MediaMaintenancePanel() {
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [rows, setRows] = useState<BackfillRow[]>([]);
  const [paths, setPaths] = useState<string[] | null>(null);

  const scan = async () => {
    setScanning(true);
    setRows([]);
    setDone(0);
    try {
      const found = await listAllAvatarFiles();
      setPaths(found);
      setTotal(found.length);
      toast.success(`Trovati ${found.length} file in "${BUCKET}"`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Scan fallito');
    } finally {
      setScanning(false);
    }
  };

  const run = async () => {
    if (!paths || paths.length === 0) {
      toast.error('Nessun file da processare. Esegui prima lo scan.');
      return;
    }
    setRunning(true);
    setRows([]);
    setDone(0);

    const collected: BackfillRow[] = [];
    let ok = 0;
    let skipped = 0;
    let errors = 0;
    let savedBytes = 0;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      try {
        if (/\.svg$/i.test(path)) {
          collected.push({ path, status: 'skipped', reason: 'svg' });
          skipped++;
          continue;
        }
        const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
        if (dlErr || !blob) throw dlErr || new Error('download failed');
        const beforeBytes = blob.size;

        const originalName = path.split('/').pop() || 'image';
        const asFile = new File([blob], originalName, { type: blob.type || 'image/jpeg' });
        const prepared = await prepareImageForUpload(asFile, { longSide: LONG_SIDE, quality: QUALITY });

        // Keep SAME path (don't rename) — avatar URLs in profiles stay valid.
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, prepared.file, {
            upsert: true,
            cacheControl: '604800',
            contentType: prepared.file.type,
          });
        if (upErr) throw upErr;

        const afterBytes = prepared.file.size;
        savedBytes += Math.max(0, beforeBytes - afterBytes);
        collected.push({ path, status: 'ok', beforeBytes, afterBytes });
        ok++;
      } catch (e: any) {
        collected.push({ path, status: 'error', reason: e?.message || String(e) });
        errors++;
      } finally {
        setDone(i + 1);
        setRows([...collected]);
      }
    }

    setRunning(false);
    const savedKB = Math.round(savedBytes / 1024);
    toast.success(`Completato — ok: ${ok}, skipped: ${skipped}, errori: ${errors}. Risparmiati ~${savedKB} KB`);
  };

  const okCount = rows.filter(r => r.status === 'ok').length;
  const skipCount = rows.filter(r => r.status === 'skipped').length;
  const errCount = rows.filter(r => r.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Manutenzione media — Avatar</CardTitle>
            <CardDescription>
              Backfill una-tantum: scarica gli avatar esistenti, li ricomprime in WebP 512px e li ricarica con
              cache lunga. Bucket: <code>{BUCKET}</code>. Nessuna modifica a path, profili o bucket privati.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={scan} disabled={scanning || running}>
            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileImage className="h-4 w-4 mr-2" />}
            Scansiona bucket
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!paths || paths.length === 0 || running || scanning}>
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Ottimizza {paths ? `(${paths.length})` : ''}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confermi l'ottimizzazione?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno scaricati e ri-caricati {paths?.length ?? 0} file nel bucket <strong>{BUCKET}</strong>.
                  L'operazione è idempotente, sovrascrive i file allo stesso path, e non altera <code>profiles.avatar</code>.
                  Procedere?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={run}>Procedi</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="ml-auto flex items-center gap-2">
            {paths && (
              <Badge variant="outline">
                {paths.length} file trovati
              </Badge>
            )}
            {rows.length > 0 && (
              <>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {okCount} ok
                </Badge>
                <Badge variant="outline">
                  {skipCount} skipped
                </Badge>
                {errCount > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {errCount} errori
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {(running || rows.length > 0) && total > 0 && (
          <div className="space-y-2">
            <Progress value={(done / total) * 100} />
            <p className="text-xs text-muted-foreground">{done} / {total}</p>
          </div>
        )}

        {rows.length > 0 && (
          <ScrollArea className="h-72 rounded-md border">
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.path} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Badge
                    variant={r.status === 'ok' ? 'default' : r.status === 'skipped' ? 'outline' : 'destructive'}
                    className="shrink-0"
                  >
                    {r.status}
                  </Badge>
                  <span className="font-mono text-xs truncate flex-1">{r.path}</span>
                  {r.status === 'ok' && r.beforeBytes != null && r.afterBytes != null && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(r.beforeBytes / 1024).toFixed(0)}KB → {(r.afterBytes / 1024).toFixed(0)}KB
                    </span>
                  )}
                  {r.status === 'error' && (
                    <span className="text-xs text-destructive shrink-0 max-w-[40%] truncate">{r.reason}</span>
                  )}
                  {r.status === 'skipped' && r.reason && (
                    <span className="text-xs text-muted-foreground shrink-0">{r.reason}</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
