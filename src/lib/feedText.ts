import type { TFunction } from 'i18next';
import { ximatarDisplayName } from '@/lib/ximatarName';

interface FeedTextSource {
  feed_type?: string | null;
  title?: string | null;
  body?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * The feed items written by the database triggers are stored in English
 * (feed_on_assessment_complete, feed_on_cv_analysis,
 * feed_on_challenge_invitation). They are rewritten here in the reader's
 * language from their type and metadata; anything else is shown as stored.
 */
export const localizeFeedItem = (t: TFunction, item: FeedTextSource) => {
  const meta = item.metadata || {};
  const title = item.title || '';

  if (item.feed_type === 'milestone' && title.startsWith('Welcome, ')) {
    const name = ximatarDisplayName(t, (meta.ximatar as string) || null);
    return {
      title: name
        ? t('feed.items.assessment_complete.title', { ximatar: name, defaultValue: 'Welcome, {{ximatar}}!' })
        : t('feed.items.assessment_complete.title_generic', 'Your XIMAtar is ready'),
      body: t('feed.items.assessment_complete.body', 'Upload your CV to see where it tells your story and where it does not.'),
      action: t('feed.items.assessment_complete.action', 'Upload CV'),
    };
  }
  if (item.feed_type === 'milestone' && title === 'CV Analysis Complete') {
    return {
      title: t('feed.items.cv_analysis.title', 'CV analysis ready'),
      body: t('feed.items.cv_analysis.body', 'See how your CV tells your professional identity, and where it leaves something out.'),
      action: t('feed.items.cv_analysis.action', 'Read the analysis'),
    };
  }
  if (item.feed_type === 'challenge_invitation') {
    const company = (meta.company as string) || t('feed.items.challenge_invitation.a_company', 'A company');
    const role = meta.role as string | undefined;
    return {
      title: t('feed.items.challenge_invitation.title', { company, defaultValue: '{{company}} invited you' }),
      body: role
        ? t('feed.items.challenge_invitation.body_role', { role, defaultValue: 'Your profile fits what they look for as {{role}}. The challenge shows how you work.' })
        : t('feed.items.challenge_invitation.body', 'Your profile fits what they look for. The challenge shows how you work.'),
      action: t('feed.items.challenge_invitation.action', 'Open the challenge'),
    };
  }
  return { title, body: item.body || '', action: item.action_label || '' };
};
