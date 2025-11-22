import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Sparkles, Upload, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';

interface CVAnalysisCardProps {
  cvAnalysis: {
    summary?: string | null;
    strengths?: string[] | null;
    soft_skills?: string[] | null;
    cv_comments?: {
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
}

export const CVAnalysisCard: React.FC<CVAnalysisCardProps> = ({
  cvAnalysis,
  cvPillarScores,
  assessmentPillarScores
}) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PDF or DOCX file');
      toast.error('Invalid file type. Please upload a PDF or DOCX file.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No active session. Please log in again.');
      }

      // Create FormData with the file
      const formData = new FormData();
      formData.append('file', file);

      // Get Supabase URL
      const supabaseUrl = 'https://iyckvvnecpnldrxqmzta.supabase.co';
      
      // Call analyze-cv edge function with FormData
      const response = await fetch(
        `${supabaseUrl}/functions/v1/analyze-cv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error || 'CV analysis failed');
      }

      toast.success('CV analyzed successfully! Refreshing...');
      
      // Refresh the page to show new data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('CV upload error:', error);
      const errorMsg = error.message || 'Failed to analyze CV';
      
      // Provide user-friendly error messages
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

  const pillarsToCompare = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'];
  
  // Calculate overall delta and biggest improvement
  let overallDelta = 0;
  let biggestImprovement = { pillar: '', diff: 0 };
  if (cvPillarScores && assessmentPillarScores) {
    pillarsToCompare.forEach((pillar) => {
      const cvScore = (cvPillarScores[pillar as keyof typeof cvPillarScores] || 0) / 10; // Normalize to 0-10
      const assessmentScore = assessmentPillarScores[pillar as keyof typeof assessmentPillarScores] || 0;
      const diff = assessmentScore - cvScore;
      overallDelta += diff;
      if (Math.abs(diff) > Math.abs(biggestImprovement.diff)) {
        biggestImprovement = { pillar, diff };
      }
    });
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <div>
              <CardTitle className="font-heading">
                {t('profile.cv_analysis', 'CV Analysis')}
              </CardTitle>
              {cvPillarScores && assessmentPillarScores && (
                <p className={`text-sm mt-1 ${
                  overallDelta > 0 ? 'text-green-600' : 
                  overallDelta < 0 ? 'text-red-600' : 
                  'text-muted-foreground'
                }`}>
                  Score Alignment: {overallDelta > 0 ? '+' : ''}{overallDelta.toFixed(1)} overall
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
              variant={cvAnalysis ? "outline" : "default"}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {cvAnalysis ? 'Re-upload CV' : 'Upload CV'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Message */}
        {uploadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">Upload Error</p>
              <p className="text-sm text-red-600">{uploadError}</p>
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

        {/* No CV Message */}
        {!cvAnalysis && !isUploading && !uploadError && (
          <div className="p-6 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">
              Upload your CV to compare your documented skills with your assessment results
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="default"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload CV
            </Button>
          </div>
        )}

        {/* Summary */}
        {cvAnalysis?.summary && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground leading-relaxed">{cvAnalysis.summary}</p>
          </div>
        )}

        {/* Strengths */}
        {cvAnalysis?.strengths && cvAnalysis.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('profile.cv_strengths', 'Key Strengths from CV')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {cvAnalysis.strengths.map((strength, idx) => (
                <Badge key={idx} variant="secondary" className="bg-green-500/10 text-green-600">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Soft Skills */}
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

        {/* CV vs Assessment Comparison */}
        {cvPillarScores && assessmentPillarScores && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t('profile.cv_vs_assessment', 'CV vs Assessment Comparison')}
            </h4>
            
            {biggestImprovement.diff > 0 && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-green-600 font-medium">
                  {t('profile.biggest_improvement', 'Biggest Improvement')}: {' '}
                  <span className="capitalize">
                    {t(`pillars.${biggestImprovement.pillar}.name`, biggestImprovement.pillar)}
                  </span>
                  {' '}(+{biggestImprovement.diff.toFixed(1)})
                </p>
              </div>
            )}

            <div className="space-y-4">
              {pillarsToCompare.map((pillar) => {
                const cvScoreRaw = cvPillarScores[pillar as keyof typeof cvPillarScores] || 0;
                const cvScore = cvScoreRaw / 10; // Normalize from 0-100 to 0-10
                const assessmentScore = assessmentPillarScores[pillar as keyof typeof assessmentPillarScores] || 0;
                const diff = assessmentScore - cvScore;
                const comment = cvAnalysis?.cv_comments?.[pillar as keyof typeof cvAnalysis.cv_comments];
                
                return (
                  <div key={pillar} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="capitalize font-medium">
                        {t(`pillars.${pillar}.name`, pillar.replace('_', ' '))}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          CV: {cvScore.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold">
                          Assessment: {assessmentScore.toFixed(1)}
                        </span>
                        {diff !== 0 && (
                          <Badge 
                            variant={diff > 0 ? "default" : "destructive"}
                            className={`ml-2 ${
                              diff > 0 ? 'bg-green-500 hover:bg-green-600' : 
                              diff < 0 ? 'bg-red-500 hover:bg-red-600' : 
                              'bg-gray-500'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">CV Score</p>
                        <Progress value={cvScore * 10} className="h-2" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Assessment Score</p>
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
