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

function dimsFromVolume(netFt3, woodThickness = 0.75) {
  const ratioD = 1, ratioH = 1.25, ratioW = 1.6;
  const netIn3 = netFt3 * 1728;
  const scale = Math.cbrt(netIn3 / (ratioD * ratioH * ratioW));
  const depth = ratioD * scale;
  const height = ratioH * scale;
  const width = ratioW * scale;
  return {
    internal: { depth, height, width },
    external: {
      depth: depth + 2 * woodThickness,
      height: height + 2 * woodThickness,
      width: width + 2 * woodThickness,
    },
  };
}

function netVolumeFromExternal(ext, woodThickness) {
  const d = ext.depth - 2 * woodThickness;
  const h = ext.height - 2 * woodThickness;
  const w = ext.width - 2 * woodThickness;
  return Math.max((d * h * w) / 1728, 0.01);
}

export default function SubBoxDesigner() {
  const [selectedId, setSelectedId] = useState(SUB_DATABASE[3].id);
  const [useCustom, setUseCustom] = useState(false);
  const [customFs, setCustomFs] = useState("30");
  const [customVas, setCustomVas] = useState("50");
  const [customQts, setCustomQts] = useState("0.5");
  const [customSize, setCustomSize] = useState("12");

  const [numSubs, setNumSubs] = useState(1);
  const [boxType, setBoxType] = useState("sealed");
  const [targetFb, setTargetFb] = useState(33);
  const woodThickness = 0.75;

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

  const ideal = useMemo(
    () => idealNetVolumeFt3({ vas: sub.vas, qts: sub.qts, boxType, numSubs, targetFb }),
    [sub.vas, sub.qts, boxType, numSubs, targetFb]
  );
  const idealDims = useMemo(() => dimsFromVolume(ideal, woodThickness), [ideal]);

  const [ext, setExt] = useState(idealDims.external);
  const lastIdealKey = useRef(JSON.stringify(idealDims.external));
  const idealKey = JSON.stringify(idealDims.external);
  if (idealKey !== lastIdealKey.current) {
    lastIdealKey.current = idealKey;
    setExt(idealDims.external);
  }

  const currentNetFt3 = netVolumeFromExternal(ext, woodThickness);
  const diffPct = ((currentNetFt3 - ideal) / ideal) * 100;
  const volColor = Math.abs(diffPct) < 5 ? C.good : Math.abs(diffPct) < 20 ? "#E8C547" : C.warn;

  let port = null;
  if (boxType === "ported") {
    const portAreaIn2 = 14 * numSubs;
    const portDiamIn = 2 * Math.sqrt(portAreaIn2 / Math.PI);
    const portDiamCm = portDiamIn * 2.54;
    const netLiters = currentNetFt3 * 28.3168;
    const lengthCm = portedPortLengthCm(netLiters, targetFb, portDiamCm, 1);
    port = {
      diameterIn: Math.round(portDiamIn * 10) / 10,
      lengthIn: Math.round(Math.max(lengthCm / 2.54, 2) * 10) / 10,
    };
  }

  const cuts = [
    { panel: "Top & bottom", qty: 2, w: ext.width - 2 * woodThickness, h: ext.depth },
    { panel: "Left & right sides", qty: 2, w: ext.depth, h: ext.height - 2 * woodThickness },
    { panel: "Front baffle & back", qty: 2, w: ext.width - 2 * woodThickness, h: ext.height - 2 * woodThickness },
  ];

  function updateDim(key, value) {
    const v = Math.max(parseFloat(value) || 0, 4);
    setExt((prev) => ({ ...prev, [key]: v }));
  }

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
    setRot((r) => ({
      x: Math.max(-80, Math.min(80, r.x - dy * 0.5)),
      y: r.y + dx * 0.5,
    }));
  }
  function onPointerUp() {
    dragging.current = false;
  }

  const maxDim = Math.max(ext.width, ext.height, ext.depth);
  const pxPerIn = Math.min(180 / maxDim, 14);
  const w = ext.width * pxPerIn;
  const h = ext.height * pxPerIn;
  const d = ext.depth * pxPerIn;

  const cutoutPx = Math.min(sub.cutoutIn * pxPerIn, w / (numSubs > 1 ? numSubs : 1) - 10);

  return (
    <div style={{ fontFamily: "'Manrope', system-ui, sans-serif", color: C.text }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
              <Field label="Size (in)">
                <input value={customSize} onChange={(e) => setCustomSize(e.target.value)} style={inputStyle} inputMode="decimal" />
              </Field>
              <Field label="Fs (Hz)">
                <input value={customFs} onChange={(e) => setCustomFs(e.target.value)} style={inputStyle} inputMode="decimal" />
              </Field>
              <Field label="Vas (L)">
                <input value={customVas} onChange={(e) => setCustomVas(e.target.value)} style={inputStyle} inputMode="decimal" />
              </Field>
              <Field label="Qts">
                <input value={customQts} onChange={(e) => setCustomQts(e.target.value)} style={inputStyle} inputMode="decimal" />
              </Field>
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
            <div style={{ marginBottom: 16, maxWidth: 200 }}>
              <Field label="Target tuning (Hz)">
                <input
                  value={targetFb}
                  onChange={(e) => setTargetFb(parseFloat(e.target.value) || 33)}
                  style={inputStyle}
                  inputMode="decimal"
                />
              </Field>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.panelBorder}`, paddingTop: 16, marginBottom: 8 }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>
              Adjust external box dimensions (drag the box to rotate it)
            </div>
            {["width", "height", "depth"].map((key) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  <span style={{ textTransform: "capitalize" }}>{key}</span>
                  <span>{ext[key].toFixed(1)}"</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={maxDim + 15}
                  step={0.1}
                  value={ext[key]}
                  onChange={(e) => updateDim(key, e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            ))}
          </div>

          <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(0,0,0,0.2)", fontSize: 13 }}>
            <span style={{ color: volColor, fontWeight: 700 }}>
              {currentNetFt3.toFixed(2)} ft³ net
            </span>{" "}
            <span style={{ color: C.textMuted }}>
              ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(0)}% vs. {ideal.toFixed(2)} ft³ ideal)
            </span>
          </div>
        </div>

        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.panelBorder}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 320,
            cursor: "grab",
            touchAction: "none",
            perspective: 900,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            style={{
              width: w,
              height: h,
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            }}
          >
            <Face
              w={w} h={h}
              style={{ transform: `translateZ(${d / 2}px)`, background: C.wood }}
            >
              {Array.from({ length: numSubs }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${((i + 0.5) / numSubs) * 100}%`,
                    top: "50%",
                    width: cutoutPx,
                    height: cutoutPx,
                    borderRadius: "50%",
                    background: "#1A1A1A",
                    border: "3px solid #333",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
              {port && (
                <div
                  style={{
                    position: "absolute",
                    right: 8,
                    bottom: 8,
                    width: Math.max(port.diameterIn * pxPerIn, 8),
                    height: Math.max(port.diameterIn * pxPerIn, 8),
                    borderRadius: "50%",
                    background: "#0A0A0A",
                    border: "2px solid #333",
                  }}
                />
              )}
            </Face>
            <Face w={w} h={h} style={{ transform: `translateZ(${-d / 2}px) rotateY(180deg)`, background: "#6B4A2F" }} />
            <Face w={d} h={h} style={{ transform: `rotateY(-90deg) translateZ(${w / 2}px)`, background: "#7A5334" }} />
            <Face w={d} h={h} style={{ transform: `rotateY(90deg) translateZ(${d / 2}px)`, background: "#7A5334" }} />
            <Face w={w} h={d} style={{ transform: `rotateX(90deg) translateZ(${h / 2}px)`, background: "#9C6B44" }} />
            <Face w={w} h={d} style={{ transform: `rotateX(-90deg) translateZ(${h / 2}px)`, background: "#5C3E27" }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>
          Cut list (0.75" MDF, external dimensions)
        </div>
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 6, overflow: "hidden" }}>
          {cuts.map((row, i) => (
            <div
              key={row.panel}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                fontSize: 13,
                borderTop: i === 0 ? "none" : `1px solid ${C.panelBorder}`,
                background: C.bg,
              }}
            >
              <span>{row.panel} (qty {row.qty})</span>
              <span style={{ color: C.textMuted }}>{row.w.toFixed(1)}" x {row.h.toFixed(1)}"</span>
            </div>
          ))}
          {port && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, borderTop: `1px solid ${C.panelBorder}`, background: C.bg }}>
              <span>Port tube</span>
              <span style={{ color: C.textMuted }}>{port.diameterIn}" diameter x {port.lengthIn}" long, tuned to {targetFb} Hz</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12, lineHeight: 1.5 }}>
          Driver cutout shown at {sub.cutoutIn.toFixed(2)}" is approximate for drivers without a
          published spec — verify against your subwoofer's actual mounting template before cutting.
          Add internal bracing for boxes over 2 cubic feet.
        </div>
      </div>
    </div>
  );
}

function Face({ w, h, style, children }) {
  return (
    <div
      style={{
        position: "absolute",
        width: w,
        height: h,
        top: 0,
        left: 0,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
        backfaceVisibility: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

const labelStyle = { fontSize: 12, color: "#9CA1AA", marginBottom: 6, fontWeight: 600 };
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: `1px solid ${C.panelBorder}`,
  background: C.bg,
  color: C.text,
  fontSize: 14,
  boxSizing: "border-box",
};
