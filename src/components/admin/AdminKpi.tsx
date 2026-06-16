import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'muted';
}

const accentMap = {
  primary: 'text-primary',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  muted: 'text-foreground',
};

export function AdminKpi({ label, value, sub, icon: Icon, accent = 'primary' }: Props) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn('text-3xl font-bold mt-1', accentMap[accent])}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          {Icon && <Icon className="text-muted-foreground" size={20} />}
        </div>
      </CardContent>
    </Card>
  );
}
