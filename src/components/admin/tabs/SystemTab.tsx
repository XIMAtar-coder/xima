import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Trash2, Database, Clock, Activity, Zap } from 'lucide-react';

export default function SystemTab() {
  const { toast } = useToast();
  const [log, setLog] = useState<string[]>([]);
  const addLog = (m: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${m}`, ...prev].slice(0, 80));

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity size={18} /> System Status</CardTitle>
          <CardDescription>Placeholder visivo — health check reali non agganciati</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['Database', 'Edge Functions', 'Realtime'].map(n => (
            <div key={n} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{n}</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
