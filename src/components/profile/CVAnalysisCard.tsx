import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  FileText,
  TrendingUp,
  Sparkles,
  Upload,
  Loader2,
  AlertCircle,
  Target,
  Wrench,
  Briefcase,
  MessageSquareQuote,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';

interface CvTensionGap {
  pillar: string;
  ximatar_score: number;
  cv_score: number;
  gap_direction: 'undersold' | 'oversold' | string;
  narrative: string;
}

interface CvTechnicalImprovement {
  category: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low' | string;
}

interface CvIdentityImprovement {
  target_pillar: string;
  recommendation: string;
  example_before?: string | null;
  example_after?: string | null;
}

interface CVAnalysisCardProps {
  cvAnalysis: {
    summary?: string | null;
    strengths?: string[] | null;
    soft_skills?: string[] | null;
    alignmentScore?: number | null;
    tensionNarrative?: string | null;
    tensionGaps?: CvTensionGap[] | null;
    technicalImprovements?: CvTechnicalImprovement[] | null;
    identityImprovements?: CvIdentityImprovement[] | null;
    roleFit?: {
      cvQualifiedRoles: string[];
      archetypeAlignedRoles: string[];
      growthBridgeRoles: string[];
    } | null;
    mentorHook?: {
      suggestedFocus?: string | null;
      keyQuestion?: string | null;
    } | null;
    cvArchetype?: {
      primary?: string | null;
      secondary?: string | null;
    } | null;
    cv_comments?: {
      summary?: string;
      computational_power?: string;
      communication?: string;
      knowledge?: string;
      creativity?: string;
      drive?: string;
    } | null;
  } | null;
  cvPillarScores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
  assessmentPillarScores: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  } | null;
  onUploadSuccess?: () => void;
}

