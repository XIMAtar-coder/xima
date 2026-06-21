import { useState, useRef } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { prepareImageForUpload } from '@/lib/images/prepareImageForUpload';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface LogoUploaderProps {
  currentLogo?: string | null;
  onUpload: (url: string) => void;
}

export const LogoUploader = ({ currentLogo, onUpload }: LogoUploaderProps) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('business.logo.too_large', 'Il file è troppo grande (max 2MB)'));
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      toast.error(t('business.logo.wrong_type', 'Formato non supportato (PNG, JPG, SVG, WebP)'));
      return;
    }

    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // SVG passthrough; raster → webp 512px (EXIF-safe).
      const prepared = await prepareImageForUpload(file, { longSide: 512 });
      const filePath = `${user.id}/logo-${Date.now()}.${prepared.ext}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, prepared.file, {
          upsert: true,
          cacheControl: '604800',
          contentType: prepared.file.type,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      const { data: updated, error: updateError } = await supabase
        .from('business_profiles')
        .update({
          logo_url: urlData.publicUrl,
          logo_uploaded_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id)
        .select('user_id, logo_url');
      if (updateError) {
        console.error('[LogoUploader] business_profiles update failed', updateError);
        throw updateError;
      }
      if (!updated || updated.length === 0) {
        throw new Error('Business profile row not updated (auth/RLS mismatch).');
      }

      toast.success(t('business.logo.upload_success', 'Logo caricato con successo'));
      onUpload(urlData.publicUrl);
    } catch (err: any) {
      toast.error(err.message || t('business.logo.upload_error', 'Errore nel caricamento'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center">
        {currentLogo ? (
          <OptimizedImage
            src={currentLogo}
            alt="Company logo"
            width={80}
            height={80}
            objectFit="contain"
            className="w-full h-full"
            fallback={<Building2 className="w-8 h-8 text-muted-foreground" />}
          />
        ) : (
          <Building2 className="w-8 h-8 text-muted-foreground" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {currentLogo ? t('business.logo.change', 'Cambia logo') : t('business.logo.upload', 'Carica logo')}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('business.logo.hint', 'PNG, JPG, SVG o WebP — max 2MB')}
        </p>
      </div>
    </div>
  );
};
