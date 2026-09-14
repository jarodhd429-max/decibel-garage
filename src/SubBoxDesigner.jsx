import { useState, useMemo, useRef } from "react";
import { SUB_DATABASE, subLabel } from "./subDatabase";

const C = {
  bg: "#121316",
  panel: "#1B1D22",
  panelBorder: "#2A2D34",
  text: "#EDEEF0",
  textMuted: "#9CA1AA",
  accent: "#3DA5FF",
  good: "#3DD68C",
  warn: "#FF6B4A",
  wood: "#8B5E3C",
  woodDark: "#6B4A2F",
  woodSide: "#7A5334",
  woodTop: "#9C6B44",
  woodBottom: "#5C3E27",
  notch: "rgba(255,107,74,0.35)",
};

function sealedNetVolumeLiters(vas, qts, qtcTarget = 0.707) {
  return vas / ((qtcTarget / qts) ** 2 - 1);
}

function portedPortLengthCm(vbLiters, fbHz, portDiameterCm, numPorts = 1) {
  return (
    (23562.5 * portDiameterCm ** 2 * numPorts) / (fbHz ** 2 * vbLiters) -
    0.732 * portDiameterCm
  );
}

function idealNetVolumeFt3({ vas, qts, boxType, numSubs, targetFb }) {
  const single = boxType === "sealed" ? sealedNetVolumeLiters(vas, qts, 0.707) : vas * 1.2;
  return (single * numSubs) / 28.3168;
}

const WOOD = 0.75; // inches, 3/4" MDF

