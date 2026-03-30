/* ═══════════════════════════════════════════════════════════════
   IdeaAudit — Vanilla JS Application Logic
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ───────────────────────────────────────────────────────
// ⚠️ Set your Anthropic API key here (do NOT commit real keys to GitHub)
const API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE";

const SYSTEM_PROMPT = `You are a ruthless startup analyst with deep knowledge of the global startup ecosystem. Use your extensive knowledge of competitors, funding, market trends, and startup failures to respond ONLY with valid JSON, no markdown:
{
  "verdict": "BUILD"|"AVOID"|"PIVOT",
  "verdictReason": "One brutal sentence max 18 words",
  "marketScore": 0-100,
  "competitionScore": 0-100,
  "timingScore": 0-100,
  "overallScore": 0-100,
  "summary": "3 sharp sentences: opportunity, competition reality, your edge",
  "existingPlayers": [{ "name": "string", "founded": "year", "funding": "real amount", "weakness": "verified gap", "status": "active|failed|acquired" }],
  "marketGaps": ["gap1","gap2","gap3"],
  "killerFeature": "The ONE feature that wins where others failed",
  "targetSegment": "Precise niche, not generic",
  "revenueModel": "Specific path with realistic numbers",
  "biggestRisk": "Single kill risk",
  "mvpIdea": "What to build and ship in 4 weeks",
  "investorTake": "Honest one-sentence VC view",
  "whyNow": "Market timing signals right now",
  "implementationRoadmap": [
    {"phase":"Phase 1","duration":"X weeks","focus":"title","actions":["a1","a2","a3"]},
    {"phase":"Phase 2","duration":"X weeks","focus":"title","actions":["a1","a2"]},
    {"phase":"Phase 3","duration":"X weeks","focus":"title","actions":["a1","a2"]}
  ]
}`;

const SAMPLE_IDEAS = [
  "An AI tool that helps Indian college students find relevant internships and auto-fills applications using their resume",
  "A WhatsApp-based expense tracker for Indian freelancers that categorizes spending and sends GST reports automatically",
  "A platform that connects tier-2 city students with urban startup internships through verified skill assessments",
  "An AI study buddy for UPSC aspirants that creates personalized daily schedules and quizzes from current affairs",
];

const LOADING_STEPS = [
  { label: "Scanning market landscape",      pct: 14 },
  { label: "Scanning competitor landscape",   pct: 30 },
  { label: "Analyzing failure patterns",      pct: 47 },
  { label: "Mapping opportunity gaps",        pct: 63 },
  { label: "Building implementation roadmap", pct: 80 },
  { label: "Generating verdict",              pct: 96 },
];

const COMPARISON_ROWS = [
  ["📄 15-page research dump",        "✓  Crisp BUILD / AVOID / PIVOT verdict"],
  ["⏱  5–10 minutes to read",          "✓  ~15 seconds, founder-ready output"],
  ["🔍 Tells you what exists",         "✓  Shows exactly where competitors failed"],
  ["❌ No verdict or recommendation",  "✓  Scored: Market, Competition, Timing"],
  ["❌ No MVP or implementation plan", "✓  4-week MVP + 3-phase roadmap"],
  ["❌ Built for researchers",         "✓  Built for founders who need to act"],
  ["💳 Requires paid subscription",   "✓  100% free, no login required"],
];

const FEATURES = [
  { n:"01", t:"Verdict",          d:"BUILD / AVOID / PIVOT with brutal reason" },
  { n:"02", t:"Score Analysis",   d:"Market, competition, timing — 0–100 each" },
  { n:"03", t:"Live Competitors", d:"Real companies + verified failure points" },
  { n:"04", t:"Market Gaps",      d:"What nobody has built yet — your opening" },
  { n:"05", t:"Killer Feature",   d:"One feature that lets you win" },
  { n:"06", t:"Why Now",          d:"Live market signals for timing" },
  { n:"07", t:"4-Week MVP",       d:"Exactly what to ship to validate" },
  { n:"08", t:"Roadmap",          d:"3-phase plan with specific actions" },
  { n:"09", t:"Revenue Model",    d:"Specific monetization path" },
  { n:"10", t:"Investor Take",    d:"Honest VC fundability read" },
];

// ─── STATE ────────────────────────────────────────────────────────
let currentView = "home";
let idea = "";
let loading = false;
let loadStep = 0;
let result = null;
let error = null;
let copied = false;
let shareId = null;
let loadInterval = null;

// ─── DOM REFS ─────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const views = { home: "home-view", loading: "loading-view", error: "error-view", result: "result-view" };

// ─── UTILS ────────────────────────────────────────────────────────
function scoreColor(s) { return s >= 70 ? "#00e5a0" : s >= 45 ? "#ff9f43" : "#f5a623"; }
function scoreGlow(s)  { return s >= 70 ? "rgba(0,230,118,.4)" : s >= 45 ? "rgba(255,171,0,.4)" : "rgba(255,45,85,.4)"; }

// ─── VIEW MANAGEMENT ──────────────────────────────────────────────
function showView(name) {
  currentView = name;
  Object.entries(views).forEach(([key, id]) => {
    const el = $(id);
    if (key === name) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
  $("nav-new-btn").classList.toggle("hidden", name !== "result");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reset() {
  result = null; idea = ""; error = null; shareId = null; copied = false;
  $("idea-input").value = "";
  $("char-count").textContent = "0/500";
  updateRunBtn();
  showView("home");
}

// ─── ENTRANCE ANIMATIONS ─────────────────────────────────────────
function runEntranceAnimations() {
  const items = document.querySelectorAll(".anim-enter");
  items.forEach((el) => {
    const delay = parseInt(el.dataset.delay || 0, 10) * 80 + 60;
    setTimeout(() => el.classList.add("entered"), delay);
  });
}

// ─── POPULATE STATIC CONTENT ──────────────────────────────────────
function populateComparison() {
  const grid = document.querySelector(".comparison-grid");
  COMPARISON_ROWS.forEach(([them, us]) => {
    const dThem = document.createElement("div");
    dThem.className = "cg-row cg-row-them";
    dThem.innerHTML = `<span>${them}</span>`;
    grid.appendChild(dThem);

    const dUs = document.createElement("div");
    dUs.className = "cg-row cg-row-us";
    dUs.innerHTML = `<span>${us}</span>`;
    grid.appendChild(dUs);
  });
}

function populateFeatures() {
  const grid = $("features-grid");
  FEATURES.forEach(({ n, t, d }) => {
    const card = document.createElement("div");
    card.className = "feature-card";
    card.innerHTML = `
      <div class="feature-num">${n}</div>
      <div class="feature-title">${t}</div>
      <p class="feature-desc">${d}</p>`;
    grid.appendChild(card);
  });
}

// ─── LOADING VIEW SETUP ──────────────────────────────────────────
function setupLoadingSteps() {
  const container = $("loading-steps");
  container.innerHTML = "";
  LOADING_STEPS.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "loading-step";
    div.id = `lstep-${i}`;
    div.innerHTML = `
      <div class="loading-step-dot"></div>
      <span class="loading-step-label">${s.label}</span>`;
    container.appendChild(div);
  });
}

function updateLoadingUI() {
  const circ = 2 * Math.PI * 72;
  const arc = $("loading-arc");
  arc.setAttribute("stroke-dasharray", circ);
  arc.setAttribute("stroke-dashoffset", circ * (1 - LOADING_STEPS[loadStep].pct / 100));
  $("loading-pct").textContent = LOADING_STEPS[loadStep].pct + "%";

  LOADING_STEPS.forEach((_, i) => {
    const step = $(`lstep-${i}`);
    step.classList.remove("active", "done");
    if (i < loadStep) {
      step.classList.add("done");
      if (!step.querySelector(".loading-step-check")) {
        const chk = document.createElement("span");
        chk.className = "loading-step-check";
        chk.textContent = "✓";
        step.appendChild(chk);
      }
    } else if (i === loadStep) {
      step.classList.add("active");
    }
  });
}

// ─── SCORE RING ──────────────────────────────────────────────────
function createScoreRing(score, label, delay) {
  const r = 32, circ = 2 * Math.PI * r;
  const col = scoreColor(score);
  const glow = scoreGlow(score);
  const div = document.createElement("div");
  div.className = "score-ring";
  div.innerHTML = `
    <svg width="82" height="82" viewBox="0 0 82 82">
      <circle cx="41" cy="41" r="${r}" fill="none" stroke="var(--border)" stroke-width="5" />
      <circle cx="41" cy="41" r="${r}" fill="none" stroke="${col}" stroke-width="5"
        stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
        stroke-linecap="round" transform="rotate(-90 41 41)"
        style="transition: stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1) ${delay + 200}ms; filter: drop-shadow(0 0 10px ${glow})" />
      <text x="41" y="47" text-anchor="middle" fill="var(--text-primary)"
        style="font-size:15px; font-weight:700; font-family:'IBM Plex Mono',monospace">${score}</text>
    </svg>
    <div class="score-ring-label">${label}</div>`;

  // Animate
  const svg = div.querySelector("svg");
  setTimeout(() => {
    svg.classList.add("visible");
    const arc = div.querySelectorAll("circle")[1];
    arc.setAttribute("stroke-dashoffset", circ - (score / 100) * circ);
  }, delay);

  return div;
}

// ─── RENDER RESULT ───────────────────────────────────────────────
function renderResult() {
  if (!result) return;
  const r = result;

  // Date
  $("result-date").textContent = "AUDIT COMPLETE · " +
    new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  // Verdict
  const cfg = {
    BUILD: { color: "var(--green)",  cls: "build", icon: "↑" },
    AVOID: { color: "var(--accent)", cls: "avoid", icon: "✕" },
    PIVOT: { color: "var(--amber)",  cls: "pivot", icon: "◆" },
  };
  const vc = cfg[r.verdict] || cfg.PIVOT;
  const vb = $("verdict-block");
  vb.className = `verdict-block ${vc.cls}`;
  vb.innerHTML = `
    <div class="verdict-top">
      <span class="verdict-icon" style="color:${vc.color}">${vc.icon}</span>
      <span class="verdict-word" style="color:${vc.color}; text-shadow:0 0 48px ${vc.color}">${r.verdict}</span>
    </div>
    <p class="verdict-reason">${r.verdictReason}</p>`;

  // Score Rings
  const rings = $("score-rings");
  rings.innerHTML = "";
  rings.appendChild(createScoreRing(r.marketScore,      "Market",      0));
  rings.appendChild(createScoreRing(r.competitionScore, "Competition", 150));
  rings.appendChild(createScoreRing(r.timingScore,      "Timing",      300));
  rings.appendChild(createScoreRing(r.overallScore,     "Overall",     450));

  // Summary + Why Now
  $("result-summary").textContent = r.summary;
  $("result-whynow").textContent = r.whyNow;

  // Signal Cards
  const signals = $("signal-cards");
  signals.innerHTML = "";
  [
    { k: "Killer Feature", v: r.killerFeature, c: "var(--accent)" },
    { k: "Target Segment", v: r.targetSegment, c: "var(--purple)" },
    { k: "Revenue Model",  v: r.revenueModel,  c: "var(--green)" },
    { k: "Biggest Risk",   v: r.biggestRisk,   c: "var(--amber)" },
  ].forEach(({ k, v, c }) => {
    const card = document.createElement("div");
    card.className = "signal-card";
    card.innerHTML = `
      <div class="signal-card-label" style="color:${c}">${k}</div>
      <p class="signal-card-value">${v}</p>`;
    signals.appendChild(card);
  });

  // Competitors
  const compList = $("competitors-list");
  compList.innerHTML = "";
  (r.existingPlayers || []).forEach((p) => {
    const statusCls = p.status === "failed" ? "failed" : p.status === "acquired" ? "acquired" : "active";
    const item = document.createElement("div");
    item.className = "competitor-item";
    item.innerHTML = `
      <div class="competitor-top">
        <span class="competitor-name">${p.name}</span>
        <span class="competitor-status ${statusCls}">${p.status}</span>
      </div>
      <div class="competitor-meta">${p.founded} · ${p.funding}</div>
      <p class="competitor-weakness">${p.weakness}</p>`;
    compList.appendChild(item);
  });

  // Market Gaps
  const gapsList = $("gaps-list");
  gapsList.innerHTML = "";
  (r.marketGaps || []).forEach((g, i) => {
    const item = document.createElement("div");
    item.className = "gap-item";
    item.innerHTML = `
      <span class="gap-num">${String(i + 1).padStart(2, "0")}</span>
      <p class="gap-text">${g}</p>`;
    gapsList.appendChild(item);
  });

  // MVP
  $("result-mvp").textContent = r.mvpIdea;

  // Roadmap
  const phases = $("roadmap-phases");
  phases.innerHTML = "";
  (r.implementationRoadmap || []).forEach((ph) => {
    const phDiv = document.createElement("div");
    phDiv.className = "roadmap-phase";
    phDiv.innerHTML = `
      <div class="roadmap-phase-head">${ph.phase} · ${ph.duration}</div>
      <div class="roadmap-phase-title">${ph.focus}</div>
      ${(ph.actions || []).map(a => `
        <div class="roadmap-action">
          <span class="roadmap-action-dash">—</span>
          <span class="roadmap-action-text">${a}</span>
        </div>`).join("")}`;
    phases.appendChild(phDiv);
  });

  // Investor
  $("result-investor").textContent = `"${r.investorTake}"`;

  // Share state reset
  shareId = null; copied = false;
  $("share-link-box").classList.add("hidden");
  $("share-error").classList.add("hidden");
  $("share-hint").classList.remove("hidden");
  $("share-btn").textContent = "⎘ SHARE WITH INVESTORS";
  $("share-btn").classList.remove("copied");
  $("result-share-link-box").classList.add("hidden");
  $("result-share-hint").classList.remove("hidden");
  $("result-share-btn").textContent = "⎘ Share with Investors";
  $("result-share-btn").classList.remove("copied");
}

// ─── SHARE LOGIC ─────────────────────────────────────────────────
async function copyShare() {
  if (!result) return;
  try {
    const slim = {
      verdict: result.verdict, verdictReason: result.verdictReason,
      marketScore: result.marketScore, competitionScore: result.competitionScore,
      timingScore: result.timingScore, overallScore: result.overallScore,
      summary: result.summary, killerFeature: result.killerFeature,
      targetSegment: result.targetSegment, revenueModel: result.revenueModel,
      biggestRisk: result.biggestRisk, mvpIdea: result.mvpIdea,
      investorTake: result.investorTake, whyNow: result.whyNow,
      marketGaps: result.marketGaps,
      existingPlayers: (result.existingPlayers || []).slice(0, 3),
      implementationRoadmap: result.implementationRoadmap,
    };
    const enc = btoa(encodeURIComponent(JSON.stringify(slim)));
    const url = `${window.location.origin}${window.location.pathname}?r=${enc}`;
    shareId = enc.slice(0, 8);

    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      $("share-btn").textContent = "✓ COPIED!";
      $("share-btn").classList.add("copied");
      $("result-share-btn").textContent = "✓ COPIED!";
      $("result-share-btn").classList.add("copied");
      setTimeout(() => {
        copied = false;
        $("share-btn").textContent = "⎘ SHARE WITH INVESTORS";
        $("share-btn").classList.remove("copied");
        $("result-share-btn").textContent = "⎘ Share with Investors";
        $("result-share-btn").classList.remove("copied");
      }, 3000);
    } catch {
      $("share-error").textContent = "Auto-copy blocked — long-press the link below to copy";
      $("share-error").classList.remove("hidden");
    }

    // Show link boxes
    $("share-link-box").classList.remove("hidden");
    $("share-link-text").textContent = `ideaaudit.app/audit/${shareId}…`;
    $("share-hint").classList.add("hidden");

    $("result-share-link-box").classList.remove("hidden");
    $("result-share-link-text").textContent = url;
    $("result-share-hint").classList.add("hidden");

  } catch (e) {
    $("share-error").textContent = "Share failed: " + e.message;
    $("share-error").classList.remove("hidden");
  }
}

// ─── RUN BUTTON STATE ────────────────────────────────────────────
function updateRunBtn() {
  const btn = $("run-audit-btn");
  if (idea.trim()) {
    btn.classList.remove("disabled");
    btn.disabled = false;
  } else {
    btn.classList.add("disabled");
    btn.disabled = true;
  }
}

// ─── ANALYZE ─────────────────────────────────────────────────────
async function analyze() {
  if (!idea.trim() || loading) return;
  loading = true; result = null; error = null; loadStep = 0;

  // Show loading
  setupLoadingSteps();
  $("loading-idea-text").textContent = `"${idea.length > 90 ? idea.slice(0, 90) + "…" : idea}"`;
  const circ = 2 * Math.PI * 72;
  $("loading-arc").setAttribute("stroke-dasharray", circ);
  $("loading-arc").setAttribute("stroke-dashoffset", circ);
  showView("loading");
  updateLoadingUI();

  loadInterval = setInterval(() => {
    loadStep = Math.min(loadStep + 1, LOADING_STEPS.length - 1);
    updateLoadingUI();
  }, 1900);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerously-allow-browser": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Analyze this startup idea. Respond with ONLY a raw JSON object. No markdown. No backticks. No explanation. Start your response with { and end with }. Idea: ${idea}`
        }],
      }),
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);
    if (data.error) throw new Error(data.error.message);

    const allText = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("").trim();

    if (!allText) throw new Error(`Model returned empty response (stop_reason: ${data.stop_reason})`);

    const start = allText.indexOf("{");
    const end = allText.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Model did not return JSON. Try a more specific idea.");

    let parsed;
    try { parsed = JSON.parse(allText.slice(start, end + 1)); }
    catch { throw new Error("JSON parse failed — model response was malformed. Try again."); }

    if (!parsed.verdict) throw new Error("Analysis incomplete — please try again.");

    result = parsed;
    renderResult();
    showView("result");

  } catch (e) {
    clearTimeout(timeout);
    error = e.name === "AbortError"
      ? "Analysis timed out after 90s. Try a shorter idea description."
      : e.message || "Analysis failed. Try again.";
    $("error-message").textContent = error;
    showView("error");
  } finally {
    loading = false;
    clearInterval(loadInterval);
  }
}

// ─── CHECK URL FOR SHARED RESULT ─────────────────────────────────
function checkSharedResult() {
  try {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("r");
    if (!r) return;
    const parsed = JSON.parse(decodeURIComponent(atob(r)));
    if (parsed?.verdict) {
      result = parsed;
      renderResult();
      showView("result");
    }
  } catch { /* bad param, stay on home */ }
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Populate static content
  populateComparison();
  populateFeatures();

  // Entrance animations
  setTimeout(runEntranceAnimations, 60);

  // Input events
  const input = $("idea-input");
  input.addEventListener("input", (e) => {
    idea = e.target.value.slice(0, 500);
    e.target.value = idea;
    $("char-count").textContent = `${idea.length}/500`;
    updateRunBtn();
  });
  input.addEventListener("focus", () => $("input-card").classList.add("focused"));
  input.addEventListener("blur", () => $("input-card").classList.remove("focused"));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
  });

  // Buttons
  $("run-audit-btn").addEventListener("click", analyze);
  $("sample-btn").addEventListener("click", () => {
    idea = SAMPLE_IDEAS[Math.floor(Math.random() * SAMPLE_IDEAS.length)];
    input.value = idea;
    $("char-count").textContent = `${idea.length}/500`;
    updateRunBtn();
    input.focus();
  });
  $("cta-start-btn").addEventListener("click", () => {
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Nav
  $("nav-home-btn").addEventListener("click", reset);
  $("nav-new-btn").addEventListener("click", reset);

  // Error view
  $("error-retry-btn").addEventListener("click", () => { error = null; analyze(); });
  $("error-edit-btn").addEventListener("click", reset);

  // Result view
  $("result-new-btn").addEventListener("click", reset);
  $("share-btn").addEventListener("click", copyShare);
  $("share-copy-btn").addEventListener("click", copyShare);
  $("result-share-btn").addEventListener("click", copyShare);

  // Check for shared result in URL
  checkSharedResult();
});
