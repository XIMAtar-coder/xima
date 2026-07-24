import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, BarChart3, Users, Activity, Wrench, LineChart, Wallet, Radio, BrainCircuit, TrendingUp, Inbox, ScrollText, ShieldCheck, ImageIcon } from 'lucide-react';
import TabSkeleton from '@/components/ui/TabSkeleton';
import ChunkErrorBoundary from '@/components/ui/ChunkErrorBoundary';

const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const ActivityTab = lazy(() => import('./tabs/ActivityTab'));
const InteractionsTab = lazy(() => import('./tabs/InteractionsTab'));
const CandidatesTab = lazy(() => import('./tabs/CandidatesTab'));
const EvolutionTab = lazy(() => import('./tabs/EvolutionTab'));
const SystemTab = lazy(() => import('./tabs/SystemTab'));
const CostsTab = lazy(() => import('./tabs/CostsTab'));
const AIQualityTab = lazy(() => import('./tabs/AIQualityTab'));
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab'));
const RequestsTab = lazy(() => import('./tabs/RequestsTab'));
const AuditTab = lazy(() => import('./tabs/AuditTab'));
const RolesTab = lazy(() => import('./tabs/RolesTab'));
const MediaTab = lazy(() => import('./tabs/MediaTab'));


const TABS = [
  { value: 'overview', label: 'Overview', icon: BarChart3, Component: OverviewTab },
  { value: 'activity', label: 'Activity', icon: Radio, Component: ActivityTab },
  { value: 'interactions', label: 'Interazioni', icon: LineChart, Component: InteractionsTab },
  { value: 'candidates', label: 'Candidati', icon: Users, Component: CandidatesTab },
  { value: 'evolution', label: 'Evoluzione', icon: Activity, Component: EvolutionTab },
  { value: 'system', label: 'Developer & System', icon: Wrench, Component: SystemTab },
  { value: 'costs', label: 'Costi', icon: Wallet, Component: CostsTab },
  { value: 'ai-quality', label: 'AI & Qualità', icon: BrainCircuit, Component: AIQualityTab },
  { value: 'analytics', label: 'Analytics', icon: TrendingUp, Component: AnalyticsTab },
  { value: 'requests', label: 'Richieste', icon: Inbox, Component: RequestsTab },
  { value: 'audit', label: 'Audit', icon: ScrollText, Component: AuditTab },
  { value: 'roles', label: 'Roles', icon: ShieldCheck, Component: RolesTab },
  { value: 'media', label: 'Media', icon: ImageIcon, Component: MediaTab },
] as const;


export default function XimaManager() {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') || 'overview';
  const ActiveTab = TABS.find(t => t.value === active)?.Component ?? OverviewTab;

  return (
    <div className="container max-w-7xl mx-auto pt-6 pb-12 px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="text-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">XIMA Manager</h1>
            <p className="text-sm text-muted-foreground">Overview, interazioni, candidati, evoluzione e strumenti di sistema</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </Badge>
      </div>

      <Tabs value={active} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 mb-6 flex-wrap">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <t.icon className="h-4 w-4" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Mount only the active tab — each tab chunk is loaded on demand */}
        <TabsContent value={active} forceMount>
          <ChunkErrorBoundary>
            <Suspense fallback={<TabSkeleton />}>
              <ActiveTab />
            </Suspense>
          </ChunkErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
