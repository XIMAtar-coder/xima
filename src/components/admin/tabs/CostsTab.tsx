import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Info, Wallet, Zap, AlertTriangle, DollarSign } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

type Category = 'ai' | 'hosting_site' | 'database' | 'development' | 'other';
type Recurrence = 'monthly' | 'one_off';

type CostRow = {
  id: string;
  category: Category;
  label: string;
  amount: number;
  currency: string;
  recurrence: Recurrence;
  incurred_on: string;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type CostsSummary = {
  currency: string;
  monthly_total: number;
  monthly_by_category: Record<string, number>;
  oneoff_total_12m: number;
  oneoff_by_category_12m: Record<string, number>;
  entries_count: number;
  ai_invocations_30d: number;
};

const CATEGORY_LABELS: Record<Category, string> = {
  ai: 'AI',
  hosting_site: 'Sito',
  database: 'Database',
  development: 'Sviluppo',
  other: 'Altro',
};

const CATEGORY_COLORS: Record<Category, string> = {
  ai: 'hsl(var(--primary))',
  hosting_site: 'hsl(217 91% 60%)',
  database: 'hsl(142 71% 45%)',
  development: 'hsl(38 92% 50%)',
  other: 'hsl(var(--muted-foreground))',
};

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);


function useCostsSummary() {
  return useQuery({
    queryKey: ['admin', 'costs-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_costs_summary');
      if (error) throw error;
      return data as unknown as CostsSummary;
    },
    refetchInterval: 60_000,
  });
}

type AiCostsSummary = {
  last30d_usd: number;
  mtd_usd: number;
  by_function: Array<{ function_name: string; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }>;
  by_model: Array<{ provider: string; model_name: string; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }>;
  unpriced_models: Array<{ provider: string; model_name: string }>;
  missing_usage_pct: number;
  total_calls_30d: number;
  missing_calls_30d: number;
};

function useAiCostsSummary() {
  return useQuery({
    queryKey: ['admin', 'ai-costs-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_ai_costs_summary');
      if (error) throw error;
      return data as unknown as AiCostsSummary;
    },
    refetchInterval: 60_000,
  });
}

function useCostsList() {
  return useQuery({
    queryKey: ['admin', 'costs-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_costs');
      if (error) throw error;
      return (data as unknown as CostRow[]) ?? [];
    },
  });
}

type FormState = {
  id?: string;
  category: Category;
  label: string;
  amount: string;
  currency: string;
  recurrence: Recurrence;
  incurred_on: string;
  active: boolean;
  notes: string;
};

const EMPTY: FormState = {
  category: 'ai',
  label: '',
  amount: '',
  currency: 'EUR',
  recurrence: 'monthly',
  incurred_on: new Date().toISOString().slice(0, 10),
  active: true,
  notes: '',
};