function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function SubBoxDesigner() {
  // ---- Subwoofer selection ----
  const [selectedId, setSelectedId] = useState(SUB_DATABASE[3].id);
  const [useCustom, setUseCustom] = useState(false);
  const [customFs, setCustomFs] = useState("30");
  const [customVas, setCustomVas] = useState("50");
  const [customQts, setCustomQts] = useState("0.5");
  const [customSize, setCustomSize] = useState("12");

  const dbSub = SUB_DATABASE.find((s) => s.id === selectedId);
  const sub = useCustom
    ? {
        size: parseFloat(customSize) || 12,
        fs: parseFloat(customFs) || 30,
        vas: parseFloat(customVas) || 50,
        qts: parseFloat(customQts) || 0.5,
        cutoutIn: (parseFloat(customSize) || 12) - 1,
        brand: "Custom",
        model: "driver",
      }
    : dbSub;

  const [numSubs, setNumSubs] = useState(1);
  const [boxType, setBoxType] = useState("sealed");
  const [targetFb, setTargetFb] = useState(33);

  const ideal = useMemo(
    () => idealNetVolumeFt3({ vas: sub.vas, qts: sub.qts, boxType, numSubs, targetFb }),
    [sub.vas, sub.qts, boxType, numSubs, targetFb]
  );
  const idealIn3 = ideal * 1728;

  // ---- Shape ----
  const [shapeType, setShapeType] = useState("rectangular"); // rectangular | wedge | notch

  // Rectangular params
  const [rectExt, setRectExt] = useState(() => defaultRectFromVolume(idealIn3));
  function defaultRectFromVolume(volIn3) {
    const ratioD = 1, ratioH = 1.25, ratioW = 1.6;
    const scale = Math.cbrt(volIn3 / (ratioD * ratioH * ratioW));
    return {
      width: ratioW * scale + 2 * WOOD,
      height: ratioH * scale + 2 * WOOD,
      depth: ratioD * scale + 2 * WOOD,
    };
  }

  // Wedge params (front height draggable, back height auto-solved for volume)
  const [wedgeWidth, setWedgeWidth] = useState(24);
  const [wedgeDepth, setWedgeDepth] = useState(16);
  const [wedgeFrontHeight, setWedgeFrontHeight] = useState(10);

  // Notch params (main width auto-solved for volume)
  const [notchDepth, setNotchDepth] = useState(16);
  const [notchHeight, setNotchHeight] = useState(14);
  const [notchCutWidth, setNotchCutWidth] = useState(6);
  const [notchCutDepth, setNotchCutDepth] = useState(6);

  // Reset shape params to sensible defaults sized to current ideal volume when sub/box-type changes
  const lastIdealRef = useRef(idealIn3);
  if (Math.abs(lastIdealRef.current - idealIn3) > 0.01) {
    lastIdealRef.current = idealIn3;
    setRectExt(defaultRectFromVolume(idealIn3));
  }

  // ---- Port ----
  const [portShape, setPortShape] = useState("round"); // round | slotted
  const [portPlacement, setPortPlacement] = useState("front"); // front | side

  // ---- Sub placement ----
  const [subPlacement, setSubPlacement] = useState("front"); // front | top | side

  // ---- Derived geometry per shape ----
  let currentNetFt3, cuts, render3d, warning = null;

  if (shapeType === "rectangular") {
    const iw = rectExt.width - 2 * WOOD;
    const ih = rectExt.height - 2 * WOOD;
    const id = rectExt.depth - 2 * WOOD;
    currentNetFt3 = Math.max((iw * ih * id) / 1728, 0.01);
    cuts = [
      { panel: "Top & bottom", qty: 2, dims: `${round1(rectExt.width - 2 * WOOD)}" x ${round1(rectExt.depth)}"` },
      { panel: "Left & right sides", qty: 2, dims: `${round1(rectExt.depth)}" x ${round1(rectExt.height - 2 * WOOD)}"` },
      { panel: "Front & back", qty: 2, dims: `${round1(rectExt.width - 2 * WOOD)}" x ${round1(rectExt.height - 2 * WOOD)}"` },
    ];
  } else if (shapeType === "wedge") {
    const iw = wedgeWidth - 2 * WOOD;
    const id = wedgeDepth - 2 * WOOD;
    const ifH = wedgeFrontHeight - 2 * WOOD;
    let ibH = (2 * idealIn3) / (iw * id) - ifH;
    if (ibH < 2) {
      warning = "This combination can't reach the target volume — try a taller front height, or a larger width/depth.";
      ibH = Math.max(ibH, 2);
    }
    currentNetFt3 = Math.max((iw * id * (ifH + ibH)) / 2 / 1728, 0.01);
    const backHeightExt = ibH + 2 * WOOD;
    const slantLength = Math.sqrt(id ** 2 + (ibH - ifH) ** 2);
    cuts = [
      { panel: "Bottom", qty: 1, dims: `${round1(iw)}" x ${round1(wedgeDepth)}"` },
      { panel: "Front", qty: 1, dims: `${round1(iw)}" x ${round1(wedgeFrontHeight)}"` },
      { panel: "Back", qty: 1, dims: `${round1(iw)}" x ${round1(backHeightExt)}"` },
      { panel: "Slanted top", qty: 1, dims: `${round1(iw)}" x ${round1(slantLength)}" (angled panel)` },
      { panel: "Left & right sides (trapezoid)", qty: 2, dims: `parallel edges ${round1(wedgeFrontHeight)}" & ${round1(backHeightExt)}", depth edge ${round1(wedgeDepth)}", slant edge ${round1(slantLength)}"` },
    ];
    render3d = { type: "wedge", width: wedgeWidth, depth: wedgeDepth, frontHeight: wedgeFrontHeight, backHeight: backHeightExt };
  } else if (shapeType === "notch") {
    const id = notchDepth - 2 * WOOD;
    const ih = notchHeight - 2 * WOOD;
    const ncw = notchCutWidth;
    const ncd = notchCutDepth;
    let iw = idealIn3 / (ih * id) + (ncw * ncd) / id;
    if (iw - ncw < 4) {
      warning = "The notch is large relative to the box — try a smaller notch, or increase depth/height.";
    }
    currentNetFt3 = Math.max((ih * (iw * id - ncw * ncd)) / 1728, 0.01);
    const widthExt = iw + 2 * WOOD;
    cuts = [
      { panel: "Top & bottom (L-shaped)", qty: 2, dims: `${round1(widthExt)}" x ${round1(notchDepth)}" overall, with a ${round1(ncw)}" x ${round1(ncd)}" corner removed` },
      { panel: "Front wall", qty: 1, dims: `${round1(widthExt)}" x ${round1(notchHeight)}"` },
      { panel: "Left wall", qty: 1, dims: `${round1(notchDepth)}" x ${round1(notchHeight)}"` },
      { panel: "Back wall (shortened by notch)", qty: 1, dims: `${round1(widthExt - ncw)}" x ${round1(notchHeight)}"` },
      { panel: "Right wall (shortened by notch)", qty: 1, dims: `${round1(notchDepth - ncd)}" x ${round1(notchHeight)}"` },
      { panel: "Notch inner walls", qty: 2, dims: `${round1(ncw)}" x ${round1(notchHeight)}" and ${round1(ncd)}" x ${round1(notchHeight)}"` },
    ];
    render3d = { type: "notch", width: widthExt, depth: notchDepth, height: notchHeight, notchW: ncw, notchD: ncd };
  }

  const diffPct = ((currentNetFt3 - ideal) / ideal) * 100;
  const volColor = Math.abs(diffPct) < 5 ? C.good : Math.abs(diffPct) < 20 ? "#E8C547" : C.warn;

  // ---- Port sizing (shape-agnostic: Helmholtz formula uses area & length) ----
  let port = null;
  if (boxType === "ported") {
    const portAreaIn2 = 14 * numSubs;
    let diameterEquivIn, portDesc;
    if (portShape === "round") {
      diameterEquivIn = 2 * Math.sqrt(portAreaIn2 / Math.PI);
      portDesc = { kind: "round", diameterIn: round1(diameterEquivIn) };
    } else {
      const slotHeight = 4;
      const slotWidth = portAreaIn2 / slotHeight;
      diameterEquivIn = 2 * Math.sqrt(portAreaIn2 / Math.PI);
      portDesc = { kind: "slotted", widthIn: round1(slotWidth), heightIn: slotHeight };
    }
    const portDiamCm = diameterEquivIn * 2.54;
    const netLiters = currentNetFt3 * 28.3168;
    const lengthCm = portedPortLengthCm(netLiters, targetFb, portDiamCm, 1);
    const lengthIn = round1(Math.max(lengthCm / 2.54, 2));
    port = { ...portDesc, lengthIn, placement: portPlacement };
  }

  return (
    <div style={{ fontFamily: "'Manrope', system-ui, sans-serif", color: C.text }}>
      {/* Shape selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={labelStyle}>Box shape</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { id: "rectangular", label: "Rectangular", desc: "Standard box" },
            { id: "wedge", label: "Wedge", desc: "Slanted top, fits sloped trunks" },
            { id: "notch", label: "V-shape / notch", desc: "Corner cut for wheel wells" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShapeType(s.id)}
              style={{
                flex: 1,
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 6,
                border: `1px solid ${shapeType === s.id ? C.accent : C.panelBorder}`,
                background: shapeType === s.id ? "rgba(61,165,255,0.1)" : "transparent",
                color: C.text,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Controls */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Subwoofer</div>
            <select
              value={useCustom ? "custom" : selectedId}
              onChange={(e) => {
                if (e.target.value === "custom") setUseCustom(true);
                else {
                  setUseCustom(false);
                  setSelectedId(e.target.value);
                }
              }}
              style={inputStyle}
            >
              {[8, 10, 12, 15, 18].map((size) => (
                <optgroup key={size} label={`${size}" subwoofers`}>
                  {SUB_DATABASE.filter((s) => s.size === size).map((s) => (
                    <option key={s.id} value={s.id}>{subLabel(s)}</option>
                  ))}
                </optgroup>
              ))}
              <option value="custom">My sub isn't listed (enter specs)</option>
            </select>
          </div>

          {useCustom && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Size (in)"><input value={customSize} onChange={(e) => setCustomSize(e.target.value)} style={inputStyle} inputMode="decimal" /></Field>
              <Field label="Fs (Hz)"><input value={customFs} onChange={(e) => setCustomFs(e.target.value)} style={inputStyle} inputMode="decimal" /></Field>
              <Field label="Vas (L)"><input value={customVas} onChange={(e) => setCustomVas(e.target.value)} style={inputStyle} inputMode="decimal" /></Field>
              <Field label="Qts"><input value={customQts} onChange={(e) => setCustomQts(e.target.value)} style={inputStyle} inputMode="decimal" /></Field>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <Field label="Number of subs">
              <select value={numSubs} onChange={(e) => setNumSubs(parseInt(e.target.value, 10))} style={inputStyle}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Box type">
              <select value={boxType} onChange={(e) => setBoxType(e.target.value)} style={inputStyle}>
                <option value="sealed">Sealed</option>
                <option value="ported">Ported</option>
              </select>
            </Field>
          </div>

          {boxType === "ported" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <Field label="Target tuning (Hz)">
                  <input value={targetFb} onChange={(e) => setTargetFb(parseFloat(e.target.value) || 33)} style={inputStyle} inputMode="decimal" />
                </Field>
                <Field label="Port shape">
                  <select value={portShape} onChange={(e) => setPortShape(e.target.value)} style={inputStyle}>
                    <option value="round">Round</option>
                    <option value="slotted">Slotted</option>
                  </select>
                </Field>
              </div>
              <div style={{ marginBottom: 16, maxWidth: 220 }}>
                <Field label="Port placement">
                  <select value={portPlacement} onChange={(e) => setPortPlacement(e.target.value)} style={inputStyle}>
                    <option value="front">Front baffle</option>
                    <option value="side">Side panel</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          <div style={{ marginBottom: 16, maxWidth: 220 }}>
            <Field label="Subwoofer mounted on">
              <select value={subPlacement} onChange={(e) => setSubPlacement(e.target.value)} style={inputStyle}>
                <option value="front">Front baffle</option>
                <option value="top">Top panel</option>
                <option value="side">Side panel</option>
              </select>
            </Field>
          </div>

          <div style={{ borderTop: `1px solid ${C.panelBorder}`, paddingTop: 16, marginBottom: 8 }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>
              {shapeType === "rectangular" && "Adjust external dimensions"}
              {shapeType === "wedge" && "Adjust width, depth, and front height — back height auto-solves for volume"}
              {shapeType === "notch" && "Adjust depth, height, and notch size — width auto-solves for volume"}
            </div>

            {shapeType === "rectangular" && ["width", "height", "depth"].map((key) => (
              <Slider key={key} label={key} value={rectExt[key]} min={4} max={60}
                onChange={(v) => setRectExt((p) => ({ ...p, [key]: v }))} />
            ))}

            {shapeType === "wedge" && (
              <>
                <Slider label="width" value={wedgeWidth} min={8} max={60} onChange={setWedgeWidth} />
                <Slider label="depth" value={wedgeDepth} min={6} max={40} onChange={setWedgeDepth} />
                <Slider label="front height" value={wedgeFrontHeight} min={4} max={30} onChange={setWedgeFrontHeight} />
              </>
            )}

            {shapeType === "notch" && (
              <>
                <Slider label="depth" value={notchDepth} min={6} max={40} onChange={setNotchDepth} />
                <Slider label="height" value={notchHeight} min={6} max={30} onChange={setNotchHeight} />
                <Slider label="notch width" value={notchCutWidth} min={1} max={20} onChange={setNotchCutWidth} />
                <Slider label="notch depth" value={notchCutDepth} min={1} max={20} onChange={setNotchCutDepth} />
              </>
            )}
          </div>

          <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(0,0,0,0.2)", fontSize: 13 }}>
            <span style={{ color: volColor, fontWeight: 700 }}>{currentNetFt3.toFixed(2)} ft³ net</span>{" "}
            <span style={{ color: C.textMuted }}>
              ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(0)}% vs. {ideal.toFixed(2)} ft³ ideal)
            </span>
          </div>
          {warning && <div style={{ marginTop: 10, fontSize: 12, color: C.warn }}>{warning}</div>}
        </div>

        {/* 3D-ish view */}
        <Box3DView
          shapeType={shapeType}
          rectExt={rectExt}
          render3d={render3d}
          sub={sub}
          numSubs={numSubs}
          port={port}
          subPlacement={subPlacement}
        />
      </div>

      {/* Cut list */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>
          Cut list (0.75" MDF, external dimensions) — this is the authoritative source, more so than the preview above for angled or notched shapes
        </div>
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 6, overflow: "hidden" }}>
          {cuts.map((row, i) => (
            <div key={row.panel} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", fontSize: 13, borderTop: i === 0 ? "none" : `1px solid ${C.panelBorder}`, background: C.bg }}>
              <span style={{ flexShrink: 0 }}>{row.panel} (qty {row.qty})</span>
              <span style={{ color: C.textMuted, textAlign: "right" }}>{row.dims}</span>
            </div>
          ))}
          {port && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", fontSize: 13, borderTop: `1px solid ${C.panelBorder}`, background: C.bg }}>
              <span>Port ({port.kind}, {port.placement === "front" ? "front baffle" : "side panel"})</span>
              <span style={{ color: C.textMuted, textAlign: "right" }}>
                {port.kind === "round"
                  ? `${port.diameterIn}" diameter x ${port.lengthIn}" long`
                  : `${port.widthIn}" x ${port.heightIn}" slot x ${port.lengthIn}" long`}
                , tuned to {targetFb} Hz
              </span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12, lineHeight: 1.5 }}>
          Driver cutout for the {sub.brand} {sub.model} is approximately {sub.cutoutIn.toFixed(2)}" —
          verify against the actual mounting template before cutting. Add internal bracing for
          boxes over 2 cubic feet, and seal all internal seams with silicone or wood glue.
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9CA1AA", marginBottom: 4 }}>
        <span style={{ textTransform: "capitalize" }}>{label}</span>
        <span>{value.toFixed(1)}"</span>
      </div>
      <input type="range" min={min} max={max} step={0.1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}

function Box3DView({ shapeType, rectExt, render3d, sub, numSubs, port, subPlacement }) {
  const [rot, setRot] = useState({ x: -20, y: -30 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function onPointerDown(e) {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setRot((r) => ({ x: Math.max(-80, Math.min(80, r.x - dy * 0.5)), y: r.y + dx * 0.5 }));
  }
  function onPointerUp() { dragging.current = false; }

  let dims;
  if (shapeType === "rectangular") dims = rectExt;
  else if (shapeType === "wedge") dims = { width: render3d.width, height: Math.max(render3d.frontHeight, render3d.backHeight), depth: render3d.depth };
  else dims = { width: render3d.width, height: render3d.height, depth: render3d.depth };

  const maxDim = Math.max(dims.width, dims.height, dims.depth);
  const pxPerIn = Math.min(180 / maxDim, 14);
  const w = dims.width * pxPerIn;
  const h = dims.height * pxPerIn;
  const d = dims.depth * pxPerIn;

  const cutoutPx = Math.min(sub.cutoutIn * pxPerIn, w / (numSubs > 1 ? numSubs : 1) - 10);

  const driverDots = (faceW) => Array.from({ length: numSubs }).map((_, i) => (
    <div key={i} style={{
      position: "absolute", left: `${((i + 0.5) / numSubs) * 100}%`, top: "50%",
      width: cutoutPx, height: cutoutPx, borderRadius: "50%",
      background: "#1A1A1A", border: "3px solid #333", transform: "translate(-50%, -50%)",
    }} />
  ));

  return (
    <div
      style={{
        background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320,
        cursor: "grab", touchAction: "none", perspective: 900,
      }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
    >
      {shapeType === "rectangular" && (
        <div style={{ width: w, height: h, position: "relative", transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
          <Face w={w} h={h} style={{ transform: `translateZ(${d / 2}px)`, background: C.wood }}>
            {subPlacement === "front" && driverDots(w)}
            {port && port.placement === "front" && <PortDot port={port} pxPerIn={pxPerIn} />}
          </Face>
          <Face w={w} h={h} style={{ transform: `translateZ(${-d / 2}px) rotateY(180deg)`, background: C.woodDark }} />
          <Face w={d} h={h} style={{ transform: `rotateY(-90deg) translateZ(${w / 2}px)`, background: C.woodSide }}>
            {subPlacement === "side" && driverDots(d)}
            {port && port.placement === "side" && <PortDot port={port} pxPerIn={pxPerIn} />}
          </Face>
          <Face w={d} h={h} style={{ transform: `rotateY(90deg) translateZ(${d / 2}px)`, background: C.woodSide }} />
          <Face w={w} h={d} style={{ transform: `rotateX(90deg) translateZ(${h / 2}px)`, background: C.woodTop }}>
            {subPlacement === "top" && driverDots(w)}
          </Face>
          <Face w={w} h={d} style={{ transform: `rotateX(-90deg) translateZ(${h / 2}px)`, background: C.woodBottom }} />
        </div>
      )}

      {shapeType === "wedge" && (() => {
        const fh = render3d.frontHeight * pxPerIn;
        const bh = render3d.backHeight * pxPerIn;
        const maxH = Math.max(fh, bh);
        const slant = Math.sqrt(d ** 2 + (bh - fh) ** 2);
        const angleDeg = (Math.atan2(bh - fh, d) * 180) / Math.PI;
        return (
          <div style={{ width: w, height: maxH, position: "relative", transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
            <Face w={w} h={fh} style={{ transform: `translateZ(${d / 2}px) translateY(${maxH - fh}px)`, background: C.wood }}>
              {subPlacement === "front" && driverDots(w)}
              {port && port.placement === "front" && <PortDot port={port} pxPerIn={pxPerIn} />}
            </Face>
            <Face w={w} h={bh} style={{ transform: `translateZ(${-d / 2}px) translateY(${maxH - bh}px) rotateY(180deg)`, background: C.woodDark }} />
            <Face w={w} h={d} style={{ transform: `rotateX(-90deg) translateZ(${maxH}px)`, background: C.woodBottom }} />
            <div style={{
              position: "absolute", width: w, height: slant, top: 0, left: 0,
              background: C.woodTop, backfaceVisibility: "hidden",
              transformOrigin: "top center",
              transform: `translateY(${maxH - Math.max(fh, bh)}px) translateZ(${fh > bh ? d / 2 : -d / 2}px) rotateX(${fh > bh ? -90 - angleDeg : -90 + angleDeg}deg)`,
            }} />
            {[-1, 1].map((side) => (
              <div key={side} style={{
                position: "absolute", width: d, height: maxH, top: 0, left: 0,
                background: C.woodSide, backfaceVisibility: "hidden",
                transform: side < 0 ? `rotateY(-90deg) translateZ(${w / 2}px)` : `rotateY(90deg) translateZ(${d / 2}px)`,
                clipPath: `polygon(0% ${maxH - fh}px, 100% ${maxH - bh}px, 100% 100%, 0% 100%)`,
              }} />
            ))}
          </div>
        );
      })()}

      {shapeType === "notch" && (
        <div style={{ width: w, height: h, position: "relative", transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
          <Face w={w} h={h} style={{ transform: `translateZ(${d / 2}px)`, background: C.wood }}>
            {subPlacement === "front" && driverDots(w)}
            {port && port.placement === "front" && <PortDot port={port} pxPerIn={pxPerIn} />}
          </Face>
          <Face w={w} h={h} style={{ transform: `translateZ(${-d / 2}px) rotateY(180deg)`, background: C.woodDark }} />
          <Face w={d} h={h} style={{ transform: `rotateY(-90deg) translateZ(${w / 2}px)`, background: C.woodSide }} />
          <Face w={d} h={h} style={{ transform: `rotateY(90deg) translateZ(${d / 2}px)`, background: C.woodSide }} />
          <Face w={w} h={d} style={{ transform: `rotateX(90deg) translateZ(${h / 2}px)`, background: C.woodTop }} />
          <Face w={w} h={d} style={{ transform: `rotateX(-90deg) translateZ(${h / 2}px)`, background: C.woodBottom }} />
          <div style={{
            position: "absolute",
            width: (render3d.notchW / dims.width) * w,
            height: h,
            top: 0,
            right: 0,
            transform: `translateZ(${-d / 2}px) translateX(${(render3d.notchW / dims.width) * w}px) rotateY(90deg)`,
            background: C.notch,
            border: "2px dashed rgba(255,107,74,0.8)",
          }} />
        </div>
      )}
    </div>
  );
}

function PortDot({ port, pxPerIn }) {
  const size = port.kind === "round" ? port.diameterIn * pxPerIn : Math.max(port.widthIn, port.heightIn) * pxPerIn;
  return (
    <div style={{
      position: "absolute", right: 8, bottom: 8,
      width: Math.max(size, 8), height: Math.max(port.kind === "round" ? size : port.heightIn * pxPerIn, 8),
      borderRadius: port.kind === "round" ? "50%" : 4,
      background: "#0A0A0A", border: "2px solid #333",
    }} />
  );
}

function Face({ w, h, style, children }) {
  return (
    <div style={{ position: "absolute", width: w, height: h, top: 0, left: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)", backfaceVisibility: "hidden", ...style }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (<div><div style={labelStyle}>{label}</div>{children}</div>);
}

const labelStyle = { fontSize: 12, color: "#9CA1AA", marginBottom: 6, fontWeight: 600 };
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.panelBorder}`,
  background: C.bg, color: C.text, fontSize: 14, boxSizing: "border-box",
};
