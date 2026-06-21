import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { prepareImageForUpload } from '@/lib/images/prepareImageForUpload';

export const ProfilePhotoUpload: React.FC = () => {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatar?.image || null
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
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
      // Downscale + re-encode (webp 512px, EXIF-safe) BEFORE upload.
      const prepared = await prepareImageForUpload(file, { longSide: 512 });
      const fileName = `${user.id}-${Date.now()}.${prepared.ext}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, prepared.file, {
          upsert: true,
          cacheControl: '604800',
          contentType: prepared.file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Persist on profile (jsonb 'avatar' column read as user.avatar.image).
      const avatarValue = { image: publicUrl, type: 'custom' as const };
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar: avatarValue,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select('user_id, avatar');

      if (updateError) {
        console.error('[ProfilePhotoUpload] profile update failed', updateError);
        throw updateError;
      }
      if (!updated || updated.length === 0) {
        const err = new Error('Profile row not updated (auth/RLS mismatch). User: ' + user.id);
        console.error('[ProfilePhotoUpload]', err);
        throw err;
      }

      setAvatarUrl(publicUrl);
      toast.success('Profile photo updated');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="animate-[fade-in_0.4s_ease-out]">
      <CardHeader>
        <CardTitle>Profile Photo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {/* Photo Preview */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[hsl(var(--xima-accent))]/10 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-4xl font-bold text-[hsl(var(--xima-accent))]">
              {getInitials()}
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex flex-col items-center gap-2">
          <input
            type="file"
            id="photo-upload"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <Button
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={uploading}
            className="bg-[hsl(var(--xima-accent))] hover:bg-[hsl(var(--xima-accent))]/90 transition-all hover:shadow-lg hover:shadow-[hsl(var(--xima-accent))]/30"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Change Photo
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WEBP. Max 2MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
