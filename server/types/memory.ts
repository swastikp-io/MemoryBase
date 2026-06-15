export interface User {
  id: string;
  email: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  category?: string | null;
  importance: number;
  embedding?: number[];
  embedding_status?: 'pending' | 'completed' | 'failed';
  memory_state?: 'active' | 'superseded' | 'deleted';
  occurrence_count?: number;
  last_seen_at?: string;
  superseded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  user_id: string;
  summary: string;
  embedding?: number[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string | null;
  mode: string;
  created_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}
