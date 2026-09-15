import { COLORS } from "./theme.js";

export default function AboutPage() {
  return (
    <section style={{ padding: "56px 28px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>About Decibel Garage</h1>
      <p style={{ fontSize: 15, color: COLORS.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
        Decibel Garage exists to take the guesswork out of car audio. Instead of digging
        through forum threads and conflicting advice, you get a system recommendation
        built for your exact vehicle, and a subwoofer box designer that does the real
        acoustic math instead of eyeballing it.
      </p>
      <p style={{ fontSize: 15, color: COLORS.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
        {/* Replace this paragraph with your own story: your background in car audio,
            why you built this site, and what makes it different from a generic online
            calculator. */}
        This site was built by someone who's spent years under dashboards and in
        trunks — swap this text for your own background before publishing.
      </p>
      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.7 }}>
        Recommendations on this site are generated automatically and refined over
        time. Some links may be affiliate links, which help support the site at no
        extra cost to you.
      </p>
    </section>
  );
}
