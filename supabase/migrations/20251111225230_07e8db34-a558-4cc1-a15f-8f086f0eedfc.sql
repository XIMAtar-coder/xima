-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('challenge', 'job_offer', 'message', 'system')) NOT NULL,
    related_id UUID,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT 
USING (auth.uid() = recipient_id);

-- Businesses and admins can send notifications
CREATE POLICY "Businesses can send notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND 
  (has_role(auth.uid(), 'business') OR has_role(auth.uid(), 'admin'))
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Add is_public column to business_challenges if not exists
ALTER TABLE public.business_challenges 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Add is_public column to opportunities (job posts)
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Function to notify users when a new challenge is created
CREATE OR REPLACE FUNCTION notify_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if challenge is public
    IF NEW.is_public THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
        SELECT 
            p.user_id, 
            NEW.business_id, 
            'challenge', 
            NEW.id,
            'New Challenge: ' || NEW.title,
            'A new challenge from ' || COALESCE(bp.company_name, 'a company') || ' matches your XIMA profile.'
        FROM profiles p
        LEFT JOIN business_profiles bp ON bp.user_id = NEW.business_id
        WHERE p.user_id != NEW.business_id
          AND p.profile_complete = true
        LIMIT 50; -- Limit to avoid too many notifications
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new challenges
DROP TRIGGER IF EXISTS on_challenge_created ON public.business_challenges;
CREATE TRIGGER on_challenge_created
AFTER INSERT ON public.business_challenges
FOR EACH ROW EXECUTE FUNCTION notify_new_challenge();

-- Function to notify users when a new job offer is created
CREATE OR REPLACE FUNCTION notify_new_job()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if job is public
    IF NEW.is_public THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, related_id, title, message)
        SELECT 
            p.user_id, 
            auth.uid(), 
            'job_offer', 
            NEW.id,
            'New Job Offer: ' || NEW.title,
            'A new opportunity at ' || NEW.company || ' is now available.'
        FROM profiles p
        WHERE p.profile_complete = true
        LIMIT 50;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new job offers
DROP TRIGGER IF EXISTS on_job_created ON public.opportunities;
CREATE TRIGGER on_job_created
AFTER INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION notify_new_job();