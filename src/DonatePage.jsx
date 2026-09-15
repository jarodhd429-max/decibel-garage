import { COLORS } from "./theme.js";

// Replace this with your real donation link before publishing --
// PayPal.me, Venmo, Ko-fi, Buy Me a Coffee, etc. all work fine here.
const DONATE_URL = "https://paypal.me/yourname";

export default function DonatePage() {
  return (
    <section style={{ padding: "56px 28px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>Support Decibel Garage</h1>
      <p style={{ fontSize: 15, color: COLORS.textMuted, lineHeight: 1.7, marginBottom: 24 }}>
        This site is free to use, no account required. If it saved you a trip to the
        shop or helped you build a box that actually fits the first time, a donation
        helps cover hosting costs and keeps the subwoofer database growing.
      </p>
      <a
        href={DONATE_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          padding: "12px 20px",
          borderRadius: 6,
          background: COLORS.accent,
          color: "#0A0B0D",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        Donate
      </a>
      <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 20 }}>
        Replace DONATE_URL at the top of DonatePage.jsx with your real donation link.
      </p>
    </section>
  );
}
