import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, BarChart3, Users, Activity, Wrench, LineChart, Wallet, Sparkles, Radio, BrainCircuit, TrendingUp } from 'lucide-react';
import OverviewTab from './tabs/OverviewTab';
import InteractionsTab from './tabs/InteractionsTab';
import CandidatesTab from './tabs/CandidatesTab';
import EvolutionTab from './tabs/EvolutionTab';
import SystemTab from './tabs/SystemTab';
import CostsTab from './tabs/CostsTab';
import PocRagTab from './tabs/PocRagTab';
import ActivityTab from './tabs/ActivityTab';
import AIQualityTab from './tabs/AIQualityTab';
import AnalyticsTab from './tabs/AnalyticsTab';

const TABS = [
  { value: 'overview', label: 'Overview', icon: BarChart3 },
  { value: 'activity', label: 'Activity', icon: Radio },
  { value: 'interactions', label: 'Interazioni', icon: LineChart },
  { value: 'candidates', label: 'Candidati', icon: Users },
  { value: 'evolution', label: 'Evoluzione', icon: Activity },
  { value: 'system', label: 'Developer & System', icon: Wrench },
  { value: 'costs', label: 'Costi', icon: Wallet },
  { value: 'ai-quality', label: 'AI & Qualità', icon: BrainCircuit },
  { value: 'analytics', label: 'Analytics', icon: TrendingUp },
  { value: 'poc-rag', label: 'PoC RAG', icon: Sparkles },
] as const;


export default function XimaManager() {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') || 'overview';

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

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="activity"><ActivityTab /></TabsContent>
        <TabsContent value="interactions"><InteractionsTab /></TabsContent>
        <TabsContent value="candidates"><CandidatesTab /></TabsContent>
        <TabsContent value="evolution"><EvolutionTab /></TabsContent>
        <TabsContent value="system"><SystemTab /></TabsContent>
        <TabsContent value="costs"><CostsTab /></TabsContent>
        <TabsContent value="ai-quality"><AIQualityTab /></TabsContent>
        <TabsContent value="poc-rag"><PocRagTab /></TabsContent>
      </Tabs>
    </div>
  );
}
