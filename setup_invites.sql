-- Create early access invites table
CREATE TABLE IF NOT EXISTS public.early_access_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    invite_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (deny all by default)
ALTER TABLE public.early_access_invites ENABLE ROW LEVEL SECURITY;

-- Create secure verification function
CREATE OR REPLACE FUNCTION verify_invite_code(p_email TEXT, p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.early_access_invites 
        WHERE email = p_email AND invite_code = p_code
    ) INTO is_valid;
    
    RETURN is_valid;
END;
$$;

-- Insert the first user
INSERT INTO public.early_access_invites (email, invite_code)
VALUES ('dev.swastikpatel0305@gmail.com', 'PARALEX2025')
ON CONFLICT (email) DO NOTHING;
