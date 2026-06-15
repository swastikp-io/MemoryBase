import db from '../server/db/database.ts';
import { MemoryService } from '../server/services/memoryService.ts';
import { HybridMemoryRetrieval } from '../server/services/memory/hybridMemoryRetrieval.ts';
import { ContextBuilder } from '../server/services/memory/contextBuilder.ts';
import { DebugTraceStore } from '../server/services/memory/debugTraceStore.ts';
import { compileSystemPrompt } from '../server/personalization/promptCompiler.ts';
import { app } from '../server.ts';
import crypto from 'crypto';

async function runValidations() {
  console.log('--- START VALIDATION ---');
  const memoryService = new MemoryService();
  const hybridRetrieval = new HybridMemoryRetrieval();

  // Clean DB for user1
  db.prepare('INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)').run('user1', 'user1@test.com');
  db.prepare('INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)').run('user2', 'user2@test.com');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run('user1');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run('user2');

  console.log('\n--- Validation 1: End-to-End Memory Recall ---');
  await memoryService.createMemory('user1', 'My favorite programming language is Rust.', 'preference', 0.9);
  const rows1 = db.prepare('SELECT id, content, category, importance, memory_state, occurrence_count FROM memories WHERE user_id = ?').all('user1');
  console.log('### Stored Memory');
  console.log(JSON.stringify(rows1, null, 2));

  const retrieved1 = await hybridRetrieval.retrieve('user1', 'What programming language do I prefer?');
  console.log('### Retrieved Memories');
  console.log(JSON.stringify({ count: retrieved1.length, memories: retrieved1.map(r => r.memory.content) }, null, 2));

  const context1 = ContextBuilder.buildPrompt(retrieved1.map(r => r.memory), [], [], 'What programming language do I prefer?');
  console.log('### Context Builder Output');
  console.log(context1);


  console.log('\n--- Validation 2: Hybrid Retrieval Fallback ---');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run('user1');
  
  // Create a memory, but force embedding_status to failed
  const mem2 = await memoryService.createMemory('user1', 'I live in Mumbai.', 'location', 0.9);
  db.prepare('UPDATE memories SET embedding_status = ? WHERE id = ?').run('failed', mem2!.id);

  const retrieved2 = await hybridRetrieval.retrieve('user1', 'Where do I live?');
  console.log('### Retrieved Memories with source');
  console.log(`Returned Memories: ${retrieved2.length}`);
  if (retrieved2.length > 0) {
    console.log(`Source used: ${retrieved2[0].source}`);
  }


  console.log('\n--- Validation 3: Zero Vector Protection ---');
  const pragma = db.prepare('PRAGMA table_info(memories)').all();
  console.log('### Schema Columns');
  console.log(pragma.map((c: any) => c.name).join(', '));
  const row3 = db.prepare('SELECT content, embedding_status FROM memories WHERE id = ?').get(mem2!.id);
  console.log('### Failed Embedding Row');
  console.log(JSON.stringify(row3, null, 2));


  console.log('\n--- Validation 4: Conflict Resolution ---');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run('user1');
  await memoryService.createMemory('user1', 'My favorite language is Python.', 'preference', 0.8);
  await memoryService.createMemory('user1', 'My favorite language is now TypeScript.', 'preference', 0.9);
  const rows4 = db.prepare('SELECT content, memory_state FROM memories WHERE user_id = ?').all('user1');
  console.log('### Database Rows');
  console.log(JSON.stringify(rows4, null, 2));


  console.log('\n--- Validation 5: Semantic Deduplication ---');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run('user1');
  await memoryService.createMemory('user1', 'My startup is Paralex.', 'work', 0.8);
  await memoryService.createMemory('user1', 'User startup is Paralex.', 'work', 0.8);
  await memoryService.createMemory('user1', 'My startup is called Paralex.', 'work', 0.8);
  const rows5 = db.prepare('SELECT content, occurrence_count, memory_state FROM memories WHERE user_id = ?').all('user1');
  console.log('### Database Rows');
  console.log(JSON.stringify(rows5, null, 2));


  console.log('\n--- Validation 6: Context Injection ---');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run('user1');
  await memoryService.createMemory('user1', 'I am building Paralex.', 'work', 0.9);
  await memoryService.createMemory('user1', 'My favorite language is Rust.', 'preference', 0.9);
  
  const retrieved6 = await hybridRetrieval.retrieve('user1', 'Give me startup ideas.');
  const context6 = ContextBuilder.buildPrompt(retrieved6.map(r => r.memory), [], [], 'Give me startup ideas.');
  console.log('### Context Builder Output');
  console.log(context6);

  // Note: For actual Prompt Compiler we will check compileSystemPrompt directly.
  const finalPrompt = compileSystemPrompt({
    aboutUser: '',
    responseStyle: '',
    memories: retrieved6.map(r => r.memory.content)
  });
  console.log('### Final Prompt Snippet');
  console.log(finalPrompt.substring(finalPrompt.indexOf('# User Memories')));

  
  console.log('\n--- Validation 7: Security ---');
  const mem7 = await memoryService.createMemory('user1', 'Secret memory', 'secret', 0.9);
  try {
    memoryService.deleteMemoryForUser('user2', mem7!.id);
    console.log('Deleted successfully (FAIL)');
  } catch (e: any) {
    console.log(`Attempted delete by user2. Result: ${e.message}`);
  }


  console.log('\n--- Validation 8: Debug Endpoint ---');
  const trace = DebugTraceStore.create('user1', 'Test query');
  DebugTraceStore.update(trace.requestId, {
    retrievedMemories: [{ id: '1', content: 'Test memory', score: 0.9, similarity: 0.8, source: 'semantic' }],
    contextBuilderOutput: 'Test context',
    finalPromptPreview: 'Test prompt',
    llmResponse: 'Test response',
    extractedMemories: [],
    storedMemories: []
  });
  const storedTrace = DebugTraceStore.get(trace.requestId);
  console.log(JSON.stringify(storedTrace, null, 2));

  console.log('\n--- END VALIDATION ---');
}

runValidations().catch(console.error);
