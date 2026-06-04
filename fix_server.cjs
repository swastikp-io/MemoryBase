const fs = require('fs');

const file = fs.readFileSync('server.ts', 'utf8');

// Find the buffer line
const targetText = "      const buffer = Buffer.from(audio, 'base64');";
const bufferIndex = file.indexOf(targetText);

if (bufferIndex === -1) {
  console.log("Could not find target text");
  process.exit(1);
}

const beforeBuffer = file.substring(0, bufferIndex + targetText.length);

// Find the mockBackendSettings
const afterTargetText = `    autoMemoryDetectionEnabled: true
  };`;
const afterIndex = file.indexOf(afterTargetText);

const afterText = file.substring(afterIndex + afterTargetText.length);

const middleText = `
      const file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' });

      const transcription = await groq.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
      });

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Groq Transcription Error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const xaiKey = process.env.XAI_API_KEY;
      if (!xaiKey) {
        return res.status(500).json({ error: "XAI API key not configured on server" });
      }

      const response = await fetch("https://api.x.ai/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${xaiKey}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "alloy"
        })
      });

      // fallback just in case their new API uses tts endpoint from docs
      if (!response.ok && response.status === 404) {
         const fbResponse = await fetch("https://api.x.ai/v1/tts", {
           method: "POST",
           headers: {
             "Authorization": \`Bearer \${xaiKey}\`,
             "Content-Type": "application/json"
           },
           body: JSON.stringify({
             text: text,
             voice_id: "eve",
             language: "en"
           })
         });
         if (!fbResponse.ok) {
           const errorText = await fbResponse.text();
           throw new Error(\`XAI API Error: \${fbResponse.status} \${errorText}\`);
         }
         res.setHeader('Content-Type', 'audio/mpeg');
         const arrayBuffer = await fbResponse.arrayBuffer();
         res.send(Buffer.from(arrayBuffer));
         return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(\`XAI API Error: \${response.status} \${errorText}\`);
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("XAI TTS Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate speech" });
    }
  });

  // Settings API Routes for Personalization
  app.get("/api/settings/personalization/:userId", (req, res) => {
    const settings = PersonalizationService.getSettings(req.params.userId);
    res.json(settings || {});
  });

  app.post("/api/settings/personalization/:userId", (req, res) => {
    const updated = PersonalizationService.updateSettings(req.params.userId, req.body);
    res.json(updated);
  });

  // Settings API Routes (Mocked for architecture completeness)
  let mockBackendSettings = {
    memoryEnabled: true,
    conversationContinuityEnabled: true,
    autoMemoryDetectionEnabled: true
  };`;

const newFileContent = beforeBuffer + middleText + afterText;
fs.writeFileSync('server.ts', newFileContent);
console.log('Fixed server.ts successfully');
