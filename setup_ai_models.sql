CREATE TABLE IF NOT EXISTS public.ai_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ai_models" ON public.ai_models
    FOR SELECT
    TO public
    USING (true);

INSERT INTO public.ai_models (id, name, model_name, provider, description, icon) VALUES
('fast-answers', 'Fast Answers', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'OpenRouter', 'Fast everyday responses', '⚡'),
('deep-research', 'Deep Research', 'moonshotai/kimi-k2.6:free', 'OpenRouter', 'Long-form reasoning and research', '🔍'),
('coding-task', 'Coding Task', 'openai/gpt-oss-120b:free', 'OpenRouter', 'Programming and debugging', '🟢'),
('medical-research', 'Medical Research', 'google/gemma-4-31b-it:free', 'OpenRouter', 'Medical and scientific research', '➕')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    model_name = EXCLUDED.model_name,
    provider = EXCLUDED.provider,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;
