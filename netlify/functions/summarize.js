// netlify/functions/summarize.js
// ─────────────────────────────────────────────────────────────
//  Serverless proxy for the Anthropic API.
//  Keeps the API key server-side — never exposed to the browser.
//
//  Deploy: drop this file into netlify/functions/summarize.js
//  Env var: set ANTHROPIC_API_KEY in Netlify → Site config → Environment variables
//
//  Expects:  POST  { title: string, text: string }
//  Returns:  { tldr, keyPoints, tone, wordCount }
// ─────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables.' }),
    };
  }

  let title = '', text = '';
  try {
    const body = JSON.parse(event.body || '{}');
    title = (body.title || '').slice(0, 200);
    text  = (body.text  || '').slice(0, 12000); // ~6k words max context
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!text.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No text provided' }) };
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const prompt = `You are a sharp, concise summarizer for a personal blog. 
Read the following blog post and return ONLY valid JSON — no markdown, no backticks, no extra text.

Return exactly this shape:
{
  "tldr": "One punchy sentence (max 30 words) capturing the single most important insight",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "tone": "one word — e.g. Reflective / Personal / Analytical / Inspiring / Candid / Humorous"
}

Rules:
- keyPoints: 3 to 5 items. Each is a complete, standalone insight — not a fragment.
- tldr: write it as if you're telling a friend what the post is actually about.
- tone: pick the single word that best captures the author's voice in this piece.
- Never start keyPoints with "The author" — write in second or third person naturally.

Title: ${title}

Post:
${text}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Anthropic API error: ' + err }) };
    }

    const data = await response.json();
    const raw  = data.content?.[0]?.text?.trim() || '';

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return { statusCode: 502, body: JSON.stringify({ error: 'Could not parse AI response', raw }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tldr:       String(parsed.tldr      || ''),
        keyPoints:  Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
        tone:       String(parsed.tone      || 'Thoughtful'),
        wordCount,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};