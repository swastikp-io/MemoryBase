CREATE OR REPLACE FUNCTION update_hf_token(p_email TEXT, p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try updating if the column is exactly "HF_TOKEN"
    UPDATE public.early_access_invites
    SET "HF_TOKEN" = p_token
    WHERE email = p_email;
EXCEPTION
    WHEN undefined_column THEN
        -- Fallback to lowercase "hf_token" if that's how it was created
        UPDATE public.early_access_invites
        SET hf_token = p_token
        WHERE email = p_email;
END;
$$;
