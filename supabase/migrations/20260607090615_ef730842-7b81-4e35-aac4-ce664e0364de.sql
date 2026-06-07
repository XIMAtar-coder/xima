DELETE FROM public.feed_items WHERE candidate_profile_id = '5218a7a2-3a79-4c3b-a435-a2376d0aeb04' AND (metadata->>'challenge_id') = '34abbebd-b221-40d8-b174-0f45869b995c';
DELETE FROM public.challenge_submissions WHERE id = '33c7a111-bc40-4044-a3a5-3bd29b6314ae';
UPDATE public.challenge_invitations SET status = 'invited', responded_at = NULL WHERE id = 'dd8fd3bf-a0b3-4527-a088-f759d3769bb5';