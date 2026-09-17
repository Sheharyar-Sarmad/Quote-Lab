"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { SceneBackground } from "@/components/three/SceneBG";

/* ============================================================
   Lenis context — lets any child scroll via Lenis instead of
   native scrollIntoView, which conflicts with smooth scroll.
   ============================================================ */

type LenisContextValue = {
  scrollTo: (
    target: string | HTMLElement | number,
    opts?: { offset?: number; duration?: number; immediate?: boolean },
  ) => void;
};

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
});

export const useLenis = () => useContext(LenisContext);

/* ============================================================
   AppShell
   ============================================================ */

export function AppShell({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Respect reduced motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled) return;

      const lenis = new Lenis({
        duration: 0.9,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1.05,
        touchMultiplier: 1.4,
        syncTouch: false,
        syncTouchLerp: 0.075,
        autoRaf: false,
        infinite: false,
        gestureOrientation: "vertical",
        prevent: (node) => {
          if (!node) return false;
          const tag = (node as HTMLElement).tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return true;
          if ((node as HTMLElement).isContentEditable) return true;
          return (
            (node as HTMLElement).closest?.("[data-lenis-prevent]") != null
          );
        },
      });

      lenisRef.current = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      const recalc = () => lenis.resize();
      window.addEventListener("resize", recalc);
      window.addEventListener("orientationchange", recalc);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(recalc);
        resizeObserver.observe(document.body);
        resizeObserver.observe(document.documentElement);
      }

      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          recalc();
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(raf);
          lenis.start();
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (typeof window !== "undefined") {
        const w = window as unknown as { __lenis?: Lenis };
        w.__lenis?.destroy();
        delete w.__lenis;
      }
      lenisRef.current = null;
    };
  }, []);

  // Reset scroll on route change, then recalc after content mounts
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true, force: true });
    const id = requestAnimationFrame(() => lenis.resize());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  /* Safe scrollTo — always goes through Lenis when available */
  const scrollTo: LenisContextValue["scrollTo"] = (target, opts) => {
    const lenis = lenisRef.current;
    if (!lenis) {
      if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "smooth" });
      } else if (typeof target === "string") {
        document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    lenis.scrollTo(target, {
      offset: opts?.offset ?? 0,
      duration: opts?.duration ?? 1,
      immediate: opts?.immediate ?? false,
      force: true,
    });
  };

  return (
    <LenisContext.Provider value={{ scrollTo }}>
      {/*
          Outer wrapper is now painted dark BEFORE the canvas mounts.
           The `bg-background` class uses your theme's background token.
           The inline `backgroundColor` is a hard fallback in case the
           theme hasn't resolved yet — this is what kills the white flash.
      */}
      <div className="relative w-full bg-background">
        {/* key by pathname → remounts on route change → intro replays */}
        <SceneBackground key={pathname} />

        <div className="pointer-events-none fixed inset-0 z-[1] grid-bg opacity-40" />
        <div className="pointer-events-none fixed inset-0 z-[2] noise-overlay" />

        <div className="relative z-10 flex min-h-screen w-full flex-col">
          {children}
        </div>
      </div>
    </LenisContext.Provider>
  );
}
