import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Star, Target, TrendingUp, Bookmark, BookmarkCheck, Send, CheckCircle2, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { CandidateLevelBadge } from './CandidateLevelBadge';
import { CandidateLevelProgress } from '@/lib/challenges/challengeLevels';
import { formatRoundedScore } from './PillarScoreBar';

export interface XimatarRecommendationExplanation {
  shortReason: string;
  source: 'company_constraint' | 'hiring_goal_match' | 'taxonomy_fallback';
  matchedSkills?: string[];
  matchedKeywords?: string[];
  matchedIndustries?: string[];
  scoreBreakdown?: {
    skills_overlap: number;
    keyword_overlap: number;
    industry_overlap: number;
    seniority_fit: number;
    location_language: number;
    total: number;
  };
}

interface XimatarCandidateCardProps {
  candidateId: string;
  profileId?: string;
  displayName?: string;
  ximatarLabel: string;
  ximatarImage: string;
  ximatarId?: string;
  evaluationScore: number;
  pillarAverage: number;
  pillars: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
  isShortlisted?: boolean;
  isSelected?: boolean;
  showSaveButton?: boolean;
  showDebug?: boolean;
  invitationStatus?: 'none' | 'invited' | 'accepted' | 'declined' | 'loading';
  inviteDisabled?: boolean;
  inviteDisabledReason?: string;
  levelProgress?: CandidateLevelProgress;
  recommendationExplanation?: XimatarRecommendationExplanation;
  onSelect?: (checked: boolean) => void;
  onToggleShortlist?: () => void;
  onInviteToChallenge?: () => void;
}

const getLevelBadge = (score: number) => {
  if (score >= 80) return { label: 'Gold', color: 'from-yellow-500 to-yellow-600' };
  if (score >= 50) return { label: 'Silver', color: 'from-gray-400 to-gray-500' };
  return { label: 'Bronze', color: 'from-orange-600 to-orange-700' };
};

