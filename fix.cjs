const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
const startIdx = lines.findIndex(l => l.includes('ath from "path";'));
let endIdx = -1;
for(let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes('Buffer.from(audio')) {
    endIdx = i + 2;
    break;
  }
}
console.log('start', startIdx, 'end', endIdx);
if(startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1);
  fs.writeFileSync('server.ts', lines.join('\n'));
}
