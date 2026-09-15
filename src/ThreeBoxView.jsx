import { useEffect, useRef } from "react";
import * as THREE from "three";

const WOOD = 0.75;
const TAP_DIST_THRESHOLD = 8;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DIST = 30;
const PANEL_DRAG_SCALE = 0.06;

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

function axisForPanel(name) {
  if (name === "front" || name === "back") return "depth";
  if (name === "left" || name === "right") return "width";
  return "height";
}

// UI placement name -> internal panel name
function placementPanel(p) {
  if (p === "top") return "top";
  if (p === "side") return "right";
  return "front";
}

export default function ThreeBoxView({
  width, height, depth, numSubs, cutoutIn, subPlacements, port, portB,
  viewMode = "solid", explodeMode = "none", onPanelDrag,
}) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const selectedPanelRef = useRef(null);
  const propsRef = useRef({});
  propsRef.current = { width, height, depth, onPanelDrag };

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
    const raycaster = new THREE.Raycaster();

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

    function findPanelMesh(name) {
      return group.children.find((c) => c.userData?.name === name);
    }
    function highlight(mesh, on) {
      if (!mesh) return;
      mesh.material.emissive = new THREE.Color(on ? 0x3da5ff : 0x000000);
      mesh.material.emissiveIntensity = on ? 0.55 : 0;
    }
    function selectPanel(name) {
      if (selectedPanelRef.current) highlight(findPanelMesh(selectedPanelRef.current), false);
      selectedPanelRef.current = name;
      highlight(findPanelMesh(name), true);
    }
    function deselectPanel() {
      if (selectedPanelRef.current) highlight(findPanelMesh(selectedPanelRef.current), false);
      selectedPanelRef.current = null;
    }

    let downPos = null;
    let dragStarted = false;
    let dragMode = null;
    let last = { x: 0, y: 0 };
    let dragStartAxisValue = null;
    let lastCallTime = 0;
    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };

    function handleTap(x, y) {
      const now = performance.now();
      const dt = now - lastTapTime;
      const dFromLast = Math.hypot(x - lastTapPos.x, y - lastTapPos.y);
      const isDoubleTap = dt < DOUBLE_TAP_MS && dFromLast < DOUBLE_TAP_DIST;
      lastTapTime = now;
      lastTapPos = { x, y };
      if (!isDoubleTap) return;

      const rect = el.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((x - rect.left) / rect.width) * 2 - 1,
        -((y - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(group.children, false);
      if (hits.length === 0) {
        deselectPanel();
        return;
      }
      const name = hits[0].object.userData?.name;
      if (!name) return;
      if (selectedPanelRef.current === name) deselectPanel();
      else selectPanel(name);
    }

    function onDown(x, y, pointerId) {
      downPos = { x, y };
      dragStarted = false;
      dragMode = null;
      dragStartAxisValue = null;
      last = { x, y };
      if (pointerId != null) {
        try { el.setPointerCapture(pointerId); } catch (err) {}
      }
    }
    function onMove(x, y) {
      if (!downPos) return;
      const totalDist = Math.hypot(x - downPos.x, y - downPos.y);
      if (!dragStarted) {
        if (totalDist < TAP_DIST_THRESHOLD) return;
        dragStarted = true;
        dragMode = selectedPanelRef.current && propsRef.current.onPanelDrag ? "resize" : "rotate";
        if (dragMode === "resize") {
          const axis = axisForPanel(selectedPanelRef.current);
          dragStartAxisValue = propsRef.current[axis];
        }
      }

      if (dragMode === "rotate") {
        const dx = x - last.x;
        const dy = y - last.y;
        last = { x, y };
        rot.y += dx * 0.008;
        rot.x = Math.max(-1.2, Math.min(1.2, rot.x - dy * 0.008));
        group.rotation.set(rot.x, rot.y, 0);
      } else if (dragMode === "resize") {
        const now = performance.now();
        if (now - lastCallTime < 32) return;
        lastCallTime = now;
        const axis = axisForPanel(selectedPanelRef.current);
        const totalDy = y - downPos.y;
        const newVal = dragStartAxisValue + -totalDy * PANEL_DRAG_SCALE;
        propsRef.current.onPanelDrag?.(axis, newVal);
      }
    }
    function onUp(x, y) {
      if (!dragStarted && downPos) handleTap(x, y);
      downPos = null;
      dragStarted = false;
      dragMode = null;
    }

    function onPointerDown(e) { onDown(e.clientX, e.clientY, e.pointerId); }
    function onPointerMove(e) { onMove(e.clientX, e.clientY); }
    function onPointerUp(e) { onUp(e.clientX, e.clientY); }
    function onTouchStart(e) {
      const t = e.touches[0];
      if (t) onDown(t.clientX, t.clientY, null);
    }
    function onTouchMove(e) {
      const t = e.touches[0];
      if (t) {
        if (downPos && Math.hypot(t.clientX - downPos.x, t.clientY - downPos.y) >= TAP_DIST_THRESHOLD) {
          e.preventDefault();
        }
        onMove(t.clientX, t.clientY);
      }
    }
    function onTouchEnd(e) {
      const t = e.changedTouches[0];
      if (t) onUp(t.clientX, t.clientY);
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("contextmenu", (e) => e.preventDefault());

    let raf;
    function animate() {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    engineRef.current = { scene, camera, renderer, group };

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
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

    // Group subs by which panel they're mounted on, so cutouts are spaced
    // correctly within each panel independently of subs on other panels.
    const subGroups = {}; // panelName -> array of sub indices
    (subPlacements || []).forEach((placement, i) => {
      const panelName = placementPanel(placement);
      if (!subGroups[panelName]) subGroups[panelName] = [];
      subGroups[panelName].push(i);
    });

    const decalMat = () => new THREE.MeshBasicMaterial({ color: 0x141414, side: THREE.DoubleSide });

    panels.forEach((p) => {
      const geo = new THREE.BoxGeometry(...p.size);
      const solidMat = new THREE.MeshStandardMaterial({
        color: p.color, roughness: 0.85, metalness: 0.04,
        transparent: viewMode === "wireframe", opacity: viewMode === "wireframe" ? 0 : 1,
      });
      const mesh = new THREE.Mesh(geo, solidMat);
      mesh.userData = { name: p.name };

      const autoOffset = explodedSet.includes(p.name) ? explodeAmount : 0;
      mesh.position.set(
        p.pos[0] + p.normal[0] * autoOffset,
        p.pos[1] + p.normal[1] * autoOffset,
        p.pos[2] + p.normal[2] * autoOffset
      );

      if (selectedPanelRef.current === p.name) {
        solidMat.emissive = new THREE.Color(0x3da5ff);
        solidMat.emissiveIntensity = 0.55;
      }

      if (viewMode === "wireframe") {
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x3da5ff }));
        mesh.add(line);
      }

      // Driver cutouts assigned to this panel, spaced across whichever
      // dimension the panel actually spans.
      const group1 = subGroups[p.name];
      if (group1 && group1.length > 0) {
        const count = group1.length;
        const spanIn = p.name === "right" ? p.size[2] : p.size[0]; // depth for side panel, width otherwise
        const cutoutR = Math.max(Math.min(cutoutIn / 2, spanIn / count / 2 - 0.6), 0.7);
        const offsets = Array.from({ length: count }, (_, k) => (k + 0.5) / count - 0.5);
        offsets.forEach((o) => {
          const circle = new THREE.Mesh(new THREE.CircleGeometry(cutoutR, 32), decalMat());
          if (p.name === "front" || p.name === "top") {
            const localX = o * p.size[0];
            if (p.name === "front") {
              circle.position.set(localX, 0, p.size[2] / 2 + 0.02);
            } else {
              circle.position.set(localX, p.size[1] / 2 + 0.02, 0);
              circle.rotation.x = -Math.PI / 2;
            }
          } else if (p.name === "right") {
            const localZ = o * p.size[2];
            circle.position.set(p.size[0] / 2 + 0.02, 0, localZ);
            circle.rotation.y = Math.PI / 2;
          }
          mesh.add(circle);
        });
      }

      const portsOnThisPanel = [port, portB].filter((prt) => prt && prt.placement === p.name);
      portsOnThisPanel.forEach((prt, idx) => {
        // When two ports share a panel, put one near each corner instead of stacking them.
        const sign = portsOnThisPanel.length > 1 ? (idx === 0 ? 1 : -1) : 1;
        const pw = prt.kind === "round" ? prt.diameterIn : prt.widthIn;
        const ph = prt.kind === "round" ? prt.diameterIn : prt.heightIn;
        const portMesh = prt.kind === "round"
          ? new THREE.Mesh(new THREE.CircleGeometry(pw / 2, 24), decalMat())
          : new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), decalMat());
        const pad = 1;
        const halfU = p.size[0] / 2 - pw / 2 - pad; // primary in-plane span (width-like)
        const halfV = (p.name === "left" || p.name === "right" ? p.size[1] : p.size[1]) / 2 - ph / 2 - pad;
        switch (p.name) {
          case "front":
            portMesh.position.set(sign * halfU, -halfV, p.size[2] / 2 + 0.03);
            break;
          case "back":
            portMesh.position.set(sign * halfU, -halfV, -p.size[2] / 2 - 0.03);
            portMesh.rotation.y = Math.PI;
            break;
          case "left": {
            const halfUD = p.size[2] / 2 - pw / 2 - pad;
            portMesh.position.set(-p.size[0] / 2 - 0.03, -halfV, sign * halfUD);
            portMesh.rotation.y = -Math.PI / 2;
            break;
          }
          case "right": {
            const halfUD = p.size[2] / 2 - pw / 2 - pad;
            portMesh.position.set(p.size[0] / 2 + 0.03, -halfV, sign * halfUD);
            portMesh.rotation.y = Math.PI / 2;
            break;
          }
          case "top": {
            const halfVD = p.size[2] / 2 - ph / 2 - pad;
            portMesh.position.set(sign * halfU, p.size[1] / 2 + 0.03, -halfVD);
            portMesh.rotation.x = -Math.PI / 2;
            break;
          }
          case "bottom": {
            const halfVD = p.size[2] / 2 - ph / 2 - pad;
            portMesh.position.set(sign * halfU, -p.size[1] / 2 - 0.03, halfVD);
            portMesh.rotation.x = Math.PI / 2;
            break;
          }
        }
        mesh.add(portMesh);
      });

      group.add(mesh);
    });
  }, [width, height, depth, numSubs, cutoutIn, subPlacements, port, portB, viewMode, explodeMode]);

  return <div ref={mountRef} style={{ width: "100%", height: 340 }} />;
}
