import { useState, useMemo } from "react";
import { COLORS, labelStyle, inputStyle } from "./theme.js";

const PRIORITIES = [
  { id: "bass", label: "Bass-heavy", desc: "Trunk rattle, low-end you feel" },
  { id: "balanced", label: "Balanced", desc: "Even response across the range" },
  { id: "clarity", label: "Clarity", desc: "Vocals and detail up front" },
  { id: "daily", label: "Daily commute", desc: "Clean upgrade, easy on the ears" },
];

const BUDGETS = ["Under $300", "$300–$700", "$700–$1,500", "$1,500+"];

function EqBars() {
  const heights = [22, 38, 60, 82, 55, 70, 40, 26, 48, 65, 34, 20];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: `${h}%`,
            background: i % 3 === 0 ? COLORS.accent : COLORS.accentDim,
            borderRadius: 2,
            animation: `rise 900ms ease-out ${i * 40}ms both`,
          }}
        />
      ))}
      <style>{`@keyframes rise { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }`}</style>
    </div>
  );
}

function shopUrl(query) {
  return `https://www.crutchfield.com/search?query=${encodeURIComponent(query)}`;
}

export default function HomePage() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [priority, setPriority] = useState("balanced");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => year.trim() && make.trim() && model.trim(), [year, make, model]);

  async function getRecommendation(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    setError("");
    setResult(null);

    const priorityLabel = PRIORITIES.find((p) => p.id === priority)?.label ?? "Balanced";

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, make, model, budget, priorityLabel }),
      });
      if (!response.ok) {
        throw new Error(`Server responded ${response.status}`);
      }
      const parsed = await response.json();
      setResult(parsed);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setError("Couldn't generate a build right now. Try again in a moment.");
      setStatus("error");
    }
  }

  return (
    <>
      {/* Hero */}
      <section style={{ padding: "56px 28px 40px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 40, alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 42, lineHeight: 1.1, fontWeight: 700, margin: "0 0 16px" }}>
              Know exactly what to buy before you touch a wrench.
            </h1>
            <p style={{ fontSize: 16, color: COLORS.textMuted, maxWidth: 480, lineHeight: 1.6 }}>
              Tell us your car and what you're after. We'll put together a specific
              head unit, speaker, sub, and amp setup that actually fits — no forum
              guesswork, no returns.
            </p>
          </div>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: 24, display: "flex", justifyContent: "center" }}>
            <EqBars />
          </div>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: "0 28px 56px", maxWidth: 1040, margin: "0 auto" }}>
        <form
          onSubmit={getRecommendation}
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: 28 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Field label="Year">
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2019" style={inputStyle} />
            </Field>
            <Field label="Make">
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Honda" style={inputStyle} />
            </Field>
            <Field label="Model">
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Civic" style={inputStyle} />
            </Field>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Sound priority</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: `1px solid ${priority === p.id ? COLORS.accent : COLORS.panelBorder}`,
                    background: priority === p.id ? "rgba(61,165,255,0.1)" : "transparent",
                    color: COLORS.text,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={labelStyle}>Budget</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {BUDGETS.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBudget(b)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: `1px solid ${budget === b ? COLORS.accent : COLORS.panelBorder}`,
                    background: budget === b ? COLORS.accent : "transparent",
                    color: budget === b ? "#0A0B0D" : COLORS.text,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || status === "loading"}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 6,
              border: "none",
              background: canSubmit ? COLORS.accent : COLORS.panelBorder,
              color: canSubmit ? "#0A0B0D" : COLORS.textMuted,
              fontWeight: 700,
              fontSize: 15,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {status === "loading" ? "Building your setup…" : "Build my setup"}
          </button>
        </form>

        {status === "error" && (
          <div style={{ marginTop: 16, color: COLORS.warn, fontSize: 14 }}>{error}</div>
        )}

        {status === "done" && result && (
          <div style={{ marginTop: 24, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, margin: 0 }}>
                {year} {make} {model} — Your build
              </h2>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                Install: <span style={{ color: COLORS.text, fontWeight: 700 }}>{result.installDifficulty}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <ResultCard title="Head unit" value={result.headUnit} />
              <ResultCard title="Speakers" value={result.speakers} />
              <ResultCard title="Subwoofer" value={result.subwoofer} />
              <ResultCard title="Amplifier" value={result.amplifier} />
            </div>

            <div style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
              <strong style={{ color: COLORS.text }}>Wiring notes: </strong>
              {result.wiringNotes}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
              <strong style={{ color: COLORS.text }}>Why this fits: </strong>
              {result.reasoning}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${COLORS.panelBorder}`, paddingTop: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>Estimated parts cost</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  ${result.estimateLow?.toLocaleString?.() ?? result.estimateLow} – ${result.estimateHigh?.toLocaleString?.() ?? result.estimateHigh}
                </div>
              </div>
              <a
                href={shopUrl(`${result.speakers} ${result.subwoofer} ${result.amplifier}`)}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "12px 20px",
                  borderRadius: 6,
                  background: COLORS.accent,
                  color: "#0A0B0D",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Shop this build
              </a>
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section style={{ padding: "0 28px 64px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          <InfoBlock
            title="Built for your car"
            body="Every recommendation accounts for your specific year, make, and model — not a generic 'universal fit' guess."
          />
          <InfoBlock
            title="No account needed"
            body="Get a build in seconds. There's nothing to sign up for and nothing installed on your car until you decide to buy."
          />
          <InfoBlock
            title="Independent picks"
            body="Recommendations are generated from the gear itself, not from which brand pays the most. Some links on this page are affiliate links."
          />
        </div>
      </section>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function ResultCard({ title, value }) {
  return (
    <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 6, padding: 14 }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function InfoBlock({ title, body }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}
