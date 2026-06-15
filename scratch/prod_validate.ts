import db from '../server/db/database.ts';
process.env.LAMBDA_TASK_ROOT = "1";
import { MemoryService } from '../server/services/memoryService.ts';
import http from 'http';

let server: http.Server | null = null;
const PORT = 3005;

async function startServer() {
  const serverModule = await import('../server.ts');
  const app = serverModule.app;
  serverModule.setupRoutes();
  return new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise<void>((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

const USER_TOKEN = 'prod_test_user';
const USER_ID = 'prod_test_user';

async function sendChatRequest(message: string): Promise<{ responseText: string; requestId: string }> {
  const response = await fetch(`http://localhost:${PORT}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${USER_TOKEN}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      mode: 'standard'
    })
  });

  const text = await response.text();
  let responseText = '';
  let requestId = '';
  
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const data = JSON.parse(line.substring(6));
        if (data.text) responseText += data.text;
        if (data.memoryTraceId) requestId = data.memoryTraceId;
      } catch(e) {}
    }
  }

  return { responseText, requestId };
}

async function fetchTrace(requestId: string) {
  const response = await fetch(`http://localhost:${PORT}/api/chat/debug/${requestId}`, {
    headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
  });
  return response.json();
}

async function waitForMemoryExtraction(userId: string, targetCount: number, maxWaitMs = 20000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const mems = db.prepare('SELECT * FROM memories WHERE user_id = ?').all(userId);
    if (mems.length >= targetCount) {
      return mems;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return db.prepare('SELECT * FROM memories WHERE user_id = ?').all(userId);
}

async function run() {
  console.log('--- STARTING PRODUCTION VALIDATION ---');
  db.prepare('INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)').run(USER_ID, 'prod@test.com');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run(USER_ID);
  
  await startServer();

  console.log('\n=== Validation A & B: Real API End-to-End Recall & Trace ===');
  console.log('[Step 1] Sending memory...');
  await sendChatRequest('My favorite programming language is Rust.');
  
  console.log('Waiting for extraction to complete...');
  await waitForMemoryExtraction(USER_ID, 1);
  
  const mems1 = db.prepare('SELECT id, content, memory_state FROM memories WHERE user_id = ?').all(USER_ID);
  console.log('### Stored Memory');
  console.log(JSON.stringify(mems1, null, 2));

  console.log('\n[Step 2] Sending query...');
  const { responseText: resp2, requestId: reqId2 } = await sendChatRequest('What programming language do I prefer?');
  
  const trace2 = await fetchTrace(reqId2);
  
  console.log('\n--- FULL PRODUCTION TRACE ---');
  console.log('User Message:\n' + trace2.userMessage);
  console.log('\nRetrieved Memories:');
  console.log(JSON.stringify({ count: trace2.retrievedMemories?.length || 0, memories: trace2.retrievedMemories }, null, 2));
  console.log('\nContext Builder Output:\n' + trace2.contextBuilderOutput);
  console.log('\nPrompt Compiler Output (Final Prompt Preview):\n' + trace2.finalPromptPreview);
  console.log('\nLLM Response:\n' + trace2.llmResponse);
  console.log('\nMemory Extraction:\n' + JSON.stringify(trace2.extractedMemories, null, 2));
  console.log('\nMemory Storage:\n' + JSON.stringify(trace2.storedMemories, null, 2));


  console.log('\n=== Validation C: Restart Persistence ===');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run(USER_ID);
  
  await sendChatRequest('I live in Mumbai.');
  await waitForMemoryExtraction(USER_ID, 1);

  const memsBefore = db.prepare('SELECT content FROM memories WHERE user_id = ?').all(USER_ID);
  console.log('\n### Memories Before Restart');
  console.log(JSON.stringify(memsBefore, null, 2));

  console.log('Stopping server...');
  await stopServer();
  
  console.log('Starting server...');
  await startServer();

  const memsAfter = db.prepare('SELECT content FROM memories WHERE user_id = ?').all(USER_ID);
  console.log('\n### Memories After Restart');
  console.log(JSON.stringify(memsAfter, null, 2));

  const { responseText: resp3, requestId: reqId3 } = await sendChatRequest('Where do I live?');
  const trace3 = await fetchTrace(reqId3);

  console.log('\n### Retrieval Logs (from Trace)');
  console.log(JSON.stringify(trace3.retrievedMemories, null, 2));
  
  console.log('\n### Assistant Response');
  console.log(resp3);


  console.log('\n=== Validation D & E: Retrieval Quality & Context Pollution ===');
  db.prepare('DELETE FROM memories WHERE user_id = ?').run(USER_ID);
  
  const memoryService = new MemoryService();
  await memoryService.createMemory(USER_ID, 'I like Rust.', 'preference', 0.9);
  await memoryService.createMemory(USER_ID, 'I live in Mumbai.', 'location', 0.8);
  await memoryService.createMemory(USER_ID, 'I own a Tesla.', 'possession', 0.7);
  await memoryService.createMemory(USER_ID, 'I enjoy football.', 'hobby', 0.6);
  
  for(let i=1; i<=25; i++) {
    await memoryService.createMemory(USER_ID, `Dummy context pollution memory number ${i}.`, 'other', 0.1);
  }

  const { responseText: resp4, requestId: reqId4 } = await sendChatRequest('What programming language do I prefer?');
  const trace4 = await fetchTrace(reqId4);

  const totalMems = db.prepare('SELECT COUNT(*) as c FROM memories WHERE user_id = ?').get(USER_ID) as any;
  
  console.log(`\nTotal stored memories: ${totalMems.c}`);
  console.log(`Retrieved memories: ${trace4.retrievedMemories?.length || 0}`);
  
  console.log('\n### Retrieval Scores');
  if (trace4.retrievedMemories) {
    trace4.retrievedMemories.forEach((m: any) => {
      console.log(`- [${m.score.toFixed(3)}] ${m.content} (Source: ${m.source})`);
    });
  }

  await stopServer();
  console.log('\n--- END PRODUCTION VALIDATION ---');
}

run().catch(console.error);
