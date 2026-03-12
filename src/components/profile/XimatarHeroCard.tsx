import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle, Upload, Loader2, Flame, Zap, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';

interface XimatarHeroCardProps {
  ximatarName: string | null;
  ximatarImage: string | null;
  driveLevel: 'high' | 'medium' | 'low' | null;
  strongestPillar: string | null;
  weakestPillar: string | null;
  storytelling: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  pillarScores: {
    drive?: number;
  } | null;
  onAvatarUpdate?: () => void;
}

export const XimatarHeroCard: React.FC<XimatarHeroCardProps> = ({
  ximatarName,
  ximatarImage,
  driveLevel,
  strongestPillar,
  weakestPillar,
  storytelling,
  fullName,
  avatarUrl,
  pillarScores,
  onAvatarUpdate
}) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar: {
            image: publicUrl,
            type: 'custom'
          }
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCurrentAvatar(publicUrl);
      toast.success('Profile photo updated');
      onAvatarUpdate?.();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const driveLevelConfig = {
    high: { icon: Flame, gradient: 'from-emerald-500 to-teal-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: t('profile.drive_level_high', 'High Drive') },
    medium: { icon: Zap, gradient: 'from-primary to-sky-400', text: 'text-primary', bg: 'bg-primary/10', label: t('profile.drive_level_medium', 'Medium Drive') },
    low: { icon: Target, gradient: 'from-amber-500 to-orange-400', text: 'text-amber-400', bg: 'bg-amber-500/10', label: t('profile.drive_level_low', 'Building Momentum') }
  };

  const driveConfig = driveLevel ? driveLevelConfig[driveLevel] : null;
  const DriveIcon = driveConfig?.icon || Zap;
  
  const driveValue = pillarScores?.drive ?? 0;
  const drivePercentage = Math.min(Math.max(driveValue / 10, 0), 1);

  return (
    <div className="dashboard-hero-gradient rounded-2xl overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          
          {/* Left: User Photo + Upload */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative group">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg shadow-primary/5">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={fullName || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl font-bold text-primary">
                    {getInitials()}
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-background/80 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {/* Hover overlay */}
              <label 
                htmlFor="avatar-upload"
                className="absolute inset-0 bg-background/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Upload className="w-5 h-5 text-foreground" />
              </label>
            </div>
            <input
              type="file"
              id="avatar-upload"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Center: XIMAtar Identity */}
          <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                {t('profile.your_ximatar', 'Your XIMAtar')}
              </p>
              <h2 className="text-2xl md:text-4xl font-bold font-heading text-foreground glow-text truncate">
                {ximatarName || t('profile.ximatar_archetype', 'XIMAtar Archetype')}
              </h2>
            </div>

            {/* Drive Badge */}
            {driveConfig && (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Badge className={`${driveConfig.bg} ${driveConfig.text} border-0 px-3 py-1.5 text-xs font-semibold gap-1.5`}>
                  <DriveIcon className="w-3.5 h-3.5" />
                  {driveConfig.label}
                </Badge>
              </div>
            )}

            {/* Storytelling */}
            {storytelling && (
              <p className="text-muted-foreground leading-relaxed text-sm max-w-lg line-clamp-2">
                {storytelling}
              </p>
            )}

            {/* Edge & Friction - inline chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              {strongestPillar && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {t('profile.your_edge', 'Edge')}:
                  </span>
                  <span className="text-xs font-medium text-foreground capitalize">
                    {t(`pillars.${strongestPillar}.name`, strongestPillar)}
                  </span>
                </div>
              )}
              {weakestPillar && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    {t('profile.growth_area', 'Grow')}:
                  </span>
                  <span className="text-xs font-medium text-foreground capitalize">
                    {t(`pillars.${weakestPillar}.name`, weakestPillar)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: XIMAtar Image with Drive Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className="relative w-28 h-28 md:w-36 md:h-36">
              {/* Drive Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                  opacity="0.4"
                />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  className="momentum-bar"
                  style={{
                    stroke: driveLevel === 'high' ? 'hsl(160, 84%, 39%)' :
                      driveLevel === 'medium' ? 'hsl(var(--primary))' :
                      'hsl(38, 92%, 50%)',
                  }}
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - drivePercentage)}`}
                  strokeLinecap="round"
                  style={{
                    stroke: driveLevel === 'high' ? 'hsl(160, 84%, 39%)' :
                      driveLevel === 'medium' ? 'hsl(var(--primary))' :
                      'hsl(38, 92%, 50%)',
                    transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </svg>
              {/* XIMAtar Image */}
              <div className="absolute inset-0 flex items-center justify-center p-3">
                {ximatarImage ? (
                  <div className="w-full h-full rounded-full overflow-hidden bg-background border-2 border-primary/20 shadow-lg shadow-primary/10">
                    <img 
                      src={ximatarImage} 
                      alt={ximatarName || 'XIMAtar'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center border-2 border-primary/20">
                    <Sparkles className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Drive percentage label */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <span className="text-[10px] font-bold text-muted-foreground bg-background/90 px-2 py-0.5 rounded-full border border-border/50 stat-value">
                  {Math.round(drivePercentage * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom momentum strip */}
      <div className="h-1 momentum-bar" />
    </div>
  );
};