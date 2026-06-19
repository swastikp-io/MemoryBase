const fs = require('fs');
let code = fs.readFileSync('server/orchestrator/researchPipeline.ts', 'utf8');

if (!code.includes('WikipediaProvider')) {
  code = `import { WikipediaProvider } from '../services/wikipedia.ts';\n` + code;
}

const synthesisContextIndex = code.indexOf(`    let synthesisContext = "You are an expert researcher. Synthesize a comprehensive Deep Research report based on the following web sources.\\n\\n";`);

if (synthesisContextIndex !== -1) {
  // Before building synthesisContext, let's fetch Wikipedia Enrichment
  const wikiEnrichmentCode = `    // Knowledge Expansion via Wikipedia Enrichment
    let wikiEnrichmentText = "";
    try {
      console.log(\`[Research] Stage Started: Knowledge Expansion (Wikipedia)\`);
      wikiEnrichmentText = await WikipediaProvider.getEnrichment(userQuery);
      if (wikiEnrichmentText) {
         console.log(\`[Research] Wikipedia Enrichment Retrieved successfully.\`);
      }
      console.log(\`[Research] Stage Completed: Knowledge Expansion\`);
    } catch (err) {
      console.warn(\`[Research] Knowledge Expansion Failed\`);
    }

`;
  
  const synthesisModification = `    let synthesisContext = "You are an expert researcher. Synthesize a comprehensive Deep Research report based on the following web sources and enriched knowledge.\\n\\n";
    if (wikiEnrichmentText) {
      synthesisContext += \`--- Core Enriched Context (Wikipedia) ---\\n\${wikiEnrichmentText}\\n----------------------------------------\\n\\n\`;
    }
`;

  code = code.substring(0, synthesisContextIndex) + wikiEnrichmentCode + synthesisModification + code.substring(synthesisContextIndex + `    let synthesisContext = "You are an expert researcher. Synthesize a comprehensive Deep Research report based on the following web sources.\\n\\n";`.length);
  fs.writeFileSync('server/orchestrator/researchPipeline.ts', code);
  console.log("Updated researchPipeline.ts");
} else {
  console.log("Could not find synthesisContext");
}
