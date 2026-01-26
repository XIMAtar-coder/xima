-- Create company_legal table for legal/compliance data (separate from marketing profile)
CREATE TABLE public.company_legal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE,
  legal_name TEXT,
  street_address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  vat_number TEXT,
  registration_number TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_business_legal FOREIGN KEY (business_id) 
    REFERENCES public.business_profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.company_legal ENABLE ROW LEVEL SECURITY;

-- Policy: Business admins can view their own company legal info
CREATE POLICY "Business can view own legal info"
ON public.company_legal
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Business admins can insert their own company legal info
CREATE POLICY "Business can insert own legal info"
ON public.company_legal
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Business admins can update their own company legal info
CREATE POLICY "Business can update own legal info"
ON public.company_legal
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Policy: Business admins can delete their own company legal info
CREATE POLICY "Business can delete own legal info"
ON public.company_legal
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Admin access policies
CREATE POLICY "Admins can view all legal info"
ON public.company_legal
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update all legal info"
ON public.company_legal
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Create updated_at trigger
CREATE TRIGGER update_company_legal_updated_at
BEFORE UPDATE ON public.company_legal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_company_legal_business_id ON public.company_legal(business_id);

COMMENT ON TABLE public.company_legal IS 'Stores company legal/compliance data separate from marketing profile for GDPR compliance';