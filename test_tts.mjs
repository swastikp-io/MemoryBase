import fs from 'fs';

async function testTTS() {
  const startTime = Date.now();
  console.log("Sending TTS request...");
  
  try {
    const res = await fetch("http://localhost:3000/api/tts", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer dummy_token"
      },
      body: JSON.stringify({ text: "Testing Paralex speech output" })
    });
    
    const timeToGenerate = Date.now() - startTime;
    console.log(`HTTP status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
    console.log(`Time to generate audio: ${timeToGenerate}ms`);
    
    if (!res.ok) {
      console.log(`Error response: ${await res.text()}`);
      return;
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`Response size in bytes: ${buffer.length}`);
    
    fs.writeFileSync("test_audio.mp3", buffer);
    console.log("Audio saved to test_audio.mp3");
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testTTS();
