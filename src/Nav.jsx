import { COLORS } from "./theme.js";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "subbox", label: "Sub Box Builder" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "donate", label: "Donate" },
];

export default function Nav({ page, setPage }) {
  return (
    <header style={{ borderBottom: `1px solid ${COLORS.panelBorder}`, padding: "18px 28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          maxWidth: 1040,
          margin: "0 auto",
        }}
      >
        <div
          className="display"
          style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" }}
          onClick={() => setPage("home")}
        >
          Decibel <span style={{ color: COLORS.accent }}>Garage</span>
        </div>
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "none",
                background: page === p.id ? "rgba(61,165,255,0.15)" : "transparent",
                color: page === p.id ? COLORS.accent : COLORS.textMuted,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
