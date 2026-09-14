import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Real WebGL 3D box renderer for the rectangular subwoofer box shape.
 * Drag (mouse or touch) to rotate. Driver and port cutouts render as
 * flat decals positioned on the correct face and axis.
 */
export default function ThreeBoxView({ width, height, depth, numSubs, cutoutIn, subPlacement, port }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  // One-time scene setup
  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth || 320;
    const h = 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 10, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-6, -4, -6);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    let rot = { x: -0.32, y: -0.55 };
    group.rotation.x = rot.x;
    group.rotation.y = rot.y;

    let dragging = false;
    let last = { x: 0, y: 0 };

    function pointFromEvent(e) {
      return e.touches ? e.touches[0] : e;
    }
    function onDown(e) {
      dragging = true;
      const p = pointFromEvent(e);
      last = { x: p.clientX, y: p.clientY };
    }
    function onMove(e) {
      if (!dragging) return;
      if (e.touches) e.preventDefault();
      const p = pointFromEvent(e);
      const dx = p.clientX - last.x;
      const dy = p.clientY - last.y;
      last = { x: p.clientX, y: p.clientY };
      rot.y += dx * 0.008
