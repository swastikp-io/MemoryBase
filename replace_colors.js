const fs = require('fs');
const path = require('path');

const colorMap = {
  '#F4F0E8': '#FFFFFF', // Main bg
  '#F8F6F1': '#FFFFFF', // Modal bg
  '#EAE4D9': '#F7F7F8', // Hover, secondary bg (OpenAI uses f7f7f8 for user messages)
  '#D9D4CC': '#E5E5E5', // Borders
  '#1F1D1A': '#000000', // Primary text, black
  '#544D45': '#6E6E80', // Secondary text (OpenAI text-gray)
  '#322E2A': '#333333', // Hover state for primary buttons
  '#A8A39C': '#8E8EA0', // Placeholder
  '#D97757': '#10A37F', // Accent / Selection color
  'bg-[#F4F0E8]': 'bg-white',
  'bg-[#F8F6F1]': 'bg-white',
  'text-[#1F1D1A]': 'text-black',
  'text-[#F4F0E8]': 'text-white',
  'bg-[#1F1D1A]': 'bg-black',
  'border-[#1F1D1A]': 'border-black'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.css')) {
        callback(dirPath);
      }
    }
  });
}

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    // Escape brackets for regex
    const escapedOld = oldColor.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    const regex = new RegExp(escapedOld, 'g');
    content = content.replace(regex, newColor);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
});
