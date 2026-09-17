"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { useTheme } from "next-themes";

/* ============================================================
   Helpers
   ============================================================ */

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* ============================================================
   SceneBackground — cinematic intro + idle loop
   ============================================================ */

export function SceneBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [canvasVisible, setCanvasVisible] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const isLight = resolvedTheme === "light";

    // ─────────────────────────────────────────────────────────────
    // Palettes (unchanged)
    // ─────────────────────────────────────────────────────────────
    const palette = isLight
  ? {
      // LIGHT — indigo/violet accents that read well on white
      line: 0x475569,         // slate-600 wireframe grid
      lineOp: 0.32,
      accent: 0x6366f1,       // indigo-500
      accentOp: 0.5,
      curve: 0x8b5cf6,        // violet-500
      curveOp: 0.55,
      particle: 0x6366f1,     // indigo particles
      particleOp: 0.5,
      glyph: "#4f46e5",       // indigo-600 formulas
      glyphOp: 0.38,
      shape: 0x64748b,        // slate-500
      shapeOp: 0.2,
      arc: 0x7c3aed,          // violet-600 arcs
      arcOp: 0.5,
      knot: 0x6366f1,         // indigo knot
      knotOp: 0.9,
    }
  : {
      line: 0xd4dcff,
      lineOp: 0.2,
      accent: 0xffffff,
      accentOp: 0.18,
      curve: 0xd4dcff,
      curveOp: 0.35,
      particle: 0xffffff,
      particleOp: 0.5,
      glyph: "#dbe3ff",
      glyphOp: 0.24,
      shape: 0xd4dcff,
      shapeOp: 0.14,
      arc: 0xd4dcff,
      arcOp: 0.32,
      knot: 0xe4e9ff,
      knotOp: 0.98,
    };

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);
    // Intro starts wider for a "punch in" feel
    const FOV_START = 90;
    const FOV_END = 60;
    if (!reduceMotion) {
      camera.fov = FOV_START;
      camera.updateProjectionMatrix();
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.visible = true;
    scene.add(root);

    /* ============================================================
       Layer 1 — Background shell
       ============================================================ */
    const shapesLayer = new THREE.Group();
    root.add(shapesLayer);

    const shellGeo = new THREE.IcosahedronGeometry(6.5, 2);
    const shellMat = new THREE.MeshBasicMaterial({
      color: palette.shape,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shapesLayer.add(shell);

    /* ============================================================
       Layer 2 — Hero knot
       ============================================================ */
    const knotGeo = new THREE.TorusKnotGeometry(2.6, 0.05, 260, 20, 2, 3);
    const knotMat = new THREE.MeshBasicMaterial({
      color: palette.knot,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.z = -1.4;
    knot.scale.setScalar(0.001);
    root.add(knot);

    /* ============================================================
       Layer 3 — LSTM gate grid
       ============================================================ */
    const lstmLayer = new THREE.Group();
    lstmLayer.position.z = -2.2;
    root.add(lstmLayer);

    const makeRect = (w: number, h: number, color: number, opacity: number) => {
      const geo = new THREE.PlaneGeometry(w, h, 1, 1);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
      const line = new THREE.LineSegments(edges, mat);
      geo.dispose();
      return line;
    };

    const gateW = 1.4;
    const gateH = 1.8;

    // Each gate gets an intro offset & delay
    type GateAnim = {
      mesh: THREE.LineSegments;
      targetX: number;
      targetY: number;
      fromX: number;
      fromY: number;
      delay: number;
      duration: number;
    };
    const gateAnims: GateAnim[] = [];

    const gateConfigs = [
      // left gate — enters from far left
      {
        target: { x: -2.2, y: 0 },
        from: { x: -18, y: 0 },
        delay: 0.15,
        duration: 0.7,
        color: palette.line,
      },
      // center gate — drops down from above
      {
        target: { x: 0, y: 0 },
        from: { x: 0, y: 12 },
        delay: 0.35,
        duration: 0.7,
        color: palette.accent,
      },
      // right gate — enters from far right
      {
        target: { x: 2.2, y: 0 },
        from: { x: 18, y: 0 },
        delay: 0.25,
        duration: 0.7,
        color: palette.line,
      },
    ];

    gateConfigs.forEach((g) => {
      const box = makeRect(gateW, gateH, g.color, palette.lineOp);
      box.position.set(g.from.x, g.from.y, 0);
      (box.material as THREE.LineBasicMaterial).opacity = 0;
      lstmLayer.add(box);
      gateAnims.push({
        mesh: box,
        targetX: g.target.x,
        targetY: g.target.y,
        fromX: g.from.x,
        fromY: g.from.y,
        delay: g.delay,
        duration: g.duration,
      });
    });

    // Flow line — fades in
    const flowGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.4, 0, 0),
      new THREE.Vector3(3.4, 0, 0),
    ]);
    const flowMat = new THREE.LineBasicMaterial({
      color: palette.line,
      transparent: true,
      opacity: 0,
    });
    const flowLine = new THREE.Line(flowGeo, flowMat);
    lstmLayer.add(flowLine);

    // Vertical guide lines
    const vLines: THREE.Line[] = [];
    [-2.2, 0, 2.2].forEach((x) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -1.4, 0),
        new THREE.Vector3(x, 1.4, 0),
      ]);
      const m = new THREE.LineBasicMaterial({
        color: palette.line,
        transparent: true,
        opacity: 0,
      });
      const l = new THREE.Line(g, m);
      lstmLayer.add(l);
      vLines.push(l);
    });

    /* ============================================================
       Arcs (drawing effect via setDrawRange)
       ============================================================ */
    const arcGroup = new THREE.Group();
    lstmLayer.add(arcGroup);

    const arcSegments = 60;

    const makeArc = (fromX: number, toX: number) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fromX, 0, 0.05),
        new THREE.Vector3((fromX + toX) / 2, 1.1, 0.05),
        new THREE.Vector3(toX, 0, 0.05),
      );
      const points = curve.getPoints(arcSegments);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: palette.arc,
        transparent: true,
        opacity: palette.arcOp,
      });
      // Nothing drawn initially
      geo.setDrawRange(0, 0);
      return new THREE.Line(geo, mat);
    };

    const arcLines = [
      makeArc(-2.2, 0),
      makeArc(0, 2.2),
      makeArc(-2.2, 2.2),
      makeArc(2.2, -2.2),
    ];
    arcLines.forEach((l) => arcGroup.add(l));

    /* ============================================================
       Sigmoid / tanh curves (drawing effect)
       ============================================================ */
    const makeCurve = (
      fn: (x: number) => number,
      color: number,
      opacity: number,
      zOffset: number,
    ) => {
      const points: THREE.Vector3[] = [];
      const steps = 140;
      for (let i = 0; i <= steps; i++) {
        const x = -4 + (8 * i) / steps;
        const y = fn(x) * 1.6;
        points.push(new THREE.Vector3(x, y, zOffset));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      geo.setDrawRange(0, 0);
      return new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
      );
    };

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x)) - 0.5;
    const tanhFn = (x: number) => Math.tanh(x) * 0.8;

    const sigmoidCurve = makeCurve(
      sigmoid,
      palette.curve,
      palette.curveOp,
      -1.2,
    );
    sigmoidCurve.position.y = 2.5;

    const tanhCurve = makeCurve(tanhFn, palette.accent, palette.curveOp, -1.8);
    tanhCurve.position.y = -2.5;

    lstmLayer.add(sigmoidCurve);
    lstmLayer.add(tanhCurve);

    /* ============================================================
       Layer 4 — Formula glyphs (fly in from outside)
       ============================================================ */
    const glyphLayer = new THREE.Group();
    glyphLayer.position.z = -3;
    root.add(glyphLayer);

    type Glyph = {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      baseOpacity: number;
      life: number;
      lifespan: number;
      orbitRadius: number;
      orbitSpeed: number;
      orbitOffset: number;
      yOffset: number;
      zOffset: number;
      // intro
      introFromX: number;
      introFromY: number;
      introDelay: number;
      introDuration: number;
    };

    const glyphs: Glyph[] = [];

    const makeGlyphTexture = (text: string, color: string) => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.font =
        "600 200px 'Space Grotesk', 'Geist Mono', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, size / 2, size / 2);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    };

    const glyphChars = [
      "σ(Wx+b)",
      "tanh(C)",
      "⊙",
      "f_t",
      "i_t",
      "o_t",
      "h_{t-1}",
      "C_t",
      "LSTM",
      "∇L",
      "∑",
      "∂L/∂W",
      "W_hh",
      "b_f",
    ];

    const spawnGlyph = (glyph: Glyph) => {
      glyph.life = 0;
      glyph.lifespan = 9 + Math.random() * 5;
      glyph.orbitRadius = 4.6 + Math.random() * 2.4;
      glyph.orbitSpeed = 0.02 + Math.random() * 0.04;
      glyph.orbitOffset = Math.random() * Math.PI * 2;
      glyph.yOffset = (Math.random() - 0.5) * 5;
      glyph.zOffset = -3 - Math.random() * 3;
    };

    glyphChars.forEach((ch, i) => {
      const tex = makeGlyphTexture(ch, palette.glyph);
      if (!tex) return;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sizeScale = ch.length > 4 ? 1.5 : 1.0;
      const geo = new THREE.PlaneGeometry(1.5 * sizeScale, 1.5 * sizeScale);
      const mesh = new THREE.Mesh(geo, mat);
      glyphLayer.add(mesh);

      // Alternate sides: left and right
      const side = i % 2 === 0 ? -1 : 1;
      const g: Glyph = {
        mesh,
        mat,
        baseOpacity: palette.glyphOp,
        life: Math.random() * 5,
        lifespan: 9 + Math.random() * 5,
        orbitRadius: 4.6 + Math.random() * 2.4,
        orbitSpeed: 0.02 + Math.random() * 0.04,
        orbitOffset: (i / glyphChars.length) * Math.PI * 2,
        yOffset: (Math.random() - 0.5) * 5,
        zOffset: -3 - Math.random() * 3,
        introFromX: side * 22,
        introFromY: (Math.random() - 0.5) * 6,
        introDelay: 0.55 + i * 0.045,
        introDuration: 0.75,
      };
      glyphs.push(g);
    });

    /* ============================================================
       Layer 5 — Token particles
       ============================================================ */
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const lanes = [-2.2, 0, 2.2];
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = -4 + Math.random() * 8;
      positions[i * 3 + 1] =
        lanes[i % lanes.length] + (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      particleSpeeds[i] = 0.006 + Math.random() * 0.014;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMat = new THREE.PointsMaterial({
      color: palette.particle,
      size: 0.018,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    root.add(particles);

    /* ============================================================
       Layer 6 — Ambient stars
       ============================================================ */
    const starCount = 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 32;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: palette.particle,
      size: 0.01,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    /* ============================================================
       Intro timing constants
       ============================================================ */
    const visibilityTimer = window.setTimeout(() => setCanvasVisible(true), 0);

    /* ============================================================
       Interactions
       ============================================================ */
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 0.6;
    };
    window.addEventListener("mousemove", onMouseMove);

    let scrollProgress = 0;
    let smoothScroll = 0;
    const onScroll = () => {
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = docHeight > 0 ? window.scrollY / docHeight : 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ============================================================
       Animate
       ============================================================ */
    let frameId = 0;
    const clock = new THREE.Clock();
    let introStart = -1;

    const animate = () => {
      const t = clock.getElapsedTime();
      if (introStart < 0) introStart = t;
      const et = t - introStart; // elapsed intro time

      // ─────────────────────────────────────────────────────────
      // INTRO STAGES
      // ─────────────────────────────────────────────────────────

      // 1) Camera punch — 0.0s → 1.2s
      const camP = clamp(et / 1.2);
      if (!reduceMotion) {
        camera.fov = FOV_START + (FOV_END - FOV_START) * easeOutQuint(camP);
        camera.updateProjectionMatrix();
      }

      // 2) Knot scale + fade — 0.0s → 0.7s
      const knotP = easeOutBack(clamp(et / 0.7));
      knot.scale.setScalar(knotP);
      knotMat.opacity = palette.knotOp * easeOutCubic(clamp(et / 0.6));

      // 3) Shell fade + slight scale — 0.25s → 0.95s
      const shellP = easeOutCubic(clamp((et - 0.25) / 0.7));
      shellMat.opacity = palette.shapeOp * shellP;
      shell.scale.setScalar(0.6 + 0.4 * shellP);

      // 4) LSTM gates slide in
      gateAnims.forEach((g) => {
        const p = easeOutQuint(clamp((et - g.delay) / g.duration));
        g.mesh.position.x = g.fromX + (g.targetX - g.fromX) * p;
        g.mesh.position.y = g.fromY + (g.targetY - g.fromY) * p;
        (g.mesh.material as THREE.LineBasicMaterial).opacity =
          palette.lineOp * p;
      });

      // 5) Flow line + vertical guides fade in — 0.5s → 1.1s
      const lineFade = easeOutCubic(clamp((et - 0.5) / 0.6));
      flowMat.opacity = palette.lineOp * lineFade;
      vLines.forEach((l) => {
        (l.material as THREE.LineBasicMaterial).opacity =
          palette.lineOp * 0.8 * lineFade;
      });

      // 6) Arcs draw themselves — staggered 0.6s onwards
      arcLines.forEach((line, i) => {
        const p = easeOutQuint(clamp((et - (0.6 + i * 0.12)) / 0.7));
        const total = arcSegments + 1;
        line.geometry.setDrawRange(0, Math.floor(total * p));
      });

      // 7) Sigmoid + tanh curves draw left → right — 0.85s onwards
      const sigP = easeOutQuint(clamp((et - 0.85) / 0.9));
      const tanhP = easeOutQuint(clamp((et - 1.0) / 0.9));
      sigmoidCurve.geometry.setDrawRange(0, Math.floor(141 * sigP));
      tanhCurve.geometry.setDrawRange(0, Math.floor(141 * tanhP));

      // 8) Glyphs fly in from sides — 0.55s onwards
      glyphs.forEach((g) => {
        const p = easeOutQuint(clamp((et - g.introDelay) / g.introDuration));
        g.mesh.userData.introP = p;
      });
      // 9) Particles + stars fade in — 0.9s → 1.6s
      const pP = easeOutCubic(clamp((et - 0.9) / 0.7));
      particleMat.opacity = palette.particleOp * pP;
      starMat.opacity = palette.particleOp * 0.6 * pP;

      // ─────────────────────────────────────────────────────────
      // IDLE MOTION
      // ─────────────────────────────────────────────────────────
      smoothScroll += (scrollProgress - smoothScroll) * 0.08;
      const scrollSpin = smoothScroll * Math.PI * 2;

      if (!reduceMotion) {
        knot.rotation.x = t * 0.06 + scrollSpin * 0.35;
        knot.rotation.y = t * 0.09 + scrollSpin * 0.55;
        knot.rotation.z = t * 0.035 + scrollSpin * 0.25;

        shell.rotation.x = -t * 0.015 - scrollSpin * 0.2;
        shell.rotation.y = t * 0.02 + scrollSpin * 0.35;
        shell.rotation.z = scrollSpin * 0.15;

        lstmLayer.rotation.y = scrollSpin * 0.5;
        lstmLayer.rotation.z = scrollSpin * 0.3;

        glyphLayer.rotation.z = scrollSpin * 0.6;
        glyphLayer.rotation.y = scrollSpin * 0.4;

        shapesLayer.rotation.z = scrollSpin * 0.3;
        shapesLayer.rotation.y = scrollSpin * 0.15;

        const pos = particleGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pos[i * 3] += particleSpeeds[i];
          if (pos[i * 3] > 4.5) pos[i * 3] = -4.5;
        }
        particleGeo.attributes.position.needsUpdate = true;

        glyphs.forEach((g, i) => {
          g.life += 0.016;

          const a = t * g.orbitSpeed + g.orbitOffset + scrollSpin * 0.2;

          // Base orbit position
          const orbitX = Math.cos(a) * g.orbitRadius;
          const orbitY = Math.sin(a * 0.6) * 2 + g.yOffset;
          const orbitZ = g.zOffset;

          // Intro offset — slides in from the sides
          const introP = (g.mesh.userData.introP as number) ?? 1;
          const introOffX = g.introFromX * (1 - introP);
          const introOffY = g.introFromY * (1 - introP);

          g.mesh.position.x = orbitX + introOffX;
          g.mesh.position.y = orbitY + introOffY;
          g.mesh.position.z = orbitZ;

          // Spin during intro
          g.mesh.rotation.z =
            Math.sin(t * 0.2 + i) * 0.2 +
            (1 - introP) * Math.PI * 2 * (g.introFromX > 0 ? 1 : -1);
          g.mesh.rotation.y = Math.sin(t * 0.15 + i) * 0.15;

          const phase = g.life / g.lifespan;
          let opacity: number;
          let scale: number;

          if (phase < 0.15) {
            const k = phase / 0.15;
            opacity = g.baseOpacity * k;
            scale = 0.5 + k * 0.5;
          } else if (phase < 0.65) {
            opacity = g.baseOpacity;
            scale = 1.0;
          } else if (phase < 1.0) {
            const k = (phase - 0.65) / 0.35;
            opacity = g.baseOpacity * (1 - k);
            scale = 1.0 + k * 0.8;
            g.mesh.position.y += k * 0.03;
          } else {
            spawnGlyph(g);
            opacity = 0;
            scale = 0.5;
          }

          g.mat.opacity = opacity;
          g.mesh.scale.setScalar(scale);
        });

        // Arcs soft pulse after intro
        const arcPulseOn = clamp((et - 1.4) / 0.6);
        arcGroup.children.forEach((child, idx) => {
          const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
          mat.opacity =
            palette.arcOp * (0.6 + 0.4 * Math.sin(t * 2 + idx)) * arcPulseOn;
        });

        stars.rotation.y = t * 0.005 + scrollSpin * 0.1;
      }

      // Camera parallax from mouse — eases in after intro
      const parallaxOn = clamp((et - 0.8) / 0.8);
      target.x += (mouse.x - target.x) * 0.03 * parallaxOn;
      target.y += (mouse.y - target.y) * 0.03 * parallaxOn;
      camera.position.x = target.x;
      camera.position.y = -target.y;
      camera.lookAt(0, 0, 0);
      camera.position.z = 8;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(visibilityTimer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [resolvedTheme]);

  return (
    <motion.div
      ref={mountRef}
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: canvasVisible ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
