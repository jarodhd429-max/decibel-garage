// Clean 2D technical drawings for shapes where accurate 3D is impractical
// (angled and notched panels). This is how real box plans are actually drawn.

const LINE = "#3DA5FF";
const DIM = "#9CA1AA";
const FILL = "rgba(61,165,255,0.08)";

export function WedgeDiagram({ width, depth, frontHeight, backHeight }) {
  const pad = 50;
  const scale = 220 / Math.max(depth, frontHeight, backHeight);
  const d = depth * scale;
  const fh = frontHeight * scale;
  const bh = backHeight * scale;
  const maxH = Math.max(fh, bh);
  const svgW = d + pad * 2;
  const svgH = maxH + pad * 2;

  const x0 = pad, x1 = pad + d;
  const yBottom = pad + maxH;
  const yFrontTop = pad + (maxH - fh);
  const yBackTop = pad + (maxH - bh);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={320} style={{ display: "block" }}>
      <polygon
        points={`${x0},${yBottom} ${x1},${yBottom} ${x1},${yBackTop} ${x0},${yFrontTop}`}
        fill={FILL} stroke={LINE} strokeWidth={2}
      />
      <text x={x0 - 10} y={(yBottom + yFrontTop) / 2} fill={DIM} fontSize={12} textAnchor="end">
        {fr
