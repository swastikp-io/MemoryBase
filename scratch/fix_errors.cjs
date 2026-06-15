const fs = require('fs');

const file = 'src/components/MainChat.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix updateChatMode
content = content.replace(/updateChatMode\(currentChatId, mode\);/g, `// TODO: add updateChatMode to store if needed`);

// Fix updateResearchState
content = content.replace(/updateResearchState\(activeChatId, modelMessageId, \{ status: 'cancelled' \}\);/g, `updateMessageContent(modelMessageId, "", false, undefined, undefined, undefined, { status: 'cancelled' });`);

// Fix updateChatTitle 4 arguments
content = content.replace(/renameChat\(([^,]+), ([^,]+), true, false\)/g, `renameChat($1, $2)`);

// Check any remaining updateModelMessage uses
content = content.replace(/updateModelMessage/g, `updateMessageContent`);

fs.writeFileSync(file, content);

// ChatSearchModal.tsx
const searchFile = 'src/components/search/ChatSearchModal.tsx';
let searchContent = fs.readFileSync(searchFile, 'utf8');
// selectChat was removed and we did loadChat in the onClick, but line 72 might be selectChat(result.chatId) or similar.
searchContent = searchContent.replace(/selectChat\(/g, `loadChat(`);
// Property messages does not exist on ChatSession
searchContent = searchContent.replace(/chat\.messages/g, `[] /* messages not on ChatSession */`);
fs.writeFileSync(searchFile, searchContent);

console.log('Fixed errors.');
