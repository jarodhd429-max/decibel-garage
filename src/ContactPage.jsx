import { COLORS } from "./theme.js";

// Replace this with your real contact email before publishing.
const CONTACT_EMAIL = "youremail@example.com";

export default function ContactPage() {
  return (
    <section style={{ padding: "56px 28px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>Contact</h1>
      <p style={{ fontSize: 15, color: COLORS.textMuted, lineHeight: 1.7, marginBottom: 24 }}>
        Question about a build, a bug on the site, or a subwoofer that's missing from
        the database? Send an email and it'll get read.
      </p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
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
        Email {CONTACT_EMAIL}
      </a>
      <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 20 }}>
        This page doesn't run a contact form or a backend — tapping the button just
        opens the visitor's own email app addressed to you. Replace CONTACT_EMAIL at
        the top of ContactPage.jsx with your real address.
      </p>
    </section>
  );
}
