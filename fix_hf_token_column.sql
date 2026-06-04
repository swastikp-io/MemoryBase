-- Add HF_TOKEN column if it does not exist
ALTER TABLE public.early_access_invites 
ADD COLUMN IF NOT EXISTS "HF_TOKEN" TEXT;

-- Recreate the function to ensure it targets the correct column name
CREATE OR REPLACE FUNCTION update_hf_token(p_email TEXT, p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.early_access_invites
    SET "HF_TOKEN" = p_token
    WHERE email = p_email;
END;
$$;
