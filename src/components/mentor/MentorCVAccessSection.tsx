import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, User, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface CVAccessCandidate {
  id: string;
  mentor_id: string;
  candidate_profile_id: string;
  is_allowed: boolean;
  allowed_at: string | null;
  candidate_name?: string;
}

interface MentorCVAccessSectionProps {
  mentorId: string;
}

export function MentorCVAccessSection({ mentorId }: MentorCVAccessSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [candidates, setCandidates] = useState<CVAccessCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingCV, setViewingCV] = useState<string | null>(null);
  const [cvData, setCvData] = useState<any>(null);

  useEffect(() => {
    fetchCandidatesWithAccess();
  }, [mentorId]);

  const fetchCandidatesWithAccess = async () => {
    setLoading(true);
    try {
      // Fetch CV access records for this mentor where access is granted
      const { data, error } = await supabase
        .from('mentor_cv_access')
        .select(`
          id,
          mentor_id,
          candidate_profile_id,
          is_allowed,
          allowed_at
        `)
        .eq('mentor_id', mentorId)
        .eq('is_allowed', true)
        .order('allowed_at', { ascending: false });

      if (error) {
        console.error('[MentorCVAccessSection] Error fetching access:', error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch candidate names (only display_name, not email)
        const profileIds = data.map(d => d.candidate_profile_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, full_name')
          .in('id', profileIds);

        const profileMap = new Map(
          profiles?.map(p => [p.id, p.full_name || p.name || 'Anonymous']) || []
        );

        const enriched = data.map(d => ({
          ...d,
          candidate_name: profileMap.get(d.candidate_profile_id) || 'Anonymous',
        }));

        setCandidates(enriched);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('[MentorCVAccessSection] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCV = async (candidateProfileId: string) => {
    setViewingCV(candidateProfileId);
    setCvData(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: t('common.error'),
          description: t('mentor.cv_auth_required', 'Authentication required'),
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('mentor-get-candidate-cv', {
        body: { candidate_profile_id: candidateProfileId },
      });

      if (error) {
        console.error('[MentorCVAccessSection] Error fetching CV:', error);
        toast({
          title: t('mentor.cv_error', 'Error loading CV'),
          description: error.message || t('mentor.cv_error_desc', 'Failed to load candidate CV'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        setCvData(data);
      } else {
        toast({
          title: t('mentor.cv_not_found', 'CV not found'),
          description: data?.message || t('mentor.cv_not_found_desc', 'No CV available for this candidate'),
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('[MentorCVAccessSection] Error:', err);
      toast({
        title: t('common.error'),
        description: err.message || 'Failed to load CV',
        variant: 'destructive',
      });
    } finally {
      setViewingCV(null);
    }
  };

  const closeCV = () => {
    setCvData(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t('mentor.cv_access_title', 'Candidate CV Access')}
        </CardTitle>
        <CardDescription>
          {t('mentor.cv_access_desc', 'View CVs of candidates who have granted you access')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {candidates.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground">
              {t('mentor.cv_no_access', 'No candidates have granted CV access yet')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('mentor.cv_consent_required', 'Candidates must explicitly grant permission for you to view their CV')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{candidate.candidate_name}</p>
                    {candidate.allowed_at && (
                      <p className="text-xs text-muted-foreground">
                        {t('mentor.cv_access_since', 'Access granted')}: {new Date(candidate.allowed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewCV(candidate.candidate_profile_id)}
                  disabled={viewingCV === candidate.candidate_profile_id}
                  className="gap-2"
                >
                  {viewingCV === candidate.candidate_profile_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {t('mentor.cv_view', 'View CV')}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* CV Viewer Modal */}
        {cvData && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {cvData.candidate_name}'s CV
                  </CardTitle>
                  <Badge variant="secondary" className="mt-2">
                    {cvData.cv?.type === 'file' ? 'PDF Document' : 'Text Analysis'}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={closeCV}>
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {cvData.cv?.type === 'file' ? (
                  <div className="space-y-4">
                    {cvData.cv.data.signed_url && (
                      <Button asChild className="w-full gap-2">
                        <a 
                          href={cvData.cv.data.signed_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <FileText className="h-4 w-4" />
                          {t('mentor.cv_download', 'Open CV')} ({cvData.cv.data.file_name})
                        </a>
                      </Button>
                    )}
                    {cvData.cv.data.analysis_summary && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">{t('mentor.cv_analysis', 'Analysis Summary')}</h4>
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(cvData.cv.data.analysis_summary, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : cvData.cv?.type === 'text' ? (
                  <div className="space-y-4">
                    {cvData.cv.data.summary && (
                      <div>
                        <h4 className="font-medium mb-1">{t('mentor.cv_summary', 'Summary')}</h4>
                        <p className="text-sm text-muted-foreground">{cvData.cv.data.summary}</p>
                      </div>
                    )}
                    {cvData.cv.data.strengths?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">{t('mentor.cv_strengths', 'Strengths')}</h4>
                        <div className="flex flex-wrap gap-1">
                          {cvData.cv.data.strengths.map((s: string, i: number) => (
                            <Badge key={i} variant="secondary">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {cvData.cv.data.soft_skills?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">{t('mentor.cv_soft_skills', 'Soft Skills')}</h4>
                        <div className="flex flex-wrap gap-1">
                          {cvData.cv.data.soft_skills.map((s: string, i: number) => (
                            <Badge key={i} variant="outline">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {cvData.cv.data.cv_text && (
                      <div>
                        <h4 className="font-medium mb-1">{t('mentor.cv_full_text', 'Full Text')}</h4>
                        <div className="p-4 bg-muted rounded-lg max-h-64 overflow-auto">
                          <pre className="text-xs whitespace-pre-wrap">{cvData.cv.data.cv_text}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t('mentor.cv_unavailable', 'CV content unavailable')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
