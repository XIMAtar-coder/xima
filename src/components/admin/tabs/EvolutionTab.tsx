import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Pause, Play } from 'lucide-react';
import { useAdminEvolution, EvolutionEvent } from '../hooks/useAdminRpc';
import { cn } from '@/lib/utils';

const PILLAR_LABEL: Array<{ key: keyof EvolutionEvent['deltas']; label: string }> = [
  { key: 'knowledge', label: 'K' },
  { key: 'communication', label: 'Cm' },
  { key: 'computational_power', label: 'Cp' },
  { key: 'creativity', label: 'Cr' },
  { key: 'drive', label: 'D' },
];

function deltaClass(v: number) {
  if (v > 0) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (v < 0) return 'bg-destructive/15 text-destructive border-destructive/30';
  return 'bg-muted text-muted-foreground border-border';
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return new Date(iso).toLocaleString();
}

export default function EvolutionTab() {
  const [live, setLive] = useState(true);
  const { data, isLoading, error, dataUpdatedAt } = useAdminEvolution(50, live);

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Evoluzione XIMAtar
              {live && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Ultimi eventi di traiettoria (pseudonimi). Polling ogni 10s · ultimo: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLive(v => !v)}>
            {live ? <><Pause className="h-4 w-4 mr-2" /> Pausa</> : <><Play className="h-4 w-4 mr-2" /> Riprendi</>}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-sm text-muted-foreground">Caricamento…</div>}
          {error && <div className="text-sm text-destructive">Errore caricamento.</div>}
          {!isLoading && !error && (data?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">Nessun evento ancora.</div>
          )}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {data?.map((ev, i) => (
              <div key={`${ev.created_at}-${i}`} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/40 transition-colors">
                <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{ev.candidate_ref?.slice(0, 10)}</code>
                    <Badge variant="outline" className="text-xs">{ev.source_type}</Badge>
                    {ev.source_function && <span className="text-muted-foreground">{ev.source_function}</span>}
                    <span className="text-muted-foreground ml-auto">{relTime(ev.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {PILLAR_LABEL.map(({ key, label }) => {
                      const v = ev.deltas?.[key] ?? 0;
                      return (
                        <span key={key} className={cn('text-xs font-mono px-1.5 py-0.5 rounded border', deltaClass(v))}>
                          {label} {v > 0 ? `+${v}` : v}
                        </span>
                      );
                    })}
                  </div>
                  {ev.reasoning && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ev.reasoning}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Nota: live via polling 10s. Per Realtime vero serve abilitare la replica su <code>audit_events</code> + <code>pillar_trajectory_log</code> con policy admin (follow-up).
      </p>
    </div>
  );
}
