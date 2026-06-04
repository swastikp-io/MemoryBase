const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/MainChat.tsx',
  'src/components/Sidebar.tsx',
  'src/components/WelcomeScreen.tsx',
  'src/components/ChatInput.tsx',
  'src/pages/LandingPage.tsx',
  'src/context/ChatContext.tsx',
  'metadata.json',
  'server.ts'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.split('Dew AI').join('Paralex');
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`Updated ${file}`);
    }
  } else {
    console.warn(`File not found: ${file}`);
  }
});
