import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Kind = 'audit' | 'trajectory';

interface FeedItem {
  id: string;
  kind: Kind;
  ts: string; // ISO timestamp used for ordering
  raw: any;
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return 'ora';
  if (diff < 60) return `${Math.floor(diff)}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return new Date(iso).toLocaleString();
}

const PILLAR_KEYS: Array<{ key: string; label: string }> = [
  { key: 'knowledge_delta', label: 'K' },
  { key: 'communication_delta', label: 'Cm' },
  { key: 'computational_power_delta', label: 'Cp' },
  { key: 'creativity_delta', label: 'Cr' },
  { key: 'drive_delta', label: 'D' },
];

function deltaClass(v: number) {
  if (v > 0) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (v < 0) return 'bg-destructive/15 text-destructive border-destructive/30';
  return 'bg-muted text-muted-foreground border-border';
}

export default function ActivityTab() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'down'>('connecting');

  const mergeItems = useCallback((incoming: FeedItem[]) => {
    setItems(prev => {
      const map = new Map<string, FeedItem>();
      // prepend incoming first so latest wins on duplicate id, then existing
      for (const it of incoming) map.set(it.id, it);
      for (const it of prev) if (!map.has(it.id)) map.set(it.id, it);
      const arr = Array.from(map.values());
      arr.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      return arr.slice(0, 200);
    });
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditRes, trajRes] = await Promise.all([
        supabase.from('audit_events').select('*').order('occurred_at', { ascending: false }).limit(50),
        supabase.from('pillar_trajectory_log').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (auditRes.error) throw auditRes.error;
      if (trajRes.error) throw trajRes.error;

      const audit: FeedItem[] = (auditRes.data || []).map((r: any) => ({
        id: r.id, kind: 'audit', ts: r.occurred_at, raw: r,
      }));
      const traj: FeedItem[] = (trajRes.data || []).map((r: any) => ({
        id: r.id, kind: 'trajectory', ts: r.created_at, raw: r,
      }));
      mergeItems([...audit, ...traj]);
    } catch (e: any) {
      setError(e?.message || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, [mergeItems]);

  // Initial load
  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Realtime subscription
  useEffect(() => {
    setLiveStatus('connecting');
    const channel = supabase
      .channel('admin-activity-feed')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_events' },
        (payload) => {
          const r: any = payload.new;
          mergeItems([{ id: r.id, kind: 'audit', ts: r.occurred_at, raw: r }]);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pillar_trajectory_log' },
        (payload) => {
          const r: any = payload.new;
          mergeItems([{ id: r.id, kind: 'trajectory', ts: r.created_at, raw: r }]);
        })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setLiveStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setLiveStatus('down');
      });

    return () => { supabase.removeChannel(channel); };
  }, [mergeItems]);

  const liveBadge = useMemo(() => {
    const map = {
      connecting: { cls: 'bg-amber-500 hover:bg-amber-500', label: 'Connessione…' },
      live: { cls: 'bg-emerald-500 hover:bg-emerald-500', label: 'Live' },
      down: { cls: 'bg-destructive hover:bg-destructive', label: 'Offline' },
    } as const;
    return map[liveStatus];
  }, [liveStatus]);

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Activity Feed
              <Badge className={cn('text-white gap-1', liveBadge.cls)}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> {liveBadge.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Eventi di audit e traiettoria pillar in tempo reale · {items.length} eventi
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadInitial} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Aggiorna
          </Button>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 && <div className="text-sm text-muted-foreground">Caricamento…</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">Nessun evento.</div>
          )}
          <div className="space-y-2 max-h-[640px] overflow-y-auto">
            {items.map((it) => (
              <div
                key={`${it.kind}:${it.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-colors"
              >
                {it.kind === 'audit' ? (
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant="outline" className="text-xs">
                      {it.kind === 'audit' ? 'audit' : 'trajectory'}
                    </Badge>
                    {it.kind === 'audit' ? (
                      <>
                        <span className="font-mono">{it.raw.action}</span>
                        {it.raw.actor_type && <Badge variant="secondary" className="text-xs">{it.raw.actor_type}</Badge>}
                        {it.raw.entity_type && (
                          <span className="text-muted-foreground">{it.raw.entity_type}</span>
                        )}
                      </>
                    ) : (
                      <>
                        {it.raw.source_function && (
                          <span className="font-mono">{it.raw.source_function}</span>
                        )}
                        {it.raw.source_type && <Badge variant="secondary" className="text-xs">{it.raw.source_type}</Badge>}
                      </>
                    )}
                    <span className="text-muted-foreground ml-auto">{relTime(it.ts)}</span>
                  </div>

                  {it.kind === 'trajectory' && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {PILLAR_KEYS.map(({ key, label }) => {
                        const v = Number(it.raw[key] ?? 0);
                        if (!v) return null;
                        return (
                          <span key={key} className={cn('text-xs font-mono px-1.5 py-0.5 rounded border', deltaClass(v))}>
                            {label} {v > 0 ? `+${v}` : v}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {it.kind === 'trajectory' && it.raw.reasoning && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{it.raw.reasoning}</p>
                  )}

                  {it.kind === 'audit' && it.raw.correlation_id && (
                    <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                      cid: {it.raw.correlation_id}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