export const CVAnalysisCard: React.FC<CVAnalysisCardProps> = ({
  cvAnalysis,
  cvPillarScores,
  assessmentPillarScores,
  onUploadSuccess,
}) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const waitForCvAnalysisPersistence = async (startedAt: string) => {
    if (!user?.id) return false;

    const startedAtMs = new Date(startedAt).getTime();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const { data, error } = await supabase
        .from('profiles')
        .select('updated_at, cv_scores, cv_comments')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data?.updated_at) continue;

      const updatedAtMs = new Date(data.updated_at).getTime();
      const cvScores = data.cv_scores as Record<string, unknown> | null;
      const hasCvScores = !!cvScores && Object.keys(cvScores).length > 0;
      const hasCvSummary = !!(data.cv_comments as { summary?: string } | null)?.summary;

      if (updatedAtMs >= startedAtMs && (hasCvScores || hasCvSummary)) {
        return true;
      }
    }

    return false;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PDF or DOCX file');
      toast.error('Invalid file type. Please upload a PDF or DOCX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const analysisStartedAt = new Date().toISOString();

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session. Please log in again.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iyckvvnecpnldrxqmzta.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-cv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json().catch(() => null);
      if (!data?.success) {
        throw new Error(data?.error || 'CV analysis failed');
      }

      toast.success('CV analyzed successfully! Your profile has been updated.');
      setUploadError(null);
      onUploadSuccess?.();
    } catch (error: any) {
      console.error('CV upload error:', error);
      const errorMsg = error?.message || 'Failed to analyze CV';
      const looksLikeBrowserTimeout = errorMsg.includes('Load failed') || errorMsg.includes('Failed to fetch');

      if (looksLikeBrowserTimeout) {
        const persisted = await waitForCvAnalysisPersistence(analysisStartedAt);

        if (persisted) {
          toast.success('CV analyzed successfully! Your profile has been updated.');
          setUploadError(null);
          onUploadSuccess?.();
          return;
        }
      }

      if (errorMsg.includes('Authentication') || errorMsg.includes('log in') || errorMsg.includes('session')) {
        setUploadError('Authentication required. Please refresh the page and try again.');
        toast.error('Please log in again to upload your CV');
      } else if (errorMsg.includes('RLS') || errorMsg.includes('policy')) {
        setUploadError('Permission denied. Please ensure you are logged in.');
        toast.error('Permission denied. Please refresh and try again.');
      } else {
        setUploadError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pillarsToCompare = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'] as const;

  let overallDelta = 0;
  let biggestImprovement = { pillar: '', diff: 0 };
  if (cvPillarScores && assessmentPillarScores) {
    pillarsToCompare.forEach((pillar) => {
      const cvScore = (cvPillarScores[pillar] || 0) / 10;
      const assessmentScore = assessmentPillarScores[pillar] || 0;
      const diff = assessmentScore - cvScore;
      overallDelta += diff;
      if (Math.abs(diff) > Math.abs(biggestImprovement.diff)) {
        biggestImprovement = { pillar, diff };
      }
    });
  }

  const summaryText = cvAnalysis?.tensionNarrative || cvAnalysis?.summary;
  const pillarComments = cvAnalysis?.cv_comments || null;

  const renderRoleChips = (items: string[] | undefined, variant: 'secondary' | 'outline' = 'outline') => {
    if (!items?.length) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <Badge key={`${item}-${idx}`} variant={variant}>
            {item}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <div>
              <CardTitle className="font-heading">
                {t('dashboard.cv_analysis_title', 'CV Analysis')}
              </CardTitle>
              {cvPillarScores && assessmentPillarScores && (
                <p className={`text-sm mt-1 ${
                  overallDelta > 0 ? 'text-primary' : overallDelta < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {t('dashboard.cv_score_alignment', 'Score Alignment')}: {overallDelta > 0 ? '+' : ''}{overallDelta.toFixed(1)} overall
                </p>
              )}
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              variant={cvAnalysis ? 'outline' : 'default'}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('dashboard.cv_analyzing', 'Analyzing...')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {cvAnalysis ? t('dashboard.cv_reupload', 'Re-upload CV') : t('dashboard.cv_upload', 'Upload CV')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {uploadError && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-medium">Upload Error</p>
              <p className="text-sm text-destructive">{uploadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {!cvAnalysis && !isUploading && !uploadError && (
          <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">
              Upload your CV to compare your documented skills with your assessment results
            </p>
            <Button onClick={() => fileInputRef.current?.click()} variant="default">
              <Upload className="w-4 h-4 mr-2" />
              Upload CV
            </Button>
          </div>
        )}

        {typeof cvAnalysis?.alignmentScore === 'number' && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              Alignment score: {cvAnalysis.alignmentScore.toFixed(0)}/100
            </Badge>
            {cvAnalysis.cvArchetype?.primary && (
              <Badge variant="outline">
                CV archetype: {cvAnalysis.cvArchetype.primary}
              </Badge>
            )}
            {cvAnalysis.cvArchetype?.secondary && (
              <Badge variant="outline">
                Secondary: {cvAnalysis.cvArchetype.secondary}
              </Badge>
            )}
          </div>
        )}

        {summaryText && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground leading-relaxed">{summaryText}</p>
          </div>
        )}

        {cvAnalysis?.strengths && cvAnalysis.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('profile.cv_strengths', 'Key Strengths from CV')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {cvAnalysis.strengths.map((strength, idx) => (
                <Badge key={idx} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {cvAnalysis?.soft_skills && cvAnalysis.soft_skills.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">
              {t('profile.soft_skills', 'Soft Skills Identified')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {cvAnalysis.soft_skills.map((skill, idx) => (
                <Badge key={idx} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {cvAnalysis?.tensionGaps && cvAnalysis.tensionGaps.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Tension Map
            </h4>
            <div className="space-y-3">
              {cvAnalysis.tensionGaps.map((gap, idx) => (
                <div key={`${gap.pillar}-${idx}`} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {t(`pillars.${gap.pillar}.name`, gap.pillar.replace(/_/g, ' '))}
                    </span>
                    <Badge
                      variant="outline"
                      className={gap.gap_direction === 'undersold'
                        ? 'border-primary/20 bg-primary/5 text-primary'
                        : 'border-destructive/20 bg-destructive/5 text-destructive'}
                    >
                      {gap.gap_direction}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      CV {Number(gap.cv_score || 0).toFixed(1)} → Assessment {Number(gap.ximatar_score || 0).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{gap.narrative}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {cvAnalysis?.identityImprovements && cvAnalysis.identityImprovements.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Identity-aligned suggestions
            </h4>
            <div className="space-y-3">
              {cvAnalysis.identityImprovements.map((item, idx) => (
                <div key={`${item.target_pillar}-${idx}`} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      {t(`pillars.${item.target_pillar}.name`, item.target_pillar.replace(/_/g, ' '))}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{item.recommendation}</p>
                  {item.example_before && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Before:</span> {item.example_before}
                    </p>
                  )}
                  {item.example_after && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">After:</span> {item.example_after}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {cvAnalysis?.technicalImprovements && cvAnalysis.technicalImprovements.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Technical CV fixes
            </h4>
            <div className="space-y-3">
              {cvAnalysis.technicalImprovements.map((item, idx) => (
                <div key={`${item.category}-${idx}`} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge
                      variant="outline"
                      className={item.priority === 'high'
                        ? 'border-destructive/20 bg-destructive/5 text-destructive'
                        : item.priority === 'medium'
                        ? 'border-primary/20 bg-primary/5 text-primary'
                        : ''}
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {cvAnalysis?.roleFit && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Role fit and growth paths
            </h4>
            <div className="space-y-4">
              {cvAnalysis.roleFit.cvQualifiedRoles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">CV-qualified roles</p>
                  {renderRoleChips(cvAnalysis.roleFit.cvQualifiedRoles, 'outline')}
                </div>
              )}
              {cvAnalysis.roleFit.archetypeAlignedRoles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Archetype-aligned roles</p>
                  {renderRoleChips(cvAnalysis.roleFit.archetypeAlignedRoles, 'secondary')}
                </div>
              )}
              {cvAnalysis.roleFit.growthBridgeRoles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Bridge roles</p>
                  {renderRoleChips(cvAnalysis.roleFit.growthBridgeRoles, 'outline')}
                </div>
              )}
            </div>
          </div>
        )}

        {cvAnalysis?.mentorHook?.suggestedFocus && (
          <div className="pt-4 border-t">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-primary" />
                Mentor focus
              </h4>
              <p className="text-sm text-foreground">{cvAnalysis.mentorHook.suggestedFocus}</p>
              {cvAnalysis.mentorHook.keyQuestion && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Key question:</span> {cvAnalysis.mentorHook.keyQuestion}
                </p>
              )}
            </div>
          </div>
        )}

        {cvPillarScores && assessmentPillarScores && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t('dashboard.cv_comparison_title', 'CV vs Assessment Comparison')}
            </h4>

            {biggestImprovement.diff > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium">
                  {t('dashboard.cv_best_improvement', 'Biggest Improvement')}:{' '}
                  <span className="capitalize">
                    {t(`pillars.${biggestImprovement.pillar}.name`, biggestImprovement.pillar)}
                  </span>
                  {' '}(+{biggestImprovement.diff.toFixed(1)})
                </p>
              </div>
            )}

            <div className="space-y-4">
              {pillarsToCompare.map((pillar) => {
                const cvScoreRaw = cvPillarScores[pillar] || 0;
                const cvScore = cvScoreRaw / 10;
                const assessmentScore = assessmentPillarScores[pillar] || 0;
                const diff = assessmentScore - cvScore;
                const comment = pillarComments?.[pillar];

                return (
                  <div key={pillar} className="space-y-2">
                    <div className="flex justify-between items-center text-sm gap-3 flex-wrap">
                      <span className="capitalize font-medium">
                        {t(`pillars.${pillar}.name`, pillar.replace('_', ' '))}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="text-muted-foreground">CV: {cvScore.toFixed(1)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold">Assessment: {assessmentScore.toFixed(1)}</span>
                        {diff !== 0 && (
                          <Badge
                            variant="outline"
                            className={diff > 0
                              ? 'border-primary/20 bg-primary/5 text-primary'
                              : 'border-destructive/20 bg-destructive/5 text-destructive'}
                          >
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{t('dashboard.cv_score_label', 'CV Score')}</p>
                        <Progress value={cvScore * 10} className="h-2" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{t('dashboard.cv_assessment_label', 'Assessment Score')}</p>
                        <Progress value={assessmentScore * 10} className="h-2" />
                      </div>
                    </div>
                    {comment && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground italic">
                        {comment}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};