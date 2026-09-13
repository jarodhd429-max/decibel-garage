import { useState, useMemo } from "react";

const COLORS = {
  bg: "#121316",
  panel: "#1B1D22",
  panelBorder: "#2A2D34",
  text: "#EDEEF0",
  textMuted: "#9CA1AA",
  accent: "#3DA5FF",
  accentDim: "#245A85",
  warn: "#FF6B4A",
};

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

// ---- Subwoofer box math (verified acoustic formulas) ----

function sealedNetVolumeLiters(vasLiters, qts, qtcTarget = 0.707) {
  return vasLiters / ((qtcTarget / qts) ** 2 - 1);
}

function portedPortLengthCm(vbLiters, fbHz, portDiameterCm, numPorts = 1) {
  return (
    (23562.5 * portDiameterCm ** 2 * numPorts) / (fbHz ** 2 * vbLiters) -
    0.732 * portDiameterCm
  );
}

function designBox({ vas, qts, boxType, numSubs, targetFb, woodThickness = 0.75 }) {
  let netVolLSingle;
  let fb = targetFb;
  if (boxType === "sealed") {
    netVolLSingle = sealedNetVolumeLiters(vas, qts, 0.707);
  } else {
    netVolLSingle = vas * 1.2;
    if (!fb) fb = 33;
  }

  const netVolLTotal = netVolLSingle * numSubs;
  const netVolFt3Total = netVolLTotal / 28.3168;

  // Box proportions: depth : height : width = 1 : 1.25 : 1.6 (trunk-friendly ratio)
  const ratioD = 1, ratioH = 1.25, ratioW = 1.6;
  const netVolIn3 = netVolFt3Total * 1728;
  const unitVol = ratioD * ratioH * ratioW;
  const scale = Math.cbrt(netVolIn3 / unitVol);

  const depth = ratioD * scale;
  const height = ratioH * scale;
  const width = ratioW * scale;

  const extDepth = depth + 2 * woodThickness;
  const extHeight = height + 2 * woodThickness;
  const extWidth = width + 2 * woodThickness;

  const result = {
    boxType,
    netVolumeFt3: Math.round(netVolFt3Total * 100) / 100,
    internal: { depth, height, width },
    external: { depth: extDepth, height: extHeight, width: extWidth },
    woodThickness,
  };

  if (boxType === "ported") {
    const portAreaIn2 = 14 * numSubs;
    const portDiamIn = 2 * Math.sqrt(portAreaIn2 / Math.PI);
    const portDiamCm = portDiamIn * 2.54;
    const lengthCm = portedPortLengthCm(netVolLTotal, fb, portDiamCm, 1);
    const lengthIn = Math.max(lengthCm / 2.54, 2);
    result.port = {
      tuningHz: fb,
      diameterIn: Math.round(portDiamIn * 10) / 10,
      lengthIn: Math.round(lengthIn * 10) / 10,
    };
  }

  return result;
}

function cutList(design, woodThickness) {
  const { width, height, depth } = design.external;
  const round1 = (n) => Math.round(n * 10) / 10;
  return [
    { panel: "Top and bottom", qty: 2, w: round1(width - 2 * woodThickness), h: round1(depth) },
    { panel: "Left and right sides", qty: 2, w: round1(depth), h: round1(height - 2 * woodThickness) },
    { panel: "Front baffle and back", qty: 2, w: round1(width - 2 * woodThickness), h: round1(height - 2 * woodThickness) },
  ];
}

