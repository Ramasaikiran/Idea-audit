const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

const PORT = 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_MODEL = "gemini-2.0-flash";

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {

  // ─── API Proxy to Gemini ────────────────────────────────────
  if (req.method === "POST" && req.url === "/api/analyze") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const userIdea = payload.idea || "";
        const systemPrompt = payload.systemPrompt || "";

        // Build Gemini request
        const geminiBody = JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nAnalyze this startup idea. Respond with ONLY a raw JSON object. No markdown. No backticks. No explanation. Start your response with { and end with }.\n\nIdea: ${userIdea}` }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        });

        const apiPath = `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const options = {
          hostname: "generativelanguage.googleapis.com",
          port: 443,
          path: apiPath,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(geminiBody),
          },
        };

        const proxyReq = https.request(options, (proxyRes) => {
          let responseData = "";
          proxyRes.on("data", (chunk) => (responseData += chunk));
          proxyRes.on("end", () => {
            try {
              const geminiResponse = JSON.parse(responseData);

              if (geminiResponse.error) {
                res.writeHead(geminiResponse.error.code || 500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: { message: geminiResponse.error.message } }));
                return;
              }

              // Extract text from Gemini response
              const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

              // Return in a normalized format the frontend expects
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                content: [{ type: "text", text: text }],
                stop_reason: geminiResponse.candidates?.[0]?.finishReason || "end_turn"
              }));
            } catch (e) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: { message: "Failed to parse Gemini response: " + e.message } }));
            }
          });
        });

        proxyReq.on("error", (e) => {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Proxy error: " + e.message } }));
        });

        proxyReq.write(geminiBody);
        proxyReq.end();

      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Bad request: " + e.message } }));
      }
    });
    return;
  }

  // ─── CORS preflight ─────────────────────────────────────────
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // ─── Static file server ─────────────────────────────────────
  let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n   IdeaAudit server running at:\n`);
  console.log(`     → http://localhost:${PORT}\n`);
  console.log(`  API proxy active at /api/analyze (Gemini ${GEMINI_MODEL})\n`);
});
