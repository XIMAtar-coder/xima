import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  Video,
  Camera,
  FileVideo,
  Upload,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
  File,
  RefreshCw,
} from 'lucide-react';

interface StandingUploadModeProps {
  context: {
    invitationId: string;
    challengeId: string;
    businessId: string;
    hiringGoalId: string;
    candidateProfileId: string;
    companyName: string;
    roleTitle: string | null;
    locale: string;
  };
  submissionId: string | null;
  onSubmitted: (submissionId: string, submittedAt: string) => void;
  onBack: () => void;
}

interface VideoMeta {
  file: File;
  name: string;
  size: number;
  duration: number | null;
  previewUrl: string;
  type: string;
}

const MAX_FILE_SIZE_MB = 200;
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mpeg'];

export default function StandingUploadMode({
  context,
  submissionId,
  onSubmitted,
  onBack,
}: StandingUploadModeProps) {
  const { t } = useTranslation();
  
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Hidden file input refs
  const captureInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Cleanup object URL on unmount or when video changes
  useEffect(() => {
    return () => {
      if (videoMeta?.previewUrl) {
        URL.revokeObjectURL(videoMeta.previewUrl);
      }
    };
  }, [videoMeta?.previewUrl]);

  // Handle file selection (from either input)
  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: t('level3.standing.upload.invalid_file_type'),
        description: t('level3.standing.upload.allowed_types'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      toast({
        title: t('level3.standing.upload.file_too_large'),
        description: t('level3.standing.upload.max_size', { size: MAX_FILE_SIZE_MB }),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Try to get duration
    let duration: number | null = null;
    try {
      duration = await getVideoDuration(file);
    } catch (err) {
      console.warn('Could not read video duration:', err);
      // Don't block - duration is optional
    }

    // Clear previous preview URL if exists
    if (videoMeta?.previewUrl) {
      URL.revokeObjectURL(videoMeta.previewUrl);
    }

    setVideoMeta({
      file,
      name: file.name,
      size: file.size,
      duration,
      previewUrl,
      type: file.type,
    });
    setIsLoading(false);
  }, [t, videoMeta?.previewUrl]);

  // Get video duration using a temporary video element
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Timeout'));
      }, 10000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        if (video.duration && isFinite(video.duration)) {
          resolve(Math.round(video.duration));
        } else {
          reject(new Error('Invalid duration'));
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        reject(new Error('Video load error'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Handle capture input change
  const handleCaptureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  // Clear selected video
  const handleClearVideo = () => {
    if (videoMeta?.previewUrl) {
      URL.revokeObjectURL(videoMeta.previewUrl);
    }
    setVideoMeta(null);
  };

  // Upload the video
  const handleUpload = async () => {
    if (!videoMeta || !context) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Determine file extension from type
      let ext = 'mp4';
      if (videoMeta.type === 'video/webm') ext = 'webm';
      else if (videoMeta.type === 'video/quicktime') ext = 'mov';
      else if (videoMeta.type === 'video/x-m4v') ext = 'm4v';

      const fileName = `standing/${context.candidateProfileId}/${context.invitationId}.${ext}`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('challenge-videos')
        .upload(fileName, videoMeta.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: videoMeta.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      setUploadProgress(70);

      // Create submission payload
      const submissionPayload = {
        video_url: fileName,
        duration_seconds: videoMeta.duration || null,
        upload_mode: 'file_picker',
        file_name: videoMeta.name,
        file_size_bytes: videoMeta.size,
        locale: context.locale,
        submitted_at: new Date().toISOString(),
      };

      setUploadProgress(85);

      let newSubmissionId = submissionId;
      const now = new Date().toISOString();

      if (submissionId) {
        await supabase
          .from('challenge_submissions')
          .update({
            submitted_payload: submissionPayload,
            status: 'submitted',
            submitted_at: now,
          })
          .eq('id', submissionId);
      } else {
        const { data: newSubmission } = await supabase
          .from('challenge_submissions')
          .insert({
            invitation_id: context.invitationId,
            candidate_profile_id: context.candidateProfileId,
            business_id: context.businessId,
            hiring_goal_id: context.hiringGoalId,
            challenge_id: context.challengeId,
            submitted_payload: submissionPayload,
            status: 'submitted',
            submitted_at: now,
          })
          .select('id')
          .single();

        if (newSubmission) {
          newSubmissionId = newSubmission.id;
        }
      }

      setUploadProgress(100);

      toast({ title: t('level3.standing.submitted_success') });
      
      // Cleanup
      URL.revokeObjectURL(videoMeta.previewUrl);
      
      onSubmitted(newSubmissionId || '', now);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: t('common.error'),
        description: t('level3.standing.upload_failed'),
        variant: 'destructive',
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if device likely supports camera capture
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Uploading state
  if (isUploading) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardContent className="py-8 text-center space-y-4">
          <Upload className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <div>
            <p className="font-medium">{t('level3.standing.uploading')}</p>
            <p className="text-sm text-muted-foreground">{t('level3.standing.uploading_desc')}</p>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg w-full mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('level3.standing.upload.title')}
        </CardTitle>
        <CardDescription>
          {t('level3.standing.upload.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden inputs */}
        <input
          ref={captureInputRef}
          type="file"
          accept="video/*"
          capture="user"
          onChange={handleCaptureChange}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* No video selected */}
        {!videoMeta && !isLoading && (
          <div className="space-y-4">
            {/* Record button */}
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => captureInputRef.current?.click()}
            >
              <Camera className="h-5 w-5 mr-2" />
              {t('level3.standing.upload.record_video_now')}
            </Button>
            
            {!isMobile && (
              <p className="text-xs text-muted-foreground text-center">
                {t('level3.standing.upload.camera_desktop_hint')}
              </p>
            )}

            {/* Choose existing button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileVideo className="h-5 w-5 mr-2" />
              {t('level3.standing.upload.choose_existing_video')}
            </Button>

            {/* Limits info */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>{t('level3.standing.upload.max_size', { size: MAX_FILE_SIZE_MB })}</p>
              <p>{t('level3.standing.upload.allowed_types')}</p>
            </div>

            <Button variant="ghost" onClick={onBack} className="w-full">
              {t('common.back')}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('level3.standing.upload.processing')}
            </p>
          </div>
        )}

        {/* Video selected - preview */}
        {videoMeta && !isLoading && (
          <div className="space-y-4">
            {/* Video preview */}
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              <video
                ref={previewVideoRef}
                src={videoMeta.previewUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Video metadata */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="truncate flex-1">{videoMeta.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(videoMeta.size)}</span>
                {videoMeta.duration !== null && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(videoMeta.duration)}</span>
                  </>
                )}
              </div>
              {videoMeta.duration === null && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {t('level3.standing.upload.could_not_read_duration')}
                </div>
              )}
            </div>

            {/* Ready to upload badge */}
            <Badge variant="secondary" className="w-full justify-center py-2">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              {t('level3.standing.upload.upload_ready')}
            </Badge>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClearVideo} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('level3.standing.upload.replace_video')}
              </Button>
              <Button onClick={handleUpload} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                {t('level3.standing.upload.upload_button')}
              </Button>
            </div>

            <Button variant="ghost" onClick={onBack} className="w-full">
              {t('common.back')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
