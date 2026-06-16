-- Migration: Create provider_logs table
-- Purpose: Monitor provider health and LLM request latency

CREATE TABLE IF NOT EXISTS public.provider_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    request_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    latency_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying recent errors and latencies
CREATE INDEX IF NOT EXISTS idx_provider_logs_created_at ON public.provider_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_logs_request_type ON public.provider_logs (request_type);
