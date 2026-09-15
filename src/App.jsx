import { useState } from "react";
import Nav from "./Nav.jsx";
import HomePage from "./HomePage.jsx";
import SubBoxPage from "./SubBoxPage.jsx";
import AboutPage from "./AboutPage.jsx";
import ContactPage from "./ContactPage.jsx";
import DonatePage from "./DonatePage.jsx";
import { COLORS } from "./theme.js";

export default function App() {
  const [page, setPage] = useState("home");

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100%", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Oswald:wght@500;600;700&display=swap');
        h1, h2, h3, .display { font-family: 'Oswald', system-ui, sans-serif; letter-spacing: 0.01em; }
        input, select { font-family: 'Manrope', system-ui, sans-serif; }
        ::selection { background: ${COLORS.accent}; color: #0A0B0D; }
      `}</style>

      <Nav page={page} setPage={setPage} />

      {page === "home" && <HomePage />}
      {page === "subbox" && <SubBoxPage />}
      {page === "about" && <AboutPage />}
      {page === "contact" && <ContactPage />}
      {page === "donate" && <DonatePage />}

      <footer style={{ borderTop: `1px solid ${COLORS.panelBorder}`, padding: "24px 28px", fontSize: 12, color: COLORS.textMuted, textAlign: "center" }}>
        Decibel Garage may earn a commission from links to retailers. That doesn't change what we recommend.
      </footer>
    </div>
  );
}
