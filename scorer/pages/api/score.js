export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fail clearly if the server is misconfigured rather than sending a blank API key.
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Scorer is not configured — ANTHROPIC_API_KEY is missing.' });
  }

  // Optional access gate. Set SCORER_ACCESS_TOKEN in your environment to restrict who
  // can call this endpoint. If the env var is not set the endpoint is open.
  const requiredToken = process.env.SCORER_ACCESS_TOKEN;
  if (requiredToken) {
    const { accessToken } = req.body;
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() !== requiredToken.trim()) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
  }

  const { prdText } = req.body;

  if (!prdText || typeof prdText !== 'string' || prdText.length < 100 || prdText.length > 50000) {
    return res.status(400).json({ error: 'PRD text is required and must be 100–50000 characters' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are an expert TPM and AI product reviewer. You will evaluate an AI feature PRD against a 10-point readiness scorecard.

For each dimension, determine if the PRD passes (1 point) or fails (0 points).
Be strict — partial mentions without specifics should fail.

Return ONLY a valid JSON object in exactly this format, no other text:

{
  "total": <number 0-10>,
  "verdict": "<one of: Ready for engineering kickoff | Address gaps before sprint planning | Significant rework needed | Not ready — restart with the template>",
  "dimensions": [
    {
      "id": 1,
      "name": "Eval criteria defined and measurable",
      "score": <0 or 1>,
      "status": "<pass or fail>",
      "finding": "<one sentence: what you found or didn't find in the PRD>",
      "fix": "<one sentence: specific action to fix it, or null if passed>"
    }
  ],
  "top_gaps": ["<top 3 most critical gaps as short phrases, empty array if score is 9-10>"],
  "summary": "<2-3 sentence plain English summary of overall PRD readiness>"
}

The 10 dimensions to evaluate:
1. Eval criteria defined and measurable — specific metrics with targets, not just "model should work"
2. Golden dataset ownership — existing dataset or named owner with due date
3. Confidence thresholds specified — three tiers: auto-act, suggest, abstain
4. Latency SLA defined — per-call p50/p95 targets, not just "fast"
5. Fallback behavior documented — at least 3 named failure types with fallback actions
6. Data readiness go/no-go criteria — explicit data quality gates before build starts
7. Human-in-the-loop checkpoint — at least one named decision with override mechanism
8. Failure mode pre-mortem — table or list with likelihood, impact, mitigation
9. Rollout cost estimate at scale — token/volume/cost calculation, not just "monitor costs"
10. Open questions log with owners — named owners and due dates, not just a question list`,
        messages: [
          {
            role: 'user',
            content: `Please evaluate this AI feature PRD:\n\n${prdText}`,
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API error:', response.status, errorBody);
      if (response.status === 401) {
        return res.status(500).json({ error: 'Scorer API key is invalid. Contact the site owner.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Scoring quota reached — try again later.' });
      }
      return res.status(500).json({ error: 'Scoring service unavailable' });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return res.status(500).json({ error: 'Scoring service unavailable' });
    }

    // Strip any markdown code fences if Claude wraps the JSON
    const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const result = JSON.parse(cleaned);

    return res.status(200).json(result);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Scoring request timed out — please try again' });
    }
    console.error('Score API error:', err);
    return res.status(500).json({ error: 'Scoring service unavailable' });
  }
}