export const XimatarCandidateCard: React.FC<XimatarCandidateCardProps> = ({
  candidateId,
  profileId,
  displayName,
  ximatarLabel,
  ximatarImage,
  ximatarId,
  evaluationScore,
  pillarAverage,
  pillars,
  isShortlisted = false,
  isSelected = false,
  showSaveButton = false,
  showDebug = false,
  invitationStatus = 'none',
  inviteDisabled = false,
  inviteDisabledReason,
  levelProgress,
  recommendationExplanation,
  onSelect,
  onToggleShortlist,
  onInviteToChallenge,
}) => {
  const isDebugMode = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('debug') === '1' || 
     import.meta.env.DEV);
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);
  const level = getLevelBadge(evaluationScore);
  const roundedEvaluationScore = formatRoundedScore(evaluationScore);
  const roundedPillarAverage = formatRoundedScore(pillarAverage);

  // Check if pillars have real data
  const hasPillarData = pillarAverage > 0;

  const chartData = [
    { pillar: 'Computational', score: pillars.computational_power },
    { pillar: 'Communication', score: pillars.communication },
    { pillar: 'Knowledge', score: pillars.knowledge },
    { pillar: 'Creativity', score: pillars.creativity },
    { pillar: 'Drive', score: pillars.drive },
  ];

  return (
    <>
      <Card className="bg-slate-900/70 backdrop-blur-sm border border-white/10 hover:border-primary/40 transition-all shadow-lg">
        <CardContent className="p-6">
          {/* DEV Debug Overlay */}
          {showDebug && process.env.NODE_ENV === 'development' && (
            <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs font-mono space-y-0.5">
              <div className="text-yellow-600">🔧 DEV DEBUG</div>
              <div><span className="text-muted-foreground">profile_id:</span> {profileId || 'N/A'}</div>
              <div><span className="text-muted-foreground">user_id:</span> {candidateId}</div>
              <div><span className="text-muted-foreground">ximatar_id:</span> {ximatarId || 'N/A'}</div>
              <div><span className="text-muted-foreground">save_id:</span> {profileId || candidateId}</div>
            </div>
          )}
          
          <div className="flex items-start justify-between mb-4">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
              />
            )}
            {/* Small star icon for legacy/non-goal view */}
            {onToggleShortlist && !showSaveButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleShortlist}
                className={isShortlisted ? 'text-yellow-500' : 'text-muted-foreground'}
              >
                <Star size={20} fill={isShortlisted ? 'currentColor' : 'none'} />
              </Button>
            )}
          </div>

          <div className="text-center mb-4">
            <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-primary/50">
              <img 
                src={ximatarImage} 
                alt={ximatarLabel} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <Badge className={`bg-gradient-to-r ${level.color} text-white mb-2`}>
              {level.label}
            </Badge>
            <h3 className="text-lg font-bold text-white capitalize">{displayName || ximatarLabel}</h3>
            {displayName && (
              <p className="text-sm text-white/70 capitalize">{ximatarLabel}</p>
            )}
          </div>

          {/* Recommendation Explanation - 1-line reason */}
          {recommendationExplanation && (
            <div className="mb-3">
              <div className="flex items-center justify-center gap-1.5 text-xs text-primary/80">
                <Sparkles className="h-3 w-3" />
                <span>{recommendationExplanation.shortReason}</span>
              </div>
              
              {/* Debug mode: expandable full details */}
              {isDebugMode && (
                <Collapsible className="mt-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show details
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1.5 border border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {recommendationExplanation.source.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {recommendationExplanation.matchedSkills && recommendationExplanation.matchedSkills.length > 0 && (
                      <div className="text-muted-foreground">
                        <span className="text-foreground font-medium">Skills:</span> {recommendationExplanation.matchedSkills.slice(0, 5).join(', ')}
                      </div>
                    )}
                    {recommendationExplanation.matchedIndustries && recommendationExplanation.matchedIndustries.length > 0 && (
                      <div className="text-muted-foreground">
                        <span className="text-foreground font-medium">Industry:</span> {recommendationExplanation.matchedIndustries.join(', ')}
                      </div>
                    )}
                    {recommendationExplanation.scoreBreakdown && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Skills:</span>
                        <span>{recommendationExplanation.scoreBreakdown.skills_overlap.toFixed(0)}</span>
                        <span className="text-muted-foreground">Keywords:</span>
                        <span>{recommendationExplanation.scoreBreakdown.keyword_overlap.toFixed(0)}</span>
                        <span className="text-muted-foreground">Industry:</span>
                        <span>{recommendationExplanation.scoreBreakdown.industry_overlap.toFixed(0)}</span>
                        <span className="text-muted-foreground">Seniority:</span>
                        <span>{recommendationExplanation.scoreBreakdown.seniority_fit.toFixed(0)}</span>
                        <span className="text-muted-foreground font-medium">Total:</span>
                        <span className="font-medium">{recommendationExplanation.scoreBreakdown.total.toFixed(1)}</span>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Level Progress Badge */}
          {levelProgress && (
            <div className="mb-3 flex justify-center">
              <CandidateLevelBadge progress={levelProgress} compact showUncertainty />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">{t('business.candidates.evaluation_score', 'Evaluation Score')}</span>
              <span className="text-sm font-bold text-white">{roundedEvaluationScore}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">{t('business.candidates.pillar_average', 'Pillar Average')}</span>
              <span className="text-sm font-bold text-white">
                {hasPillarData ? roundedPillarAverage : t('business.candidates.not_computed', 'Not computed')}
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, roundedEvaluationScore))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {/* Explicit Save/Saved button for goal-based view */}
            {showSaveButton && onToggleShortlist && (
              <Button
                variant={isShortlisted ? "secondary" : "outline"}
                className={`w-full ${isShortlisted ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30 border-green-500/30' : ''}`}
                onClick={onToggleShortlist}
              >
                {isShortlisted ? (
                  <>
                    <BookmarkCheck className="mr-2" size={16} />
                    {t('business.shortlist.saved_btn')}
                  </>
                ) : (
                  <>
                    <Bookmark className="mr-2" size={16} />
                    {t('business.shortlist.save_btn')}
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDetail(true)}
            >
              <TrendingUp className="mr-2" size={16} />
              View Insights
            </Button>
            {/* Invite button - available for ANY candidate (not just saved) */}
            {onInviteToChallenge && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button
                        className={`w-full ${
                          invitationStatus === 'accepted' 
                            ? 'bg-green-600 hover:bg-green-600 cursor-default' 
                            : invitationStatus === 'invited'
                            ? 'bg-amber-600 hover:bg-amber-600 cursor-default'
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                        onClick={invitationStatus === 'none' && !inviteDisabled ? onInviteToChallenge : undefined}
                        disabled={invitationStatus === 'loading' || invitationStatus !== 'none' || inviteDisabled}
                      >
                        {invitationStatus === 'loading' ? (
                          <>
                            <Loader2 className="mr-2 animate-spin" size={16} />
                            {t('business.shortlist.sending')}
                          </>
                        ) : invitationStatus === 'accepted' ? (
                          <>
                            <CheckCircle2 className="mr-2" size={16} />
                            {t('business.shortlist.accepted')}
                          </>
                        ) : invitationStatus === 'invited' ? (
                          <>
                            <Send className="mr-2" size={16} />
                            {t('business.shortlist.invited')}
                          </>
                        ) : (
                          <>
                            <Target className="mr-2" size={16} />
                            {t('business.shortlist.invite_to_challenge')}
                          </>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {inviteDisabled && inviteDisabledReason && (
                    <TooltipContent>
                      <p>{inviteDisabledReason}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img 
                src={ximatarImage} 
                alt={ximatarLabel} 
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/50"
              />
              <div>
                <div className="capitalize">{ximatarLabel} Profile</div>
                <Badge className={`bg-gradient-to-r ${level.color} text-white mt-1`}>
                  {level.label} Level
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Pillar Breakdown</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="pillar" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {chartData.map((item) => (
                <div key={item.pillar} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.pillar}</span>
                    <span className="font-bold text-foreground">{formatRoundedScore(item.score)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, (formatRoundedScore(item.score) / 10) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <h4 className="text-sm font-semibold mb-2">XIMAtar Summary</h4>
              <p className="text-sm text-muted-foreground">
                This candidate exhibits strong {ximatarLabel} characteristics, 
                with an overall evaluation score of {roundedEvaluationScore} and 
                balanced pillar performance averaging {roundedPillarAverage}.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
