import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Upload, FileText, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import XimaScoreCard from '@/components/XimaScoreCard';
import FeaturedProfessionals, { type FieldKey } from '@/components/FeaturedProfessionals';
import ProfileXimatarBadge from '@/components/ximatar/ProfileXimatarBadge';

const IlTuoViaggio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, signOut, isAuthenticated } = useUser();
  
  const [currentStep, setCurrentStep] = useState<'ximatar' | 'cv' | 'mentor'>('ximatar');
  const [assignedXimatar, setAssignedXimatar] = useState<any>(null);
  const [assessmentPillars, setAssessmentPillars] = useState<any>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvSkipped, setCvSkipped] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedField] = useState<FieldKey>(() => {
    return (localStorage.getItem('preferred_field') as FieldKey) || 'business_leadership';
  });

  // Reset session on mount if user is logged in (as per requirements)
  useEffect(() => {
    const resetSession = async () => {
      if (isAuthenticated) {
        await signOut();
      }
      setLoading(false);
    };
    resetSession();
  }, []);

  // Fetch XIMATAR results
  useEffect(() => {
    const fetchXimatarResults = async () => {
      // Get user_id from localStorage (set during assessment)
      const tempUserId = localStorage.getItem('temp_user_id') || user?.id;
      if (!tempUserId) {
        setLoading(false);
        return;
      }

      // Fetch latest assessment result
      const { data: latestResult } = await supabase
        .from('assessment_results')
        .select(`
          pillars,
          top3,
          ximatar_id,
          ximatars (
            id,
            label,
            image_url,
            updated_at,
            vector,
            ximatar_translations (
              lang,
              title,
              core_traits
            )
          )
        `)
        .eq('user_id', tempUserId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestResult?.ximatars) {
        const ximatarData = latestResult.ximatars as any;
        const translation = ximatarData.ximatar_translations?.find((t: any) => t.lang === 'it') 
          || ximatarData.ximatar_translations?.[0];
        
        setAssignedXimatar({
          ...ximatarData,
          name: translation?.title || ximatarData.label,
          traits: translation?.core_traits ? translation.core_traits.split(' – ') : []
        });

        if (latestResult.pillars) {
          const pillars = latestResult.pillars as any;
          setAssessmentPillars({
            computational: pillars.comp_power || 0,
            communication: pillars.communication || 0,
            knowledge: pillars.knowledge || 0,
            creativity: pillars.creativity || 0,
            drive: pillars.drive || 0
          });
        }
      }

      setLoading(false);
    };

    if (!loading) {
      fetchXimatarResults();
    }
  }, [loading, user]);

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: t('il_tuo_viaggio.invalid_format'),
          description: t('il_tuo_viaggio.invalid_format_desc'),
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('il_tuo_viaggio.file_too_large'),
          description: t('il_tuo_viaggio.file_too_large_desc'),
          variant: 'destructive',
        });
        return;
      }
      setCvFile(file);
    }
  };

  const handleCvUpload = async () => {
    if (!cvFile) return;

    setLoading(true);
    try {
      // Upload CV to storage
      const fileExt = cvFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('cv-uploads')
        .upload(fileName, cvFile);

      if (uploadError) throw uploadError;

      toast({
        title: t('il_tuo_viaggio.cv_uploaded'),
        description: t('il_tuo_viaggio.cv_upload_next'),
      });

      setCurrentStep('mentor');
    } catch (error) {
      console.error('CV upload error:', error);
      toast({
        title: t('il_tuo_viaggio.cv_upload_error'),
        description: t('il_tuo_viaggio.cv_upload_error_desc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipCv = () => {
    setCvSkipped(true);
    setCurrentStep('mentor');
  };

  const handleProfessionalSelect = (professional: any) => {
    setSelectedProfessional(professional.id);
    localStorage.setItem('selected_professional_data', JSON.stringify(professional));
  };

  const handleProceedToRegistration = () => {
    if (!selectedProfessional) {
      toast({
        title: t('il_tuo_viaggio.select_mentor'),
        description: t('il_tuo_viaggio.choose_mentor_prompt'),
        variant: 'destructive',
      });
      return;
    }

    // Store all data for registration
    localStorage.setItem('ximatar_journey_data', JSON.stringify({
      ximatar: assignedXimatar,
      professional: JSON.parse(localStorage.getItem('selected_professional_data') || '{}'),
      pillars: assessmentPillars,
      cvUploaded: !!cvFile,
    }));

    navigate('/register');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src="/assets/logo_light.png" 
            alt="XIMA Logo" 
            className="h-12 w-auto"
          />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">IT</span>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">{t('il_tuo_viaggio.title')}</h1>
          <p className="text-xl text-muted-foreground">
            {t('il_tuo_viaggio.subtitle')}
          </p>
        </div>

        {/* Progress Steps Visual */}
        <div className="mb-12">
          <div className="flex justify-center gap-8 items-center flex-wrap">
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                currentStep === 'ximatar' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
              }`}>
                <Check className="w-8 h-8" />
              </div>
              <span className="text-sm mt-2 font-medium">{t('il_tuo_viaggio.step_2')}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                currentStep === 'cv' ? 'bg-primary text-primary-foreground' : 
                currentStep === 'mentor' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Upload className="w-8 h-8" />
              </div>
              <span className="text-sm mt-2 font-medium">{t('il_tuo_viaggio.step_1')}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                currentStep === 'mentor' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <FileText className="w-8 h-8" />
              </div>
              <span className="text-sm mt-2 font-medium">{t('il_tuo_viaggio.step_3')}</span>
            </div>
          </div>
        </div>

        {/* Step 1: XIMATAR Reveal */}
        {currentStep === 'ximatar' && assignedXimatar && (
          <Card className="p-12">
            <div className="text-center space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-4">{t('il_tuo_viaggio.ximatar_reveal_title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('il_tuo_viaggio.ximatar_reveal_subtitle')}
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <ProfileXimatarBadge
                  name={assignedXimatar.name}
                  avatar_path={assignedXimatar.image_url}
                  updated_at={assignedXimatar.updated_at}
                  subtitle={t('il_tuo_viaggio.your_profile')}
                  traits={assignedXimatar.traits}
                  size="lg"
                  className="bg-card border-2"
                />
              </div>

              {assessmentPillars && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">{t('il_tuo_viaggio.your_scores')}</h3>
                  <XimaScoreCard pillars={assessmentPillars} showTooltip />
                </div>
              )}

              <Button 
                size="lg"
                onClick={() => setCurrentStep('cv')}
                className="px-8 py-6 text-lg"
              >
                {t('il_tuo_viaggio.continue')}
                <ArrowRight className="ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: CV Upload or Skip */}
        {currentStep === 'cv' && (
          <Card className="p-12">
            <div className="text-center space-y-8 max-w-2xl mx-auto">
              <div>
                <h2 className="text-3xl font-bold mb-4">{t('il_tuo_viaggio.cv_section_title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('il_tuo_viaggio.cv_section_subtitle')}
                </p>
              </div>

              <div className="space-y-6">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 hover:border-primary/50 transition-colors">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">{t('il_tuo_viaggio.upload_cv')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('il_tuo_viaggio.cv_format')}
                  </p>
                  
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleCvFileChange}
                    className="hidden"
                    id="cv-upload"
                  />
                  <label htmlFor="cv-upload">
                    <Button variant="outline" asChild>
                      <span>{t('il_tuo_viaggio.select_file')}</span>
                    </Button>
                  </label>

                  {cvFile && (
                    <div className="mt-4">
                      <Badge variant="secondary">{cvFile.name}</Badge>
                      <Button 
                        className="mt-4 w-full"
                        onClick={handleCvUpload}
                        disabled={loading}
                      >
                        {loading ? t('il_tuo_viaggio.uploading') : t('il_tuo_viaggio.upload_button')}
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost"
                  size="lg"
                  onClick={handleSkipCv}
                  className="w-full"
                >
                  {t('il_tuo_viaggio.skip_for_now')}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Mentor Selection */}
        {currentStep === 'mentor' && (
          <div className="space-y-8">
            <Card className="p-12">
              <div className="text-center space-y-6 mb-8">
                <h2 className="text-3xl font-bold">{t('il_tuo_viaggio.mentor_title')}</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t('il_tuo_viaggio.mentor_subtitle')}
                </p>
              </div>

              <FeaturedProfessionals 
                onSelect={handleProfessionalSelect}
                fieldKey={selectedField}
                limit={6}
              />

              {selectedProfessional && (
                <div className="text-center mt-8">
                  <Button 
                    size="lg"
                    onClick={handleProceedToRegistration}
                    className="px-8 py-6 text-lg"
                  >
                    {t('il_tuo_viaggio.register_to_continue')}
                    <ArrowRight className="ml-2" />
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>{t('journey.step')} {currentStep === 'ximatar' ? '1' : currentStep === 'cv' ? '2' : '3'} {t('il_tuo_viaggio.step_of')} 3</p>
          <p className="mt-2">{t('il_tuo_viaggio.footer')}</p>
        </footer>
      </div>
    </div>
  );
};

export default IlTuoViaggio;
