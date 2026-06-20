import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Inbox, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Source = 'hiring_goal_drafts' | 'job_posts' | 'contact_sales_requests';
type HandlingStatus = 'pending' | 'in_progress' | 'done' | 'dismissed';

interface RequestItem {
  source: Source;
  source_id: string;
  handling_status: HandlingStatus;
  handled_by: string | null;
  handled_at: string | null;
  note: string | null;
  business_id: string | null;
  title: string;
  origin_status: string | null;
  created_at: string;
  extra: Record<string, any>;
}

const SOURCE_LABEL: Record<Source, string> = {
  hiring_goal_drafts: 'HR Draft',
  job_posts: 'Job Post',
  contact_sales_requests: 'Contact Sales',
};

const STATUS_VARIANT: Record<HandlingStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'destructive',
  in_progress: 'default',
  done: 'secondary',
  dismissed: 'outline',
};

const STATUS_LABEL: Record<HandlingStatus, string> = {
  pending: 'Pending',
  in_progress: 'In corso',
  done: 'Evaso',
  dismissed: 'Dismiss',
};

export default function RequestsTab() {
  const qc = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState<'all' | Source>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | HandlingStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const query = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-requests-list');
      if (error) throw error;
      return data as { items: RequestItem[]; counts: Record<string, number>; total: number };
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: { source: Source; source_id: string; new_status: HandlingStatus; note?: string | null }) => {
      const { data, error } = await supabase.functions.invoke('admin-requests-update-status', { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Stato aggiornato');
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Errore aggiornamento'),
  });

  const items = query.data?.items || [];
  const counts = query.data?.counts || {};

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((it) => {
      if (sourceFilter !== 'all' && it.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && it.handling_status !== statusFilter) return false;
      if (s && !`${it.title} ${it.extra?.requester_email || ''} ${it.extra?.company_name || ''}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [items, sourceFilter, statusFilter, search]);

  const openDetails = (item: RequestItem) => {
    setSelected(item);
    setNoteDraft(item.note || '');
  };

  const updateStatus = (status: HandlingStatus) => {
    if (!selected) return;
    mutation.mutate({
      source: selected.source,
      source_id: selected.source_id,
      new_status: status,
      note: noteDraft || null,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" /> Richieste
              {counts.pending > 0 && (
                <Badge variant="destructive">{counts.pending} pending</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Coda unificata: HR drafts, job posts con richiesta XIMA HR, contact sales.
              Stato gestito in <code>xima_request_actions</code>; le tabelle business non vengono modificate.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['admin-requests'] })}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le origini</SelectItem>
                <SelectItem value="hiring_goal_drafts">HR Drafts</SelectItem>
                <SelectItem value="job_posts">Job Posts</SelectItem>
                <SelectItem value="contact_sales_requests">Contact Sales</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In corso</SelectItem>
                <SelectItem value="done">Evaso</SelectItem>
                <SelectItem value="dismissed">Dismiss</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Cerca per titolo / email / azienda…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origine</TableHead>
                  <TableHead>Titolo / Oggetto</TableHead>
                  <TableHead>Stato handling</TableHead>
                  <TableHead>Stato origine</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Caricamento…</TableCell></TableRow>
                )}
                {!query.isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nessuna richiesta</TableCell></TableRow>
                )}
                {filtered.map((it) => (
                  <TableRow key={`${it.source}:${it.source_id}`}>
                    <TableCell><Badge variant="outline">{SOURCE_LABEL[it.source]}</Badge></TableCell>
                    <TableCell className="max-w-md truncate">{it.title}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[it.handling_status]}>{STATUS_LABEL[it.handling_status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.origin_status || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {it.created_at ? new Date(it.created_at).toLocaleString('it-IT') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openDetails(it)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Apri
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant="outline">{SOURCE_LABEL[selected.source]}</Badge>
                  <span className="truncate">{selected.title}</span>
                </DialogTitle>
                <DialogDescription>
                  Stato attuale: <Badge variant={STATUS_VARIANT[selected.handling_status]}>{STATUS_LABEL[selected.handling_status]}</Badge>
                  {selected.handled_at && (
                    <span className="ml-2 text-xs">— ultimo update {new Date(selected.handled_at).toLocaleString('it-IT')}</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Field label="Source ID" value={selected.source_id} mono />
                  <Field label="Business ID" value={selected.business_id || '—'} mono />
                  <Field label="Origin status" value={selected.origin_status || '—'} />
                  <Field label="Created at" value={selected.created_at ? new Date(selected.created_at).toLocaleString('it-IT') : '—'} />
                </div>

                {selected.source === 'contact_sales_requests' && (
                  <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                    <Field label="Richiedente" value={selected.extra?.requester_name || '—'} />
                    <Field label="Email" value={selected.extra?.requester_email || '—'} />
                    <Field label="Azienda" value={selected.extra?.company_name || '—'} />
                    <Field label="Tier desiderato" value={selected.extra?.desired_tier || '—'} />
                    <Field label="Seats" value={String(selected.extra?.desired_seats ?? '—')} />
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Messaggio</div>
                      <div className="rounded-md bg-muted/50 p-2 whitespace-pre-wrap">{selected.extra?.message || '—'}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground">Note operatore</label>
                  <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} />
                </div>
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" disabled={mutation.isPending} onClick={() => updateStatus('pending')}>Pending</Button>
                <Button variant="default" disabled={mutation.isPending} onClick={() => updateStatus('in_progress')}>Preso in carico</Button>
                <Button variant="secondary" disabled={mutation.isPending} onClick={() => updateStatus('done')}>Evaso</Button>
                <Button variant="ghost" disabled={mutation.isPending} onClick={() => updateStatus('dismissed')}>Dismiss</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? 'font-mono text-[11px] break-all' : ''}>{value}</div>
    </div>
  );
}
