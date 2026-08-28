-- notify_challenge_submission() inserts a 'submission_to_review' notification for
-- the business on every transition into 'submitted'. That value is not in
-- notifications_type_check, so the INSERT raises 23514 — and because it happens
-- inside an AFTER trigger on challenge_submissions, it aborts the whole
-- transaction. The candidate's submit fails outright.
--
-- Reproduced by simulating a real candidate submitting a real draft row:
--   new row for relation "notifications" violates check constraint
--   "notifications_type_check"
--
-- Corroborated by the data: zero rows of type 'submission_to_review' exist, so
-- this notification has never once been delivered since the trigger was added.
--
-- 'advanced_level3' has the same problem: NotificationsDropdown routes it, and
-- the L3 advancement path emits it, but the constraint rejects it. Adding both
-- now rather than waiting for the second one to be reported.
--
-- The constraint stays a whitelist on purpose — it is what stops a typo'd type
-- becoming an unroutable notification the UI silently ignores. It just has to
-- list what the application actually emits.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type = any (array[
    'challenge',
    'challenge_invitation',
    'job_offer',
    'message',
    'system',
    'submission_received',
    'submission_to_review',
    'shortlisted',
    'followup_requested',
    'passed',
    'advanced_level2',
    'advanced_level3'
  ]));

comment on constraint notifications_type_check on public.notifications is
  'Whitelist of notification types. Every value here must be routed by NotificationsDropdown.handleNotificationClick, otherwise the notification renders but clicking it does nothing. Keep the two in sync when adding a type.';
