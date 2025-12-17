/**
 * Challenge Time Window Utilities
 * Computes derived status and time-related display info
 */

export type ChallengeTimeStatus = 'upcoming' | 'active' | 'expired' | 'archived';

export interface ChallengeTimeInfo {
  timeStatus: ChallengeTimeStatus;
  remainingMs: number | null;
  remainingText: string | null;
  isExpiringSoon: boolean; // < 48h remaining
  canInvite: boolean;
  canSubmit: boolean;
}

/**
 * Compute the time-based status of a challenge
 */
export function getChallengeTimeStatus(
  startAt: string | null,
  endAt: string | null,
  manualStatus: string
): ChallengeTimeStatus {
  // Manual archived status takes precedence
  if (manualStatus === 'archived') return 'archived';
  
  // If no time window set, use manual status
  if (!startAt || !endAt) {
    return manualStatus === 'active' ? 'active' : 'upcoming';
  }

  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

/**
 * Get comprehensive time info for a challenge
 */
export function getChallengeTimeInfo(
  startAt: string | null,
  endAt: string | null,
  manualStatus: string
): ChallengeTimeInfo {
  const timeStatus = getChallengeTimeStatus(startAt, endAt, manualStatus);
  
  let remainingMs: number | null = null;
  let remainingText: string | null = null;
  let isExpiringSoon = false;

  if (endAt && (timeStatus === 'active' || timeStatus === 'upcoming')) {
    const now = new Date();
    const end = new Date(endAt);
    remainingMs = end.getTime() - now.getTime();

    if (remainingMs > 0) {
      remainingText = formatRemainingTime(remainingMs);
      isExpiringSoon = remainingMs < 48 * 60 * 60 * 1000; // 48 hours
    }
  }

  return {
    timeStatus,
    remainingMs,
    remainingText,
    isExpiringSoon,
    canInvite: timeStatus === 'active',
    canSubmit: timeStatus === 'active'
  };
}

/**
 * Format remaining time in human-readable format
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return `${days}d ${remainingHours}h left`;
  } else if (hours > 0) {
    return `${hours}h left`;
  } else {
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes}m left`;
  }
}

/**
 * Check if dates are valid for activation
 */
export function validateChallengeDates(
  startAt: string | null,
  endAt: string | null
): { valid: boolean; error?: string } {
  if (!startAt || !endAt) {
    return { valid: false, error: 'Start and end dates are required' };
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (end <= start) {
    return { valid: false, error: 'End date must be after start date' };
  }

  if (end <= now) {
    return { valid: false, error: 'End date must be in the future' };
  }

  return { valid: true };
}
