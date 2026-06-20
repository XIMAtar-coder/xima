import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, ShieldCheck, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'user' | 'business' | 'operator';
const ALL_ROLES: AppRole[] = ['admin', 'user', 'business', 'operator'];

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

interface ListResp {
  users: UserRow[];
  page: number;
  page_size: number;
  has_more: boolean;
  admin_count: number;
  current_admin_id: string;
}

const ROLE_VARIANT: Record<AppRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  business: 'default',
  operator: 'secondary',
  user: 'outline',
};

const PAGE_SIZE = 25;

export default function RolesTab() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [grantTarget, setGrantTarget] = useState<UserRow | null>(null);
  const [grantRole, setGrantRole] = useState<AppRole>('user');
  const [revokeTarget, setRevokeTarget] = useState<{ user: UserRow; role: AppRole } | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, refetch, isFetching } = useQuery<ListResp>({
    queryKey: ['admin-roles-list', search, page],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-roles-list', {
        body: { search, page, page_size: PAGE_SIZE },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(JSON.stringify((data as any).error));
      return data as ListResp;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { target_user_id: string; role: AppRole; op: 'grant' | 'revoke' }) => {
      const { data, error } = await supabase.functions.invoke('admin-roles-update', { body: payload });
      if (error) throw error;
      if ((data as any)?.error) {
        const err: any = (data as any);
        const code = err.error;
        if (code === 'LAST_ADMIN') throw new Error("Impossibile rimuovere l'ultimo admin del sistema.");
        if (code === 'SELF_LOCKOUT') throw new Error('Non puoi rimuovere il tuo ultimo ruolo admin.');
        if (code === 'LOCKOUT_DETECTED') throw new Error('Errore critico: lockout rilevato. Operazione annullata.');
        throw new Error(typeof code === 'string' ? code : JSON.stringify(err));
      }
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.op === 'grant' ? 'Ruolo assegnato' : 'Ruolo rimosso');
      qc.invalidateQueries({ queryKey: ['admin-roles-list'] });
    },
    onError: (e: any) => toast.error(e.message || 'Errore'),
  });

  const adminCount = data?.admin_count ?? 0;
  const currentAdminId = data?.current_admin_id;

  const availableRolesForGrant = useMemo(() => {
    if (!grantTarget) return ALL_ROLES;
    return ALL_ROLES.filter(r => !grantTarget.roles.includes(r));
  }, [grantTarget]);

  useEffect(() => {
    if (grantTarget && availableRolesForGrant.length > 0 && !availableRolesForGrant.includes(grantRole)) {
      setGrantRole(availableRolesForGrant[0]);
    }
  }, [grantTarget, availableRolesForGrant, grantRole]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Gestione Ruoli
          </CardTitle>
          <CardDescription>
            Admin-only. Assegna o revoca ruoli ({ALL_ROLES.join(', ')}). L'ultimo admin non è rimovibile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Cerca per email o nome…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              Admin totali: <span className="font-semibold text-foreground">{adminCount}</span>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ruoli</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead className="w-32 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Caricamento…</TableCell></TableRow>
                )}
                {!isLoading && (data?.users.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nessun utente</TableCell></TableRow>
                )}
                {data?.users.map((u) => {
                  const isSelf = u.user_id === currentAdminId;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-mono text-xs">
                        {u.email || '—'}
                        {isSelf && <Badge variant="outline" className="ml-2">tu</Badge>}
                      </TableCell>
                      <TableCell>{u.full_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 && <span className="text-xs text-muted-foreground">nessuno</span>}
                          {u.roles.map((r) => {
                            const isLastAdminChip = r === 'admin' && adminCount <= 1;
                            return (
                              <Badge key={r} variant={ROLE_VARIANT[r]} className="gap-1 pr-1">
                                {r}
                                <button
                                  type="button"
                                  className="ml-1 rounded hover:bg-background/30 disabled:opacity-30 disabled:cursor-not-allowed"
                                  disabled={isLastAdminChip || updateMutation.isPending}
                                  onClick={() => setRevokeTarget({ user: u, role: r })}
                                  title={isLastAdminChip ? "Ultimo admin: non rimovibile" : "Rimuovi ruolo"}
                                  aria-label={`Rimuovi ruolo ${r}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={u.roles.length >= ALL_ROLES.length || updateMutation.isPending}
                          onClick={() => setGrantTarget(u)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Ruolo
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Pagina {page + 1}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={!data?.has_more} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant dialog */}
      <AlertDialog open={!!grantTarget} onOpenChange={(o) => !o && setGrantTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assegna ruolo</AlertDialogTitle>
            <AlertDialogDescription>
              Aggiungi un ruolo a <span className="font-mono">{grantTarget?.email}</span>.
              {grantRole === 'admin' && (
                <span className="block mt-2 text-destructive font-medium">
                  Attenzione: stai concedendo privilegi di amministratore.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={grantRole} onValueChange={(v) => setGrantRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableRolesForGrant.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateMutation.isPending || availableRolesForGrant.length === 0}
              onClick={() => {
                if (!grantTarget) return;
                updateMutation.mutate(
                  { target_user_id: grantTarget.user_id, role: grantRole, op: 'grant' },
                  { onSettled: () => setGrantTarget(null) },
                );
              }}
            >
              Assegna
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi ruolo</AlertDialogTitle>
            <AlertDialogDescription>
              Rimuovere il ruolo <span className="font-semibold">{revokeTarget?.role}</span> da{' '}
              <span className="font-mono">{revokeTarget?.user.email}</span>?
              {revokeTarget?.role === 'admin' && (
                <span className="block mt-2 text-destructive font-medium">
                  Attenzione: rimozione privilegi admin.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!revokeTarget) return;
                updateMutation.mutate(
                  { target_user_id: revokeTarget.user.user_id, role: revokeTarget.role, op: 'revoke' },
                  { onSettled: () => setRevokeTarget(null) },
                );
              }}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
