/**
 * Challenge Level Definitions
 * 
 * This module defines the progressive challenge pipeline structure.
 * XIMA uses a 3-level system where business explicitly controls progression.
 * 
 * NO SCORES, NO GRADES, NO RANKINGS - this is orchestration only.
 */

export type ChallengeLevel = 1 | 2 | 3;

export interface LevelDefinition {
  level: ChallengeLevel;
  key: 'xima_core' | 'role_specific' | 'standing_presence';
  labelKey: string;
  descriptionKey: string;
  isMandatory: boolean;
}

export const CHALLENGE_LEVELS: Record<ChallengeLevel, LevelDefinition> = {
  1: {
    level: 1,
    key: 'xima_core',
    labelKey: 'levels.xima_core',
    descriptionKey: 'levels.xima_core_desc',
    isMandatory: true,
  },
  2: {
    level: 2,
    key: 'role_specific',
    labelKey: 'levels.role_specific',
    descriptionKey: 'levels.role_specific_desc',
    isMandatory: false,
  },
  3: {
    level: 3,
    key: 'standing_presence',
    labelKey: 'levels.standing_presence',
    descriptionKey: 'levels.standing_presence_desc',
    isMandatory: false,
  },
};

export interface CandidateLevelProgress {
  currentLevel: ChallengeLevel | null;
  completedLevels: ChallengeLevel[];
  nextAvailableLevel: ChallengeLevel | null;
  isComplete: boolean;
  canProgress: boolean;
}

/**
 * Determines which level a challenge belongs to based on its type/rubric
 */
export function getChallengeLevel(challenge: {
  rubric?: { type?: string } | null;
  title?: string;
}): ChallengeLevel {
  const rubricType = challenge?.rubric?.type;
  
  if (rubricType === 'xima_core') {
    return 1;
  }
  
  if (rubricType === 'standing_presence' || rubricType === 'video') {
    return 3;
  }
  
  // Default to Level 2 (role-specific) for custom challenges
  return 2;
}

/**
 * Computes a candidate's progress through the level pipeline
 * based on their completed submissions for a hiring goal
 */
export function computeLevelProgress(
  submissions: Array<{
    challenge_level?: ChallengeLevel;
    status: string;
  }>
): CandidateLevelProgress {
  const completed = submissions
    .filter(s => s.status === 'submitted' || s.status === 'reviewed')
    .map(s => s.challenge_level || 1)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .sort((a, b) => a - b) as ChallengeLevel[];

  const hasLevel1 = completed.includes(1);
  const hasLevel2 = completed.includes(2);
  const hasLevel3 = completed.includes(3);

  let nextAvailableLevel: ChallengeLevel | null = null;
  
  if (!hasLevel1) {
    nextAvailableLevel = 1;
  } else if (!hasLevel2) {
    nextAvailableLevel = 2;
  } else if (!hasLevel3) {
    nextAvailableLevel = 3;
  }

  // Current level is the one being worked on or most recently completed
  const inProgress = submissions.find(s => s.status === 'in_progress' || s.status === 'draft');
  const currentLevel = inProgress?.challenge_level || (completed.length > 0 ? completed[completed.length - 1] : null);

  return {
    currentLevel,
    completedLevels: completed,
    nextAvailableLevel,
    isComplete: hasLevel3,
    canProgress: nextAvailableLevel !== null,
  };
}

/**
 * Checks if a candidate can be invited to a specific level
 * Enforces: Level 1 first, then 2, then 3 (no skipping)
 */
export function canInviteToLevel(
  progress: CandidateLevelProgress,
  targetLevel: ChallengeLevel
): { allowed: boolean; reason?: string } {
  // Level 1 is always allowed (mandatory entry)
  if (targetLevel === 1) {
    if (progress.completedLevels.includes(1)) {
      return { allowed: false, reason: 'levels.already_completed_level' };
    }
    return { allowed: true };
  }

  // Level 2 requires Level 1 complete
  if (targetLevel === 2) {
    if (!progress.completedLevels.includes(1)) {
      return { allowed: false, reason: 'levels.requires_level_1' };
    }
    if (progress.completedLevels.includes(2)) {
      return { allowed: false, reason: 'levels.already_completed_level' };
    }
    return { allowed: true };
  }

  // Level 3 requires Level 2 complete
  if (targetLevel === 3) {
    if (!progress.completedLevels.includes(2)) {
      return { allowed: false, reason: 'levels.requires_level_2' };
    }
    if (progress.completedLevels.includes(3)) {
      return { allowed: false, reason: 'levels.already_completed_level' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'levels.invalid_level' };
}

/**
 * Gets uncertainty indicator text based on completed levels
 * This is qualitative, NOT a score
 */
export function getUncertaintyIndicator(
  progress: CandidateLevelProgress
): { key: string; level: 'high' | 'medium' | 'low' } {
  const completedCount = progress.completedLevels.length;

  if (completedCount === 0) {
    return { key: 'levels.uncertainty_high', level: 'high' };
  }
  
  if (completedCount === 1) {
    return { key: 'levels.uncertainty_medium', level: 'medium' };
  }
  
  if (completedCount === 2) {
    return { key: 'levels.uncertainty_low', level: 'medium' };
  }

  return { key: 'levels.uncertainty_minimal', level: 'low' };
}
