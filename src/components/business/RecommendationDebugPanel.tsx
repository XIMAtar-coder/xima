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
  Sparkles,
  FlaskConical,
  Building2
} from 'lucide-react';
import { useRecommendationDebug, XIMATAR_PROFILES, type XimatarExplanation } from '@/hooks/useRecommendationDebug';
import { runRecommendationTests, type TestResult } from '@/lib/recommendations/__tests__/recommendations.test';
import { type XimatarRecommendation } from '@/lib/recommendations';
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['warnings', 'engine']));
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  
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

  const runTests = () => {
    setTestRunning(true);
    setTimeout(() => {
      const results = runRecommendationTests();
      setTestResults(results);
      setTestRunning(false);
      console.log('[RecommendationDebug] Test results:', results);
    }, 100);
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

  const renderEngineRecommendation = (rec: XimatarRecommendation) => (
    <div 
      key={rec.ximatar_id}
      className={cn(
        "p-3 rounded-lg border bg-card space-y-2",
        rec.source === 'company_constraint' ? "border-green-500/50 bg-green-500/5" :
        rec.source === 'hiring_goal_match' ? "border-blue-500/50 bg-blue-500/5" :
        "border-muted"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src={`/ximatars/${rec.ximatar_id}.png`} 
            alt={rec.ximatar_id}
            className="h-8 w-8 object-contain"
          />
          <div>
            <span className="font-medium capitalize">{rec.ximatar_id}</span>
            <p className="text-xs text-muted-foreground">{rec.profile.title}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant={rec.rank <= 3 ? "default" : "secondary"}>
            #{rec.rank}
          </Badge>
          <div className="text-xs font-mono mt-1">
            score: {rec.score}
          </div>
        </div>
      </div>
      
      {/* Source badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            rec.source === 'company_constraint' ? "bg-green-500/10 text-green-700" :
            rec.source === 'hiring_goal_match' ? "bg-blue-500/10 text-blue-700" :
            "bg-muted"
          )}
        >
          {rec.source === 'company_constraint' ? '🏢 Company Constraint' :
           rec.source === 'hiring_goal_match' ? '🎯 Goal Match' :
           '📊 Taxonomy Fallback'}
        </Badge>
        {rec.seniority_compatible && (
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700">
            ✓ Seniority
          </Badge>
        )}
      </div>
      
      {/* Score breakdown */}
      <div className="space-y-1 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-muted-foreground">Skills (45%)</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${rec.score_breakdown.skills_overlap}%` }} />
          </div>
          <span className="w-8 text-right font-mono">{rec.score_breakdown.skills_overlap}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-muted-foreground">Keywords (25%)</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${rec.score_breakdown.keyword_overlap}%` }} />
          </div>
          <span className="w-8 text-right font-mono">{rec.score_breakdown.keyword_overlap}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-muted-foreground">Industry (15%)</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${rec.score_breakdown.industry_overlap}%` }} />
          </div>
          <span className="w-8 text-right font-mono">{rec.score_breakdown.industry_overlap}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 text-muted-foreground">Seniority (10%)</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-purple-500" style={{ width: `${rec.score_breakdown.seniority_fit}%` }} />
          </div>
          <span className="w-8 text-right font-mono">{rec.score_breakdown.seniority_fit}</span>
        </div>
      </div>
      
      {/* Matched items */}
      {(rec.matched_skills.length > 0 || rec.matched_industries.length > 0) && (
        <div className="text-xs space-y-1">
          {rec.matched_skills.length > 0 && (
            <div>
              <span className="text-muted-foreground">Matched skills: </span>
              {rec.matched_skills.slice(0, 4).map((s, i) => (
                <Badge key={i} variant="secondary" className="mr-1 text-xs">{s}</Badge>
              ))}
              {rec.matched_skills.length > 4 && <span className="text-muted-foreground">+{rec.matched_skills.length - 4}</span>}
            </div>
          )}
          {rec.matched_industries.length > 0 && (
            <div>
              <span className="text-muted-foreground">Matched industries: </span>
              {rec.matched_industries.slice(0, 3).map((s, i) => (
                <Badge key={i} variant="outline" className="mr-1 text-xs">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Explanation */}
      <p className="text-xs text-muted-foreground italic">{rec.explanation}</p>
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
            <Button variant="outline" size="sm" onClick={runTests} disabled={testRunning}>
              <FlaskConical className={cn("h-4 w-4 mr-1", testRunning && "animate-pulse")} />
              Run Tests
            </Button>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
              DEBUG MODE
            </Badge>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Hybrid constraint matching: ≥8 from company profile, ranked by goal similarity
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
        
        {/* Test Results */}
        {testResults && (
          <Collapsible 
            open={expandedSections.has('tests')}
            onOpenChange={() => toggleSection('tests')}
            defaultOpen
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors">
              {expandedSections.has('tests') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <FlaskConical className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-purple-700 dark:text-purple-300">
                Test Results: {testResults.filter(t => t.passed).length}/{testResults.length} passed
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {testResults.map((result, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-2 rounded border text-sm",
                      result.passed ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {result.passed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Strategy: {result.result.strategy_used} | 
                      Company: {result.result.company_constraint_count} | 
                      Goal: {result.result.goal_match_count} | 
                      Fallback: {result.result.fallback_count}
                    </div>
                    <div className="text-xs mt-1">
                      Top 3: {result.result.recommendations.slice(0, 3).map(r => r.ximatar_id).join(', ')}
                    </div>
                    {result.errors.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {result.errors.join('; ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
            
            {/* Engine Strategy Summary */}
            {debugData.engineResult && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Recommendation Engine Result
                  </h4>
                  <Badge variant="default">{debugData.engineResult.strategy_used}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div className="p-2 rounded bg-green-500/10">
                    <div className="text-2xl font-bold text-green-600">{debugData.engineResult.company_constraint_count}</div>
                    <div className="text-xs text-muted-foreground">Company Constraint</div>
                  </div>
                  <div className="p-2 rounded bg-blue-500/10">
                    <div className="text-2xl font-bold text-blue-600">{debugData.engineResult.goal_match_count}</div>
                    <div className="text-xs text-muted-foreground">Goal Match</div>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <div className="text-2xl font-bold text-muted-foreground">{debugData.engineResult.fallback_count}</div>
                    <div className="text-xs text-muted-foreground">Fallback</div>
                  </div>
                </div>
                {debugData.engineResult.debug_info.goal_tokens.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Goal tokens: </span>
                    {debugData.engineResult.debug_info.goal_tokens.slice(0, 10).map((t, i) => (
                      <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">{t}</Badge>
                    ))}
                    {debugData.engineResult.debug_info.goal_tokens.length > 10 && (
                      <span className="text-muted-foreground">+{debugData.engineResult.debug_info.goal_tokens.length - 10}</span>
                    )}
                  </div>
                )}
              </div>
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
                    <Building2 className="h-4 w-4 text-primary" />
                    Company Context
                    <Badge variant="outline" className="text-xs">{debugData.companyContext?.source}</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {debugData.companyContext?.company_name || '—'}</div>
                    <div><span className="text-muted-foreground">Industry:</span> {debugData.companyContext?.industry || '—'}</div>
                    <div><span className="text-muted-foreground">Website:</span> {debugData.companyContext?.website || '—'}</div>
                    <div><span className="text-muted-foreground">Employees:</span> {debugData.companyContext?.employees_count || '—'}</div>
                  </div>
                  
                  {debugData.companyContext?.ideal_ximatar_profile_ids && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Ideal XIMAtar IDs ({debugData.companyContext.ideal_ximatar_profile_ids.length}): </span>
                      {debugData.companyContext.ideal_ximatar_profile_ids.slice(0, 6).map((x, i) => (
                        <Badge key={i} variant="default" className="mr-1 mb-1 text-xs capitalize">{x}</Badge>
                      ))}
                      {debugData.companyContext.ideal_ximatar_profile_ids.length > 6 && (
                        <Badge variant="secondary" className="text-xs">+{debugData.companyContext.ideal_ximatar_profile_ids.length - 6}</Badge>
                      )}
                    </div>
                  )}
                  
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
            
            {/* Engine Recommendations (New) */}
            {debugData.engineResult && (
              <Collapsible 
                open={expandedSections.has('engine')}
                onOpenChange={() => toggleSection('engine')}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  {expandedSections.has('engine') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Engine: All 12 Recommendations</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {debugData.engineResult.recommendations.map(renderEngineRecommendation)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Matching Strategy */}
            <Collapsible 
              open={expandedSections.has('strategy')}
              onOpenChange={() => toggleSection('strategy')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {expandedSections.has('strategy') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Target className="h-4 w-4" />
                <span className="font-medium">Matching Strategy Details</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="p-3 rounded-lg border border-border bg-card text-sm">
                  <div><span className="text-muted-foreground">Algorithm:</span> <code className="bg-muted px-1 rounded">{debugData.matchingStrategy.algorithm}</code></div>
                  <p className="mt-2 text-muted-foreground">{debugData.matchingStrategy.description}</p>
                  <div className="mt-2">
                    <span className="text-muted-foreground">Scoring Weights: </span>
                    {Object.entries(debugData.matchingStrategy.weights).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="mr-1 text-xs">{k}: {(v as number * 100).toFixed(0)}%</Badge>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">Constraints: </span>
                    <Badge variant="outline" className="mr-1 text-xs">
                      Min company: {debugData.matchingStrategy.constraints?.min_company_constraint || 8}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Total: {debugData.matchingStrategy.constraints?.total_recommendations || 12}
                    </Badge>
                  </div>
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
