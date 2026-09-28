import type { TFunction } from 'i18next';

const XIMATAR_IDS = ['bear', 'bee', 'cat', 'chameleon', 'dolphin', 'elephant', 'fox', 'horse', 'lion', 'owl', 'parrot', 'wolf'];

/**
 * The XIMAtar name in the reader's language. Profiles store whatever the
 * flow that created them had at hand: the id ("owl"), the English label
 * ("Owl") or an already translated name ("Gufo"). Ids and English labels
 * are translated; anything else is shown as it is.
 */
export const ximatarDisplayName = (t: TFunction, value: string | null | undefined): string | null => {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return XIMATAR_IDS.includes(key) ? (t(`ximatar.${key}.name`, { defaultValue: value.trim() }) as string) : value.trim();
};