export default function DecibelGarage() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [priority, setPriority] = useState("balanced");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => year.trim() && make.trim() && model.trim(), [year, make, model]);

  // Subwoofer box builder state
  const [subDiameter, setSubDiameter] = useState("12");
  const [numSubs, setNumSubs] = useState("1");
  const [vas, setVas] = useState("");
  const [qts, setQts] = useState("");
  const [boxType, setBoxType] = useState("sealed");
  const [targetFb, setTargetFb] = useState("33");
  const [boxDesign, setBoxDesign] = useState(null);
  const [boxError, setBoxError] = useState("");

  const canBuildBox = useMemo(() => {
    const vasNum = parseFloat(vas);
    const qtsNum = parseFloat(qts);
    return vasNum > 0 && qtsNum > 0 && qtsNum < 1;
  }, [vas, qts]);

  function buildBox(e) {
    e.preventDefault();
    setBoxError("");
    const vasNum = parseFloat(vas);
    const qtsNum = parseFloat(qts);
    const numSubsNum = parseInt(numSubs, 10) || 1;
    const fbNum = parseFloat(targetFb) || 33;

    if (boxType === "sealed" && qtsNum >= 0.707) {
      setBoxError(
        "This driver's Qts is too high for a tight sealed alignment. A ported box will suit it better."
      );
      setBoxDesign(null);
      return;
    }

    try {
      const design = designBox({
        vas: vasNum,
        qts: qtsNum,
        boxType,
        numSubs: numSubsNum,
        targetFb: fbNum,
      });
      setBoxDesign(design);
    } catch (err) {
      console.error(err);
      setBoxError("Couldn't calculate a box for those numbers. Double check your Vas and Qts values.");
      setBoxDesign(null);
    }
  }

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
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100%", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Oswald:wght@500;600;700&display=swap');
        h1, h2, h3, .display { font-family: 'Oswald', system-ui, sans-serif; letter-spacing: 0.01em; }
        input, select { font-family: 'Manrope', system-ui, sans-serif; }
        ::selection { background: ${COLORS.accent}; color: #0A0B0D; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${COLORS.panelBorder}`, padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase" }}>
          Decibel <span style={{ color: COLORS.accent }}>Garage</span>
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>AI-built systems for your exact car</div>
      </header>

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

      {/* Subwoofer box builder */}
      <section style={{ padding: "0 28px 56px", maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>Build a subwoofer box to spec</h2>
          <p style={{ fontSize: 14, color: COLORS.textMuted, maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
            Enter your subwoofer's Thiele-Small parameters from its spec sheet and we'll
            calculate net volume, box dimensions, and a full panel cut list. Ported
            designs include port diameter and length tuned to your target frequency.
          </p>
        </div>

        <form
          onSubmit={buildBox}
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: 28 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Field label="Sub size (inches)">
              <select value={subDiameter} onChange={(e) => setSubDiameter(e.target.value)} style={inputStyle}>
                {["8", "10", "12", "15", "18"].map((s) => (
                  <option key={s} value={s}>{s}"</option>
                ))}
              </select>
            </Field>
            <Field label="Number of subs">
              <select value={numSubs} onChange={(e) => setNumSubs(e.target.value)} style={inputStyle}>
                {["1", "2", "3", "4"].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
            <Field label="Vas (liters)">
              <input
                value={vas}
                onChange={(e) => setVas(e.target.value)}
                placeholder="e.g. 65"
                style={inputStyle}
                inputMode="decimal"
              />
            </Field>
            <Field label="Qts">
              <input
                value={qts}
                onChange={(e) => setQts(e.target.value)}
                placeholder="e.g. 0.45"
                style={inputStyle}
                inputMode="decimal"
              />
            </Field>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Box type</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { id: "sealed", label: "Sealed", desc: "Tighter, more accurate bass" },
                { id: "ported", label: "Ported", desc: "Louder, more low-end output" },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setBoxType(t.id)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: `1px solid ${boxType === t.id ? COLORS.accent : COLORS.panelBorder}`,
                    background: boxType === t.id ? "rgba(61,165,255,0.1)" : "transparent",
                    color: COLORS.text,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {boxType === "ported" && (
            <div style={{ marginBottom: 20, maxWidth: 220 }}>
              <Field label="Target tuning (Hz)">
                <input
                  value={targetFb}
                  onChange={(e) => setTargetFb(e.target.value)}
                  placeholder="33"
                  style={inputStyle}
                  inputMode="decimal"
                />
              </Field>
            </div>
          )}

          <button
            type="submit"
            disabled={!canBuildBox}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 6,
              border: "none",
              background: canBuildBox ? COLORS.accent : COLORS.panelBorder,
              color: canBuildBox ? "#0A0B0D" : COLORS.textMuted,
              fontWeight: 700,
              fontSize: 15,
              cursor: canBuildBox ? "pointer" : "not-allowed",
            }}
          >
            Calculate box
          </button>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 10, lineHeight: 1.5 }}>
            Find Vas and Qts on your subwoofer's spec sheet or product page. These
            numbers vary by driver, not by car, so use the exact values for your model.
          </div>
        </form>

        {boxError && <div style={{ marginTop: 16, color: COLORS.warn, fontSize: 14 }}>{boxError}</div>}

        {boxDesign && (
          <div style={{ marginTop: 24, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: 28 }}>
            <h3 style={{ fontSize: 20, margin: "0 0 20px" }}>
              {numSubs}x {subDiameter}" {boxDesign.boxType} box
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
              <ResultCard title="Net internal volume" value={`${boxDesign.netVolumeFt3} cubic feet`} />
              <ResultCard
                title="External dimensions"
                value={`${boxDesign.external.width.toFixed(1)} W x ${boxDesign.external.height.toFixed(1)} H x ${boxDesign.external.depth.toFixed(1)} D in`}
              />
              {boxDesign.port ? (
                <ResultCard
                  title="Port"
                  value={`${boxDesign.port.diameterIn} in diameter, ${boxDesign.port.lengthIn} in long, tuned to ${boxDesign.port.tuningHz} Hz`}
                />
              ) : (
                <ResultCard title="Alignment" value="Sealed, Qtc 0.707 (textbook flat response)" />
              )}
            </div>

            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8, fontWeight: 600 }}>
              Cut list (0.75 inch MDF, external dimensions)
            </div>
            <div style={{ border: `1px solid ${COLORS.panelBorder}`, borderRadius: 6, overflow: "hidden" }}>
              {cutList(boxDesign, boxDesign.woodThickness).map((row, i) => (
                <div
                  key={row.panel}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    fontSize: 13,
                    borderTop: i === 0 ? "none" : `1px solid ${COLORS.panelBorder}`,
                    background: COLORS.bg,
                  }}
                >
                  <span>{row.panel} (qty {row.qty})</span>
                  <span style={{ color: COLORS.textMuted }}>{row.w}" x {row.h}"</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 12, lineHeight: 1.5 }}>
              Cut list assumes a simple rectangular box with butt-jointed panels.
              Add internal bracing for boxes over 2 cubic feet, and always round
              cuts to the nearest tool your saw can hold steady.
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

      <footer style={{ borderTop: `1px solid ${COLORS.panelBorder}`, padding: "24px 28px", fontSize: 12, color: COLORS.textMuted, textAlign: "center" }}>
        Decibel Garage may earn a commission from links to retailers. That doesn't change what we recommend.
      </footer>
    </div>
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

const labelStyle = { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: 600 };
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: `1px solid ${COLORS.panelBorder}`,
  background: COLORS.bg,
  color: COLORS.text,
  fontSize: 14,
  boxSizing: "border-box",
};
