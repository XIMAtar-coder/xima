import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Trash2, Database, Clock, Activity, Zap } from 'lucide-react';

type HealthStatus = 'ok' | 'degraded' | 'down' | 'checking';
type HealthResult = { status: HealthStatus; latencyMs: number | null; lastCheckedAt: number | null; error?: string };

const INITIAL: HealthResult = { status: 'checking', latencyMs: null, lastCheckedAt: null };

function classify(latencyMs: number, threshold: number): HealthStatus {
  return latencyMs < threshold ? 'ok' : 'degraded';
}

async function checkDatabase(): Promise<HealthResult> {
  const t0 = performance.now();
  try {
    const { error } = await supabase.rpc('health_db');
    const latencyMs = Math.round(performance.now() - t0);
    if (error) return { status: 'down', latencyMs, lastCheckedAt: Date.now(), error: error.message };
    return { status: classify(latencyMs, 600), latencyMs, lastCheckedAt: Date.now() };
  } catch (e: any) {
    return { status: 'down', latencyMs: null, lastCheckedAt: Date.now(), error: e?.message ?? 'error' };
  }
}


function checkRealtime(): Promise<HealthResult> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const channel = supabase.channel(`health-${Date.now()}`);
    let done = false;
    const finish = (r: HealthResult) => {
      if (done) return;
      done = true;
      try { supabase.removeChannel(channel); } catch {}
      resolve(r);
    };
    const timeout = setTimeout(() => finish({ status: 'down', latencyMs: null, lastCheckedAt: Date.now(), error: 'timeout' }), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        const latencyMs = Math.round(performance.now() - t0);
        finish({ status: classify(latencyMs, 600), latencyMs, lastCheckedAt: Date.now() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timeout);
        finish({ status: 'down', latencyMs: null, lastCheckedAt: Date.now(), error: status });
      }
    });
  });
}

function relativeTime(ts: number | null, now: number): string {
  if (!ts) return 'never';
  const s = Math.round((now - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function badgeClasses(status: HealthStatus): { bg: string; text: string; dot: string; label: string } {
  switch (status) {
    case 'ok': return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Operational' };
    case 'degraded': return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'Degraded' };
    case 'down': return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', label: 'Down' };
    case 'checking': return { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-400 animate-pulse', label: 'Checking…' };
  }
}

export default function SystemTab() {
  const { toast } = useToast();
  const [log, setLog] = useState<string[]>([]);
  const addLog = (m: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${m}`, ...prev].slice(0, 80));

  const [db, setDb] = useState<HealthResult>(INITIAL);
  const [rt, setRt] = useState<HealthResult>(INITIAL);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(Date.now());

  const runChecks = useCallback(async () => {
    setChecking(true);
    setDb(INITIAL); setRt(INITIAL);
    const [d, r] = await Promise.all([checkDatabase(), checkRealtime()]);
    setDb(d); setRt(r);
    setChecking(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const runRecs = async () => {
    addLog('Triggering recommendation engine…');
    const { error } = await supabase.functions.invoke('recommend-jobs');
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); addLog(`ERROR: ${error.message}`); return; }
    toast({ title: 'OK', description: 'Recommendations generated' });
    addLog('Recommendations done');
  };

  const purge = async () => {
    addLog('Purging logs > 90d…');
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    const { error } = await supabase.from('user_job_links').delete().lt('created_at', cutoff.toISOString());
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); addLog(`ERROR: ${error.message}`); return; }
    toast({ title: 'OK', description: 'Old logs purged' });
    addLog('Purge done');
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap size={18} /> Developer Tools</CardTitle>
          <CardDescription>Operazioni di manutenzione</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button variant="outline" className="justify-start" onClick={runRecs}>
            <RefreshCw className="mr-2 h-4 w-4" /> Force Run Recommendations
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="justify-start text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Purge Old Logs (90d+)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confermi la cancellazione?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno eliminati definitivamente i log <code>user_job_links</code> più vecchi di 90 giorni. Azione irreversibile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={purge} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" className="justify-start" onClick={() => { toast({ title: 'In sviluppo', description: 'Schema sync' }); addLog('Schema sync requested (not impl)'); }}>
            <Database className="mr-2 h-4 w-4" /> Sync Schema
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => { toast({ title: 'In sviluppo', description: 'Cron viewer' }); addLog('Cron jobs requested (not impl)'); }}>
            <Clock className="mr-2 h-4 w-4" /> Show Cron Jobs
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Developer Console</CardTitle>
            <CardDescription>Log locale delle operazioni</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLog([])}>Clear</Button>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-900 text-emerald-400 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs border border-border">
            {log.length === 0 ? <p className="text-muted-foreground">Nessuna attività.</p> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity size={18} /> System Status</CardTitle>
            <CardDescription>Health check reali (admin-only)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={runChecks} disabled={checking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([
            { name: 'Database', r: db },
            { name: 'Realtime', r: rt },
          ] as const).map(({ name, r }) => {
            const c = badgeClasses(r.status);
            const detail = r.status === 'checking'
              ? 'Checking…'
              : r.status === 'down'
                ? `Down${r.error ? ` — ${r.error}` : ''}`
                : `${c.label}${r.latencyMs != null ? ` · ${r.latencyMs}ms` : ''}`;
            return (
              <div key={name} className={`flex items-start gap-3 p-3 rounded-lg border ${c.bg}`}>
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full ${c.dot}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${c.text}`}>{name}</p>
                  <p className="text-xs text-muted-foreground truncate">{detail}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">checked {relativeTime(r.lastCheckedAt, now)}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
