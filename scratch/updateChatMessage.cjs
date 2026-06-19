const fs = require('fs');
let code = fs.readFileSync('src/components/ChatMessage.tsx', 'utf8');

// 1. Add import
if (!code.includes('ReportExport')) {
  code = code.replace(
    /import \{ ResearchSessionView \} from "\.\/research\/ResearchSessionView";/,
    `import { ResearchSessionView } from "./research/ResearchSessionView";\nimport { ReportExport } from "./research/ReportExport";`
  );
}

// 2. Add id to markdown body to enable PDF export and add the Export component
const findStr = `<div className="markdown-body w-full">`;
const replaceStr = `<div id={\`markdown-body-\${id}\`} className="markdown-body w-full">`;
code = code.replace(findStr, replaceStr);

// 3. Add ReportExport at the bottom of the model's message content if mode === 'research'
const endOfSourcesStr = `                  </div>
                </div>
              )}`;

const exportStr = `                  </div>
                </div>
              )}

              {!isGenerating && mode === 'research' && role === 'model' && content && (
                <ReportExport content={content} elementId={\`markdown-body-\${id}\`} />
              )}`;

code = code.replace(endOfSourcesStr, exportStr);

fs.writeFileSync('src/components/ChatMessage.tsx', code);
console.log('ChatMessage.tsx updated');
