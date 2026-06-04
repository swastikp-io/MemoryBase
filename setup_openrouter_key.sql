-- Add OPEN_ROUTER_KEY column if it does not exist
ALTER TABLE public.early_access_invites 
ADD COLUMN IF NOT EXISTS "OPEN_ROUTER_KEY" TEXT;

-- Recreate the function to ensure it targets the correct column name for OpenRouter keys
CREATE OR REPLACE FUNCTION update_openrouter_key(p_email TEXT, p_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.early_access_invites
    SET "OPEN_ROUTER_KEY" = p_key
    WHERE email = p_email;
EXCEPTION
    WHEN undefined_column THEN
        -- Fallback to lowercase if that's how it was created
        UPDATE public.early_access_invites
        SET open_router_key = p_key
        WHERE email = p_email;
END;
$$;
