import db from '../db/database.ts';
import { Episode } from '../types/memory.ts';
import crypto from 'crypto';

export class EpisodeRepository {
  private parseEpisode(row: any): Episode | undefined {
    if (!row) return undefined;
    return {
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined
    };
  }

  create(episode: Omit<Episode, 'id' | 'created_at'>): Episode {
    const id = crypto.randomUUID();
    const embeddingStr = episode.embedding ? JSON.stringify(episode.embedding) : null;
    const stmt = db.prepare(`
      INSERT INTO episodes (id, user_id, summary, embedding)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, episode.user_id, episode.summary, embeddingStr);
    
    return this.findById(id)!;
  }

  findById(id: string): Episode | undefined {
    const stmt = db.prepare(`SELECT * FROM episodes WHERE id = ?`);
    return this.parseEpisode(stmt.get(id));
  }

  findByUserId(userId: string): Episode[] {
    const stmt = db.prepare(`SELECT * FROM episodes WHERE user_id = ? ORDER BY created_at DESC`);
    return stmt.all(userId).map((row: any) => this.parseEpisode(row) as Episode);
  }

  delete(id: string): boolean {
    const stmt = db.prepare(`DELETE FROM episodes WHERE id = ?`);
    const info = stmt.run(id);
    return info.changes > 0;
  }
}
