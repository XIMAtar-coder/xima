/**
 * Mentor cards in the reader's language. The mentors table keeps
 * `title_i18n`, `bio_i18n` and `specialties_i18n` next to the original
 * single-language columns; the cached copy in `profiles.mentor` keeps the
 * same keys when assign-mentor wrote it.
 */
export const pickI18n = <T = string>(obj: unknown, locale: string): T | null => {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, T>;
  const lang = locale.slice(0, 2).toLowerCase();
  return o[lang] || o.it || o.en || null;
};

export const localizedMentor = (m: any, locale: string): { title: string; bio: string; specialties: string[] } => {
  const bio = pickI18n<string>(m?.bio_i18n, locale) || m?.bio || '';
  return {
    title: (pickI18n<string>(m?.title_i18n, locale) || m?.title || '') as string,
    bio: bio as string,
    specialties: (pickI18n<string[]>(m?.specialties_i18n, locale) || m?.specialties || []) as string[],
  };
};
