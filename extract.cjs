const fs = require('fs');
const lines = fs.readFileSync('C:/Users/music/.gemini/antigravity/brain/8dd3eb17-7f9a-4699-a47c-dfe21247cbb1/.system_generated/logs/overview.txt', 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('"step_index":221')) {
    const json = JSON.parse(line);
    fs.writeFileSync('C:/Users/music/OneDrive/Documents/GitHub/early-acce-paralex/extracted_sidebar.txt', json.content);
    console.log("Extracted!");
    break;
  }
}
