const fs = require('fs');

let code = fs.readFileSync('server/orchestrator/reasoningController.ts', 'utf8');

// 1. Add import
code = code.replace(
  /import \{ resolveModel \} from '\.\.\/\.\.\/src\/lib\/models\/resolver\.ts';/,
  `import { resolveModel } from '../../src/lib/models/resolver.ts';\nimport { ResearchPipeline } from './researchPipeline.ts';`
);

// 2. Replace the block
const startStr = `      if (mode === 'research') {`;
const endStr = `        const fullMessages = [...messages, { role: "assistant", content: reportText }];\n        return;\n      }`;

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replaceWith = `      if (mode === 'research') {
        await ResearchPipeline.execute(openai, formattedMessages, userQuery, actualModel, res);
        return;
      }`;
  
  code = code.substring(0, startIndex) + replaceWith + code.substring(endIndex + endStr.length);
  fs.writeFileSync('server/orchestrator/reasoningController.ts', code);
  console.log('Replaced research block successfully.');
} else {
  console.log('Could not find block boundaries.', startIndex, endIndex);
}
