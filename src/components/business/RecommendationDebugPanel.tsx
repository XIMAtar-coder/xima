import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bug, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Database,
  Target,
  Sparkles
} from 'lucide-react';
import { useRecommendationDebug, XIMATAR_PILLAR_VECTORS, XIMATAR_PROFILES, type XimatarExplanation } from '@/hooks/useRecommendationDebug';
import { cn } from '@/lib/utils';

interface RecommendationDebugPanelProps {
  businessId: string | undefined;
  hiringGoalId: string | null;
}

export const RecommendationDebugPanel: React.FC<RecommendationDebugPanelProps> = ({
  businessId,
  hiringGoalId
}) => {
  const [searchParams] = useSearchParams();
  const isDebugMode = searchParams.get('debug') === '1' || import.meta.env.DEV;
  
  const { debugData, loading, error, refresh } = useRecommendationDebug(businessId, hiringGoalId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['warnings', 'inputs']));
  
  if (!isDebugMode) return null;
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const renderPillarBar = (value: number, label: string, delta?: number) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all" 
          style={{ width: `${value}%` }} 
        />
      </div>
      <span className="w-8 text-right font-mono">{value}</span>
      {delta !== undefined && (
        <span className={cn(
          "w-12 text-right font-mono text-xs",
          delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
  );

  const renderXimatarCard = (explanation: XimatarExplanation) => (
    <div 
      key={explanation.ximatar}
      className="p-3 rounded-lg border border-border bg-card space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src={`/ximatars/${explanation.ximatar}.png`} 
            alt={explanation.ximatar}
            className="h-8 w-8 object-contain"
          />
          <span className="font-medium capitalize">{explanation.ximatar}</span>
          <Badge variant={explanation.rank <= 3 ? "default" : "secondary"}>
            #{explanation.rank}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground font-mono">
          dist: {explanation.distance}
        </span>
      </div>
      
      {/* Match signals */}
      {explanation.match_signals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {explanation.match_signals.map((signal, idx) => (
            <Badge key={idx} variant="outline" className="text-xs bg-green-500/10">
              {signal}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Pillar breakdown */}
      <div className="space-y-1 pt-2 border-t border-border/50">
        {explanation.contribution_breakdown.map(p => (
          <div key={p.pillar} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-muted-foreground truncate capitalize">
              {p.pillar.replace('_', ' ')}
            </span>
            <span className="w-8 text-right font-mono text-muted-foreground">{p.company_value}</span>
            <span className="text-muted-foreground">→</span>
            <span className="w-8 text-right font-mono">{p.template_value}</span>
            <span className={cn(
              "w-10 text-right font-mono text-xs",
              Math.abs(p.delta) < 15 ? "text-green-500" : 
              Math.abs(p.delta) < 30 ? "text-yellow-500" : "text-red-500"
            )}>
              {p.delta > 0 ? '+' : ''}{p.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bug className="h-5 w-5 text-yellow-500" />
            XIMAtar Recommendation Debug
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
              DEBUG MODE
            </Badge>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Shows recommendation pipeline inputs, algorithm, and per-XIMAtar explanations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-700 dark:text-red-300 text-sm">
            Error: {error}
          </div>
        )}
        
        {loading && !debugData && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        
        {debugData && (
          <>
            {/* Mismatch Warnings */}
            {debugData.mismatchWarnings.length > 0 && (
              <Collapsible 
                open={expandedSections.has('warnings')}
                onOpenChange={() => toggleSection('warnings')}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-colors">
                  {expandedSections.has('warnings') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-700 dark:text-orange-300">
                    {debugData.mismatchWarnings.length} Warning(s) Detected
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <ul className="space-y-1 text-sm">
                    {debugData.mismatchWarnings.map((warning, idx) => (
                      <li key={idx} className="p-2 rounded bg-muted/50">{warning}</li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Input Contexts */}
            <Collapsible 
              open={expandedSections.has('inputs')}
              onOpenChange={() => toggleSection('inputs')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {expandedSections.has('inputs') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Database className="h-4 w-4" />
                <span className="font-medium">Recommendation Inputs</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                {/* Company Context */}
                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Company Context
                    <Badge variant="outline" className="text-xs">{debugData.companyContext?.source}</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {debugData.companyContext?.company_name || '—'}</div>
                    <div><span className="text-muted-foreground">Industry:</span> {debugData.companyContext?.industry || '—'}</div>
                    <div><span className="text-muted-foreground">Website:</span> {debugData.companyContext?.website || '—'}</div>
                    <div><span className="text-muted-foreground">Employees:</span> {debugData.companyContext?.employees_count || '—'}</div>
                  </div>
                  
                  {debugData.companyContext?.pillar_vector && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Pillar Vector</h5>
                      <div className="space-y-1">
                        {Object.entries(debugData.companyContext.pillar_vector).map(([k, v]) => 
                          renderPillarBar(v as number, k.replace('_', ' '))
                        )}
                      </div>
                    </div>
                  )}
                  
                  {debugData.companyContext?.values && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Values: </span>
                      {debugData.companyContext.values.map((v, i) => (
                        <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">{v}</Badge>
                      ))}
                    </div>
                  )}
                  
                  {debugData.companyContext?.recommended_ximatars && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Stored Recommendations: </span>
                      {debugData.companyContext.recommended_ximatars.map((x, i) => (
                        <Badge key={i} variant="default" className="mr-1 mb-1 text-xs capitalize">{x}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Hiring Goal Context */}
                {debugData.hiringGoalContext && (
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Hiring Goal Context
                      <Badge variant="outline" className="text-xs">{debugData.hiringGoalContext.source}</Badge>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Role:</span> {debugData.hiringGoalContext.role_title || '—'}</div>
                      <div><span className="text-muted-foreground">Function:</span> {debugData.hiringGoalContext.function_area || '—'}</div>
                      <div><span className="text-muted-foreground">Level:</span> {debugData.hiringGoalContext.experience_level || '—'}</div>
                      <div><span className="text-muted-foreground">Model:</span> {debugData.hiringGoalContext.work_model || '—'}</div>
                      <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {debugData.hiringGoalContext.city_region || ''} {debugData.hiringGoalContext.country || '—'}</div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
            
            {/* Matching Strategy */}
            <Collapsible 
              open={expandedSections.has('strategy')}
              onOpenChange={() => toggleSection('strategy')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {expandedSections.has('strategy') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Target className="h-4 w-4" />
                <span className="font-medium">Matching Strategy</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="p-3 rounded-lg border border-border bg-card text-sm">
                  <div><span className="text-muted-foreground">Algorithm:</span> <code className="bg-muted px-1 rounded">{debugData.matchingStrategy.algorithm}</code></div>
                  <p className="mt-2 text-muted-foreground">{debugData.matchingStrategy.description}</p>
                  <div className="mt-2">
                    <span className="text-muted-foreground">Pillar Weights: </span>
                    {Object.entries(debugData.matchingStrategy.weights).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="mr-1 text-xs">{k}: {v}</Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Top Recommendations */}
            <Collapsible 
              open={expandedSections.has('top3')}
              onOpenChange={() => toggleSection('top3')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {expandedSections.has('top3') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Top 3 Recommended XIMAtars</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid gap-3 md:grid-cols-3">
                  {debugData.recommendedXimatars.map(renderXimatarCard)}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Full Ranking */}
            <Collapsible 
              open={expandedSections.has('all')}
              onOpenChange={() => toggleSection('all')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {expandedSections.has('all') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Database className="h-4 w-4" />
                <span className="font-medium">All 12 XIMAtars Ranked</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {debugData.allXimatarsRanked.map(renderXimatarCard)}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Timestamp */}
            <div className="text-xs text-muted-foreground text-right">
              Generated: {new Date(debugData.timestamp).toLocaleString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
