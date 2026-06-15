import db from '../db/database.ts';
import { Memory } from '../types/memory.ts';
import crypto from 'crypto';

export class MemoryRepository {
  private parseMemory(row: any): Memory | undefined {
    if (!row) return undefined;
    return {
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined
    };
  }

  create(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Memory {
    const id = crypto.randomUUID();
    const importance = memory.importance ?? 0.5;
    const embeddingStr = memory.embedding ? JSON.stringify(memory.embedding) : null;
    const stmt = db.prepare(`
      INSERT INTO memories (
        id, user_id, content, category, importance, embedding,
        embedding_status, memory_state, occurrence_count, last_seen_at, superseded_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `);
    stmt.run(
      id,
      memory.user_id,
      memory.content,
      memory.category || null,
      importance,
      embeddingStr,
      memory.embedding_status || (memory.embedding ? 'completed' : 'pending'),
      memory.memory_state || 'active',
      memory.occurrence_count || 1,
      memory.superseded_by || null
    );
    
    return this.findById(id)!;
  }

  findById(id: string): Memory | undefined {
    const stmt = db.prepare(`SELECT * FROM memories WHERE id = ?`);
    return this.parseMemory(stmt.get(id));
  }

  findByUserId(userId: string): Memory[] {
    const stmt = db.prepare(`SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC`);
    return stmt.all(userId).map((row: any) => this.parseMemory(row) as Memory);
  }

  findActiveByUserId(userId: string): Memory[] {
    const stmt = db.prepare(`
      SELECT * FROM memories
      WHERE user_id = ? AND COALESCE(memory_state, 'active') = 'active'
      ORDER BY last_seen_at DESC, created_at DESC
    `);
    return stmt.all(userId).map((row: any) => this.parseMemory(row) as Memory);
  }

  findByContent(userId: string, content: string): Memory | undefined {
    const stmt = db.prepare(`SELECT * FROM memories WHERE user_id = ? AND content = ? AND COALESCE(memory_state, 'active') = 'active' LIMIT 1`);
    return this.parseMemory(stmt.get(userId, content));
  }

  update(id: string, updates: Partial<Pick<Memory, 'content' | 'category' | 'importance' | 'embedding' | 'embedding_status' | 'memory_state' | 'occurrence_count' | 'last_seen_at' | 'superseded_by'>>): Memory | undefined {
    const current = this.findById(id);
    if (!current) return undefined;

    const content = updates.content !== undefined ? updates.content : current.content;
    const category = updates.category !== undefined ? updates.category : current.category;
    const importance = updates.importance !== undefined ? updates.importance : current.importance;
    const embedding = updates.embedding !== undefined ? JSON.stringify(updates.embedding) : (current.embedding ? JSON.stringify(current.embedding) : null);
    const embeddingStatus = updates.embedding_status !== undefined ? updates.embedding_status : (current.embedding_status || 'pending');
    const memoryState = updates.memory_state !== undefined ? updates.memory_state : (current.memory_state || 'active');
    const occurrenceCount = updates.occurrence_count !== undefined ? updates.occurrence_count : (current.occurrence_count || 1);
    const lastSeenAt = updates.last_seen_at !== undefined ? updates.last_seen_at : (current.last_seen_at || current.updated_at);
    const supersededBy = updates.superseded_by !== undefined ? updates.superseded_by : (current.superseded_by || null);

    const stmt = db.prepare(`
      UPDATE memories 
      SET content = ?, category = ?, importance = ?, embedding = ?, embedding_status = ?,
          memory_state = ?, occurrence_count = ?, last_seen_at = ?, superseded_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(content, category, importance, embedding, embeddingStatus, memoryState, occurrenceCount, lastSeenAt, supersededBy, id);

    return this.findById(id);
  }

  softDelete(id: string): boolean {
    const stmt = db.prepare(`UPDATE memories SET memory_state = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    const info = stmt.run(id);
    return info.changes > 0;
  }

  delete(id: string): boolean {
    return this.softDelete(id);
  }

  markSuperseded(id: string, supersededBy: string): boolean {
    const stmt = db.prepare(`
      UPDATE memories
      SET memory_state = 'superseded', superseded_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(supersededBy, id);
    return info.changes > 0;
  }
}
