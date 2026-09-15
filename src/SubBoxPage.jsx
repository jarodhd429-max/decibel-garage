import SubBoxDesigner from "./SubBoxDesigner.jsx";
import { COLORS } from "./theme.js";

export default function SubBoxPage() {
  return (
    <section style={{ padding: "40px 28px 64px", maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, margin: "0 0 8px" }}>Design a subwoofer box in 3D</h1>
        <p style={{ fontSize: 14, color: COLORS.textMuted, maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
          Pick your subwoofer from our database of verified specs, or enter your own.
          Drag the box to rotate it, adjust the dimensions with exact numbers, and get
          a real cut list with port sizing for sealed, ported, and bandpass designs.
        </p>
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: 28 }}>
        <SubBoxDesigner />
      </div>
    </section>
  );
}
