import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image, Loader2, CheckCircle } from 'lucide-react';

interface MentorAvatarUploadProps {
  mentorId: string;
  currentImageUrl: string | null;
  onUploadSuccess: (newUrl: string) => void;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function MentorAvatarUpload({ 
  mentorId, 
  currentImageUrl, 
  onUploadSuccess 
}: MentorAvatarUploadProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: t('mentor.avatar_invalid_type', 'Invalid file type'),
        description: t('mentor.avatar_allowed_types', 'Please upload a JPG, PNG, or WebP image'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t('mentor.avatar_too_large', 'File too large'),
        description: t('mentor.avatar_max_size', 'Maximum file size is 4MB'),
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar.${ext}`;
      const filePath = `${mentorId}/${fileName}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('mentor-avatars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        console.error('[MentorAvatarUpload] Upload error:', uploadError);
        throw uploadError;
      }

      setUploadProgress(95);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('mentor-avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Add cache buster
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      // Update mentor record
      const { error: updateError } = await supabase
        .from('mentors')
        .update({
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mentorId);

      if (updateError) {
        console.error('[MentorAvatarUpload] Update error:', updateError);
        throw updateError;
      }

      setUploadProgress(100);

      toast({
        title: t('mentor.avatar_success', 'Photo updated'),
        description: t('mentor.avatar_success_desc', 'Your profile photo has been updated'),
      });

      onUploadSuccess(publicUrl);
      
      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('[MentorAvatarUpload] Error:', error);
      toast({
        title: t('mentor.avatar_error', 'Upload failed'),
        description: error.message || t('mentor.avatar_error_desc', 'Failed to upload photo. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-4">
      <Label>{t('mentor.avatar_label', 'Profile Photo')}</Label>
      
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted ring-2 ring-primary/20 flex-shrink-0">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {!selectedFile ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('mentor.avatar_choose', 'Choose Photo')}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('mentor.avatar_uploading', 'Uploading...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {t('mentor.avatar_upload', 'Upload')}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={uploading}
                  size="icon"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}

          {uploading && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          <p className="text-xs text-muted-foreground">
            {t('mentor.avatar_hint', 'JPG, PNG, or WebP. Max 4MB.')}
          </p>
        </div>
      </div>
    </div>
  );
}
