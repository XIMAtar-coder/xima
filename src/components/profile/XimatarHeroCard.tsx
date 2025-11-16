import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle, Upload, Loader2 } from 'lucide-react';
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
    high: { color: 'bg-green-600', text: 'text-green-600', label: t('ximatar_intro.drive_paths.high', 'High Drive') },
    medium: { color: 'bg-blue-600', text: 'text-blue-600', label: t('ximatar_intro.drive_paths.medium', 'Medium Drive') },
    low: { color: 'bg-orange-600', text: 'text-orange-600', label: t('ximatar_intro.drive_paths.low', 'Low Drive') }
  };

  const driveConfig = driveLevel ? driveLevelConfig[driveLevel] : null;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 p-8">
          {/* Left: User Profile Photo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={fullName || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-3xl font-bold text-primary">
                    {getInitials()}
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <input
              type="file"
              id="avatar-upload"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={uploading}
              className="text-xs"
            >
              <Upload className="mr-1 h-3 w-3" />
              {uploading ? 'Uploading...' : 'Change Photo'}
            </Button>
          </div>

          {/* Center: XIMAtar Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('profile.your_ximatar', 'Your XIMAtar')}
                </span>
              </div>
              <h2 className="text-3xl font-bold font-heading text-foreground">
                {ximatarName || t('profile.ximatar_archetype', 'XIMAtar Archetype')}
              </h2>
            </div>

            {/* Drive Level Badge */}
            {driveConfig && (
              <Badge className={`${driveConfig.color} text-white px-4 py-1.5 text-sm`}>
                {driveConfig.label}
              </Badge>
            )}

            {/* Storytelling */}
            {storytelling && (
              <p className="text-muted-foreground leading-relaxed text-sm">
                {storytelling}
              </p>
            )}

            {/* Strongest & Weakest Pillars */}
            <div className="grid grid-cols-2 gap-4">
              {strongestPillar && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t('common.strongest', 'Your Edge')}
                    </span>
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {t(`pillars.${strongestPillar}.name`, strongestPillar)}
                  </p>
                </div>
              )}

              {weakestPillar && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t('common.area_to_develop', 'Growth Area')}
                    </span>
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {t(`pillars.${weakestPillar}.name`, weakestPillar)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: XIMAtar Image with Drive Ring */}
          <div className="relative flex items-center justify-center">
            <div className="relative">
              {/* Drive Progress Ring */}
              {driveLevel && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="4"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke={
                      driveLevel === 'high' ? 'hsl(142, 76%, 36%)' :
                      driveLevel === 'medium' ? 'hsl(221, 83%, 53%)' :
                      'hsl(25, 95%, 53%)'
                    }
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - (
                      driveLevel === 'high' ? 0.85 :
                      driveLevel === 'medium' ? 0.55 :
                      0.25
                    ))}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
              )}
              {ximatarImage ? (
                <img 
                  src={ximatarImage} 
                  alt={ximatarName || 'XIMAtar'} 
                  className="w-28 h-28 object-contain drop-shadow-2xl animate-fade-in relative z-10"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
