-- XIMA — Indici sulle 53 foreign key non indicizzate

-- Additivo, idempotente (IF NOT EXISTS), nessun impatto su dati/RLS/logica.
-- Tabelle piccole oggi → creazione istantanea, nessun lock rilevante.
-- (In futuro, su tabelle molto grandi, valutare CREATE INDEX CONCURRENTLY fuori da una transazione.)

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_actioned_by ON public.admin_notifications (actioned_by);

CREATE INDEX IF NOT EXISTS idx_appointments_mentor_id ON public.appointments (mentor_id);

CREATE INDEX IF NOT EXISTS idx_assessment_cv_analysis_user_id ON public.assessment_cv_analysis (user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_evidence_ledger_open_response_id ON public.assessment_evidence_ledger (open_response_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment_id ON public.assessment_results (assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_ximatar_id ON public.assessment_results (ximatar_id);

CREATE INDEX IF NOT EXISTS idx_bookings_professional_id ON public.bookings (professional_id);

CREATE INDEX IF NOT EXISTS idx_business_challenges_hiring_goal_id ON public.business_challenges (hiring_goal_id);

CREATE INDEX IF NOT EXISTS idx_business_job_post_imports_job_post_id ON public.business_job_post_imports (job_post_id);

CREATE INDEX IF NOT EXISTS idx_business_job_post_imports_new_job_post_id ON public.business_job_post_imports (new_job_post_id);

CREATE INDEX IF NOT EXISTS idx_business_shortlists_hiring_goal_id ON public.business_shortlists (hiring_goal_id);

CREATE INDEX IF NOT EXISTS idx_candidate_challenges_challenge_id ON public.candidate_challenges (challenge_id);

CREATE INDEX IF NOT EXISTS idx_candidate_eligibility_hiring_goal_id ON public.candidate_eligibility (hiring_goal_id);

CREATE INDEX IF NOT EXISTS idx_candidate_shortlist_candidate_id ON public.candidate_shortlist (candidate_id);

CREATE INDEX IF NOT EXISTS idx_challenge_invitations_challenge_id ON public.challenge_invitations (challenge_id);

CREATE INDEX IF NOT EXISTS idx_challenge_invitations_hiring_goal_id ON public.challenge_invitations (hiring_goal_id);

CREATE INDEX IF NOT EXISTS idx_challenge_reviews_challenge_id ON public.challenge_reviews (challenge_id);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge_id ON public.challenge_submissions (challenge_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_created_by ON public.chat_threads (created_by);

CREATE INDEX IF NOT EXISTS idx_contact_sales_requests_business_id ON public.contact_sales_requests (business_id);

CREATE INDEX IF NOT EXISTS idx_cv_uploads_user_id ON public.cv_uploads (user_id);

CREATE INDEX IF NOT EXISTS idx_devplan_user_items_devplan_item_id ON public.devplan_user_items (devplan_item_id);

CREATE INDEX IF NOT EXISTS idx_eligibility_documents_eligibility_id ON public.eligibility_documents (eligibility_id);

CREATE INDEX IF NOT EXISTS idx_entitlement_events_user_id ON public.entitlement_events (user_id);

CREATE INDEX IF NOT EXISTS idx_feed_consumption_last_seen_feed_item_id ON public.feed_consumption (last_seen_feed_item_id);

CREATE INDEX IF NOT EXISTS idx_feed_seen_items_feed_item_id ON public.feed_seen_items (feed_item_id);

CREATE INDEX IF NOT EXISTS idx_flow_questions_question_id ON public.flow_questions (question_id);

CREATE INDEX IF NOT EXISTS idx_flow_questions_section_id ON public.flow_questions (section_id);

CREATE INDEX IF NOT EXISTS idx_hiring_goal_drafts_imported_from_listing_id ON public.hiring_goal_drafts (imported_from_listing_id);

CREATE INDEX IF NOT EXISTS idx_hiring_offers_shortlist_id ON public.hiring_offers (shortlist_id);

CREATE INDEX IF NOT EXISTS idx_intelligence_deposits_pattern_id ON public.intelligence_deposits (pattern_id);

CREATE INDEX IF NOT EXISTS idx_job_post_drafts_imported_job_id ON public.job_post_drafts (imported_job_id);

CREATE INDEX IF NOT EXISTS idx_job_posts_linked_hiring_goal_id ON public.job_posts (linked_hiring_goal_id);

CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_booked_by ON public.mentor_availability_slots (booked_by);

CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_booking_id ON public.mentor_availability_slots (booking_id);

CREATE INDEX IF NOT EXISTS idx_mentor_coaching_relationships_candidate_profile_id ON public.mentor_coaching_relationships (candidate_profile_id);

CREATE INDEX IF NOT EXISTS idx_mentor_cv_access_candidate_profile_id ON public.mentor_cv_access (candidate_profile_id);

CREATE INDEX IF NOT EXISTS idx_mentor_sessions_proposed_availability_slot_id ON public.mentor_sessions (proposed_availability_slot_id);

CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors (user_id);

CREATE INDEX IF NOT EXISTS idx_mutual_interest_chat_thread_id ON public.mutual_interest (chat_thread_id);

CREATE INDEX IF NOT EXISTS idx_mutual_interest_feed_item_id ON public.mutual_interest (feed_item_id);

CREATE INDEX IF NOT EXISTS idx_mutual_interest_hiring_goal_id ON public.mutual_interest (hiring_goal_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications (recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications (sender_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_chat_messages_sender_id ON public.pipeline_chat_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_chat_threads_shortlist_id ON public.pipeline_chat_threads (shortlist_id);

CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON public.professionals (user_id);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts (test_id);

CREATE INDEX IF NOT EXISTS idx_tests_devplan_item_id ON public.tests (devplan_item_id);

CREATE INDEX IF NOT EXISTS idx_user_opportunity_matches_opportunity_id ON public.user_opportunity_matches (opportunity_id);