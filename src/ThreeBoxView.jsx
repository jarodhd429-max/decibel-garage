import { useEffect, useRef } from "react";
import * as THREE from "three";

const WOOD = 0.75;

function buildPanels(width, height, depth) {
  const t = WOOD;
  return [
    { name: "top", size: [width, t, depth], pos: [0, height / 2 - t / 2, 0], normal: [0, 1, 0], color: 0x9c6b44 },
    { name: "bottom", size: [width, t, depth], pos: [0, -height / 2 + t / 2, 0], normal: [0, -1, 0], color: 0x5c3e27 },
    { name: "front", size: [width, height - 2 * t, t], pos: [0, 0, depth / 2 - t / 2], normal: [0, 0, 1], color: 0x8b5e3c },
    { name: "back", size: [width, height - 2 * t, t], pos: [0, 0, -depth / 2 + t / 2], normal: [0, 0, -1], color: 0x6b4a2f },
    { name: "left", size: [t, height - 2 * t, depth - 2 * t], pos: [-width / 2 + t / 2, 0, 0], normal: [-1, 0, 0], color: 0x7a5334 },
    { name: "right", size: [t, height - 2 * t, depth - 2 * t], pos: [width / 2 - t / 2, 0, 0], normal: [1, 0, 0], color: 0x7a5334 },
  ];
}

export default function ThreeBoxView({
  width, height, depth, numSubs, cutoutIn, subPlacement, port,
  viewMode = "solid", explodeMode = "none",
}) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  // One-time scene setup
  useEffect(() => {
    const mount = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const el = renderer.domElement;
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.display = "block";
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.webkitTouchCallout = "none";
    mount.appendChild(el);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 10, 8);
    scene.add(key);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
    fillLight.position.set(-6, -4, -6);
    scene.add(fillLight);

    const group = new THREE.Group();
    scene.add(group);

    let rot = { x: -0.32, y: -0.55 };
    group.rotation.x = rot.x;
    group.rotation.y = rot.y;

    function resize() {
      const w = mount.clientWidth || 320;
      const h = 340;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);

    // Drag to rotate: pointer events as primary, raw touch as a fallback
    // for browsers/webviews with incomplete pointer event support.
    let dragging = false;
    let last = { x: 0, y: 0 };

    function startDrag(x, y) {
      dragging = true;
      last = { x, y };
    }
    function moveDrag(x, y) {
      if (!dragging) return;
      const dx = x - last.x;
      const dy = y - last.y;
      last = { x, y };
      rot.y += dx * 0.008;
      rot.x = Math.max(-1.2, Math.min(1.2, rot.x - dy * 0.008));
      group.rotation.x = rot.x;
      group.rotation.y = rot.y;
    }
    function endDrag() {
      dragging = false;
    }

    function onPointerDown(e) {
      startDrag(e.clientX, e.clientY);
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onPointerMove(e) {
      moveDrag(e.clientX, e.clientY);
    }
    function onTouchStart(e) {
      const t = e.touches[0];
      if (t) startDrag(t.clientX, t.clientY);
    }
    function onTouchMove(e) {
      const t = e.touches[0];
      if (t) {
        e.preventDefault();
        moveDrag(t.clientX, t.clientY);
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointerleave", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", endDrag);
    el.addEventListener("contextmenu", (e) => e.preventDefault());

    let raf;
    function animate() {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    engineRef.current = { scene, camera, renderer, group, mount };

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointerleave", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", endDrag);
      mount.removeChild(el);
      renderer.dispose();
    };
  }, []);

  // Rebuild panels + decals whenever inputs change
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const { group, camera } = engine;

    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.traverse?.((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose();
      });
    }

    const maxDim = Math.max(width, height, depth);
    camera.position.set(0, 0, maxDim * 2.3);
    camera.updateProjectionMatrix();

    const explodeAmount = Math.max(4, maxDim * 0.18);
    const explodedSet = {
      none: [],
      all: ["top", "bottom", "front", "back", "left", "right"],
      topbottom: ["top", "bottom"],
      frontrear: ["front", "back"],
      leftright: ["left", "right"],
    }[explodeMode] || [];

    const panels = buildPanels(width, height, depth);
    const n = Math.max(numSubs, 1);
    const offsets = Array.from({ length: n }, (_, i) => (i + 0.5) / n - 0.5);
    const cutoutR = Math.max(Math.min(cutoutIn / 2, (width / n) / 2 - 0.6), 0.8);
    const decalMat = () => new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.DoubleSide });

    panels.forEach((p) => {
      const geo = new THREE.BoxGeometry(...p.size);
      const solidMat = new THREE.MeshStandardMaterial({
        color: p.color, roughness: 0.85, metalness: 0.04,
        transparent: viewMode === "wireframe", opacity: viewMode === "wireframe" ? 0 : 1,
      });
      const mesh = new THREE.Mesh(geo, solidMat);

      const isExploded = explodedSet.includes(p.name);
      const off = isExploded ? explodeAmount : 0;
      mesh.position.set(
        p.pos[0] + p.normal[0] * off,
        p.pos[1] + p.normal[1] * off,
        p.pos[2] + p.normal[2] * off
      );

      if (viewMode === "wireframe") {
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x3da5ff }));
        mesh.add(line);
      }

      // Attach driver cutout decals to the panel they belong to
      if (
        (p.name === "front" && subPlacement === "front") ||
        (p.name === "top" && subPlacement === "top") ||
        (p.name === "right" && subPlacement === "side")
      ) {
        offsets.forEach((o) => {
          const circle = new THREE.Mesh(new THREE.CircleGeometry(cutoutR, 32), decalMat());
          if (p.name === "front") {
            circle.position.set(o * width, 0, p.size[2] / 2 + 0.02);
          } else if (p.name === "top") {
            circle.position.set(o * width, p.size[1] / 2 + 0.02, 0);
            circle.rotation.x = -Math.PI / 2;
          } else {
            circle.position.set(p.size[0] / 2 + 0.02, 0, o * depth * 0.7);
            circle.rotation.y = Math.PI / 2;
          }
          mesh.add(circle);
        });
      }

      // Attach port decal to its placement panel
      if (port && ((p.name === "front" && port.placement === "front") || (p.name === "right" && port.placement === "side"))) {
        const pw = port.kind === "round" ? port.diameterIn : port.widthIn;
        const ph = port.kind === "round" ? port.diameterIn : port.heightIn;
        const portMesh = port.kind === "round"
          ? new THREE.Mesh(new THREE.CircleGeometry(pw / 2, 24), decalMat())
          : new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), decalMat());
        if (p.name === "front") {
          portMesh.position.set(width / 2 - pw / 2 - 1 - p.pos[0], -(height - 2 * WOOD) / 2 + ph / 2 + 1, p.size[2] / 2 + 0.03);
        } else {
          portMesh.position.set(p.size[0] / 2 + 0.03, -(height - 2 * WOOD) / 2 + ph / 2 + 1, depth / 2 - pw / 2 - 1 - p.pos[2] || 0);
          portMesh.rotation.y = Math.PI / 2;
        }
        mesh.add(portMesh);
      }

      group.add(mesh);
    });
  }, [width, height, depth, numSubs, cutoutIn, subPlacement, port, viewMode, explodeMode]);

  return <div ref={mountRef} style={{ width: "100%", height: 340 }} />;
          }
