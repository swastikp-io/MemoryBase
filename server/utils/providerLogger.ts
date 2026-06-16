import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface ProviderLogEntry {
  provider: string;
  model: string;
  request_type: string;
  success: boolean;
  error_message?: string;
  latency_ms: number;
}

export class ProviderLogger {
  static async log(entry: ProviderLogEntry) {
    try {
      const { error } = await supabaseAdmin
        .from('provider_logs')
        .insert({
          provider: entry.provider,
          model: entry.model,
          request_type: entry.request_type,
          success: entry.success,
          error_message: entry.error_message || null,
          latency_ms: Math.round(entry.latency_ms),
        });

      if (error) {
        console.error('[ProviderLogger] Failed to write log:', error.message);
      }
    } catch (e) {
      console.error('[ProviderLogger] Exception writing log:', e);
    }
  }
}
