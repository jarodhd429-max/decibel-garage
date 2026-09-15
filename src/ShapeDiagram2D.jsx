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
        {frontHeight.toFixed(1)}"
      </text>
      <text x={x1 + 10} y={(yBottom + yBackTop) / 2} fill={DIM} fontSize={12} textAnchor="start">
        {backHeight.toFixed(1)}"
      </text>
      <text x={(x0 + x1) / 2} y={yBottom + 20} fill={DIM} fontSize={12} textAnchor="middle">
        depth {depth.toFixed(1)}"
      </text>
      <text x={(x0 + x1) / 2} y={pad - 15} fill={DIM} fontSize={11} textAnchor="middle">
        width {width.toFixed(1)}" (into the page)
      </text>
      <text x={x0} y={20} fill="#EDEEF0" fontSize={12} fontWeight="700">Side profile</text>
    </svg>
  );
}

export function NotchDiagram({ width, depth, notchW, notchD }) {
  const pad = 50;
  const scale = 220 / Math.max(width, depth);
  const w = width * scale;
  const d = depth * scale;
  const nw = notchW * scale;
  const nd = notchD * scale;
  const svgW = w + pad * 2;
  const svgH = d + pad * 2;

  const x0 = pad, y0 = pad;
  const x1 = pad + w, y1 = pad + d;

  const points = [
    [x0, y0],
    [x1 - nw, y0],
    [x1 - nw, y0 + nd],
    [x1, y0 + nd],
    [x1, y1],
    [x0, y1],
  ].map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={320} style={{ display: "block" }}>
      <polygon points={points} fill={FILL} stroke={LINE} strokeWidth={2} />
      <text x={(x0 + x1) / 2} y={y1 + 20} fill={DIM} fontSize={12} textAnchor="middle">
        width {width.toFixed(1)}"
      </text>
      <text x={x0 - 10} y={(y0 + y1) / 2} fill={DIM} fontSize={12} textAnchor="end" transform={`rotate(-90 ${x0 - 10} ${(y0 + y1) / 2})`}>
        depth {depth.toFixed(1)}"
      </text>
      <text x={x1 - nw / 2} y={y0 + nd / 2} fill={DIM} fontSize={11} textAnchor="middle">
        notch {notchW.toFixed(1)}" x {notchD.toFixed(1)}"
      </text>
      <text x={x0} y={20} fill="#EDEEF0" fontSize={12} fontWeight="700">Top-down footprint</text>
    </svg>
  );
}
