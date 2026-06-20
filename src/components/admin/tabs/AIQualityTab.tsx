import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertCircle, Info, Zap, DollarSign, Timer, CheckCircle2, Database } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from 'recharts';

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(n || 0);
const fmtDate = (d: string) => new Date(d).toLocaleString('it-IT');

type Period = 7 | 30 | 90;

export default function AIQualityTab() {
  const qc = useQueryClient();
  const [days, setDays] = useState<Period>(30);

  const refresh = () =>
    qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'admin-ai-quality' });

  const kpis = useQuery({
    queryKey: ['admin-ai-quality', 'kpis', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_quality_kpis', { p_days: days });
      if (error) throw error;
      return data as any;
    },
  });

  const costSummary = useQuery({
    queryKey: ['admin-ai-quality', 'cost-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_costs_summary');
      if (error) throw error;
      return data as any;
    },
  });

  const trend = useQuery({
    queryKey: ['admin-ai-quality', 'trend', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_daily_trend', { p_days: days });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const byFn = useQuery({
    queryKey: ['admin-ai-quality', 'by-fn', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_by_function', { p_days: days });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const byModel = useQuery({
    queryKey: ['admin-ai-quality', 'by-model', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_by_model', { p_days: days });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const errors = useQuery({
    queryKey: ['admin-ai-quality', 'errors'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_recent_errors', { p_limit: 50 });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const budget = useQuery({
    queryKey: ['admin-ai-quality', 'budget'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_budget_overview');
      if (error) throw error;
      return data as any;
    },
  });

  const cache = useQuery({
    queryKey: ['admin-ai-quality', 'cache'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_cache_stats');
      if (error) throw error;
      return data as any;
    },
  });

  const quality = useQuery({
    queryKey: ['admin-ai-quality', 'quality', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_quality_indicators', { p_days: days });
      if (error) throw error;
      return data as any;
    },
  });

  const missingPct = Number(costSummary.data?.missing_usage_pct ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">AI & Qualità</h2>
          <p className="text-sm text-muted-foreground">Monitoraggio invocazioni AI, costi, budget e indicatori di qualità</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as Period)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30">Ultimi 30 giorni</SelectItem>
              <SelectItem value="90">Ultimi 90 giorni</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Aggiorna
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Nota sui costi</AlertTitle>
        <AlertDescription>
          I costi sono tracciati a partire dalle nuove chiamate (Fase 1). Lo storico pre-tracciamento
          non è costificato.
          {costSummary.data && (
            <span className="ml-1">
              Quota chiamate senza costo negli ultimi 30g: <Badge variant="secondary">{missingPct}%</Badge>
              {' '}({fmtNum(costSummary.data.missing_calls_30d)} di {fmtNum(costSummary.data.total_calls_30d)}).
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={<Zap className="h-4 w-4" />} label="Invocazioni" value={fmtNum(kpis.data?.invocations ?? 0)} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Success rate" value={`${kpis.data?.success_rate ?? 0}%`} />
        <KpiCard icon={<Timer className="h-4 w-4" />} label="Latenza media" value={`${fmtNum(kpis.data?.avg_latency_ms ?? 0)} ms`} />
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Costo totale" value={fmtUSD(Number(kpis.data?.total_cost_usd ?? 0))} />
      </div>

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Trend giornaliero</CardTitle>
          <CardDescription>Invocazioni e costo per giorno</CardDescription>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(trend.data || []).map((r: any) => ({
              day: r.day,
              invocations: Number(r.invocations),
              cost_usd: Number(r.cost_usd),
              errors: Number(r.errors),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="l" stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="r" orientation="right" stroke="hsl(var(--muted-foreground))" />
              <RTooltip />
              <Legend />
              <Line yAxisId="l" type="monotone" dataKey="invocations" stroke="hsl(var(--primary))" />
              <Line yAxisId="r" type="monotone" dataKey="cost_usd" stroke="hsl(142 71% 45%)" />
              <Line yAxisId="l" type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By function & by model */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Per function</CardTitle>
            <CardDescription>Invocazioni e costo per edge function</CardDescription>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(byFn.data || []).slice(0, 12).map((r: any) => ({
                function_name: r.function_name, invocations: Number(r.invocations), cost_usd: Number(r.cost_usd),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="function_name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
                <YAxis yAxisId="l" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <RTooltip />
                <Legend />
                <Bar yAxisId="l" dataKey="invocations" fill="hsl(var(--primary))" />
                <Bar yAxisId="r" dataKey="cost_usd" fill="hsl(142 71% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per model</CardTitle>
            <CardDescription>Invocazioni e costo per modello</CardDescription>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(byModel.data || []).slice(0, 12).map((r: any) => ({
                model_name: r.model_name, invocations: Number(r.invocations), cost_usd: Number(r.cost_usd),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="model_name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
                <YAxis yAxisId="l" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <RTooltip />
                <Legend />
                <Bar yAxisId="l" dataKey="invocations" fill="hsl(var(--primary))" />
                <Bar yAxisId="r" dataKey="cost_usd" fill="hsl(38 92% 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Errori recenti</CardTitle>
          <CardDescription>Ultime invocazioni con status diverso da success</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Function</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Correlation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(errors.data || []).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.function_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.model_name}</TableCell>
                    <TableCell><Badge variant="destructive">{r.error_code || 'error'}</Badge></TableCell>
                    <TableCell className="text-right">{r.latency_ms ?? '-'} ms</TableCell>
                    <TableCell>{fmtDate(r.invoked_at)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.correlation_id?.slice(0, 8) || '-'}</TableCell>
                  </TableRow>
                ))}
                {!errors.isLoading && (errors.data || []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nessun errore recente</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Budget AI</CardTitle>
          <CardDescription>Mese {budget.data?.month} — utilizzo per tier e top consumatori</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-2">Per tier</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Utenti</TableHead>
                  <TableHead className="text-right">Calls used</TableHead>
                  <TableHead className="text-right">Calls limit</TableHead>
                  <TableHead className="text-right">Utilizzo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(budget.data?.by_tier || []).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{r.tier}</Badge></TableCell>
                    <TableCell className="text-right">{r.users}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.calls_used)}</TableCell>
                    <TableCell className="text-right">{fmtNum(r.calls_limit)}</TableCell>
                    <TableCell className="text-right">{r.utilization_pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Top 10 consumatori</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Used / Limit</TableHead>
                  <TableHead>Ultima function</TableHead>
                  <TableHead>Ultima call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(budget.data?.top_consumers || []).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.user_short}…</TableCell>
                    <TableCell><Badge variant="outline">{r.tier}</Badge></TableCell>
                    <TableCell className="text-right">{fmtNum(r.calls_used)} / {fmtNum(r.calls_limit)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.last_function_called || '-'}</TableCell>
                    <TableCell>{r.last_call_at ? fmtDate(r.last_call_at) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Cache risultati AI</CardTitle>
          <CardDescription>Entry totali — hit ratio non disponibile (campi non tracciati)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-semibold">{fmtNum(cache.data?.entries ?? 0)}</div>
          <p className="text-sm text-muted-foreground">entry totali in ai_result_cache</p>
          {(cache.data?.by_function || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {cache.data.by_function.map((r: any) => (
                <Badge key={r.function_name} variant="secondary">{r.function_name}: {r.entries}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality */}
      <Card>
        <CardHeader>
          <CardTitle>Qualità</CardTitle>
          <CardDescription>Indicatori aggregati e anonimi sugli output del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard label="Assessment (totali)" value={fmtNum(quality.data?.assessment_results?.count ?? 0)} />
            <KpiCard label="Completati" value={`${quality.data?.assessment_results?.completed_pct ?? 0}%`} />
            <KpiCard label="Score medio" value={String(quality.data?.assessment_results?.avg_total_score ?? 0)} />
            <KpiCard label="Sentiment medio" value={String(quality.data?.assessment_results?.avg_sentiment ?? 0)} />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Distribuzione total_score</h4>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(quality.data?.score_histogram || []).map((b: any) => ({
                  bucket: `${b.bucket}-${b.bucket + 9}`, n: b.n,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <RTooltip />
                  <Bar dataKey="n" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Top archetipi (top3)</h4>
              <div className="flex flex-wrap gap-2">
                {(quality.data?.top3_archetypes || []).map((r: any) => (
                  <Badge key={r.archetype} variant="secondary">{r.archetype}: {r.n}</Badge>
                ))}
                {(quality.data?.top3_archetypes || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessun dato</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Challenge reviews ({quality.data?.challenge_reviews?.count ?? 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries((quality.data?.challenge_reviews?.by_decision || {}) as Record<string, number>).map(([k, v]) => (
                  <Badge key={k} variant="outline">{k}: {v}</Badge>
                ))}
                {Object.keys((quality.data?.challenge_reviews?.by_decision || {})).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nessuna review</p>
                )}
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Predisposto, in attesa di dati</AlertTitle>
            <AlertDescription>
              <span className="mr-3"><b>assessment_evidence_ledger</b>: {fmtNum(quality.data?.evidence_ledger_count ?? 0)} record.</span>
              <span><b>psychometrics_telemetry</b>: {fmtNum(quality.data?.psychometrics_telemetry_count ?? 0)} record.</span>
              <div className="text-sm text-muted-foreground mt-1">
                Widget dedicati saranno attivati appena queste tabelle saranno popolate.
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">{icon}{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
