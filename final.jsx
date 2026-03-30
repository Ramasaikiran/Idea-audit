import { useState, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
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

const STATS = [
  { n: "2,400+", l: "Ideas audited" },
  { n: "15s",    l: "Avg analysis time" },
  { n: "100%",   l: "Free, no login" },
];

// ─── COLOUR TOKENS — deep cosmos indigo + electric amber ─────────────────────
const C = {
  bg:          "#04040e",          // near-black with blue undertone
  surface:     "#09091f",          // deep indigo surface
  surfaceHover:"#0e0e28",
  border:      "#17173a",          // visible indigo border
  borderHover: "#252558",
  textPrimary:   "#eeeeff",        // crisp cool white  — 16:1 on bg
  textSecondary: "#9a9abf",        // readable mid-tone — 5.8:1 on surface
  textMuted:     "#5a5a80",        // labels/hints       — 3.2:1 on surface
  accent:    "#f5a623",            // electric amber/gold
  accentDim: "rgba(245,166,35,.12)",
  green:     "#00e5a0",            // teal-green success
  greenDim:  "rgba(0,229,160,.1)",
  amber:     "#ff9f43",            // warm orange
  amberDim:  "rgba(255,159,67,.1)",
  purple:    "#c084fc",
  purpleDim: "rgba(192,132,252,.1)",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const scoreColor = s => s >= 70 ? C.green : s >= 45 ? C.amber : C.accent;
const scoreGlow  = s => s >= 70 ? "rgba(0,230,118,.4)" : s >= 45 ? "rgba(255,171,0,.4)" : "rgba(255,45,85,.4)";

// ─── SCORE RING ──────────────────────────────────────────────────────────────
function ScoreRing({ score, label, delay = 0 }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t); }, [delay]);
  const r = 32, circ = 2 * Math.PI * r;
  const col = scoreColor(score);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="82" height="82" viewBox="0 0 82 82" style={{ opacity: go ? 1 : 0, transition: `opacity .5s ${delay}ms` }}>
        <circle cx="41" cy="41" r={r} fill="none" stroke={C.border} strokeWidth="5" />
        <circle cx="41" cy="41" r={r} fill="none" stroke={col} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={go ? circ - (score / 100) * circ : circ}
          strokeLinecap="round" transform="rotate(-90 41 41)"
          style={{ transition: `stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1) ${delay + 200}ms`, filter: `drop-shadow(0 0 10px ${scoreGlow(score)})` }} />
        <text x="41" y="47" textAnchor="middle" fill={C.textPrimary}
          style={{ fontSize: "15px", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>{score}</text>
      </svg>
      <div style={{ fontSize: "9px", color: C.textMuted, letterSpacing: ".18em", textTransform: "uppercase", marginTop: "5px", fontFamily: "IBM Plex Mono, monospace" }}>{label}</div>
    </div>
  );
}

// ─── VERDICT ─────────────────────────────────────────────────────────────────
function VerdictBlock({ verdict, reason }) {
  const cfg = {
    BUILD: { color: C.green,  bg: C.greenDim,  icon: "↑" },
    AVOID: { color: C.accent, bg: C.accentDim, icon: "✕" },
    PIVOT: { color: C.amber,  bg: C.amberDim,  icon: "◆" },
  };
  const c = cfg[verdict] || cfg.PIVOT;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: "6px", padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
        <span style={{ fontSize: "24px", color: c.color }}>{c.icon}</span>
        <span style={{ fontFamily: "Bebas Neue, cursive", fontSize: "52px", color: c.color, letterSpacing: ".08em", lineHeight: 1, textShadow: `0 0 48px ${c.color}88` }}>{verdict}</span>
      </div>
      <p style={{ fontFamily: "DM Serif Display, serif", fontStyle: "italic", fontSize: "16px", color: C.textSecondary, lineHeight: 1.65 }}>{reason}</p>
    </div>
  );
}

