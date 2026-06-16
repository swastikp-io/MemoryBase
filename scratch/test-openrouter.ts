import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "dummy_key",
});

async function main() {
  try {
    const response = await openai.chat.completions.create({
      model: "google/gemini-pro",
      messages: [{ role: "system", content: "Test" }],
      max_tokens: 150,
      temperature: 0.3
    });
    console.log("SUCCESS:", JSON.stringify(response, null, 2));
    console.log("Is choices present?", !!response.choices);
  } catch (e: any) {
    console.log("ERROR THROWN:", e.message);
    if (e.response) {
       console.log("ERROR RESPONSE:", JSON.stringify(e.response, null, 2));
    }
  }
}

main();
