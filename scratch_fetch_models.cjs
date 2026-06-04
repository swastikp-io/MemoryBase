const https = require('https');
https.get('https://openrouter.ai/api/v1/models', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const free = parsed.data.filter(m => m.pricing && m.pricing.prompt === '0').map(m => m.id);
      console.log(JSON.stringify(free, null, 2));
    } catch(e) { console.error(e); }
  });
});
