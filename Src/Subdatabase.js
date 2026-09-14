// Verified Thiele-Small parameters pulled from manufacturer spec sheets.
// fs = free-air resonance (Hz), vas = equivalent compliance volume (liters),
// qts = total Q, cutoutIn = baffle cutout hole diameter (inches).
export const SUB_DATABASE = [
  { id: "sundown-sa8-v3d4", size: 8, brand: "Sundown Audio", model: "SA-8 V3 D4", fs: 40.0, vas: 7.2, qts: 0.36, cutoutIn: 7.25 },
  { id: "skar-svr10-d2", size: 10, brand: "Skar Audio", model: "SVR-10 D2", fs: 44.0, vas: 10.5, qts: 0.59, cutoutIn: 9.0 },
  { id: "skar-vs10-d2", size: 10, brand: "Skar Audio", model: "VS-10 D2 (Shallow)", fs: 38.0, vas: 16.5, qts: 0.70, cutoutIn: 9.0 },
  { id: "rf-p3d2-12", size: 12, brand: "Rockford Fosgate", model: "P3D2-12", fs: 27.0, vas: 43.9, qts: 0.48, cutoutIn: 11.25 },
  { id: "rf-p3d4-12", size: 12, brand: "Rockford Fosgate", model: "P3D4-12", fs: 27.0, vas: 54.3, qts: 0.52, cutoutIn: 11.25 },
  { id: "rf-p3sd2-12", size: 12, brand: "Rockford Fosgate", model: "P3SD2-12 (Shallow)", fs: 43.0, vas: 21.0, qts: 0.70, cutoutIn: 11.125 },
  { id: "kicker-compr12-d2", size: 12, brand: "Kicker", model: "CompR 12 D2", fs: 30.8, vas: 58.3, qts: 0.564, cutoutIn: 10.98 },
  { id: "jl-12w3v3-4", size: 12, brand: "JL Audio", model: "12W3v3-4", fs: 26.72, vas: 80.54, qts: 0.444, cutoutIn: 11.06 },
  { id: "jl-12w3v3-2", size: 12, brand: "JL Audio", model: "12W3v3-2", fs: 27.97, vas: 79.47, qts: 0.50, cutoutIn: 11.06 },
  { id: "pioneer-tsw3003d4", size: 12, brand: "Pioneer", model: "TS-W3003D4", fs: 35.0, vas: 34.6, qts: 0.59, cutoutIn: 11.14 },
  { id: "alpine-rw12d2", size: 12, brand: "Alpine", model: "Type-R R-W12D2", fs: 27.0, vas: 51.0, qts: 0.49, cutoutIn: 10.83 },
  { id: "rf-p3d2-15", size: 15, brand: "Rockford Fosgate", model: "P3D2-15", fs: 22.0, vas: 141.0, qts: 0.58, cutoutIn: 13.875 },
  { id: "rf-p3d4-15", size: 15, brand: "Rockford Fosgate", model: "P3D4-15", fs: 22.0, vas: 141.0, qts: 0.599, cutoutIn: 13.875 },
  { id: "skar-evl18-d2", size: 18, brand: "Skar Audio", model: "EVL-18 D2", fs: 31.2, vas: 81.0, qts: 0.42, cutoutIn: 16.73 },
  { id: "sundown-u18-d2", size: 18, brand: "Sundown Audio", model: "U-18 D2", fs: 30.95, vas: 111.76, qts: 0.515, cutoutIn: 16.75 },
];

export function subLabel(sub) {
  return `${sub.brand} ${sub.model} (${sub.size}")`;
}
