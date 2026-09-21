import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { prepareImageForUpload } from '@/lib/images/prepareImageForUpload';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Panel, Eyebrow } from '@/components/layout/PageHeader';
import { formatScore, pillarName, type PillarKey } from '@/components/candidate/PillarBars';
import { log } from '@/lib/log';

interface XimatarHeroCardProps {
  ximatarName: string | null;
  ximatarImage: string | null;
  driveLevel: 'high' | 'medium' | 'low' | null;
  strongestPillar: string | null;
  weakestPillar: string | null;
  storytelling: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  pillarScores: { drive?: number; } | null;
  onAvatarUpdate?: () => void;
  /** "Esplora il tuo profilo ↗" — opens the profile detail below the fold. */
  onExploreProfile?: () => void;
}

/**
 * The XIMAtar identity panel of the candidate dashboard (the one glass
 * surface on that page): image, archetype, one line, and a small
 * "how you contribute" note. Profile photo upload stays here.
 */
export const XimatarHeroCard: React.FC<XimatarHeroCardProps> = ({
  ximatarName, ximatarImage, driveLevel, strongestPillar, weakestPillar,
  storytelling, fullName, avatarUrl, pillarScores, onAvatarUpdate, onExploreProfile,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Please upload a JPG, PNG, or WEBP image'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('File size must be less than 2MB'); return; }
    setUploading(true);
    try {
      const prepared = await prepareImageForUpload(file, { longSide: 512 });
      const fileName = `${user.id}-${Date.now()}.${prepared.ext}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, prepared.file, { upsert: true, cacheControl: '604800', contentType: prepared.file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarValue = { image: publicUrl, type: 'custom' as const };
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: avatarValue, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('user_id, avatar');
      if (updateError) {
        log.error('[XimatarHeroCard] profile update failed', updateError);
        throw updateError;
      }
      if (!updated || updated.length === 0) throw new Error('Profile row not updated (auth/RLS mismatch).');
      setCurrentAvatar(publicUrl);
      toast.success('Profile photo updated');
      onAvatarUpdate?.();
    } catch (error: any) {
      log.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally { setUploading(false); }
  };

  const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const driveValue = typeof pillarScores?.drive === 'number' ? pillarScores.drive : null;
  const driveLabel = driveLevel ? t(`profile.drive_level_${driveLevel}`) : null;
  const tagline = storytelling ? storytelling.split(/(?<=[.!?])\s/)[0] : null;

  return (
    <Panel glass className="flex flex-col gap-5">
      <div className="flex items-start gap-5">
        <div className="h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[10px] bg-[hsl(var(--xs-page))] sm:h-[132px] sm:w-[132px]">
          {ximatarImage ? (
            <OptimizedImage src={ximatarImage} alt={ximatarName || 'XIMAtar'} width={132} height={132} priority className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Eyebrow>{t('dashboard.ximatar_label', 'Your XIMAtar')}</Eyebrow>
          <h2 className="mt-1.5 truncate text-[26px] font-semibold leading-tight tracking-[-0.6px] text-foreground sm:text-[30px]">
            {ximatarName || t('profile.ximatar_archetype', 'XIMAtar Archetype')}
          </h2>
          {tagline && <p className="mt-1.5 line-clamp-2 text-[14px] text-muted-foreground">{tagline}</p>}
          {driveLabel && (
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">
              Drive {formatScore(driveValue, i18n.language)} / 10 · {driveLabel}
            </p>
          )}
        </div>

        {/* Profile photo (upload on hover / focus) */}
        <div className="relative shrink-0">
          <label
            htmlFor="avatar-upload"
            className="group relative flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--xs-line))] bg-background text-sm font-semibold text-muted-foreground focus-within:ring-2 focus-within:ring-primary"
            title={t('profile.upload_photo', 'Upload photo')}
          >
            {currentAvatar ? (
              <OptimizedImage src={currentAvatar} alt={fullName || 'Profile'} width={48} height={48} className="h-full w-full object-cover" fallback={<span>{initials}</span>} />
            ) : (
              <span>{initials}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Upload className="h-4 w-4 text-white" />}
            </span>
            <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="sr-only" disabled={uploading} aria-label={t('profile.upload_photo', 'Upload photo')} />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-[hsl(var(--xs-line))] bg-background/60 p-4">
        <Eyebrow>{t('dashboard.contribute_label', 'How you contribute')}</Eyebrow>
        <p className="mt-1.5 text-[15px] font-semibold text-foreground">
          {strongestPillar ? pillarName(t, strongestPillar as PillarKey) : '—'}
          {weakestPillar && (
            <span className="font-normal text-muted-foreground"> · {t('dashboard.growing_in', 'growing in')} {pillarName(t, weakestPillar as PillarKey)}</span>
          )}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t('dashboard.ximatar_tagline')}</p>
        {onExploreProfile && (
          <button type="button" onClick={onExploreProfile} className="mt-3 text-[14px] font-semibold text-primary hover:underline">
            {t('dashboard.explore_profile', 'Explore your profile')} <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
    </Panel>
  );
};
