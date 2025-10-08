// server.js (only changed portions shown; keep your existing setup)
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // keep as before
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing API key. Set GOOGLE_API_KEY or GEMINI_API_KEY in your .env');
  process.exit(1);
}
process.env.GEMINI_API_KEY = GEMINI_API_KEY;
const ai = new GoogleGenAI({});
const MODEL_ID = 'gemini-2.5-flash'; // keep your chosen model

// <-- Paste the new systemPrompt here (from section 1) -->
const systemPrompt = `You are RoadmapBuilder — a concise, pragmatic planner that outputs a branched, checklist-style roadmap in Markdown only.
Do NOT output JSON or machine-only wrappers. Produce only human-readable Markdown that follows this exact structure so clients can parse it:

# <Project Title>

**Objective:** one sentence.

**Success criteria:** 
- [ ] <measurable success item 1>
- [ ] <measurable success item 2>

## MVP (timebox: <N> days)
- [ ] Epic: <epic title> (owner: <role>, est_hours: <n>)
  - [ ] Task 1: <short task description> (owner: <role>, est_hours: <n>)
  - [ ] Task 2: <short task description> (owner: <role>, est_hours: <n>)
- [ ] Epic: <epic title>
  - [ ] Task ...

## Sprints
### Sprint 1 — Days 1-<d>
- [ ] Deliverable: <short title>
  - [ ] Task A: <desc> (acceptance: <succ criteria>)
  - [ ] Task B: <desc>

### Sprint 2 — Days <x>-<y>
- [ ] Deliverable: ...

## Dependencies & Integrations
- <bullet list>

## Risks & Mitigations
- <risk> — mitigation: <action>

## Demo checklist
- [ ] <demoable step 1>
- [ ] <demoable step 2>

Notes:
- Keep total human-readable output under ~700 words when possible.
- Use plain Markdown only (task list checkboxes like "- [ ] ...", headings, and short parenthetical metadata). Keep nesting to at most 2 levels under epics/deliverables.
- Use short sentences and measurable acceptance criteria. Be opinionated and clear.
- If the user gives a timebox (e.g., "14 days", "21 days") or stack mention in the prompt, adapt sprint lengths and tech tradeoffs accordingly.
- If the user lists "alreadyDone" or "existingModules" in their prompt text, mark those specific tasks with ticks already checked: "- [x] ...".
- Never produce JSON or additional text outside the Markdown roadmap. Only Markdown output is allowed.
`;

app.post('/generate-post', async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    if (!userPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build the combined prompt — system + user instructions.
    const fullPrompt = `${systemPrompt}\n\nUSER INPUT:\n${userPrompt}\n\nIf the request mentions 'alreadyDone' or 'existingModules', mark those tasks as done (- [x] ...)`;

    const result = await ai.models.generateContent({
      model: MODEL_ID,
      contents: fullPrompt,
      // optional config tweaks: temperature, max tokens, etc.
      // config: { temperature: 0.2 }
    });

    const generatedText = typeof result.text === 'function' ? await result.text() : result.text;

    // IMPORTANT: we return only plaintext Markdown in `post`.
    // The frontend expects `data.post` to be Markdown with "- [ ]" items.
    res.json({ post: generatedText });

  } catch (error) {
    console.error('Error:', error);
    const message = error?.message || 'Failed to generate post';
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
