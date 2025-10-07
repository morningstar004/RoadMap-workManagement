// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 4000;

if (!GEMINI_API_URL || !GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_URL or GEMINI_API_KEY not set. Set environment variables as shown in .env.example');
}

function buildPrompt(task, profession) {
  return `You are a seasoned ${profession} and an expert coach. The user gave this task: "${task}". Produce a clear, actionable roadmap to complete it as if you were mentoring a junior professional.\n\nRequirements:\n- Provide numbered major steps (1., 2., ...) with short descriptions.\n- For each major step, include an estimated time (hours/days), required skills or tools, and a short success criterion/outcome.\n- Add a brief checklist (3-8 bullet points) at the end.\n- Keep the whole output concise (aim for ~300-500 words).\n\nRespond in plain text.`;
}

app.post('/api/roadmap', async (req, res) => {
  try {
    const { task, profession = 'Expert' } = req.body;
    if (!task) return res.status(400).json({ error: 'task is required' });

    const prompt = buildPrompt(task, profession);

    const payload = { prompt };

    // Use built-in fetch (Node 18+). If your Node version is older, install node-fetch instead.
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    let text = '';
    if (typeof data === 'string') text = data;
    else if (data.output && typeof data.output === 'string') text = data.output;
    else if (data.outputText) text = data.outputText;
    else if (data.choices && data.choices[0]) {
      text = data.choices[0].text || data.choices[0].message?.content || '';
    } else {
      text = JSON.stringify(data);
    }

    return res.json({ roadmap: text });
  } catch (err) {
    console.error('Roadmap generation error', err);
    return res.status(500).json({ error: err.message || 'unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`Roadmap backend listening on http://localhost:${PORT}`);
});
