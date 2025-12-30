import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChallengeProgressHeaderProps {
  invitationId: string;
  level: 1 | 2 | 3;
  completionPercent: number;
  saving: boolean;
  lastSaveTime: Date | null;
  estimatedMinutes?: number | null;
}

const TIMER_STORAGE_PREFIX = 'xima_challenge_timer_';
const DEFAULT_L1_DURATION = 25; // minutes
const DEFAULT_L2_DURATION = 35; // minutes

export function ChallengeProgressHeader({
  invitationId,
  level,
  completionPercent,
  saving,
  lastSaveTime,
  estimatedMinutes,
}: ChallengeProgressHeaderProps) {
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Calculate duration based on level and estimatedMinutes
  const durationMinutes = useMemo(() => {
    if (estimatedMinutes && estimatedMinutes > 0) return estimatedMinutes;
    return level === 2 ? DEFAULT_L2_DURATION : DEFAULT_L1_DURATION;
  }, [level, estimatedMinutes]);

  // Initialize timer from localStorage or set start time
  useEffect(() => {
    const storageKey = `${TIMER_STORAGE_PREFIX}${invitationId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const storedDate = new Date(stored);
      if (!isNaN(storedDate.getTime())) {
        setStartTime(storedDate);
      } else {
        // Invalid stored date, reset
        const now = new Date();
        localStorage.setItem(storageKey, now.toISOString());
        setStartTime(now);
      }
    } else {
      // First time - set start time
      const now = new Date();
      localStorage.setItem(storageKey, now.toISOString());
      setStartTime(now);
    }
  }, [invitationId]);

  // Update countdown every second
  useEffect(() => {
    if (!startTime) return;

    const updateRemaining = () => {
      const durationMs = durationMinutes * 60 * 1000;
      const elapsed = Date.now() - startTime.getTime();
      const remaining = durationMs - elapsed;
      setRemainingMs(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMinutes]);

  // Format remaining time
  const formattedRemaining = useMemo(() => {
    if (remainingMs === null) return null;
    if (remainingMs <= 0) return t('candidate.challenge.time_exceeded');

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingMs, t]);

  // Time warning states
  const isAlmostDone = remainingMs !== null && remainingMs > 0 && remainingMs <= 5 * 60 * 1000; // 5 min
  const isExceeded = remainingMs !== null && remainingMs <= 0;

  // Autosave status text
  const saveStatusText = useMemo(() => {
    if (saving) return t('challenge.saving');
    if (!lastSaveTime) return null;
    
    const diffMs = Date.now() - lastSaveTime.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return t('challenge.saved');
    return `${t('challenge.saved')} · ${diffMin}m`;
  }, [saving, lastSaveTime, t]);

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container max-w-3xl py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Completion progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Progress value={completionPercent} className="h-2" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {completionPercent === 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : null}
                <span className={cn(
                  "text-sm font-medium tabular-nums",
                  completionPercent === 100 ? "text-green-600" : "text-foreground"
                )}>
                  {completionPercent}%
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {t('candidate.challenge.progress_complete')}
                </span>
              </div>
            </div>
          </div>

          {/* Time remaining */}
          {formattedRemaining && (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md shrink-0",
              isExceeded && "bg-destructive/10 text-destructive",
              isAlmostDone && !isExceeded && "bg-yellow-500/10 text-yellow-600"
            )}>
              {isExceeded ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              <span className="text-sm font-medium tabular-nums">
                {isExceeded ? formattedRemaining : (
                  <>
                    {formattedRemaining}
                    <span className="hidden sm:inline ml-1 text-xs font-normal">
                      {t('candidate.challenge.time_remaining')}
                    </span>
                  </>
                )}
              </span>
              {isAlmostDone && !isExceeded && (
                <Badge variant="outline" className="hidden md:flex bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">
                  {t('candidate.challenge.almost_done')}
                </Badge>
              )}
            </div>
          )}

          {/* Autosave status */}
          {saveStatusText && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
              <span className="hidden sm:inline">{saveStatusText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
