// server.js
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // official client per quickstart
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
// keep using your existing env name if that's what you have
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Missing API key. Set GOOGLE_API_KEY or GEMINI_API_KEY in your .env');
  process.exit(1);
}

// The official JS quickstart reads GEMINI_API_KEY from process.env
process.env.GEMINI_API_KEY = GEMINI_API_KEY;

const ai = new GoogleGenAI({}); // client will pick up process.env.GEMINI_API_KEY

// Use a supported model — gemini-2.5-flash is recommended by the quickstart docs
const MODEL_ID = 'gemini-2.5-flash';

const systemPrompt = `you have to generate a roadmap that how the work should be performed professionally 
done by making a step by step points.
1. Is to manage work load, complete project at time.
2. Its for government offices to manage work.
3. It not a one person work manage it like that.`;

app.post('/generate-post', async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    if (!userPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const fullPrompt = `${systemPrompt}\n\nUSER TOPIC: "${userPrompt}"`;

    // Call the official client's generateContent method
    const result = await ai.models.generateContent({
      model: MODEL_ID,
      // The quickstart accepts a simple string for `contents`
      contents: fullPrompt,
      // Optional: you can tune generation config here (thinkingConfig, temperature, etc.)
      // config: { thinkingConfig: { thinkingBudget: 0 } } // example to disable "thinking"
    });

    // The SDK can return result.text or result.text() depending on version.
    const generatedText =
      typeof result.text === 'function' ? await result.text() : result.text;

    res.json({ post: generatedText });

  } catch (error) {
    console.error('Error:', error);
    // if the error is from the API, send back useful info (but not your key)
    const message = error?.message || 'Failed to generate post';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
