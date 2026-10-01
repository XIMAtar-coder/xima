import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { log } from '@/lib/log';

/**
 * The next confirmed session, said out loud at the top of the page: both
 * sides had the link but nothing told them a meeting was about to start.
 * Shown from 24 hours before until the session ends; the room opens 10
 * minutes before the start.
 */
type NextSession = { id: string; starts_at: string; ends_at: string; counterpart: string | null };

const JOIN_WINDOW_MS = 10 * 60 * 1000;
const SHOW_WINDOW_MS = 24 * 60 * 60 * 1000;

export const NextSessionBanner: React.FC<{ role: 'candidate' | 'mentor'; mentorId?: string | null; className?: string }> = ({ role, mentorId, className }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [session, setSession] = useState<NextSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      let filterColumn: 'candidate_profile_id' | 'mentor_id' = 'mentor_id';
      let filterValue: string | null = mentorId ?? null;
      let counterpart: string | null = null;

      if (role === 'candidate') {
        const { data: profile } = await supabase.from('profiles').select('id, mentor').eq('user_id', user.id).maybeSingle();
        filterColumn = 'candidate_profile_id';
        filterValue = profile?.id ?? null;
        counterpart = ((profile?.mentor as { name?: string } | null)?.name) ?? null;
      }
      if (!filterValue) { setSession(null); return; }

      const { data } = await supabase
        .from('mentor_sessions')
        .select('id, starts_at, ends_at')
        .eq(filterColumn, filterValue)
        .eq('status', 'confirmed')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1);
      const next = data?.[0];
      if (!next) { setSession(null); return; }

      if (role === 'mentor') {
        const { data: names } = await (supabase.rpc as any)('mentor_session_candidates', { p_session_ids: [next.id] });
        counterpart = names?.[0]?.candidate_name ?? null;
      }
      setSession({ id: next.id, starts_at: next.starts_at, ends_at: next.ends_at, counterpart });
    } catch (e) {
      log.warn('[NextSessionBanner] load failed', e);
    }
  }, [user?.id, role, mentorId]);

  useEffect(() => {
    load();
    const refetch = setInterval(load, 60_000);
    const tick = setInterval(() => setNow(Date.now()), 20_000);
    return () => { clearInterval(refetch); clearInterval(tick); };
  }, [load]);

  if (!session) return null;
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();
  if (now > end || start - now > SHOW_WINDOW_MS) return null;

  const live = now >= start;
  const joinable = now >= start - JOIN_WINDOW_MS;
  const minutes = Math.max(1, Math.ceil((start - now) / 60_000));
  const name = session.counterpart || t(role === 'candidate' ? 'sessions.next_your_mentor' : 'sessions.next_the_candidate');
  const when = new Date(session.starts_at).toLocaleString(i18n.language, { weekday: 'long', hour: '2-digit', minute: '2-digit' });

  const headline = live
    ? t('sessions.next_live', { name })
    : joinable
      ? t('sessions.next_soon', { name, minutes })
      : t('sessions.next_scheduled', { name, when });

  return (
    <div
      role="status"
      className={`mb-5 flex flex-col gap-3 rounded-[10px] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${joinable ? 'border-primary/40 bg-primary/5' : 'border-[hsl(var(--xs-line))] bg-card'} ${className ?? ''}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {joinable
          ? <Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          : <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">{headline}</p>
          <p className="text-[13px] text-muted-foreground">
            {joinable ? t('sessions.next_room_open') : t('sessions.next_room_opens')}
          </p>
        </div>
      </div>
      {joinable ? (
        <Button onClick={() => navigate(`/sessions/${session.id}/room`)} className="shrink-0 gap-2">
          <Video className="h-4 w-4" aria-hidden="true" />
          {t('sessions.next_join')}
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => navigate(role === 'mentor' ? `/mentor/calendar/${session.id}` : `/sessions/${session.id}`)}
          className="shrink-0"
        >
          {t('sessions.next_details')}
        </Button>
      )}
    </div>
  );
};

export default NextSessionBanner;
