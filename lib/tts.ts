import { HfInference } from "@huggingface/inference";

const HF_TOKEN = process.env.HF_TOKEN;

let hf: HfInference | null = null;
if (HF_TOKEN) {
  hf = new HfInference(HF_TOKEN);
}

export async function generateSpeech(text: string): Promise<Blob> {
  if (!hf) {
    throw new Error("HF_TOKEN is missing. Please configure Hugging Face token in environment variables.");
  }
  
  try {
    const audioBlob = await hf.textToSpeech({
      model: "hexgrad/Kokoro-82M",
      inputs: text,
    });
    return audioBlob;
  } catch (error) {
    console.error("Hugging Face TTS error:", error);
    throw error;
  }
}
