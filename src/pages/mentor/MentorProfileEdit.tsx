import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { supabase } from '@/integrations/supabase/client';
import MentorLayout from '@/components/mentor/MentorLayout';
import { PageHeader, Panel, WithContext, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Plus, Loader2 } from 'lucide-react';
import { MentorAvatarUpload } from '@/components/mentor/MentorAvatarUpload';
import { MentorCandidateCard } from '@/components/mentor/MentorCandidateCard';
import { pillarLabel } from '@/components/mentor/mentorBits';
import { cn } from '@/lib/utils';
import NotAMentor from './NotAMentor';
import { log } from '@/lib/log';

const AVAILABLE_PILLARS = [
  'computational_power',
  'communication',
  'knowledge',
  'creativity',
  'drive',
];

/**
 * Profile editor, "write and watch" layout: the form on the left and the
 * candidate's card on the right, updating as you type. Before this, the only
 * way to see the result was to save and open a separate preview page.
 */
export default function MentorProfileEdit() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isMentor, mentorProfile, loading, refetch } = useMentorProfile();

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    bio: '',
    profile_image_url: '',
    specialties: [] as string[],
    xima_pillars: [] as string[],
    first_session_expectations: '',
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
        first_session_expectations: mentorProfile.first_session_expectations || '',
      });
      setDirty(false);
    }
  }, [mentorProfile]);

  const patch = (p: Partial<typeof formData>) => { setFormData((prev) => ({ ...prev, ...p })); setDirty(true); };

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
          updated_at: new Date().toISOString(),
        })
        .eq('id', mentorProfile.id);

      if (error) throw error;

      toast({
        title: t('mentor.save_success', 'Profile updated'),
        description: t('mentor.save_success_description', 'Your changes have been saved.'),
      });
      setDirty(false);
      await refetch();
    } catch (err) {
      log.error('[MentorProfileEdit] Save error:', err);
      toast({
        title: t('mentor.save_error', 'Error saving'),
        description: t('mentor.save_error_description', 'Failed to save your changes. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    const trimmed = newSpecialty.trim();
    if (trimmed && !formData.specialties.includes(trimmed)) {
      patch({ specialties: [...formData.specialties, trimmed] });
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) =>
    patch({ specialties: formData.specialties.filter((s) => s !== specialty) });

  const togglePillar = (pillar: string) =>
    patch({
      xima_pillars: formData.xima_pillars.includes(pillar)
        ? formData.xima_pillars.filter((p) => p !== pillar)
        : [...formData.xima_pillars, pillar],
    });

  if (loading) {
    return (
      <MentorLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MentorLayout>
    );
  }

  if (!isMentor || !mentorProfile) return <NotAMentor />;

  const saveButton = (
    <Button onClick={handleSave} disabled={saving || !dirty}>
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
      {saving ? t('common.saving', 'Saving…') : t('common.save', 'Save changes')}
    </Button>
  );

  return (
    <MentorLayout breadcrumb={<span className="truncate">{t('mentor.area_label', 'Mentor area')} / {t('mentor.nav_profile', 'My profile')}</span>}>
      <PageHeader
        eyebrow={`${t('mentor.eyebrow_personal', 'Personal area')} / ${t('mentor.nav_profile', 'My profile')}`}
        title={t('mentor.edit_profile', 'Edit profile')}
        subtitle={t('mentor.edit_description', 'Update how candidates see your mentor profile')}
        actions={saveButton}
        meta={dirty ? t('mentor.unsaved_changes', 'Unsaved changes') : undefined}
      />

      <WithContext
        context={
          <div className="xs-glass p-5">
            <Eyebrow>{t('mentor.live_preview', 'What the candidate sees')}</Eyebrow>
            <p className="mb-4 mt-1 text-[12.5px] text-muted-foreground">{t('mentor.live_preview_hint', 'Updates as you type. Nothing is saved until you press save.')}</p>
            <MentorCandidateCard data={{ ...formData, name: mentorProfile.name }} />
            <p className="mt-3 text-center text-[12px] text-muted-foreground">{t('mentor.preview_note', 'The button is off: here you are looking at yourself.')}</p>
          </div>
        }
      >
        <Panel className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mentor-name" className="text-muted-foreground">
              {t('mentor.name', 'Name')} · {t('common.read_only', 'read-only')}
            </Label>
            <Input id="mentor-name" value={mentorProfile.name} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t('mentor.title_label', 'Professional title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={t('mentor.title_placeholder', 'e.g. Senior product manager')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('mentor.bio_label', 'Bio')}</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => patch({ bio: e.target.value })}
              placeholder={t('mentor.bio_placeholder', 'Tell candidates how you work…')}
              rows={4}
            />
            <p className="text-[12px] text-muted-foreground">
              {t('mentor.bio_hint', 'About three lines are shown on a computer, two on a phone.')}
            </p>
          </div>

          <MentorAvatarUpload
            mentorId={mentorProfile.id}
            currentImageUrl={formData.profile_image_url}
            onUploadSuccess={(newUrl) => { patch({ profile_image_url: newUrl }); refetch(); }}
          />

          <div className="space-y-2 border-t border-[hsl(var(--xs-line))] pt-6">
            <Label>{t('mentor.pillars_label', 'XIMA pillars')}</Label>
            <p className="text-[12px] text-muted-foreground">
              {t('mentor.pillars_hint', 'Candidates reach you through the affinity between their pillars and yours.')}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_PILLARS.map((pillar) => {
                const on = formData.xima_pillars.includes(pillar);
                return (
                  <button
                    key={pillar}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePillar(pillar)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                      on ? 'border-primary bg-primary text-white' : 'border-[hsl(var(--xs-line))] bg-card text-foreground hover:border-primary/50',
                    )}
                  >
                    {pillarLabel(t, pillar)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-specialty">{t('mentor.specialties_label', 'Specialties')}</Label>
            {formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {formData.specialties.map((specialty) => (
                  <span key={specialty} className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--xs-line))] bg-card py-1 pl-3 pr-1 text-[13px]">
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="rounded-full p-1 hover:bg-destructive/15"
                      aria-label={t('mentor.remove_specialty', 'Remove {{name}}', { name: specialty })}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id="new-specialty"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder={t('mentor.specialty_placeholder', 'Add a specialty…')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addSpecialty} aria-label={t('a11y.add')}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-[12px] text-muted-foreground">{t('mentor.specialties_hint', 'The card shows the first three.')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_session_expectations">{t('mentor.first_session_label', 'At the first session')}</Label>
            <Textarea
              id="first_session_expectations"
              value={formData.first_session_expectations}
              onChange={(e) => patch({ first_session_expectations: e.target.value })}
              placeholder={t('mentor.first_session_placeholder', 'What happens in a first meeting with you?')}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[hsl(var(--xs-line))] pt-5">
            <Button variant="ghost" asChild>
              <Link to="/mentor">{t('mentor.back_to_portal', 'Back to the portal')}</Link>
            </Button>
            {saveButton}
          </div>
        </Panel>
      </WithContext>
    </MentorLayout>
  );
}
