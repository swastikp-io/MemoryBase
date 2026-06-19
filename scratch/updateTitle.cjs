const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('executeWithFallbacks')) {
  code = `import { executeWithFallbacks } from './server/utils/llmValidation.ts';\n` + code;
}

const rx = /try \{\s*const currentOpenAI = openai;\s*const actualModel = resolveModel\(mode as any\);.*?res\.json\(\{ title: fallbackTitle \}\);\s*\}/s;

const replacement = `try {
      const TITLE_MODEL = process.env.TITLE_GENERATION_MODEL || "openai/gpt-oss-120b:free";
      const FALLBACK_MODEL = process.env.TITLE_GENERATION_FALLBACK_MODEL || "google/gemma-3-27b-it:free";
      
      const localFallbackTitle = firstMessage.trim().split(/\\s+/).slice(0, 5).join(" ") || "New Chat";

      const generatedTitle = await executeWithFallbacks(
        openai,
        {
          messages: [
            {
              role: "system",
              content: "You generate concise conversation titles.\\nRules:\\n- Maximum 6 words\\n- No quotation marks\\n- No punctuation unless necessary\\n- Title Case\\n- Descriptive\\n- Professional\\n- No filler words\\nReturn only the title."
            },
            {
              role: "user",
              content: \`Input:\\n\${firstMessage}\`
            }
          ],
          temperature: 0.3,
          max_tokens: 30
        },
        [TITLE_MODEL, FALLBACK_MODEL],
        localFallbackTitle,
        'title_generation'
      );

      let cleanTitle = generatedTitle.replace(/["':\\n]/g, "");
      if (cleanTitle.length > 60) cleanTitle = cleanTitle.substring(0, 60).trim();

      res.json({ title: cleanTitle });
    } catch (error: any) {
      console.error("Title generation error completely failed:", error.message);
      res.json({ title: firstMessage.trim().split(/\\s+/).slice(0, 5).join(" ") || "New Chat" });
    }`;

code = code.replace(rx, replacement);
fs.writeFileSync('server.ts', code);
console.log("Updated server.ts successfully");
