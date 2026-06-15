const fs = require('fs');

const files = [
  'src/components/ChatMessage.tsx',
  'src/components/research/ResearchSessionView.tsx',
  'src/components/search/ChatSearchModal.tsx',
  'src/components/reasoning/ReasoningPanel.tsx',
  'src/components/coding/KimiTaskPanel.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import \{([^}]+)\} from ['\"]..\/context\/ChatContext['\"]/g, 'import {$1} from "../store/chatStore"');
    content = content.replace(/import \{([^}]+)\} from ['\"]..\/..\/context\/ChatContext['\"]/g, 'import {$1} from "../../store/chatStore"');
    content = content.replace(/useChat\(\)/g, 'useChatStore()');
    fs.writeFileSync(file, content);
  }
});
console.log('Replaced imports');
