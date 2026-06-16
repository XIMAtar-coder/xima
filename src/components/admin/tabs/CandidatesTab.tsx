import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { useAdminCandidateAnalytics } from '../hooks/useAdminRpc';
import { AdminKpi } from '../AdminKpi';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

const PIE_COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16', '#a855f7', '#14b8a6', '#f97316', '#6366f1'];

const PILLAR_LABEL: Record<string, string> = {
  knowledge: 'Knowledge',
  communication: 'Communication',
  computational_power: 'Computation',
  creativity: 'Creativity',
  drive: 'Drive',
};

export default function CandidatesTab() {
  const { data, isLoading, error } = useAdminCandidateAnalytics();

  if (isLoading) return <div className="text-muted-foreground text-sm">Caricamento candidati…</div>;
  if (error || !data) return <div className="text-destructive text-sm">Errore caricamento.</div>;

  const distribution = Object.entries(data.ximatar_distribution || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const pillarRadar = Object.entries(data.pillar_averages || {}).map(([k, v]) => ({
    pillar: PILLAR_LABEL[k] || k,
    score: Math.round(Number(v) || 0),
  }));

  const levels = Object.entries(data.ximatar_level_distribution || {}).map(([name, value]) => ({ name, value }));

  const inv = data.pipeline_invitations_by_level || {};
  const sub = data.pipeline_submissions_by_level || {};
  const levelKeys = Array.from(new Set([...Object.keys(inv), ...Object.keys(sub)])).sort();
  const funnel = levelKeys.map(k => ({ level: k, inviti: inv[k] || 0, submission: sub[k] || 0 }));

  const optOutPct = data.assessments_completed > 0
    ? Math.round((data.profiling_opt_out / data.assessments_completed) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span>Dati aggregati e pseudonimi — nessuna PII.</span>
          <Badge variant="outline">Opt-out profilazione: {data.profiling_opt_out} ({optOutPct}%)</Badge>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminKpi label="Assessment completati" value={data.assessments_completed} accent="primary" />
        <AdminKpi label="XIMAtar distinti" value={distribution.length} accent="muted" />
        <AdminKpi label="Livelli rilevati" value={levels.length} accent="muted" />
        <AdminKpi label="Opt-out profilazione" value={data.profiling_opt_out} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Distribuzione XIMAtar</CardTitle>
            <CardDescription>Dai profili candidato</CardDescription>
          </CardHeader>
          <CardContent>
            {distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={distribution} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Medie pilastri</CardTitle>
            <CardDescription>5 pilastri XIMA</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={pillarRadar}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="pillar" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Radar name="Media" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Distribuzione livelli XIMAtar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={levels}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Funnel pipeline (L1/L2/L3)</CardTitle>
            <CardDescription>Inviti vs submission per livello</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="inviti" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="submission" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
