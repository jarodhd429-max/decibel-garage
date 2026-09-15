import { useRef } from "react";

const LINE = "#3DA5FF";
const DIM = "#9CA1AA";
const FILL = "rgba(61,165,255,0.08)";
const HANDLE = "#3DA5FF";

// Shared drag logic: freezes the diagram's current pixel-per-inch scale at
// the start of the gesture, so the drag feels consistent even though the
// diagram itself rescales to fit as the value changes underneath it.
function useDragHandle(scale, currentValue, onChange, axis, invert) {
  const dragRef = useRef(null);

  function onPointerDown(e) {
    e.preventDefault();
    dragRef.current = {
      startClient: axis === "x" ? e.clientX : e.clientY,
      startValue: currentValue,
      scale,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const client = axis === "x" ? e.clientX : e.clientY;
    const deltaPx = client - d.startClient;
    const deltaIn = (invert ? -deltaPx : deltaPx) / d.scale;
    onChange(Math.max(d.startValue + deltaIn, 1));
  }
  function onPointerUp() {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  return onPointerDown;
}

function DragHandle({ x1, y1, x2, y2, cursor, onPointerDown }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g onPointerDown={onPointerDown} style={{ cursor, touchAction: "none" }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={HANDLE} strokeWidth={16} opacity={0.001} />
      <circle cx={midX} cy={midY} r={7} fill={HANDLE} opacity={0.9} />
    </g>
  );
}

export function WedgeDiagram({ width, depth, frontHeight, backHeight, onDepthChange, onFrontHeightChange }) {
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

  // Dragging the front edge up increases front height (screen Y decreases as height grows -> invert).
  const dragFront = useDragHandle(scale, frontHeight, onFrontHeightChange, "y", true);
  // Dragging the bottom edge right increases depth.
  const dragDepth = useDragHandle(scale, depth, onDepthChange, "x", false);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={320} style={{ display: "block" }}>
      <polygon
        points={`${x0},${yBottom} ${x1},${yBottom} ${x1},${yBackTop} ${x0},${yFrontTop}`}
        fill={FILL} stroke={LINE} strokeWidth={2}
      />

      {onFrontHeightChange && (
        <DragHandle x1={x0} y1={yFrontTop} x2={x0} y2={yBottom} cursor="ns-resize" onPointerDown={dragFront} />
      )}
      {onDepthChange && (
        <DragHandle x1={x0} y1={yBottom} x2={x1} y2={yBottom} cursor="ew-resize" onPointerDown={dragDepth} />
      )}

      <text x={x0 - 10} y={(yBottom + yFrontTop) / 2} fill={DIM} fontSize={12} textAnchor="end">
        {frontHeight.toFixed(1)}"
      </text>
      <text x={x1 + 10} y={(yBottom + yBackTop) / 2} fill={DIM} fontSize={12} textAnchor="start">
        {backHeight.toFixed(1)}" (auto)
      </text>
      <text x={(x0 + x1) / 2} y={yBottom + 20} fill={DIM} fontSize={12} textAnchor="middle">
        depth {depth.toFixed(1)}"
      </text>
      <text x={(x0 + x1) / 2} y={pad - 15} fill={DIM} fontSize={11} textAnchor="middle">
        width {width.toFixed(1)}" (into the page — use the text box)
      </text>
      <text x={x0} y={20} fill="#EDEEF0" fontSize={12} fontWeight="700">Side profile — drag the blue dots</text>
    </svg>
  );
}

export function NotchDiagram({ width, depth, notchW, notchD, onDepthChange, onNotchWChange, onNotchDChange }) {
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

  const dragDepth = useDragHandle(scale, depth, onDepthChange, "y", false);
  // Notch edge at x1-nw: dragging it left (negative dx) increases notch width.
  const dragNotchW = useDragHandle(scale, notchW, onNotchWChange, "x", true);
  const dragNotchD = useDragHandle(scale, notchD, onNotchDChange, "y", false);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={320} style={{ display: "block" }}>
      <polygon points={points} fill={FILL} stroke={LINE} strokeWidth={2} />

      {onDepthChange && (
        <DragHandle x1={x0} y1={y1} x2={x1} y2={y1} cursor="ns-resize" onPointerDown={dragDepth} />
      )}
      {onNotchWChange && (
        <DragHandle x1={x1 - nw} y1={y0} x2={x1 - nw} y2={y0 + nd} cursor="ew-resize" onPointerDown={dragNotchW} />
      )}
      {onNotchDChange && (
        <DragHandle x1={x1 - nw} y1={y0 + nd} x2={x1} y2={y0 + nd} cursor="ns-resize" onPointerDown={dragNotchD} />
      )}

      <text x={(x0 + x1) / 2} y={y1 + 20} fill={DIM} fontSize={12} textAnchor="middle">
        width {width.toFixed(1)}" (auto)
      </text>
      <text x={x0 - 10} y={(y0 + y1) / 2} fill={DIM} fontSize={12} textAnchor="end" transform={`rotate(-90 ${x0 - 10} ${(y0 + y1) / 2})`}>
        depth {depth.toFixed(1)}"
      </text>
      <text x={x1 - nw / 2} y={y0 + nd / 2} fill={DIM} fontSize={11} textAnchor="middle">
        notch {notchW.toFixed(1)}" x {notchD.toFixed(1)}"
      </text>
      <text x={x0} y={20} fill="#EDEEF0" fontSize={12} fontWeight="700">Top-down footprint — drag the blue dots</text>
    </svg>
  );
}
