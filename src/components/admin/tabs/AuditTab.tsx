import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, ScrollText, ChevronRight, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type Period = '7' | '30' | '90' | 'custom' | 'all';
const PAGE_SIZES = [25, 50, 100] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Row {
  id: string;
  occurred_at: string;
  actor_type: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  correlation_id: string | null;
  metadata: any;
}

const truncId = (v?: string | null) => (v ? (v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v) : '—');

const copy = (v?: string | null) => {
  if (!v) return;
  navigator.clipboard.writeText(v).then(() => toast.success('Copiato'));
};

export default function AuditTab() {
  const qc = useQueryClient();

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHashes, setShowHashes] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchRaw.trim()); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [searchRaw]);

  // Reset page on filter changes
  useEffect(() => { setPage(0); }, [actionFilter, entityFilter, actorFilter, period, customFrom, customTo, pageSize]);

  const dateRange = useMemo(() => {
    if (period === 'all') return null;
    if (period === 'custom') {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : null,
        to: customTo ? new Date(customTo).toISOString() : null,
      };
    }
    const days = parseInt(period, 10);
    return { from: new Date(Date.now() - days * 86400000).toISOString(), to: null };
  }, [period, customFrom, customTo]);

  // Facets — distinct values from latest 1000 events
  const facets = useQuery({
    queryKey: ['audit-facets'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_events')
        .select('action, entity_type, actor_type')
        .order('occurred_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      const actions = new Set<string>();
      const entities = new Set<string>();
      const actors = new Set<string>();
      for (const r of data || []) {
        if (r.action) actions.add(r.action);
        if (r.entity_type) entities.add(r.entity_type);
        if (r.actor_type) actors.add(r.actor_type);
      }
      return {
        actions: [...actions].sort(),
        entities: [...entities].sort(),
        actors: [...actors].sort(),
      };
    },
  });

  const pageQuery = useQuery({
    queryKey: ['audit-events', { actionFilter, entityFilter, actorFilter, period, customFrom, customTo, search, page, pageSize }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from('audit_events')
        .select('id, occurred_at, actor_type, actor_id, action, entity_type, entity_id, correlation_id, metadata', { count: 'exact' })
        .order('occurred_at', { ascending: false })
        .range(from, to);

      if (actionFilter !== 'all') q = q.eq('action', actionFilter);
      if (entityFilter !== 'all') q = q.eq('entity_type', entityFilter);
      if (actorFilter !== 'all') q = q.eq('actor_type', actorFilter);
      if (dateRange?.from) q = q.gte('occurred_at', dateRange.from);
      if (dateRange?.to) q = q.lte('occurred_at', dateRange.to);

      if (search) {
        if (UUID_RE.test(search)) {
          q = q.or(`entity_id.eq.${search},correlation_id.eq.${search},actor_id.eq.${search}`);
        } else {
          const s = search.replace(/[,()]/g, '');
          q = q.or(`entity_id.ilike.%${s}%,correlation_id.ilike.%${s}%`);
        }
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as Row[], count: count || 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((pageQuery.data?.count || 0) / pageSize));
  const rows = pageQuery.data?.rows || [];

  const resetFilters = () => {
    setActionFilter('all'); setEntityFilter('all'); setActorFilter('all');
    setPeriod('30'); setCustomFrom(''); setCustomTo(''); setSearchRaw(''); setSearch('');
    setPage(0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" /> Audit Events
            <Badge variant="outline">{pageQuery.data?.count ?? '…'} risultati</Badge>
          </CardTitle>
          <CardDescription>
            Lettura diretta da <code>audit_events</code> (RLS admin). Nessuna PII: actor_id mostrato troncato; ip/user-agent solo come hash a richiesta.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            qc.invalidateQueries({ queryKey: ['audit-events'] });
            qc.invalidateQueries({ queryKey: ['audit-facets'] });
          }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le action</SelectItem>
              {(facets.data?.actions || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Entity type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli entity</SelectItem>
              {(facets.data?.entities || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Actor type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli actor</SelectItem>
              {(facets.data?.actors || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimi 7g</SelectItem>
              <SelectItem value="30">Ultimi 30g</SelectItem>
              <SelectItem value="90">Ultimi 90g</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="all">Tutto</SelectItem>
            </SelectContent>
          </Select>
          {period === 'custom' && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
            </>
          )}
          <Input
            placeholder="Cerca entity_id / correlation_id / actor_id"
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            className="max-w-xs flex-1 min-w-[220px]"
          />
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v, 10))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}/pag</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
            <Switch checked={showHashes} onCheckedChange={setShowHashes} id="hashes" />
            <label htmlFor="hashes">Mostra hash tecnici</label>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-44">Data/ora</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Actor type</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Correlation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageQuery.isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Caricamento…</TableCell></TableRow>
              )}
              {!pageQuery.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nessun evento</TableCell></TableRow>
              )}
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <>
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                    >
                      <TableCell>
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.occurred_at).toLocaleString('it-IT')}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                      <TableCell className="text-xs">{r.entity_type || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.entity_id ? (
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); copy(r.entity_id); }}
                          >
                            {truncId(r.entity_id)} <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.actor_type ? <Badge variant="secondary" className="text-[10px]">{r.actor_type}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.actor_id ? (
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); copy(r.actor_id); }}
                          >
                            {truncId(r.actor_id)} <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.correlation_id ? (
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); copy(r.correlation_id); }}
                          >
                            {truncId(r.correlation_id)} <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={`${r.id}-exp`}>
                        <TableCell colSpan={8} className="bg-muted/30">
                          <div className="space-y-2 p-2">
                            <div className="text-xs text-muted-foreground">Metadata</div>
                            <pre className="text-xs bg-background rounded p-2 max-h-64 overflow-auto">
{JSON.stringify(r.metadata ?? {}, null, 2)}
                            </pre>
                            {showHashes && <HashesDetail eventId={r.id} />}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>Pagina {page + 1} di {totalPages}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0 || pageQuery.isFetching} onClick={() => setPage(p => Math.max(0, p - 1))}>Precedente</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || pageQuery.isFetching} onClick={() => setPage(p => p + 1)}>Successiva</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HashesDetail({ eventId }: { eventId: string }) {
  const { data } = useQuery({
    queryKey: ['audit-hashes', eventId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_events')
        .select('ip_hash, user_agent_hash')
        .eq('id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      <div>
        <div className="text-muted-foreground">ip_hash</div>
        <div className="font-mono break-all">{data?.ip_hash || '—'}</div>
      </div>
      <div>
        <div className="text-muted-foreground">user_agent_hash</div>
        <div className="font-mono break-all">{data?.user_agent_hash || '—'}</div>
      </div>
    </div>
  );
}
