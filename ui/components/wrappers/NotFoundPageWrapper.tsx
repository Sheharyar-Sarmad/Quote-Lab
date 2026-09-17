"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Flask,
  House,
  Sparkle,
} from "@phosphor-icons/react";

/* ============================================================
   Design tokens (mirrors the rest of the app)
   ============================================================ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const GRADIENT_TEXT =
  "bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent";

const CARD_BASE =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-xl";

/* ============================================================
   Random quote to soften the blow
   ============================================================ */

const QUOTES = [
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  {
    text: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein",
  },
  { text: "The only way out is through.", author: "Robert Frost" },
  {
    text: "Every exit is an entry somewhere else.",
    author: "Tom Stoppard",
  },
  {
    text: "It does not do to dwell on dreams and forget to live.",
    author: "J.K. Rowling",
  },
] as const;

/* ============================================================
   Wrapper
   ============================================================ */

export function NotFoundWrapper() {
  const [quote, setQuote] = useState<(typeof QUOTES)[number]>(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-24 sm:px-6">
      {/* SceneBackground (the 3D knot) is provided by AppShell — no need to render here */}

      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        {/* Eyebrow badge */}
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary backdrop-blur-xl"
        >
          <Compass weight="duotone" className="size-3.5" />
          404 · Lost in thought
        </motion.span>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="mt-7 font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl md:text-7xl"
        >
          This page
          <br />
          <span className={GRADIENT_TEXT}>isn&rsquo;t in our dataset.</span>
        </motion.h1>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
          className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          The URL you followed doesn&rsquo;t match any route we recognise.
          While you decide where to go next, here&rsquo;s a quote to soften
          the blow.
        </motion.p>

        {/* Quote card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
          className={`${CARD_BASE} mt-10 px-6 py-8 text-left sm:px-8 sm:py-10`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
              <Sparkle weight="fill" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-lg leading-snug text-balance sm:text-xl">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                — {quote.author}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40"
          >
            <House weight="bold" className="size-4" />
            Back to Home
            <ArrowRight
              weight="bold"
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          <Link
            href="/prediction-lab"
            className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-6 py-3 text-sm font-medium backdrop-blur-xl transition-colors hover:border-primary/40"
          >
            <Flask weight="bold" className="size-4 text-primary" />
            Try the Prediction Lab
          </Link>
        </motion.div>

        {/* Tiny footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1, ease: EASE }}
          className="mt-12 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70"
        >
          Error 404 · Page not found
        </motion.p>
      </div>
    </div>
  );
}