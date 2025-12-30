import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Target, 
  Calendar, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Clock, 
  FileText,
  Briefcase,
  BarChart3,
  TrendingUp,
  Megaphone,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { getChallengeLevel } from '@/lib/challenges/challengeLevels';
import {
  LEVEL_2_TEMPLATES,
  Level2Template,
  RoleFamily,
  buildLevel2Rubric,
  getDeliverableTypeKey,
  getRoleFamilyKey,
  getAllRoleFamilies,
} from '@/lib/challenges/level2Templates';

interface Level2Challenge {
  id: string;
  title: string;
  updated_at: string;
  rubric?: {
    role_family?: string;
    timebox_minutes?: number;
    deliverable_type?: string;
  } | null;
}

interface Level2InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  hiringGoalId: string;
  candidateProfileId: string;
  candidateName: string;
  onInviteSent?: () => void;
}

const ROLE_FAMILY_ICONS: Record<RoleFamily, React.ReactNode> = {
  engineering: <Settings className="h-4 w-4" />,
  data: <BarChart3 className="h-4 w-4" />,
  sales: <TrendingUp className="h-4 w-4" />,
  marketing: <Megaphone className="h-4 w-4" />,
  operations: <Briefcase className="h-4 w-4" />,
};

export const Level2InviteModal: React.FC<Level2InviteModalProps> = ({
  open,
  onOpenChange,
  businessId,
  hiringGoalId,
  candidateProfileId,
  candidateName,
  onInviteSent,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'templates' | 'existing' | 'custom'>('templates');
  
  // Existing challenges
  const [existingChallenges, setExistingChallenges] = useState<Level2Challenge[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  
  // Template selection
  const [selectedRoleFamily, setSelectedRoleFamily] = useState<RoleFamily>('engineering');
  const [selectedTemplate, setSelectedTemplate] = useState<Level2Template | null>(null);
  
  // Custom challenge
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customTimeboxMinutes, setCustomTimeboxMinutes] = useState(45);
  
  // Sending state
  const [sending, setSending] = useState(false);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Get templates for selected role family
  const templatesForFamily = useMemo(() => {
    return LEVEL_2_TEMPLATES.filter(t => t.roleFamily === selectedRoleFamily);
  }, [selectedRoleFamily]);

  // Auto-select first template when role family changes
  useEffect(() => {
    if (templatesForFamily.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templatesForFamily[0]);
    } else if (templatesForFamily.length > 0 && selectedTemplate?.roleFamily !== selectedRoleFamily) {
      setSelectedTemplate(templatesForFamily[0]);
    }
  }, [templatesForFamily, selectedRoleFamily, selectedTemplate]);

  // Fetch existing Level 2 challenges
  useEffect(() => {
    async function fetchExistingChallenges() {
      if (!open || !businessId || !hiringGoalId) return;
      
      setLoadingExisting(true);
      try {
        const { data, error } = await supabase
          .from('business_challenges')
          .select('id, title, updated_at, rubric')
          .eq('business_id', businessId)
          .eq('hiring_goal_id', hiringGoalId)
          .in('status', ['active', 'published']);

        if (error) throw error;

        // Filter to only Level 2 challenges
        const level2Challenges = (data || []).filter(c => {
          const level = getChallengeLevel({ rubric: c.rubric as { type?: string } | null });
          return level === 2;
        });

        setExistingChallenges(level2Challenges.map(c => ({
          ...c,
          rubric: c.rubric as Level2Challenge['rubric'],
        })));
        
        if (level2Challenges.length > 0) {
          setSelectedExistingId(level2Challenges[0].id);
        }
      } catch (err) {
        console.error('Error fetching Level 2 challenges:', err);
      } finally {
        setLoadingExisting(false);
      }
    }

    fetchExistingChallenges();
  }, [open, businessId, hiringGoalId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setActiveTab('templates');
      setSelectedTemplate(null);
      setCustomTitle('');
      setCustomDescription('');
      setCustomTimeboxMinutes(45);
    }
  }, [open]);

  const createChallengeAndInvite = async (challengeData: {
    title: string;
    description: string;
    rubric: Record<string, unknown>;
    time_estimate_minutes: number;
  }) => {
    setCreatingChallenge(true);
    try {
      // Create the challenge
      const { data: newChallenge, error: createError } = await supabase
        .from('business_challenges')
        .insert([{
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          title: challengeData.title,
          description: challengeData.description,
          rubric: challengeData.rubric as unknown as Record<string, never>,
          time_estimate_minutes: challengeData.time_estimate_minutes,
          status: 'active',
        }])
        .select('id')
        .single();

      if (createError) throw createError;

      // Now send the invitation
      await sendInvitation(newChallenge.id);
    } catch (err) {
      console.error('Error creating challenge:', err);
      toast({
        title: t('common.error'),
        description: t('level2.create_failed'),
        variant: 'destructive',
      });
    } finally {
      setCreatingChallenge(false);
    }
  };

  const sendInvitation = async (challengeId: string) => {
    setSending(true);
    try {
      const { error } = await supabase
        .from('challenge_invitations')
        .insert({
          business_id: businessId,
          hiring_goal_id: hiringGoalId,
          challenge_id: challengeId,
          candidate_profile_id: candidateProfileId,
          status: 'invited',
          sent_via: ['in_app'],
        });

      if (error) {
        if (error.message?.includes('pipeline_locked')) {
          toast({
            title: t('business.level2.pipeline_locked'),
            description: t('business.level2.pipeline_locked_desc'),
            variant: 'destructive',
          });
        } else if (error.code === '23505') {
          toast({
            title: t('business.level2.already_invited'),
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: t('business.level2.invite_sent'),
        description: t('business.level2.invite_sent_desc', { name: candidateName }),
      });

      onOpenChange(false);
      onInviteSent?.();
    } catch (err) {
      console.error('Error sending Level 2 invite:', err);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleTemplateConfirm = async () => {
    if (!selectedTemplate) return;

    const rubric = buildLevel2Rubric(
      selectedTemplate,
      businessId,
      hiringGoalId,
      selectedTemplate.evaluationCriteriaKeys.map(k => t(k))
    );

    await createChallengeAndInvite({
      title: t(selectedTemplate.titleKey),
      description: t(selectedTemplate.descriptionKey),
      rubric: rubric as unknown as Record<string, unknown>,
      time_estimate_minutes: selectedTemplate.timeboxMinutes,
    });
  };

  const handleExistingConfirm = async () => {
    if (!selectedExistingId) return;
    await sendInvitation(selectedExistingId);
  };

  const handleCustomConfirm = async () => {
    if (!customTitle.trim()) {
      toast({
        title: t('level2.custom.title_required'),
        variant: 'destructive',
      });
      return;
    }

    const rubric = {
      level: 2,
      type: 'role_based',
      role_family: selectedRoleFamily,
      skill_focus: [],
      deliverable_type: 'structured_design',
      timebox_minutes: customTimeboxMinutes,
      company_context_ref: {
        business_id: businessId,
        hiring_goal_id: hiringGoalId,
      },
      prompts: [],
      evaluation_criteria: [],
    };

    await createChallengeAndInvite({
      title: customTitle,
      description: customDescription,
      rubric,
      time_estimate_minutes: customTimeboxMinutes,
    });
  };

  const isProcessing = sending || creatingChallenge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('level2.modal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('level2.modal.description', { name: candidateName })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">{t('level2.tabs.templates')}</TabsTrigger>
            <TabsTrigger value="existing">
              {t('level2.tabs.existing')}
              {existingChallenges.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1">
                  {existingChallenges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="custom">{t('level2.tabs.custom')}</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            {/* Role Family Selector */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('level2.select_role_family')}</Label>
              <div className="flex flex-wrap gap-2">
                {getAllRoleFamilies().map((family) => (
                  <Button
                    key={family}
                    variant={selectedRoleFamily === family ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRoleFamily(family)}
                    className="gap-1.5"
                  >
                    {ROLE_FAMILY_ICONS[family]}
                    {t(getRoleFamilyKey(family))}
                  </Button>
                ))}
              </div>
            </div>

            {/* Template Cards */}
            <div className="space-y-3">
              {templatesForFamily.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                          <h4 className="font-medium">{t(template.titleKey)}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {t(template.descriptionKey)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {template.timeboxMinutes} min
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {t(getDeliverableTypeKey(template.deliverableType))}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Skill focus tags */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.skillFocus.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {t(`level2.skills.${skill}`, { defaultValue: skill.replace(/_/g, ' ') })}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Existing Challenges Tab */}
          <TabsContent value="existing" className="mt-4">
            {loadingExisting ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : existingChallenges.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  {t('level2.no_existing')}
                </p>
                <Button variant="outline" onClick={() => setActiveTab('templates')}>
                  {t('level2.use_template_instead')}
                </Button>
              </div>
            ) : (
              <RadioGroup
                value={selectedExistingId}
                onValueChange={setSelectedExistingId}
                className="space-y-3 max-h-[300px] overflow-y-auto"
              >
                {existingChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedExistingId === challenge.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedExistingId(challenge.id)}
                  >
                    <RadioGroupItem value={challenge.id} id={challenge.id} className="mt-0.5" />
                    <Label htmlFor={challenge.id} className="flex-1 cursor-pointer">
                      <div className="font-medium text-foreground">{challenge.title}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar size={12} />
                        {t('business.level2.updated')}: {format(new Date(challenge.updated_at), 'MMM d, yyyy')}
                        {challenge.rubric?.timebox_minutes && (
                          <>
                            <span>•</span>
                            <Clock size={12} />
                            {challenge.rubric.timebox_minutes} min
                          </>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </TabsContent>

          {/* Custom Challenge Tab */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="custom-title">{t('level2.custom.title_label')} *</Label>
                <Input
                  id="custom-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={t('level2.custom.title_placeholder')}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="custom-desc">{t('level2.custom.description_label')}</Label>
                <Textarea
                  id="custom-desc"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={t('level2.custom.description_placeholder')}
                  rows={3}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="custom-time">{t('level2.custom.timebox_label')}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="custom-time"
                    type="number"
                    min={15}
                    max={120}
                    value={customTimeboxMinutes}
                    onChange={(e) => setCustomTimeboxMinutes(parseInt(e.target.value) || 45)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('common.minutes')}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('level2.custom.role_family_label')}</Label>
                <div className="flex flex-wrap gap-2">
                  {getAllRoleFamilies().map((family) => (
                    <Button
                      key={family}
                      variant={selectedRoleFamily === family ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedRoleFamily(family)}
                      className="gap-1.5"
                    >
                      {ROLE_FAMILY_ICONS[family]}
                      {t(getRoleFamilyKey(family))}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            {t('common.cancel')}
          </Button>
          
          {activeTab === 'templates' && selectedTemplate && (
            <Button onClick={handleTemplateConfirm} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('level2.create_and_invite')}
            </Button>
          )}
          
          {activeTab === 'existing' && existingChallenges.length > 0 && (
            <Button onClick={handleExistingConfirm} disabled={!selectedExistingId || isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('business.level2.send_invite')}
            </Button>
          )}
          
          {activeTab === 'custom' && (
            <Button onClick={handleCustomConfirm} disabled={!customTitle.trim() || isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('level2.create_and_invite')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
