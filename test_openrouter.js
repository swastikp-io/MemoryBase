const https = require('https');

const req = https.request('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dummy_key',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});

req.write(JSON.stringify({ model: 'openrouter/auto', messages: [{role: 'user', content: 'test'}]}));
req.end();