function CostFormDialog({
  trigger, initial, onDone,
}: { trigger: React.ReactNode; initial?: CostRow; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          id: initial.id,
          category: initial.category,
          label: initial.label,
          amount: String(initial.amount),
          currency: initial.currency,
          recurrence: initial.recurrence,
          incurred_on: initial.incurred_on,
          active: initial.active,
          notes: initial.notes ?? '',
        }
      : EMPTY
  );

  const save = async () => {
    if (!form.label.trim() || !form.amount || isNaN(Number(form.amount))) {
      toast({ title: 'Dati mancanti', description: 'Inserisci etichetta e importo validi', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      category: form.category,
      label: form.label.trim(),
      amount: Number(form.amount),
      currency: form.currency.trim().toUpperCase() || 'EUR',
      recurrence: form.recurrence,
      incurred_on: form.incurred_on,
      active: form.active,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = form.id
      ? await supabase.from('platform_costs').update(payload).eq('id', form.id)
      : await supabase.from('platform_costs').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'OK', description: form.id ? 'Voce aggiornata' : 'Voce creata' });
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Modifica voce di costo' : 'Aggiungi voce di costo'}</DialogTitle>
          <DialogDescription>Solo gli admin possono creare/modificare voci.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Etichetta</Label>
            <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Es. Anthropic API – fattura giugno" />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as Category }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ricorrenza</Label>
            <Select value={form.recurrence} onValueChange={(v) => setForm(f => ({ ...f, recurrence: v as Recurrence }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensile</SelectItem>
                <SelectItem value="one_off">Una-tantum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Importo</Label>
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>

          <div>
            <Label>Valuta</Label>
            <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
          </div>

          <div>
            <Label>Data</Label>
            <Input type="date" value={form.incurred_on} onChange={e => setForm(f => ({ ...f, incurred_on: e.target.value }))} />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} />
              <Label>Attiva</Label>
            </div>
          </div>

          <div className="col-span-2">
            <Label>Note</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CostsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const summary = useCostsSummary();
  const aiCosts = useAiCostsSummary();
  const list = useCostsList();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'costs-summary'] });
    qc.invalidateQueries({ queryKey: ['admin', 'costs-list'] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('platform_costs').delete().eq('id', id);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'OK', description: 'Voce eliminata' });
    refresh();
  };

  const s = summary.data;
  const monthlyByCat = s
    ? (Object.keys(CATEGORY_LABELS) as Category[]).map(c => ({
        category: c, label: CATEGORY_LABELS[c],
        value: Number(s.monthly_by_category?.[c] ?? 0),
      }))
    : [];
  const oneoffByCat = s
    ? (Object.keys(CATEGORY_LABELS) as Category[]).map(c => ({
        category: c, label: CATEGORY_LABELS[c],
        value: Number(s.oneoff_by_category_12m?.[c] ?? 0),
      }))
    : [];

  const aiMonthly = Number(s?.monthly_by_category?.ai ?? 0);
  const aiInv30d = Number(s?.ai_invocations_30d ?? 0);
  const costPer1k = aiMonthly > 0 && aiInv30d > 0 ? (aiMonthly / aiInv30d) * 1000 : null;

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Burn mensile totale</CardDescription>
            <CardTitle className="text-3xl">{fmtEUR(Number(s?.monthly_total ?? 0))}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{s?.entries_count ?? 0} voci registrate</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Una-tantum (ultimi 12 mesi)</CardDescription>
            <CardTitle className="text-3xl">{fmtEUR(Number(s?.oneoff_total_12m ?? 0))}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Spese non ricorrenti negli ultimi 12 mesi</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> AI invocations (30g)</CardDescription>
            <CardTitle className="text-3xl">{aiInv30d.toLocaleString('it-IT')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {costPer1k != null
                ? <>≈ <strong>{fmtEUR(costPer1k)}</strong> per 1k invocazioni (stima da voce AI mensile)</>
                : 'Inserisci una voce AI mensile per stimare il €/1k invocazioni'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI cost note */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 flex gap-3 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p className="text-foreground/90">
            Il <strong>costo AI</strong> va inserito come voce manuale (categoria <em>AI</em>, es. fattura mensile Anthropic).
            I token non sono tracciati, quindi <strong>non è auto-calcolato</strong>. Token-accurate billing è un follow-up
            (colonne token su <code>ai_invocation_log</code> + tabella prezzi per modello).
          </p>
        </CardContent>
      </Card>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Burn mensile per categoria</CardTitle>
            <CardDescription>Solo voci ricorrenti attive</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={monthlyByCat.filter(d => d.value > 0)} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {monthlyByCat.map((d) => <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} />)}
                  </Pie>
                  <Legend />
                  <RTooltip formatter={(v: number) => fmtEUR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Una-tantum 12m per categoria</CardTitle>
            <CardDescription>Spese non ricorrenti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oneoffByCat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip formatter={(v: number) => fmtEUR(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {oneoffByCat.map((d) => <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Voci di costo</CardTitle>
            <CardDescription>Gestione manuale delle spese di piattaforma</CardDescription>
          </div>
          <CostFormDialog
            onDone={refresh}
            trigger={<Button size="sm"><Plus className="h-4 w-4 mr-2" /> Aggiungi</Button>}
          />
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          ) : !list.data || list.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna voce di costo. Aggiungi la prima per iniziare a tracciare il burn.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Etichetta</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Ricorrenza</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: CATEGORY_COLORS[row.category], color: CATEGORY_COLORS[row.category] }}>
                          {CATEGORY_LABELS[row.category] ?? row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {new Intl.NumberFormat('it-IT', { style: 'currency', currency: row.currency || 'EUR' }).format(Number(row.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.recurrence === 'monthly' ? 'default' : 'secondary'}>
                          {row.recurrence === 'monthly' ? 'Mensile' : 'Una-tantum'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.incurred_on}</TableCell>
                      <TableCell>
                        {row.active
                          ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" variant="outline">Attiva</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Disattivata</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {row.notes
                          ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="text-sm text-muted-foreground truncate text-left">{row.notes}</TooltipTrigger>
                                <TooltipContent className="max-w-sm">{row.notes}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <CostFormDialog
                            initial={row}
                            onDone={refresh}
                            trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare la voce?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{row.label}" — {fmtEUR(Number(row.amount))}. Azione irreversibile.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(row.id)} className="bg-destructive hover:bg-destructive/90">
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
