"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { useTheme } from "next-themes";

export function SceneBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [canvasVisible, setCanvasVisible] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const isLight = resolvedTheme === "light";

    // ─────────────────────────────────────────────────────────────
    // Palettes
    //   • Light theme → darker lines, higher contrast on white
    //   • Dim / Dark theme → brighter, more whitish lines
    // ─────────────────────────────────────────────────────────────
    const palette = isLight
      ? {
          // LIGHT — darker for stronger contrast
          line: 0x000000,
          lineOp: 0.22,
          accent: 0x000000,
          accentOp: 0.26,
          curve: 0x000000,
          curveOp: 0.28,
          particle: 0x000000,
          particleOp: 0.45,
          glyph: "#000000",
          glyphOp: 0.2,
          shape: 0x000000,
          shapeOp: 0.18,
          arc: 0x000000,
          arcOp: 0.3,
          knot: 0x000000,
          knotOp: 0.75,
        }
      : {
          // DIM / DARK — brighter, more whitish, more luminous
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
    root.visible = false;
    scene.add(root);

    // ==================================================================
    // Layer 1 — Background shapes
    // ==================================================================
    const shapesLayer = new THREE.Group();
    root.add(shapesLayer);

    const shellGeo = new THREE.IcosahedronGeometry(6.5, 2);
    const shellMat = new THREE.MeshBasicMaterial({
      color: palette.shape,
      wireframe: true,
      transparent: true,
      opacity: palette.shapeOp,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shapesLayer.add(shell);

    // ==================================================================
    // Layer 2 — Hero knot
    // ==================================================================
    const knotGeo = new THREE.TorusKnotGeometry(2.6, 0.05, 260, 20, 2, 3);
    const knotMat = new THREE.MeshBasicMaterial({
      color: palette.knot,
      wireframe: true,
      transparent: true,
      opacity: palette.knotOp,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.z = -1.4;
    root.add(knot);

    // ==================================================================
    // Layer 3 — LSTM cell grid
    // ==================================================================
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
    const gates = [
      { x: -2.2, color: palette.line },
      { x: 0, color: palette.accent },
      { x: 2.2, color: palette.line },
    ];

    gates.forEach((g) => {
      const box = makeRect(gateW, gateH, g.color, palette.lineOp);
      box.position.set(g.x, 0, 0);
      lstmLayer.add(box);
    });

    const flowGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.4, 0, 0),
      new THREE.Vector3(3.4, 0, 0),
    ]);
    const flowLine = new THREE.Line(
      flowGeo,
      new THREE.LineBasicMaterial({
        color: palette.line,
        transparent: true,
        opacity: palette.lineOp,
      })
    );
    lstmLayer.add(flowLine);

    [-2.2, 0, 2.2].forEach((x) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -1.4, 0),
        new THREE.Vector3(x, 1.4, 0),
      ]);
      const l = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({
          color: palette.line,
          transparent: true,
          opacity: palette.lineOp * 0.8,
        })
      );
      lstmLayer.add(l);
    });

    // Arcs
    const arcGroup = new THREE.Group();
    lstmLayer.add(arcGroup);

    const makeArc = (fromX: number, toX: number) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fromX, 0, 0.05),
        new THREE.Vector3((fromX + toX) / 2, 1.1, 0.05),
        new THREE.Vector3(toX, 0, 0.05)
      );
      const points = curve.getPoints(60);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: palette.arc,
        transparent: true,
        opacity: palette.arcOp,
      });
      return new THREE.Line(geo, mat);
    };

    arcGroup.add(makeArc(-2.2, 0));
    arcGroup.add(makeArc(0, 2.2));
    arcGroup.add(makeArc(-2.2, 2.2));
    arcGroup.add(makeArc(2.2, -2.2));

    // Curves
    const makeCurve = (
      fn: (x: number) => number,
      color: number,
      opacity: number,
      zOffset: number
    ) => {
      const points: THREE.Vector3[] = [];
      const steps = 140;
      for (let i = 0; i <= steps; i++) {
        const x = -4 + (8 * i) / steps;
        const y = fn(x) * 1.6;
        points.push(new THREE.Vector3(x, y, zOffset));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      return new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity })
      );
    };

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x)) - 0.5;
    const tanh = (x: number) => Math.tanh(x) * 0.8;

    const sigmoidCurve = makeCurve(
      sigmoid,
      palette.curve,
      palette.curveOp,
      -1.2
    );
    sigmoidCurve.position.y = 2.5;

    const tanhCurve = makeCurve(
      tanh,
      palette.accent,
      palette.curveOp,
      -1.8
    );
    tanhCurve.position.y = -2.5;

    lstmLayer.add(sigmoidCurve);
    lstmLayer.add(tanhCurve);

    // ==================================================================
    // Layer 4 — Formula glyphs
    // ==================================================================
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

      const g: Glyph = {
        mesh,
        mat,
        baseOpacity: palette.glyphOp,
        life: Math.random() * 10,
        lifespan: 9 + Math.random() * 5,
        orbitRadius: 4.6 + Math.random() * 2.4,
        orbitSpeed: 0.02 + Math.random() * 0.04,
        orbitOffset: (i / glyphChars.length) * Math.PI * 2,
        yOffset: (Math.random() - 0.5) * 5,
        zOffset: -3 - Math.random() * 3,
      };
      glyphs.push(g);
    });

    // ==================================================================
    // Layer 5 — Token particles
    // ==================================================================
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
      new THREE.BufferAttribute(positions, 3)
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

    // ==================================================================
    // Layer 6 — Ambient stars
    // ==================================================================
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

    // ==================================================================
    // Reveal timing
    // ==================================================================
    let revealStart = -1;
    const REVEAL_DELAY = 0.3;
    const REVEAL_DURATION = 3.0;

    const visibilityTimer = window.setTimeout(
      () => setCanvasVisible(true),
      2400
    );

    // ==================================================================
    // Interactions
    // ==================================================================
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 0.6;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ─────────────────────────────────────────────────────────────
    // Scroll tracking — smooth, page-agnostic.
    //   Uses document scroll percentage (0 → 1) so it works on
    //   every page regardless of length.
    // ─────────────────────────────────────────────────────────────
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

    // ==================================================================
    // Animate
    // ==================================================================
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      if (revealStart < 0) revealStart = t;
      const elapsed = t - revealStart;

      const linear = Math.max(
        0,
        Math.min(1, (elapsed - REVEAL_DELAY) / REVEAL_DURATION)
      );
      const reveal = 1 - Math.pow(1 - linear, 3);

      if (!root.visible && reveal > 0) root.visible = true;

      particleMat.opacity = palette.particleOp * reveal;
      starMat.opacity = palette.particleOp * 0.6 * reveal;
      shellMat.opacity = palette.shapeOp * reveal;
      knotMat.opacity = palette.knotOp * reveal;

      // Smoother scroll lerp — feels more premium
      smoothScroll += (scrollProgress - smoothScroll) * 0.08;

      // A gentle "scroll rotation" scalar so multiple layers rotate together
      const scrollSpin = smoothScroll * Math.PI * 2; // 0 → 2π over full page

      if (!reduceMotion) {
        // ─────────────────────────────────────────
        // Hero knot — time + scroll rotation
        // ─────────────────────────────────────────
        knot.rotation.x = t * 0.06 + scrollSpin * 0.35;
        knot.rotation.y = t * 0.09 + scrollSpin * 0.55;
        knot.rotation.z = t * 0.035 + scrollSpin * 0.25;

        // ─────────────────────────────────────────
        // Shell — time + scroll rotation
        // ─────────────────────────────────────────
        shell.rotation.x = -t * 0.015 - scrollSpin * 0.2;
        shell.rotation.y = t * 0.02 + scrollSpin * 0.35;
        shell.rotation.z = scrollSpin * 0.15;

        // ─────────────────────────────────────────
        // LSTM gate grid — rotates on scroll
        // ─────────────────────────────────────────
        lstmLayer.rotation.y = scrollSpin * 0.5;
        lstmLayer.rotation.z = scrollSpin * 0.3;

        // ─────────────────────────────────────────
        // Formula glyphs — rotates on scroll
        // ─────────────────────────────────────────
        glyphLayer.rotation.z = scrollSpin * 0.6;
        glyphLayer.rotation.y = scrollSpin * 0.4;

        // ─────────────────────────────────────────
        // Shapes layer — rotates on scroll
        // ─────────────────────────────────────────
        shapesLayer.rotation.z = scrollSpin * 0.3;
        shapesLayer.rotation.y = scrollSpin * 0.15;

        // ─────────────────────────────────────────
        // Particles
        // ─────────────────────────────────────────
        const pos = particleGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pos[i * 3] += particleSpeeds[i];
          if (pos[i * 3] > 4.5) pos[i * 3] = -4.5;
        }
        particleGeo.attributes.position.needsUpdate = true;

        // ─────────────────────────────────────────
        // Faint formula drift
        // ─────────────────────────────────────────
        glyphs.forEach((g, i) => {
          g.life += 0.016;

          const a = t * g.orbitSpeed + g.orbitOffset + scrollSpin * 0.2;
          g.mesh.position.x = Math.cos(a) * g.orbitRadius;
          g.mesh.position.y = Math.sin(a * 0.6) * 2 + g.yOffset;
          g.mesh.position.z = g.zOffset;

          g.mesh.rotation.z = Math.sin(t * 0.2 + i) * 0.2;
          g.mesh.rotation.y = Math.sin(t * 0.15 + i) * 0.15;

          const phase = g.life / g.lifespan;
          let opacity: number;
          let scale: number;

          if (phase < 0.15) {
            const k = phase / 0.15;
            opacity = g.baseOpacity * k * reveal;
            scale = 0.5 + k * 0.5;
          } else if (phase < 0.65) {
            opacity = g.baseOpacity * reveal;
            scale = 1.0;
          } else if (phase < 1.0) {
            const k = (phase - 0.65) / 0.35;
            opacity = g.baseOpacity * (1 - k) * reveal;
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

        // Arcs pulse quietly
        arcGroup.children.forEach((child, idx) => {
          const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
          mat.opacity =
            palette.arcOp * (0.6 + 0.4 * Math.sin(t * 2 + idx)) * reveal;
        });

        stars.rotation.y = t * 0.005 + scrollSpin * 0.1;
      }

      target.x += (mouse.x - target.x) * 0.03;
      target.y += (mouse.y - target.y) * 0.03;
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
      transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}