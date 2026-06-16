/**
 * Supabase Database type definitions for MemoryBase.
 * 
 * In production, generate these with:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase-types.ts
 * 
 * These manually-defined types match the migration schema exactly.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          github_username: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          github_username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          github_username?: string | null;
          created_at?: string;
        };
        Relationships: never[];
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          model_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          model_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          model_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: never[];
      };
      chat_messages: {
        Row: {
          id: string;
          chat_id: string;
          role: 'user' | 'assistant';
          content: string;
          web_search_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: 'user' | 'assistant';
          content: string;
          web_search_used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          web_search_used?: boolean;
          created_at?: string;
        };
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Chat = Database['public']['Tables']['chats']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