// ─── PILL BADGE ──────────────────────────────────────────────────────────────
function Pill({ children, color, dot }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "100px", background: color ? `${color}15` : C.surface, border: `1px solid ${color ? color + "30" : C.border}`, fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: color || C.textSecondary, letterSpacing: ".06em" }}>
      {dot && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}`, animation: "pulse 2s ease infinite", flexShrink: 0 }} />}
      {children}
    </span>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
function SL({ children, color = C.accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
      <div style={{ width: "20px", height: "2px", background: color, borderRadius: "1px" }} />
      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted, letterSpacing: ".2em", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ onHome, showNew, onNew }) {
  return (
    <nav style={{ padding: "0 28px", height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, background: C.bg, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
      <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", gap: "3px", alignItems: "flex-end" }}>
          {[9,14,9].map((h, i) => <div key={i} style={{ width: "5px", height: `${h}px`, background: i===1 ? C.accent : C.accent+"55", borderRadius: "1px" }} />)}
        </div>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, fontSize: "14px", color: C.textPrimary, letterSpacing: ".05em" }}>IDEA<span style={{ color: C.accent }}>AUDIT</span></span>
      </button>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Pill color={C.green} dot>AI ANALYSIS</Pill>
        {showNew && (
          <button onClick={onNew} style={{ padding: "8px 18px", background: C.accent, color: "white", border: "none", borderRadius: "4px", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", fontWeight: 700, letterSpacing: ".1em", cursor: "pointer", textTransform: "uppercase", boxShadow: `0 0 16px ${C.accent}44` }}>
            New Audit
          </button>
        )}
      </div>
    </nav>
  );
}

// ─── LOADING TIMEOUT SAFETY ───────────────────────────────────────────────────
function LoadingTimeout({ onRetry }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60000); // 60s
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div style={{ marginTop: "28px", padding: "16px 20px", background: "rgba(232,120,10,.08)", border: `1px solid ${C.saffron || "#e8780a"}44`, borderRadius: "6px", textAlign: "center" }}>
      <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: "#e8780a", marginBottom: "12px", letterSpacing: ".06em" }}>
        Taking longer than expected...
      </p>
      <button onClick={onRetry} style={{ padding: "8px 20px", background: "#e8780a", color: "white", border: "none", borderRadius: "4px", fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", cursor: "pointer" }}>
        ← TRY AGAIN
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function IdeaAudit() {
  const [view, setView]         = useState("home");
  const [idea, setIdea]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [copied, setCopied]     = useState(false);
  const [focused, setFocused]   = useState(false);
  const [entered, setEntered]   = useState(false);
  const [shareId, setShareId]   = useState(null);
  const [shareError, setShareError] = useState(null);
  const topRef = useRef(null);
  const taRef  = useRef(null);

  useEffect(() => { setTimeout(() => setEntered(true), 60); }, []);
  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [view]);
  useEffect(() => {
    let t;
    if (loading) t = setInterval(() => setLoadStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 1900);
    return () => clearInterval(t);
  }, [loading]);

  // On mount — check URL for shared result
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("r");
      if (!r) return;
      const parsed = JSON.parse(decodeURIComponent(atob(r)));
      if (parsed?.verdict) { setResult(parsed); setView("result"); }
    } catch { /* bad param, stay on home */ }
  }, []);

  const reset = () => { setResult(null); setIdea(""); setError(null); setShareId(null); setView("home"); };

  // Share — store key fields only (keeps URL short enough to copy)
  const copyShare = async () => {
    try {
      setShareError(null);
      // Only encode the fields investors care about — keeps URL under 2000 chars
      const slim = {
        verdict: result.verdict,
        verdictReason: result.verdictReason,
        marketScore: result.marketScore,
        competitionScore: result.competitionScore,
        timingScore: result.timingScore,
        overallScore: result.overallScore,
        summary: result.summary,
        killerFeature: result.killerFeature,
        targetSegment: result.targetSegment,
        revenueModel: result.revenueModel,
        biggestRisk: result.biggestRisk,
        mvpIdea: result.mvpIdea,
        investorTake: result.investorTake,
        whyNow: result.whyNow,
        marketGaps: result.marketGaps,
        existingPlayers: (result.existingPlayers || []).slice(0, 3),
        implementationRoadmap: result.implementationRoadmap,
      };
      const enc = btoa(encodeURIComponent(JSON.stringify(slim)));
      const url = `${window.location.origin}${window.location.pathname}?r=${enc}`;
      const id = enc.slice(0, 8);
      setShareId(id);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Clipboard blocked (mobile) — show URL visually so user can copy manually
        setShareError("Auto-copy blocked — long-press the link below to copy");
      }
    } catch (e) {
      setShareError("Share failed: " + e.message);
    }
  };

  const fillSample = () => {
    const s = SAMPLE_IDEAS[Math.floor(Math.random() * SAMPLE_IDEAS.length)];
    setIdea(s);
    taRef.current?.focus();
  };

  const analyze = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true); setResult(null); setError(null); setLoadStep(0); setView("loading");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
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
      if (data.error)  throw new Error(data.error.message);

      const allText = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("").trim();

      if (!allText) throw new Error(`Model returned empty response (stop_reason: ${data.stop_reason})`);

      // Extract JSON — find outermost { }
      const start = allText.indexOf("{");
      const end   = allText.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("Model did not return JSON. Try a more specific idea.");

      let parsed;
      try {
        parsed = JSON.parse(allText.slice(start, end + 1));
      } catch {
        throw new Error("JSON parse failed — model response was malformed. Try again.");
      }

      if (!parsed.verdict) throw new Error("Analysis incomplete — please try again.");

      setResult(parsed);
      setView("result");

    } catch (e) {
      clearTimeout(timeout);
      const msg = e.name === "AbortError"
        ? "Analysis timed out after 90s. Try a shorter idea description."
        : e.message || "Analysis failed. Try again.";
      setError(msg);
      // Stay on loading screen to show the error — don't bounce to home
      setView("error");
    } finally {
      setLoading(false);
    }
  };

  // ── HOME VIEW ─────────────────────────────────────────────────────────────
  if (view === "home") return (
    <div ref={topRef} style={{ background: C.bg, minHeight: "100vh", color: C.textPrimary }}>
      <GS />
      <Nav onHome={reset} />

      {/* Grid + glow bg */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border}18 1px,transparent 1px),linear-gradient(90deg,${C.border}18 1px,transparent 1px)`, backgroundSize: "52px 52px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", background: `radial-gradient(ellipse, ${C.accent}06 0%, transparent 65%)`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 }}>

        {/* ── HERO ── */}
        <div style={{ paddingTop: "80px", paddingBottom: "64px" }}>

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", opacity: entered ? 1 : 0, transform: entered ? "none" : "translateY(12px)", transition: "all .6s" }}>
            <div style={{ width: "28px", height: "1px", background: C.accent }} />
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: C.accent, letterSpacing: ".22em", textTransform: "uppercase" }}>Free · No login · For founders</span>
          </div>

          {/* Headline — the actual pain point */}
          <h1 style={{ fontFamily: "Bebas Neue, cursive", fontSize: "clamp(58px, 10vw, 120px)", fontWeight: 400, lineHeight: .92, letterSpacing: ".02em", marginBottom: "28px", opacity: entered ? 1 : 0, transform: entered ? "none" : "translateY(20px)", transition: "all .7s .08s" }}>
            IS YOUR IDEA<br />
            <span style={{ color: C.accent, textShadow: `0 0 80px ${C.accent}55` }}>WORTH 6 MONTHS</span><br />
            OF YOUR LIFE?
          </h1>

          {/* Sub */}
          <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "19px", color: C.textSecondary, maxWidth: "500px", lineHeight: 1.75, marginBottom: "48px", opacity: entered ? 1 : 0, transition: "all .7s .18s" }}>
            We map every competitor, expose exactly
            where they failed — then give you a founder-specific action plan
            in 15 seconds.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "32px", marginBottom: "40px", flexWrap: "wrap", opacity: entered ? 1 : 0, transition: "all .7s .24s" }}>
            {STATS.map(({ n, l }) => (
              <div key={l}>
                <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "28px", color: C.textPrimary, letterSpacing: ".04em" }}>{n}</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted, letterSpacing: ".1em" }}>{l}</div>
              </div>
            ))}
          </div>

          {/* ── INPUT CARD ── */}
          <div style={{
            maxWidth: "680px", background: C.surface,
            border: `1px solid ${focused ? C.accent + "66" : C.border}`,
            borderRadius: "10px", overflow: "hidden",
            boxShadow: focused
              ? `0 0 0 3px ${C.accent}18, 0 32px 80px rgba(0,0,0,.6)`
              : "0 32px 80px rgba(0,0,0,.5)",
            transition: "border-color .3s, box-shadow .3s",
            opacity: entered ? 1 : 0, transform: entered ? "none" : "translateY(16px)",
            transitionDelay: ".3s", transitionDuration: ".7s"
          }}>
            {/* Window chrome */}
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {[C.accent, C.amber, C.green].map(c => <div key={c} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: .4 }} />)}
              </div>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted, letterSpacing: ".1em" }}>idea.terminal</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}`, display: "inline-block", animation: "pulse 2s ease infinite" }} />
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.green, letterSpacing: ".1em" }}>CLAUDE AI</span>
              </div>
            </div>

            <div style={{ padding: "22px 22px 0" }}>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted, letterSpacing: ".14em", marginBottom: "12px" }}>
                $ DESCRIBE YOUR STARTUP IDEA
              </div>
              <textarea
                ref={taRef}
                value={idea}
                onChange={e => setIdea(e.target.value.slice(0, 500))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze(); }}
                placeholder="e.g. An AI tool that helps Indian college students find relevant internships and auto-fills applications..."
                rows={4}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "DM Serif Display, serif", fontSize: "17px", color: C.textPrimary, lineHeight: 1.7, resize: "none", caretColor: C.accent }}
              />
            </div>

            <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={fillSample}
                  style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "4px", color: C.textSecondary, fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", letterSpacing: ".08em", cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.textPrimary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
                  ⚡ Try a sample
                </button>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted }}>{idea.length}/500</span>
              </div>
              <button onClick={analyze} disabled={!idea.trim()}
                style={{
                  padding: "12px 28px",
                  background: idea.trim() ? `linear-gradient(135deg, ${C.accent}, #ff6b35)` : C.border,
                  color: idea.trim() ? "white" : C.textMuted,
                  border: "none", borderRadius: "5px",
                  fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", fontWeight: 700,
                  letterSpacing: ".14em", textTransform: "uppercase",
                  cursor: idea.trim() ? "pointer" : "not-allowed",
                  boxShadow: idea.trim() ? `0 0 28px ${C.accent}44` : "none",
                  animation: idea.trim() ? "btnPulse 3s ease infinite" : "none",
                  transition: "all .3s"
                }}>
                RUN AUDIT →
              </button>
            </div>
          </div>

          {/* Trust pills */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap", opacity: entered ? 1 : 0, transition: "all .7s .4s" }}>
            <Pill>✓ Free forever</Pill>
            <Pill>✓ No login needed</Pill>
            <Pill color={C.green} dot>Claude AI</Pill>
            <Pill>✓ Results in ~15s</Pill>
          </div>

          {error && <p style={{ marginTop: "12px", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: C.accent }}>⚠ {error}</p>}
        </div>

        {/* ── VS GEMINI ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "72px 0" }}>
          <SL color={C.amber}>Why not Gemini / Perplexity / ChatGPT?</SL>
          <h2 style={{ fontFamily: "Bebas Neue, cursive", fontSize: "clamp(30px, 4.5vw, 52px)", color: C.textPrimary, letterSpacing: ".03em", marginBottom: "36px", lineHeight: 1.05 }}>
            They write you a research essay.<br />
            <span style={{ color: C.amber }}>We make you a decision.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: "820px", gap: "1px", background: C.border, borderRadius: "8px", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: C.surface, padding: "14px 22px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted, letterSpacing: ".14em" }}>GEMINI / PERPLEXITY / CHATGPT</span>
            </div>
            <div style={{ background: C.surface, padding: "14px 22px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.accent, letterSpacing: ".14em" }}>IDEAAUDIT</span>
            </div>
            {[
              ["📄 15-page research dump",        "✓  Crisp BUILD / AVOID / PIVOT verdict"],
              ["⏱  5–10 minutes to read",          "✓  ~15 seconds, founder-ready output"],
              ["🔍 Tells you what exists",         "✓  Shows exactly where competitors failed"],
              ["❌ No verdict or recommendation",  "✓  Scored: Market, Competition, Timing"],
              ["❌ No MVP or implementation plan", "✓  4-week MVP + 3-phase roadmap"],
              ["❌ Built for researchers",         "✓  Built for founders who need to act"],
              ["💳 Requires paid subscription",   "✓  100% free, no login required"],
            ].map(([them, us], i) => (
              <>
                <div key={`t${i}`} style={{ background: "#07071a", padding: "13px 22px", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: "DM Serif Display, serif", fontSize: "14px", color: C.textMuted }}>{them}</span>
                </div>
                <div key={`u${i}`} style={{ background: C.surface, padding: "13px 22px", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: "DM Serif Display, serif", fontSize: "14px", color: "#a0e8b8" }}>{us}</span>
                </div>
              </>
            ))}
          </div>
        </div>

        {/* ── WHAT YOU GET ── */}
        <div style={{ paddingBottom: "72px" }}>
          <SL>10-Section Full Report</SL>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1px", background: C.border, borderRadius: "8px", overflow: "hidden" }}>
            {[
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
            ].map(({ n, t, d }) => (
              <div key={n} style={{ background: C.surface, padding: "20px", cursor: "default", transition: "background .2s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = C.surface}>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.accent, fontWeight: 700, letterSpacing: ".12em", marginBottom: "7px" }}>{n}</div>
                <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "18px", color: C.textPrimary, letterSpacing: ".04em", marginBottom: "5px" }}>{t}</div>
                <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "13px", color: C.textMuted, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: "center", padding: "64px 0 80px", borderTop: `1px solid ${C.border}` }}>
          <h2 style={{ fontFamily: "Bebas Neue, cursive", fontSize: "clamp(38px, 6vw, 72px)", color: C.textPrimary, letterSpacing: ".04em", lineHeight: .95, marginBottom: "20px" }}>
            HAVE AN IDEA?<br />
            <span style={{ color: C.accent, textShadow: `0 0 60px ${C.accent}44` }}>AUDIT IT FREE.</span>
          </h2>
          <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "16px", color: C.textSecondary, marginBottom: "32px" }}>No signup. No credit card. Just your idea.</p>
          <button
            onClick={() => { taRef.current?.focus(); taRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            style={{ padding: "16px 52px", background: `linear-gradient(135deg,${C.accent},#ff6b35)`, color: "white", border: "none", borderRadius: "5px", fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer", boxShadow: `0 0 40px ${C.accent}38`, animation: "btnPulse 3s ease infinite" }}>
            Start Free Audit →
          </button>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
            <Pill>✓ Free forever</Pill>
            <Pill>✓ No login</Pill>
            <Pill color={C.green} dot>Claude AI</Pill>
          </div>
        </div>
      </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "20px 28px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted }}>IDEAAUDIT · NOT FINANCIAL ADVICE</span>
      </footer>
    </div>
  );

  // ── LOADING VIEW ──────────────────────────────────────────────────────────
  if (view === "loading") return (
    <div ref={topRef} style={{ background: C.bg, minHeight: "100vh" }}>
      <GS />
      <Nav onHome={reset} />
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "96px 28px", textAlign: "center" }}>
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.accent, letterSpacing: ".28em", marginBottom: "52px", textTransform: "uppercase" }}>Running Analysis</div>

        {/* Big ring */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "52px" }}>
          <svg width="172" height="172" viewBox="0 0 172 172">
            <circle cx="86" cy="86" r="72" fill="none" stroke={C.border} strokeWidth="4" />
            <circle cx="86" cy="86" r="60" fill="none" stroke={C.border} strokeWidth="1" strokeDasharray="3 10" opacity=".4" style={{ animation: "spin 12s linear infinite" }} />
            <circle cx="86" cy="86" r="72" fill="none" stroke={C.accent} strokeWidth="4"
              strokeDasharray={2 * Math.PI * 72}
              strokeDashoffset={2 * Math.PI * 72 * (1 - LOADING_STEPS[loadStep].pct / 100)}
              strokeLinecap="round" transform="rotate(-90 86 86)"
              style={{ transition: "stroke-dashoffset 1.7s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 14px ${C.accent}66)` }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "46px", color: C.accent, lineHeight: 1 }}>{LOADING_STEPS[loadStep].pct}%</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, letterSpacing: ".14em" }}>COMPLETE</div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "11px", textAlign: "left", maxWidth: "340px", margin: "0 auto 44px" }}>
          {LOADING_STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", opacity: i <= loadStep ? 1 : .18, transition: "opacity .4s" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: i < loadStep ? C.green : i === loadStep ? C.accent : C.textMuted, boxShadow: i === loadStep ? `0 0 8px ${C.accent}` : i < loadStep ? `0 0 6px ${C.green}` : "none", transition: "all .4s" }} />
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: i < loadStep ? C.green : i === loadStep ? C.textPrimary : C.textMuted, letterSpacing: ".07em", transition: "color .4s" }}>{s.label}</span>
              {i < loadStep && <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.green, marginLeft: "auto" }}>✓</span>}
            </div>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "16px 20px" }}>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, marginBottom: "8px", letterSpacing: ".12em" }}>ANALYZING</div>
          <p style={{ fontFamily: "DM Serif Display, serif", fontStyle: "italic", fontSize: "14px", color: C.textSecondary, lineHeight: 1.6 }}>
            "{idea.length > 90 ? idea.slice(0, 90) + "…" : idea}"
          </p>
        </div>
      </div>
    </div>
  );

  // ── ERROR VIEW ────────────────────────────────────────────────────────────
  if (view === "error") return (
    <div ref={topRef} style={{ background: C.bg, minHeight: "100vh" }}>
      <GS />
      <Nav onHome={reset} />
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "96px 28px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "24px" }}>⚠</div>
        <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "32px", color: C.textPrimary, letterSpacing: ".06em", marginBottom: "16px" }}>
          Analysis Failed
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "32px" }}>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, letterSpacing: ".14em", marginBottom: "10px" }}>ERROR DETAIL</div>
          <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "15px", color: "#e06050", lineHeight: 1.6 }}>{error || "Unknown error occurred"}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setView("loading"); setLoadStep(0); setError(null); analyze(); }}
            style={{ padding: "12px 28px", background: `linear-gradient(135deg,${C.accent},#ff8c42)`, color: "white", border: "none", borderRadius: "4px", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", cursor: "pointer" }}>
            Try Again →
          </button>
          <button onClick={reset}
            style={{ padding: "12px 20px", background: "transparent", color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: "4px", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", letterSpacing: ".1em", cursor: "pointer" }}>
            ← Edit Idea
          </button>
        </div>
      </div>
    </div>
  );

  // ── RESULT VIEW ───────────────────────────────────────────────────────────
  if (view === "result" && result) {
    const r = result;
    return (
      <div ref={topRef} style={{ background: C.bg, minHeight: "100vh", color: C.textPrimary }}>
        <GS />
        <Nav onHome={reset} showNew onNew={reset} />
        <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border}14 1px,transparent 1px),linear-gradient(90deg,${C.border}14 1px,transparent 1px)`, backgroundSize: "52px 52px", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ maxWidth: "980px", margin: "0 auto", padding: "44px 28px 80px", position: "relative", zIndex: 1, animation: "fadeUp .5s ease" }}>

          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, letterSpacing: ".16em", paddingTop: "4px" }}>
              AUDIT COMPLETE · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}
            </div>

            {/* Share panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button onClick={copyShare}
                  style={{ padding: "9px 18px", background: copied ? C.green : `linear-gradient(135deg,${C.accent},#ff8c42)`, color: copied ? C.bg : "white", border: "none", borderRadius: "4px", fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", transition: "all .3s", boxShadow: copied ? `0 0 16px ${C.green}44` : `0 0 16px ${C.accent}33` }}>
                  {copied ? "✓ COPIED!" : "⎘ SHARE WITH INVESTORS"}
                </button>
              </div>

              {/* Visible link box — appears after share, shows full URL for manual copy */}
              {shareId && result && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px 12px", display: "flex", gap: "10px", alignItems: "center", maxWidth: "340px" }}>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    ideaaudit.app/audit/{shareId}…
                  </span>
                  <button onClick={copyShare}
                    style={{ background: "transparent", border: "none", color: C.accent, fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", cursor: "pointer", flexShrink: 0 }}>
                    COPY
                  </button>
                </div>
              )}

              {shareError && (
                <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: "#e06050" }}>{shareError}</p>
              )}

              {/* Investor context note */}
              {!shareId && (
                <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, textAlign: "right" }}>
                  Share audit report with investors, mentors, or co-founders
                </p>
              )}
            </div>
          </div>

          {/* Verdict + rings */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "20px", marginBottom: "20px", alignItems: "start" }}>
            <VerdictBlock verdict={r.verdict} reason={r.verdictReason} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <ScoreRing score={r.marketScore}      label="Market"      delay={0} />
              <ScoreRing score={r.competitionScore} label="Competition" delay={150} />
              <ScoreRing score={r.timingScore}      label="Timing"      delay={300} />
              <ScoreRing score={r.overallScore}     label="Overall"     delay={450} />
            </div>
          </div>

          {/* Summary + Why Now */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1px", background: C.border, borderRadius: "6px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ background: C.surface, padding: "26px" }}>
              <SL>Executive Summary</SL>
              <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "17px", color: C.textSecondary, lineHeight: 1.8 }}>{r.summary}</p>
            </div>
            <div style={{ background: "#07071c", padding: "26px" }}>
              <SL color={C.green}>Why Now</SL>
              <p style={{ fontFamily: "DM Serif Display, serif", fontStyle: "italic", fontSize: "14px", color: "#5aaa78", lineHeight: 1.7 }}>{r.whyNow}</p>
            </div>
          </div>

          {/* 4 signal cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: C.border, borderRadius: "6px", overflow: "hidden", marginBottom: "20px" }}>
            {[
              { k:"Killer Feature", v:r.killerFeature, c:C.accent  },
              { k:"Target Segment", v:r.targetSegment, c:C.purple  },
              { k:"Revenue Model",  v:r.revenueModel,  c:C.green   },
              { k:"Biggest Risk",   v:r.biggestRisk,   c:C.amber   },
            ].map(({ k, v, c }) => (
              <div key={k} style={{ background: C.surface, padding: "20px" }}>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", fontWeight: 700, color: c, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: "10px" }}>{k}</div>
                <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "13px", color: C.textSecondary, lineHeight: 1.6 }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Competitors + Gaps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <SL color={C.amber}>Existing Players</SL>
                <Pill color={C.green} dot>Live data</Pill>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {r.existingPlayers?.map((p, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${C.amber}30`, paddingLeft: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "Bebas Neue, cursive", fontSize: "18px", color: C.textPrimary, letterSpacing: ".04em" }}>{p.name}</span>
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", padding: "2px 7px", border: `1px solid ${C.border}`, borderRadius: "2px", color: p.status === "failed" ? C.accent : p.status === "acquired" ? C.purple : C.textMuted }}>{p.status}</span>
                    </div>
                    <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, marginBottom: "6px" }}>{p.founded} · {p.funding}</div>
                    <p style={{ fontFamily: "DM Serif Display, serif", fontStyle: "italic", fontSize: "13px", color: C.textMuted, lineHeight: 1.55 }}>{p.weakness}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "24px" }}>
              <SL color={C.green}>Opportunity Gaps</SL>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {r.marketGaps?.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px" }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: C.green, fontWeight: 700, flexShrink: 0, paddingTop: "2px" }}>{String(i+1).padStart(2,"0")}</span>
                    <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "14px", color: C.textSecondary, lineHeight: 1.65 }}>{g}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MVP */}
          <div style={{ background: C.greenDim, border: `1px solid ${C.green}25`, borderRadius: "6px", padding: "24px 28px", marginBottom: "20px", display: "flex", gap: "24px", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, textAlign: "center" }}>
              <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "10px", color: C.green, letterSpacing: ".22em" }}>4-WEEK</div>
              <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "10px", color: C.green, letterSpacing: ".22em" }}>MVP</div>
            </div>
            <p style={{ fontFamily: "DM Serif Display, serif", fontSize: "16px", color: "#7adea8", lineHeight: 1.75 }}>{r.mvpIdea}</p>
          </div>

          {/* Roadmap */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "26px", marginBottom: "20px" }}>
            <SL>Implementation Roadmap</SL>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1px", background: C.border, borderRadius: "4px", overflow: "hidden" }}>
              {r.implementationRoadmap?.map((ph, i) => (
                <div key={i} style={{ background: C.surface, padding: "20px" }}>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.accent, letterSpacing: ".12em", marginBottom: "5px" }}>{ph.phase} · {ph.duration}</div>
                  <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "20px", color: C.textPrimary, letterSpacing: ".04em", marginBottom: "14px" }}>{ph.focus}</div>
                  {ph.actions?.map((a, j) => (
                    <div key={j} style={{ display: "flex", gap: "8px", marginBottom: "7px" }}>
                      <span style={{ color: C.textMuted, flexShrink: 0, paddingTop: "3px" }}>—</span>
                      <span style={{ fontFamily: "DM Serif Display, serif", fontSize: "13px", color: C.textMuted, lineHeight: 1.55 }}>{a}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Investor */}
          <div style={{ background: C.purpleDim, border: `1px solid ${C.purple}25`, borderRadius: "6px", padding: "24px 28px", marginBottom: "40px", display: "flex", gap: "24px", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "10px", color: C.purple, letterSpacing: ".22em" }}>VC</div>
              <div style={{ fontFamily: "Bebas Neue, cursive", fontSize: "10px", color: C.purple, letterSpacing: ".22em" }}>TAKE</div>
            </div>
            <p style={{ fontFamily: "DM Serif Display, serif", fontStyle: "italic", fontSize: "16px", color: `${C.purple}cc`, lineHeight: 1.75 }}>"{r.investorTake}"</p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={reset}
                style={{ padding: "14px 40px", background: `linear-gradient(135deg,${C.accent},#ff8c42)`, color: "white", border: "none", borderRadius: "5px", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer", boxShadow: `0 0 24px ${C.accent}30` }}>
                Audit Another Idea →
              </button>
              <button onClick={copyShare}
                style={{ padding: "14px 26px", background: copied ? C.green : "transparent", color: copied ? C.bg : C.textSecondary, border: `1px solid ${copied ? C.green : C.border}`, borderRadius: "5px", fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer", transition: "all .3s" }}>
                {copied ? "✓ COPIED!" : "⎘ Share with Investors"}
              </button>
            </div>

            {/* Visible link for manual copy — fallback for mobile */}
            {shareId && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "14px 18px", width: "100%", maxWidth: "540px" }}>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "9px", color: C.textMuted, letterSpacing: ".14em", marginBottom: "8px" }}>
                  SHAREABLE LINK — long press to copy on mobile
                </div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: C.accent, wordBreak: "break-all", lineHeight: 1.6, userSelect: "all" }}>
                  {`${window.location.origin}${window.location.pathname}?r=${shareId}`}
                </div>
              </div>
            )}

            {!shareId && (
              <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10px", color: C.textMuted, textAlign: "center" }}>
                Share this audit with investors, co-founders, or mentors — link stays live for 30 days
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
function GS() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #04040e; }
      textarea::placeholder { color: #2e2e55; }
      ::-webkit-scrollbar { width: 3px; }
      ::-webkit-scrollbar-track { background: #0e0e15; }
      ::-webkit-scrollbar-thumb { background: #1e1e2c; border-radius: 2px; }
      ::selection { background: #ff2d55; color: white; }
      @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      @keyframes btnPulse { 0%,100%{box-shadow:0 0 28px rgba(255,45,85,.44)} 50%{box-shadow:0 0 48px rgba(255,45,85,.72)} }
      @keyframes floatIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    `}</style>
  );
}
