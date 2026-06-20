import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Info, TrendingUp, Users, Briefcase, Radio } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, AreaChart, Area,
} from 'recharts';

type Period = 7 | 30 | 90;
const fmt = (n: number) => new Intl.NumberFormat('it-IT').format(n || 0);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export default function AnalyticsTab() {
  const qc = useQueryClient();
  const [days, setDays] = useState<Period>(30);

  const refresh = () =>
    qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'admin-analytics' });

  const candidate = useQuery({
    queryKey: ['admin-analytics', 'candidate-funnel', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_candidate_funnel', { p_days: days });
      if (error) throw error;
      return data as any;
    },
  });

  const business = useQuery({
    queryKey: ['admin-analytics', 'business-funnel', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_business_funnel', { p_days: days });
      if (error) throw error;
      return data as any;
    },
  });

  const feed = useQuery({
    queryKey: ['admin-analytics', 'feed', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_feed_overview', { p_days: days });
      if (error) throw error;
      return data as any;
    },
  });

  const catalog = useQuery({
    queryKey: ['admin-analytics', 'metrics-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_metrics_catalog');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const trendNames = ['auth.signup', 'job_recommendations'];
  const trend = useQuery({
    queryKey: ['admin-analytics', 'metrics-trend', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_metrics_trend', { p_metric_names: trendNames, p_days: days });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const sparkNames = useMemo(
    () => (catalog.data || [])
      .filter((m) => m.days >= 3 && !trendNames.includes(m.metric_name))
      .slice(0, 8)
      .map((m) => m.metric_name),
    [catalog.data],
  );

  const sparkData = useQuery({
    queryKey: ['admin-analytics', 'spark', sparkNames.join(',')],
    enabled: sparkNames.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_metrics_trend', { p_metric_names: sparkNames, p_days: 90 });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const trendByMetric = useMemo(() => {
    const map: Record<string, Array<{ date: string; value: number }>> = {};
    (trend.data || []).forEach((r: any) => {
      (map[r.metric_name] ||= []).push({ date: r.metric_date, value: Number(r.metric_value) });
    });
    return map;
  }, [trend.data]);

  const sparkByMetric = useMemo(() => {
    const map: Record<string, Array<{ date: string; value: number }>> = {};
    (sparkData.data || []).forEach((r: any) => {
      (map[r.metric_name] ||= []).push({ date: r.metric_date, value: Number(r.metric_value) });
    });
    return map;
  }, [sparkData.data]);

  const singleKpis = useMemo(
    () => (catalog.data || []).filter((m) => m.days < 3),
    [catalog.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Funnel candidato e business, engagement feed, trend metriche</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as Period)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
        <AlertTitle>Lettura dei funnel</AlertTitle>
        <AlertDescription>
          I conteggi sono <b>entità distinte attive nel periodo</b> selezionato — non rappresentano
          una conversione di coorte. Le percentuali sono indicative del rapporto fra stadi nello
          stesso intervallo.
        </AlertDescription>
      </Alert>

      <Funnel
        title="Funnel candidato"
        icon={<Users className="h-4 w-4" />}
        description="Grana persona — candidati distinti per stadio"
        steps={candidate.data?.steps || []}
      />

      <Funnel
        title="Funnel business"
        icon={<Briefcase className="h-4 w-4" />}
        description="Grana goal — hiring goal distinti per stadio"
        steps={business.data?.steps || []}
        contextKpis={[
          { label: 'Business profiles', value: business.data?.context?.business_profiles ?? 0 },
          { label: 'Business con challenge', value: business.data?.context?.businesses_with_challenges ?? 0 },
        ]}
      />

      {/* Feed engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="h-4 w-4" /> Feed engagement</CardTitle>
          <CardDescription>Predisposto — i contatori interazione si attiveranno con i primi eventi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Kpi label="Feed items" value={fmt(feed.data?.feed_items ?? 0)} />
            <Kpi label="Reactions" value={fmt(feed.data?.reactions ?? 0)} muted />
            <Kpi label="Seen events" value={fmt(feed.data?.seen ?? 0)} muted />
            <Kpi label="Consumption" value={fmt(feed.data?.consumption ?? 0)} muted />
          </div>
          {(feed.data?.items_by_type || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {feed.data.items_by_type.map((r: any) => (
                <Badge key={r.type} variant="secondary">{r.type}: {r.n}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend line charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {trendNames.map((name) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {name}</CardTitle>
              <CardDescription>Trend giornaliero — ultimi {days} giorni</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendByMetric[name] || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" name={name} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sparkline KPIs */}
      {sparkNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metriche con copertura ridotta</CardTitle>
            <CardDescription>KPI + sparkline (storia disponibile fino a 90g)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {sparkNames.map((name) => {
                const series = sparkByMetric[name] || [];
                const total = series.reduce((acc, p) => acc + p.value, 0);
                return (
                  <div key={name} className="rounded-lg border p-3 space-y-2">
                    <div className="text-xs font-mono text-muted-foreground truncate">{name}</div>
                    <div className="text-2xl font-semibold">{fmt(total)}</div>
                    <div style={{ height: 50 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series}>
                          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/.2)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single-day KPIs */}
      {singleKpis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metriche puntuali</CardTitle>
            <CardDescription>Storia ≤ 2 giorni — totale registrato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              {singleKpis.map((m: any) => (
                <div key={m.metric_name} className="rounded-lg border p-3 space-y-1">
                  <div className="text-xs font-mono text-muted-foreground truncate">{m.metric_name}</div>
                  <div className="text-xl font-semibold">{fmt(Number(m.total))}</div>
                  <div className="text-[10px] text-muted-foreground">{m.first_day} → {m.last_day}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Funnel({
  title, icon, description, steps, contextKpis,
}: {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  steps: Array<{ key: string; label: string; count: number; sub_label?: string; sub_count?: number }>;
  contextKpis?: Array<{ label: string; value: number }>;
}) {
  const first = steps[0]?.count ?? 0;
  const max = Math.max(1, ...steps.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {contextKpis && contextKpis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {contextKpis.map((k) => (
              <Badge key={k.label} variant="outline">{k.label}: {fmt(k.value)}</Badge>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {steps.map((s, i) => {
            const prev = i > 0 ? steps[i - 1].count : null;
            const stepPct = prev !== null ? pct(s.count, prev) : null;
            const fromStart = i > 0 ? pct(s.count, first) : null;
            const widthPct = Math.max(2, (s.count / max) * 100);
            const isZero = s.count === 0;
            return (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.label}</span>
                    {s.sub_label && (
                      <Badge variant="outline" className="text-xs">
                        {s.sub_label}: {fmt(s.sub_count ?? 0)}
                      </Badge>
                    )}
                    {isZero && i === steps.length - 1 && (
                      <Badge variant="secondary" className="text-xs">in attesa di dati</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {stepPct !== null && <span>step→step: <b className="text-foreground">{stepPct}%</b></span>}
                    {fromStart !== null && <span>vs start: <b className="text-foreground">{fromStart}%</b></span>}
                    <span className="text-base font-semibold text-foreground tabular-nums">{fmt(s.count)}</span>
                  </div>
                </div>
                <div className="h-3 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${widthPct}%`, opacity: isZero ? 0.15 : 1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${muted ? 'opacity-70' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
