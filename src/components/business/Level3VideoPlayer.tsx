import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, AlertTriangle, Loader2, Video } from 'lucide-react';
import type { TFunction } from 'i18next';

interface Level3VideoPlayerProps {
  videoPath: string;
  payload: {
    video_url?: string;
    duration_seconds?: number;
    locale?: string;
    focus_lost_count?: number;
    prompts_shown?: string[];
  };
  t: TFunction;
}

export function Level3VideoPlayer({ videoPath, payload, t }: Level3VideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getSignedUrl() {
      setLoading(true);
      setError(null);

      try {
        // If videoPath is already a full URL (legacy), use it directly
        if (videoPath.startsWith('http')) {
          setSignedUrl(videoPath);
          setLoading(false);
          return;
        }

        // Create signed URL for private bucket access
        const { data, error: signError } = await supabase.storage
          .from('challenge-videos')
          .createSignedUrl(videoPath, 3600); // 1 hour expiry

        if (signError) {
          console.error('Error creating signed URL:', signError);
          setError('Unable to load video');
        } else if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting video URL:', err);
        setError('Unable to load video');
      } finally {
        setLoading(false);
      }
    }

    if (videoPath) {
      getSignedUrl();
    }
  }, [videoPath]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          {t('level3.standing.video_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">{t('common.loading')}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Video className="h-8 w-8" />
              <span className="text-sm">{error}</span>
            </div>
          ) : signedUrl ? (
            <video
              src={signedUrl}
              controls
              className="w-full h-full object-contain"
              controlsList="nodownload"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Video className="h-8 w-8" />
              <span className="text-sm">Video not available</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {payload.duration_seconds && (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(payload.duration_seconds / 60)}:{String(payload.duration_seconds % 60).padStart(2, '0')}
            </Badge>
          )}
          {payload.locale && (
            <Badge variant="outline">{payload.locale.toUpperCase()}</Badge>
          )}
          {payload.focus_lost_count && payload.focus_lost_count > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t('level3.standing.focus_lost', { count: payload.focus_lost_count })}
            </Badge>
          )}
        </div>
        
        {payload.prompts_shown && payload.prompts_shown.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {t('level3.standing.prompts_shown')} ({payload.prompts_shown.length})
            </summary>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
              {payload.prompts_shown.map((p: string, i: number) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
