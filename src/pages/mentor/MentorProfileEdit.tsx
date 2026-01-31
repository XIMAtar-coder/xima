import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { MentorAvatarUpload } from '@/components/mentor/MentorAvatarUpload';
import NotAMentor from './NotAMentor';

const AVAILABLE_PILLARS = [
  'computational_power',
  'communication',
  'knowledge',
  'creativity',
  'drive'
];

export default function MentorProfileEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMentor, mentorProfile, loading, refetch } = useMentorProfile();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    profile_image_url: '',
    specialties: [] as string[],
    xima_pillars: [] as string[],
    first_session_expectations: ''
  });
  const [newSpecialty, setNewSpecialty] = useState('');

  // Initialize form when mentor profile loads
  useEffect(() => {
    if (mentorProfile) {
      setFormData({
        title: mentorProfile.title || '',
        bio: mentorProfile.bio || '',
        profile_image_url: mentorProfile.profile_image_url || '',
        specialties: mentorProfile.specialties || [],
        xima_pillars: mentorProfile.xima_pillars || [],
        first_session_expectations: mentorProfile.first_session_expectations || ''
      });
    }
  }, [mentorProfile]);

  const handleSave = async () => {
    if (!mentorProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('mentors')
        .update({
          title: formData.title || null,
          bio: formData.bio || null,
          profile_image_url: formData.profile_image_url || null,
          specialties: formData.specialties,
          xima_pillars: formData.xima_pillars,
          first_session_expectations: formData.first_session_expectations || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', mentorProfile.id);

      if (error) throw error;

      toast({
        title: t('mentor.save_success', 'Profile updated'),
        description: t('mentor.save_success_description', 'Your changes have been saved.')
      });

      await refetch();
    } catch (err) {
      console.error('[MentorProfileEdit] Save error:', err);
      toast({
        title: t('mentor.save_error', 'Error saving'),
        description: t('mentor.save_error_description', 'Failed to save your changes. Please try again.'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    const trimmed = newSpecialty.trim();
    if (trimmed && !formData.specialties.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, trimmed]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const togglePillar = (pillar: string) => {
    setFormData(prev => ({
      ...prev,
      xima_pillars: prev.xima_pillars.includes(pillar)
        ? prev.xima_pillars.filter(p => p !== pillar)
        : [...prev.xima_pillars, pillar]
    }));
  };

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto py-12 px-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Not a mentor
  if (!isMentor || !mentorProfile) {
    return <NotAMentor />;
  }

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto py-12 px-4 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/mentor')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t('mentor.edit_profile', 'Edit Profile')}</CardTitle>
            <CardDescription>
              {t('mentor.edit_description', 'Update how candidates see your mentor profile')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Read-only: Name */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('mentor.name', 'Name')} ({t('common.read_only', 'read-only')})</Label>
              <Input value={mentorProfile.name} disabled className="bg-muted" />
            </div>

            {/* Editable: Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('mentor.title_label', 'Professional Title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('mentor.title_placeholder', 'e.g., Senior Product Manager at Google')}
              />
            </div>

            {/* Editable: Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">{t('mentor.bio_label', 'Bio')}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder={t('mentor.bio_placeholder', 'Tell candidates about yourself...')}
                rows={4}
              />
            </div>

            {/* Avatar Upload - NEW */}
            <MentorAvatarUpload
              mentorId={mentorProfile.id}
              currentImageUrl={formData.profile_image_url}
              onUploadSuccess={(newUrl) => {
                setFormData(prev => ({ ...prev, profile_image_url: newUrl }));
                refetch();
              }}
            />

            <Separator />

            {/* Editable: XIMA Pillars */}
            <div className="space-y-2">
              <Label>{t('mentor.pillars_label', 'XIMA Pillars')}</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_PILLARS.map((pillar) => (
                  <Badge
                    key={pillar}
                    variant={formData.xima_pillars.includes(pillar) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => togglePillar(pillar)}
                  >
                    {pillar.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Editable: Specialties */}
            <div className="space-y-2">
              <Label>{t('mentor.specialties_label', 'Specialties')}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="gap-1 pr-1">
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder={t('mentor.specialty_placeholder', 'Add a specialty...')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addSpecialty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Editable: First Session Expectations */}
            <div className="space-y-2">
              <Label htmlFor="first_session_expectations">
                {t('mentor.first_session_label', 'First Session Expectations')}
              </Label>
              <Textarea
                id="first_session_expectations"
                value={formData.first_session_expectations}
                onChange={(e) => setFormData(prev => ({ ...prev, first_session_expectations: e.target.value }))}
                placeholder={t('mentor.first_session_placeholder', 'What should candidates expect from their first session with you?')}
                rows={3}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
