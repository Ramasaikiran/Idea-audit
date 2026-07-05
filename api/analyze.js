const GEMINI_MODEL = "gemini-2.0-flash";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: { message: "Missing GEMINI_API_KEY env var" } });
    return;
  }

  try {
    const { idea = "", systemPrompt = "" } = req.body || {};

    const geminiBody = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nAnalyze this startup idea. Respond with ONLY a raw JSON object. No markdown. No backticks. No explanation. Start your response with { and end with }.\n\nIdea: ${idea}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      res.status(geminiData.error.code || 500).json({ error: { message: geminiData.error.message } });
      return;
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    res.status(200).json({
      content: [{ type: "text", text }],
      stop_reason: geminiData.candidates?.[0]?.finishReason || "end_turn",
    });
  } catch (e) {
    res.status(500).json({ error: { message: "Server error: " + e.message } });
  }
};
