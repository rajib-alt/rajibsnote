import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const ai = new GoogleGenerativeAI(key);
  return ai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
}

async function generate(prompt: string) {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

router.post('/ai/annotate', async (req, res) => {
  try {
    const { title, content, existingNotes = [] } = req.body;
    const notesCtx = existingNotes.length > 0
      ? `\n\nExisting notes:\n${existingNotes.map((n: any) => `- ${n.path}: ${n.title}`).join('\n')}`
      : '';
    const result = await generate(`You are a knowledge management AI. Analyze this note and return JSON.
Title: ${title}
Content: ${content}${notesCtx}

Return valid JSON:
{
  "type": "<research|idea|reference|synthesis|task|journal>",
  "annotation": "<1-2 sentence annotation>",
  "suggestedConnections": ["<path>"],
  "tags": ["<tag>"],
  "summary": "<one sentence>"
}
Return ONLY valid JSON.`);
    res.json({
      type: result.type ?? 'note',
      annotation: result.annotation ?? '',
      suggestedConnections: result.suggestedConnections ?? [],
      tags: result.tags ?? [],
      summary: result.summary ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'AI annotation failed' });
  }
});

router.post('/ai/suggest-connections', async (req, res) => {
  try {
    const { notes } = req.body;
    const notesList = notes.map((n: any, i: number) =>
      `Note ${i + 1} (path: ${n.path}):\nTitle: ${n.title}\nContent: ${n.content?.substring(0, 500) ?? '(none)'}`
    ).join('\n\n---\n\n');
    const result = await generate(`Analyze these notes and find meaningful connections.
${notesList}

Return valid JSON:
{
  "connections": [
    { "source": "<path>", "target": "<path>", "reason": "<reason>", "strength": 0.8 }
  ]
}
Return ONLY valid JSON.`);
    res.json({ connections: result.connections ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Connection suggestion failed' });
  }
});

router.post('/ai/synthesize', async (req, res) => {
  try {
    const { notes, prompt: userPrompt } = req.body;
    const notesContent = notes.map((n: any) =>
      `## ${n.title}\nPath: ${n.path}\n\n${n.content ?? '(none)'}`
    ).join('\n\n---\n\n');
    const result = await generate(`Synthesize insights from these notes.
User prompt: "${userPrompt}"
Notes:
${notesContent}

Return valid JSON:
{
  "title": "<title>",
  "synthesis": "<markdown synthesis>",
  "keyInsights": ["<insight>"],
  "suggestedConnections": ["<path>"]
}
Return ONLY valid JSON.`);
    res.json({
      title: result.title ?? 'Synthesis',
      synthesis: result.synthesis ?? '',
      keyInsights: result.keyInsights ?? [],
      suggestedConnections: result.suggestedConnections ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Synthesis failed' });
  }
});

router.post('/ai/suggest-placement', async (req, res) => {
  try {
    const { title, content, existingNotes = [], existingFolders = [] } = req.body;
    const result = await generate(`Suggest folder and backlinks for this note.
Title: ${title}
Content: ${content.substring(0, 1000)}
Existing folders: ${existingFolders.join(', ') || '(none)'}
Existing notes: ${existingNotes.map((n: any) => `- ${n.path}: ${n.title}`).join('\n') || '(none)'}

Return valid JSON:
{
  "suggestedFolder": "<folder/path>",
  "backlinks": [{"path":"<path>","title":"<title>","reason":"<reason>"}],
  "reasoning": "<brief reasoning>"
}
Return ONLY valid JSON.`);
    res.json({
      suggestedFolder: result.suggestedFolder ?? '',
      backlinks: result.backlinks ?? [],
      reasoning: result.reasoning ?? '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Placement failed' });
  }
});

router.post('/ai/chat', async (req, res) => {
  try {
    const { question, notes, history = [] } = req.body;
    const notesCtx = notes.length > 0
      ? notes.map((n: any) => `### ${n.title}\nPath: ${n.path}\n${(n.content ?? '').slice(0, 800)}`).join('\n\n---\n\n')
      : '(no notes)';
    const historyCtx = history.length > 0
      ? '\n\nConversation:\n' + history.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      : '';
    const result = await generate(`You are an AI assistant in a personal knowledge vault. Answer using only the vault notes.
Vault notes:
${notesCtx}${historyCtx}

User question: ${question}

Return valid JSON:
{
  "answer": "<markdown answer>",
  "citations": [{"path":"<path>","title":"<title>","excerpt":"<max 120 chars>"}]
}
Return ONLY valid JSON.`);
    res.json({
      answer: result.answer ?? "I couldn't find a relevant answer in your vault.",
      citations: result.citations ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Chat failed' });
  }
});

router.post('/ai/generate-roadmap', async (req, res) => {
  try {
    const { topic, currentLevel, goal, timeframe } = req.body;
    const result = await generate(`You are an expert learning coach. Generate a comprehensive learning roadmap.
Topic: ${topic}
Current level: ${currentLevel ?? 'beginner'}
Goal: ${goal ?? 'general mastery'}
Timeframe: ${timeframe ?? 'flexible'}

Create a practical roadmap with 3-5 phases, each with 3-6 concrete steps.

Return valid JSON ONLY:
{
  "title": "<roadmap title>",
  "description": "<2-3 sentence overview>",
  "estimatedTime": "<total time estimate>",
  "phases": [
    {
      "title": "<phase title e.g. Phase 1: Foundations>",
      "description": "<what this phase covers>",
      "duration": "<e.g. 2-3 weeks>",
      "steps": [
        {
          "title": "<step title>",
          "description": "<concrete action>",
          "resources": ["<resource>"],
          "isOptional": false
        }
      ]
    }
  ]
}
Return ONLY valid JSON.`);
    res.json({
      title: result.title ?? topic,
      description: result.description ?? '',
      estimatedTime: result.estimatedTime ?? null,
      phases: result.phases ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Roadmap generation failed' });
  }
});

export default router;
