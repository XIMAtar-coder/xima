
-- Fix overly permissive RLS policy on mentor_availability_slots
-- Drop the policy that allows ANY authenticated user to update ANY slot
DROP POLICY IF EXISTS "Service can update bookings" ON mentor_availability_slots;

-- Recreate restricted to service_role only
CREATE POLICY "Service can update bookings"
  ON mentor_availability_slots FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
