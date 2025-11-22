-- Create mentor_availability_slots table for 15-minute booking slots
CREATE TABLE IF NOT EXISTS mentor_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mentor_slots_mentor_time 
  ON mentor_availability_slots(mentor_id, start_time, is_booked);

CREATE INDEX IF NOT EXISTS idx_mentor_slots_available 
  ON mentor_availability_slots(mentor_id, is_booked, start_time) 
  WHERE is_booked = false;

-- Enable RLS
ALTER TABLE mentor_availability_slots ENABLE ROW LEVEL SECURITY;

-- Users can view available slots of their assigned mentor
CREATE POLICY "Users can view their mentor's availability"
  ON mentor_availability_slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mentor_matches mm
      JOIN mentors m ON m.user_id = mm.mentor_user_id
      WHERE m.id = mentor_availability_slots.mentor_id
      AND mm.mentee_user_id = auth.uid()
    )
  );

-- Mentors can manage their own availability
CREATE POLICY "Mentors can manage their own slots"
  ON mentor_availability_slots FOR ALL
  TO authenticated
  USING (
    mentor_id IN (
      SELECT id FROM mentors WHERE user_id = auth.uid()
    )
  );

-- Service role can update bookings (for edge functions)
CREATE POLICY "Service can update bookings"
  ON mentor_availability_slots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes to appointments table for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_mentor 
  ON appointments(user_id, mentor_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status) WHERE status = 'scheduled';

-- Enable RLS on appointments if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;