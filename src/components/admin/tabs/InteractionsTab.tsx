import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdminInteractions } from '../hooks/useAdminRpc';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { AdminKpi } from '../AdminKpi';

const ACTOR_COLORS: Record<string, string> = {
  candidate: 'hsl(var(--primary))',
  business: '#10b981',
  system: '#f59e0b',
  mentor: '#8b5cf6',
};

export default function InteractionsTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAdminInteractions(days);

  if (isLoading) return <div className="text-muted-foreground text-sm">Caricamento interazioni…</div>;
  if (error || !data) return <div className="text-destructive text-sm">Errore caricamento.</div>;

  const byActor = Object.entries(data.by_actor || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          <AdminKpi label="Eventi totali" value={data.total_events} sub={`finestra ${data.window_days}g`} accent="primary" />
          {byActor.slice(0, 3).map(a => (
            <AdminKpi key={a.name} label={a.name} value={a.value} accent="muted" />
          ))}
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 giorni</SelectItem>
            <SelectItem value="30">30 giorni</SelectItem>
            <SelectItem value="90">90 giorni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Eventi per giorno</CardTitle>
          <CardDescription>Serie temporale interazioni</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.by_day || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Line type="monotone" dataKey="n" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Per attore</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byActor}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byActor.map((a, i) => <Cell key={i} fill={ACTOR_COLORS[a.name] || 'hsl(var(--primary))'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Top azioni</CardTitle>
            <CardDescription>Funnel: signup → recommended → challenge → submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">Azione</th>
                    <th className="text-left py-2 px-2 font-medium">Attore</th>
                    <th className="text-right py-2 px-2 font-medium">N</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.by_action || []).map((row, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-2 px-2 font-mono text-xs">{row.action}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs" style={{ borderColor: ACTOR_COLORS[row.actor_type] }}>
                          {row.actor_type}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right font-semibold">{row.n}</td>
                    </tr>
                  ))}
                  {(data.by_action || []).length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted-foreground py-6">Nessun evento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
