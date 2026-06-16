import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, FileCheck2, Swords, Sparkles, Gauge } from 'lucide-react';
import { useAdminOverview } from '../hooks/useAdminRpc';
import { AdminKpi } from '../AdminKpi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function OverviewTab() {
  const { data, isLoading, error } = useAdminOverview();

  if (isLoading) return <div className="text-muted-foreground text-sm">Caricamento overview…</div>;
  if (error || !data) return <div className="text-destructive text-sm">Errore caricamento overview.</div>;

  const plansByTier = Object.entries(data.plans_by_tier || {}).map(([name, value]) => ({ name, value }));
  const membershipByTier = Object.entries(data.candidate_membership_by_tier || {}).map(([name, value]) => ({ name, value }));
  const aiByModel = Object.entries(data.ai_by_model || {}).map(([name, value]) => ({ name, value }));
  const aiByStatus = Object.entries(data.ai_by_status || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPI hero */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <AdminKpi label="Candidati" value={data.candidates_total} sub={`+${data.signups_7d} ultimi 7g`} icon={Users} />
        <AdminKpi label="Aziende" value={data.businesses_total} sub={`${data.businesses_with_plan} con piano`} icon={Building2} accent="muted" />
        <AdminKpi label="Assessment" value={data.assessments_completed} sub="completati" icon={FileCheck2} accent="success" />
        <AdminKpi label="Challenge attive" value={data.challenges_active} sub={`${data.challenges_total} totali`} icon={Swords} accent="muted" />
        <AdminKpi label="Avg score" value={Math.round(data.avg_score || 0)} sub="su 5 pilastri" icon={Gauge} accent="muted" />
        <AdminKpi label="Signup 30g" value={data.signups_30d} sub={`pending: ${data.candidates_pending}`} icon={Sparkles} accent="muted" />
      </div>

      {/* Business model */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 size={18} /> Business model</CardTitle>
          <CardDescription>Piani business, membership candidati, segnale upsell</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Aziende con piano</span>
              <span className="text-2xl font-bold text-emerald-500">{data.businesses_with_plan}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Senza piano (upsell)</span>
              <span className="text-2xl font-bold text-amber-500">{data.businesses_without_plan}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Piani business per tier</h4>
            {plansByTier.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessun piano attivo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={plansByTier}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {plansByTier.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Membership candidati per tier</h4>
            {membershipByTier.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessuna membership.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={membershipByTier}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {membershipByTier.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI usage */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles size={18} /> Uso AI</CardTitle>
          <CardDescription>Invocazioni, modelli, esito, latenza</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminKpi label="Invocazioni totali" value={data.ai_invocations_total} accent="muted" />
            <AdminKpi label="Ultimi 7g" value={data.ai_invocations_7d} accent="primary" />
            <AdminKpi label="Latenza media" value={`${Math.round(data.ai_avg_latency_ms || 0)} ms`} accent="muted" />
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="text-xs">Costo AI — non tracciato (placeholder)</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Per modello</h4>
              {aiByModel.length === 0 ? <p className="text-xs text-muted-foreground">Nessuna invocazione.</p> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={aiByModel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Per esito</h4>
              {aiByStatus.length === 0 ? <p className="text-xs text-muted-foreground">Nessuna invocazione.</p> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={aiByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {aiByStatus.map((s, i) => (
                        <Cell key={i} fill={s.name === 'success' ? '#10b981' : s.name === 'error' ? 'hsl(var(--destructive))' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline strip */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminKpi label="Inviti totali" value={data.invitations_total} accent="muted" />
          <AdminKpi label="Submission totali" value={data.submissions_total} accent="muted" />
          <AdminKpi label="Challenge totali" value={data.challenges_total} accent="muted" />
          <AdminKpi label="Challenge attive" value={data.challenges_active} accent="primary" />
        </CardContent>
      </Card>
    </div>
  );
}
