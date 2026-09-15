import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBoxView({ width, height, depth, numSubs, cutoutIn, subPlacement, port }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);

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
      rot.y += dx * 0.008;
      rot.x = Math.max(-1.2, Math.min(1.2, rot.x - dy * 0.008));
      group.rotation.x = rot.x;
      group.rotation.y = rot.y;
    }
    function onUp() {
      dragging = false;
    }

    const el = renderer.domElement;
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onUp);

    let raf;
    function animate() {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    engineRef.current = { scene, camera, renderer, group, mount };

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onUp);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const { group, camera } = engine;

    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.geometry?.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material?.dispose();
    }

    const woodMat = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, metalness: 0.04 });
    const materials = [
      woodMat(0x7a5334),
      woodMat(0x7a5334),
      woodMat(0x9c6b44),
      woodMat(0x5c3e27),
      woodMat(0x8b5e3c),
      woodMat(0x6b4a2f),
    ];
    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(boxGeo, materials);
    mesh.geometry.computeVertexNormals();
    group.add(mesh);

    const maxDim = Math.max(width, height, depth);
    camera.position.set(0, 0, maxDim * 2.1);
    camera.aspect = camera.aspect || 1;
    camera.updateProjectionMatrix();

    const n = Math.max(numSubs, 1);
    const offsets = Array.from({ length: n }, (_, i) => (i + 0.5) / n - 0.5);
    const cutoutR = Math.max(Math.min(cutoutIn / 2, (width / n) / 2 - 0.6), 0.8);
    const decalMat = new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.DoubleSide });

    offsets.forEach((off) => {
      const circle = new THREE.Mesh(new THREE.CircleGeometry(cutoutR, 32), decalMat);
      if (subPlacement === "front") {
        circle.position.set(off * width, 0, depth / 2 + 0.08);
      } else if (subPlacement === "top") {
        circle.position.set(off * width, height / 2 + 0.08, 0);
        circle.rotation.x = -Math.PI / 2;
      } else {
        circle.position.set(width / 2 + 0.08, 0, off * depth);
        circle.rotation.y = Math.PI / 2;
      }
      group.add(circle);
    });

    if (port) {
      const portMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide });
      let portMesh;
      const pw = port.kind === "round" ? port.diameterIn : port.widthIn;
      const ph = port.kind === "round" ? port.diameterIn : port.heightIn;
      if (port.kind === "round") {
        portMesh = new THREE.Mesh(new THREE.CircleGeometry(pw / 2, 24), portMat);
      } else {
        portMesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), portMat);
      }
      const cornerX = width / 2 - pw / 2 - 1;
      const cornerY = -height / 2 + ph / 2 + 1;
      if (port.placement === "front") {
        portMesh.position.set(cornerX, cornerY, depth / 2 + 0.09);
      } else {
        portMesh.position.set(width / 2 + 0.09, cornerY, depth / 2 - pw / 2 - 1);
        portMesh.rotation.y = Math.PI / 2;
      }
      group.add(portMesh);
    }
  }, [width, height, depth, numSubs, cutoutIn, subPlacement, port]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: 340, touchAction: "none", cursor: "grab" }}
    />
  );
}
