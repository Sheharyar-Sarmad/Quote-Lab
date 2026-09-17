"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  ChartLine,
  Clock,
  Code,
  Cpu,
  Database,
  EnvelopeSimple,
  Fire,
  GithubLogo,
  GitFork,
  Lightning,
  LinkedinLogo,
  List,
  Microphone,
  Notebook,
  Repeat,
  Sparkle,
  Warning,
  Waveform,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

/* ============================================================
   Shared tokens
   ============================================================ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const GRADIENT_TEXT =
  "bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent";

const CARD_BASE =
  "relative overflow-hidden border border-border/60 bg-background/40 backdrop-blur-xl transition-colors hover:border-primary/40";

const CODE_BLOCK =
  "rounded-lg border border-border/60 bg-muted/30 p-4 font-mono text-[12px] leading-relaxed text-foreground/90 overflow-x-auto";

/* API base — falls back to local FastAPI if env not set */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:10000";

/* Source repo — single source of truth */
const SOURCE_REPO = "https://github.com/Sheharyar-Sarmad/Quote-Lab";

const reveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE },
  },
};

const revealSlow: Variants = {
  hidden: { opacity: 0, y: 56, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.2, ease: EASE },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const staggerSlow: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.1 } },
};

/* ============================================================
   Mouse torch
   ============================================================ */

function MouseTorch() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  if (!mounted) return null;

  const isDarkTheme = resolvedTheme === "dark" || resolvedTheme === "dim";

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[3] hidden size-[560px] rounded-full md:block"
      style={{
        background: isDarkTheme
          ? "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 18%, rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.02) 55%, transparent 72%)"
          : "radial-gradient(circle, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.10) 18%, rgba(0,0,0,0.045) 38%, rgba(0,0,0,0.015) 55%, transparent 72%)",
        filter: "blur(28px)",
        willChange: "transform",
        transition: "background 400ms ease",
      }}
    />
  );
}

/* ============================================================
   Reusable pieces
   ============================================================ */

function CardGlow({ className }: { className?: string }) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-primary/[0.09] opacity-80 transition-opacity duration-500 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-primary/25 blur-3xl transition-all duration-500 group-hover:bg-primary/35",
          className,
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 size-44 rounded-full bg-primary/10 blur-3xl"
      />
    </>
  );
}

function CardButton({ label = "Open" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-xl transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground">
      {label}
      <ArrowUpRight weight="bold" className="size-3" />
    </span>
  );
}

function SplitTextOnMount({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.9, delay: delay + index * 0.06, ease: EASE }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
      )}
    >
      <motion.span
        variants={reveal}
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-xl"
      >
        <Sparkle weight="fill" className="size-3.5 text-primary" />
        {eyebrow}
      </motion.span>

      <motion.h2
        variants={revealSlow}
        className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl"
      >
        {title}
      </motion.h2>

      {subtitle ? (
        <motion.p
          variants={reveal}
          className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          {subtitle}
        </motion.p>
      ) : null}
    </motion.div>
  );
}

function Counter({
  to,
  duration = 2,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ============================================================
   Inline SVG line chart
   ============================================================ */

function AccuracyChart() {
  const epochs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const trainAcc = [0.039, 0.046, 0.061, 0.072, 0.087, 0.099, 0.112, 0.117, 0.121];
  const valAcc = [0.040, 0.062, 0.079, 0.093, 0.099, 0.102, 0.104, 0.107, 0.105];

  const W = 640;
  const H = 300;
  const P = { t: 24, r: 24, b: 44, l: 56 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;

  const yMin = 0.03;
  const yMax = 0.13;

  const xScale = (i: number) => P.l + (i / (epochs.length - 1)) * innerW;
  const yScale = (v: number) => P.t + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const linePath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`)
      .join(" ");

  const areaPath = (values: number[]) =>
    `${linePath(values)} L ${xScale(values.length - 1)} ${yScale(yMin)} L ${xScale(0)} ${yScale(yMin)} Z`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="LSTM training vs validation accuracy curve"
      >
        <defs>
          <linearGradient id="train-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="val-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="train-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="val-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = P.t + p * innerH;
          const v = yMax - p * (yMax - yMin);
          return (
            <g key={p}>
              <line
                x1={P.l}
                y1={y}
                x2={W - P.r}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeDasharray="3 4"
              />
              <text
                x={P.l - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="currentColor"
                fillOpacity="0.85"
                fontWeight="500"
              >
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {epochs.map((e, i) => (
          <text
            key={e}
            x={xScale(i)}
            y={H - P.b + 20}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            fillOpacity="0.85"
            fontWeight="500"
          >
            {e}
          </text>
        ))}

        <text
          x={W / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          fillOpacity="0.9"
          fontWeight="600"
        >
          Epoch
        </text>

        <path d={areaPath(trainAcc)} fill="url(#train-fill)" />
        <path d={areaPath(valAcc)} fill="url(#val-fill)" />

        <path
          d={linePath(valAcc)}
          fill="none"
          stroke="url(#val-line)"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="1"
        />

        <path
          d={linePath(trainAcc)}
          fill="none"
          stroke="url(#train-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="1"
        />

        {valAcc.map((v, i) => (
          <circle
            key={`v-${i}`}
            cx={xScale(i)}
            cy={yScale(v)}
            r="3.5"
            fill="#f472b6"
            fillOpacity="0.9"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        ))}

        {trainAcc.map((v, i) => (
          <circle
            key={`t-${i}`}
            cx={xScale(i)}
            cy={yScale(v)}
            r="4"
            fill="#8b5cf6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
        ))}
      </svg>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899]" />
          Training accuracy
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f472b6] [mask-image:repeating-linear-gradient(to_right,black_0_5px,transparent_5px_9px)]" />
          Validation accuracy
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Data
   ============================================================ */

const STATS = [
  { value: 3038, label: "Quotes in dataset", suffix: "" },
  { value: 8979, label: "Unique vocabulary words", suffix: "" },
  { value: 85271, label: "Training sequences", suffix: "" },
  { value: 11.44, label: "Final val. accuracy", suffix: "%", decimals: 2 },
] as const;

const DATASET_PREVIEW = [
  { quote: "The world as we have created it is a process of our thinking...", author: "Albert Einstein" },
  { quote: "It is our choices, Harry, that show what we truly are...", author: "J.K. Rowling" },
  { quote: "There are only two ways to live your life. One is as though...", author: "Albert Einstein" },
  { quote: "The person, be it gentleman or lady, who has not pleasure in...", author: "Jane Austen" },
  { quote: "Imperfection is beauty, madness is genius and it's better...", author: "Marilyn Monroe" },
] as const;

const PREPROCESSING_STEPS = [
  {
    step: "01",
    title: "Lowercase",
    description:
      "Every quote is normalised to lowercase so \u201cThe\u201d and \u201cthe\u201d map to the same token.",
    code: `quotes = quotes.str.lower()`,
  },
  {
    step: "02",
    title: "Strip punctuation",
    description:
      "Punctuation is removed via a translation table — shrinks the vocabulary and removes noise.",
    code: `translator = str.maketrans("", "", string.punctuation)\nquotes = quotes.apply(lambda x: x.translate(translator))`,
  },
  {
    step: "03",
    title: "Tokenize + cap vocab",
    description:
      "Keras Tokenizer maps every word to an integer. The vocabulary is capped at 10k with an <OOV> token for unknowns.",
    code: `tokenizer = Tokenizer(num_words=10000, oov_token="<OOV>")\ntokenizer.fit_on_texts(quotes)\n# 8,979 unique words survived`,
  },
  {
    step: "04",
    title: "Pad sequences",
    description:
      "Every training example is padded to a fixed length of 50, pre-padding because the task is next-word prediction.",
    code: `X_padded = pad_sequences(X, maxlen=50, padding="pre")\n# shape: (85271, 50)`,
  },
] as const;

const MODEL_COMPARISON = [
  { metric: "Hidden units", rnn: "128", lstm: "128" },
  { metric: "Embedding dim", rnn: "50", lstm: "50" },
  { metric: "Dropout", rnn: "none", lstm: "0.2 recurrent + 0.3" },
  { metric: "Long-term memory", rnn: "weak", lstm: "gated, strong" },
  { metric: "Final val. accuracy", rnn: "~7.2%", lstm: "10.58%" },
] as const;

const LSTM_CONFIG = [
  { label: "Embedding", value: "10,000 × 50" },
  { label: "LSTM units", value: "128" },
  { label: "Dropout", value: "0.2 / 0.3" },
  { label: "Dense output", value: "10,000 (softmax)" },
  { label: "Optimizer", value: "Adam" },
  { label: "Loss", value: "sparse categorical CE" },
  { label: "Batch size", value: "128" },
  { label: "Epochs (max)", value: "30" },
  { label: "Early stopping", value: "patience = 3" },
] as const;

const TRAINING_TABLE = [
  { label: "Epochs run before early stop", value: "9" },
  { label: "Best epoch", value: "6" },
  { label: "Training loss (final)", value: "5.3739" },
  { label: "Validation loss (final)", value: "6.4747" },
  { label: "Training accuracy", value: "12.22%" },
  { label: "Validation accuracy", value: "10.58%" },
  { label: "Test set accuracy", value: "11.44%" },
] as const;

const ENV_VARS = [
  {
    key: "NEXT_PUBLIC_API_BASE_URL",
    value: API_BASE,
    hint: "Base URL for the FastAPI backend that loads the LSTM and forwards to Groq. Falls back to the local FastAPI instance if unset.",
  },
  {
    key: "GROQ_API_KEY",
    value: "gsk_••••••••••••••••••••",
    hint: "Server-side only. Used by FastAPI to call Groq's LPU inference.",
  },
] as const;

/* ============================================================
   Top bar
   ============================================================ */

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="fixed left-4 top-3 z-[60] inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/40 hover:text-foreground md:hidden"
      >
        <List weight="bold" className="size-5" />
      </button>

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between",
          "border-b border-border/60 bg-background/95 px-4 pl-16 backdrop-blur-xl",
          "supports-[backdrop-filter]:bg-background/80",
          "md:left-[var(--sidebar-w)] md:pl-6",
        )}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur-xl"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          QuoteLab · Colophon
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/prediction-lab"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            Prediction Lab
          </Link>
        </nav>
      </header>
    </>
  );
}

/* ============================================================
   Footer
   ============================================================ */

const FOOTER_LINKS = {
  product: [
    { label: "Prediction Lab", href: "/prediction-lab", external: false },
    { label: "Colophon", href: "/colophon", external: false },
    { label: "Home", href: "/", external: false },
  ],
  connect: [
    { label: "GitHub", href: "https://github.com/Sheharyar-Sarmad", external: true },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/", external: true },
    { label: "Email", href: "https://mail.google.com/mail/u/0/?fs=1&to=developersheharyar2010@gmail.com&tf=cm", external: true },
    { label: "Source repo", href: SOURCE_REPO, external: true },
  ],
  builtWith: [
    { label: "TensorFlow", href: "https://www.tensorflow.org", external: true },
    { label: "FastAPI", href: "https://fastapi.tiangolo.com", external: true },
    { label: "Next.js", href: "https://nextjs.org", external: true },
    { label: "Groq", href: "https://groq.com", external: true },
  ],
} as const;

function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background/60 px-4 py-12 backdrop-blur-xl sm:px-6 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4 md:max-w-sm">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-border/60 bg-primary/10 text-primary">
                <Sparkle weight="fill" className="size-4" />
              </span>
              <span className="font-heading text-base font-semibold tracking-tight">QuoteLab</span>
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              A full-stack AI experiment — LSTM next-word prediction in
              TensorFlow / Keras, wrapped in FastAPI, shipped with a Next.js
              frontend and a Groq completion layer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Product
              </span>
              <ul className="flex flex-col gap-2">
                {FOOTER_LINKS.product.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Connect
              </span>
              <ul className="flex flex-col gap-2">
                {FOOTER_LINKS.connect.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Built with
              </span>
              <ul className="flex flex-col gap-2">
                {FOOTER_LINKS.builtWith.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 border-t border-border/60 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QuoteLab · Built by{" "}
            <a
              href="https://github.com/Sheharyar-Sarmad"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              Sheharyar Sarmad
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   Sections
   ============================================================ */

function Hero() {
  return (
    <section className="relative isolate flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/20 to-background"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 -z-10 size-[380px] rounded-full bg-primary/20 blur-[120px]"
        animate={{ y: [0, -22, 0], x: [0, 18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-xl"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          How this book was made
        </motion.span>

        <h1 className="mt-7 font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl md:text-7xl">
          <SplitTextOnMount text="The Colophon." delay={0.15} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
        >
          The dataset, the preprocessing, the LSTM, the two Colab T4 crashes
          that cost me roughly three hours, and the FastAPI + Groq pipeline
          that makes the prediction lab actually usable. All the honest bits.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease: EASE }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 font-mono text-[11px] text-muted-foreground backdrop-blur-xl"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="uppercase tracking-[0.18em] text-[10px]">
            API
          </span>
          <span className="text-foreground/90">{API_BASE}</span>
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="relative px-4 pb-16 sm:px-6 md:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
            className={cn("group rounded-2xl p-6", CARD_BASE)}
          >
            <CardGlow />
            <div className="relative flex items-start justify-between">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                <Sparkle weight="duotone" className="size-4" />
              </span>
              <span className="font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                0{index + 1}
              </span>
            </div>
            <div className="relative mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              <Counter
                to={stat.value}
                suffix={stat.suffix}
                decimals={"decimals" in stat ? (stat.decimals as number) : 0}
              />
            </div>
            <p className="relative mt-2 text-xs text-muted-foreground sm:text-sm">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Dataset() {
  return (
    <section
      id="dataset"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Source data"
          title={
            <>
              A CSV of <span className={GRADIENT_TEXT}>3,038 famous quotes</span>
            </>
          }
          subtitle="Two columns, no nulls. The whole model lives and dies by this file."
        />

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 lg:grid-cols-5"
        >
          <motion.div variants={revealSlow} className="lg:col-span-2">
            <a
              href="https://github.com/Sheharyar-Sarmad/Quote-Lab/blob/main/model/data/qoute_dataset.csv"
              target="_blank"
              rel="noreferrer noopener"
              className={cn("group flex h-full flex-col rounded-3xl p-6", CARD_BASE)}
            >
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Database weight="duotone" className="size-5" />
                </span>
                <CardButton label="Open dataset" />
              </div>
              <h3 className="relative mt-5 font-heading text-lg font-semibold">
                quote_dataset.csv
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                A curated set of famous quotations from Einstein to Austen.
                Each row is a single sentence, guaranteed clean — the
                sanity-check pass found zero missing values.
              </p>

              <dl className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Rows
                  </dt>
                  <dd className="mt-1 font-heading font-medium">3,038</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Columns
                  </dt>
                  <dd className="mt-1 font-heading font-medium">2</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Missing values
                  </dt>
                  <dd className="mt-1 font-heading font-medium">0</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Unique words
                  </dt>
                  <dd className="mt-1 font-heading font-medium">8,979</dd>
                </div>
              </dl>
            </a>
          </motion.div>

          <motion.div variants={revealSlow} className="lg:col-span-3">
            <div className={cn("group rounded-3xl p-6", CARD_BASE)}>
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                    <Database weight="duotone" className="size-3.5" />
                    df.head()
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold">
                    Preview
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  shape: (3038, 2)
                </span>
              </div>

              <div className="relative mt-6 overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">quote</th>
                      <th className="px-4 py-3 font-medium">Author</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATASET_PREVIEW.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-border/60 transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 pr-6 text-foreground/90">
                          <span className="line-clamp-1">&ldquo;{row.quote}&rdquo;</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {row.author}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={cn("relative mt-4", CODE_BLOCK)}>
                <span className="text-muted-foreground">df: pd.DataFrame =</span>{" "}
                pd.read_csv(<span className="text-primary">&apos;quote_dataset.csv&apos;</span>)
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Preprocessing() {
  return (
    <section
      id="preprocessing"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Cleaning"
          title={
            <>
              From raw text to <span className={GRADIENT_TEXT}>machine-readable tokens</span>
            </>
          }
          subtitle="Four steps, each doing exactly one thing. Nothing fancy — just the boring work that makes the model actually trainable."
        />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2"
        >
          {PREPROCESSING_STEPS.map((step) => (
            <motion.div
              key={step.step}
              variants={reveal}
              className={cn("group rounded-2xl p-6", CARD_BASE)}
            >
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Repeat weight="duotone" className="size-5" />
                </span>
                <span className="font-heading text-xs font-medium tracking-[0.2em] text-muted-foreground">
                  {step.step}
                </span>
              </div>
              <h3 className="relative mt-5 font-heading text-base font-semibold">
                {step.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <pre className={cn("relative mt-5", CODE_BLOCK)}>
                <code>{step.code}</code>
              </pre>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ModelArchitecture() {
  return (
    <section
      id="model"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Architecture"
          title={
            <>
              Two models, one clear{" "}
              <span className={GRADIENT_TEXT}>winner</span>
            </>
          }
          subtitle="I trained a SimpleRNN as a baseline, then rebuilt the same stack around an LSTM. The gap was not subtle."
        />

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 lg:grid-cols-5"
        >
          <motion.div variants={revealSlow} className="lg:col-span-3">
            <div className={cn("group flex h-full flex-col rounded-3xl p-8", CARD_BASE)}>
              <Image
                src="/lstm-architecture.png"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="pointer-events-none object-cover opacity-[0.10] dark:opacity-[0.16]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.10] via-background/85 to-primary/[0.06]"
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                    <Cpu weight="duotone" className="size-3.5" />
                    Final model
                  </span>
                  <h3 className="mt-4 font-heading text-2xl font-semibold sm:text-3xl">
                    quote-lstm-v1
                  </h3>
                </div>
              </div>

              <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Embedding → LSTM → Dropout → Dense softmax. Small enough to
                reason about, big enough to actually learn something across
                3,038 sentences.
              </p>

              <dl className="relative mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {LSTM_CONFIG.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-1 font-heading text-sm font-medium">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>

          <motion.div variants={revealSlow} className="lg:col-span-2">
            <div className={cn("group h-full rounded-3xl p-6", CARD_BASE)}>
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Brain weight="duotone" className="size-5" />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  RNN vs LSTM
                </span>
              </div>

              <h3 className="relative mt-5 font-heading text-lg font-semibold">
                Why LSTM won
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                SimpleRNN is a good sanity check — then the gates matter.
              </p>

              <div className="relative mt-6 overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Metric</th>
                      <th className="px-3 py-2 text-center font-medium">RNN</th>
                      <th className="px-3 py-2 text-center font-medium text-primary">
                        LSTM
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_COMPARISON.map((row) => (
                      <tr
                        key={row.metric}
                        className="border-t border-border/60"
                      >
                        <td className="px-3 py-2.5 text-foreground/90">
                          {row.metric}
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">
                          {row.rnn}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium text-primary">
                          {row.lstm}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function TrainingStory() {
  return (
    <section
      id="training"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Training"
          title={
            <>
              The <span className={GRADIENT_TEXT}>uncomfortable</span> part
            </>
          }
          subtitle="The model is small, but the road to it was not. Two Colab T4 crashes and roughly three hours of my life, mostly spent staring at a frozen progress bar."
        />

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 lg:grid-cols-3"
        >
          <motion.div variants={revealSlow} className="lg:col-span-2">
            <div className={cn("group h-full rounded-3xl p-8", CARD_BASE)}>
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
                  <Warning weight="duotone" className="size-5" />
                </span>
                <span className="font-mono text-[11px] text-destructive">
                  RuntimeError
                </span>
              </div>

              <h3 className="relative mt-5 font-heading text-xl font-semibold sm:text-2xl">
                Two T4 crashes. Three hours gone.
              </h3>

              <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">
                Colab's free T4 is exactly powerful enough to make you think
                you can train on 85k sequences — and exactly weak enough to
                kill the runtime when you do it twice. Each crash threw away
                a full epoch of progress. The fix in the end was boring:
                drop the batch size, drop the max sequence length, cap the
                vocabulary, and lean on EarlyStopping so the model can't
                overstay its welcome.
              </p>

              <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Fire
                    weight="duotone"
                    className="size-4 text-destructive"
                  />
                  <div className="mt-2 font-heading text-base font-semibold">
                    2
                  </div>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Runtime crashes
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Clock weight="duotone" className="size-4 text-primary" />
                  <div className="mt-2 font-heading text-base font-semibold">
                    ~3 hours
                  </div>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Wasted on retries
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Lightning
                    weight="duotone"
                    className="size-4 text-primary"
                  />
                  <div className="mt-2 font-heading text-base font-semibold">
                    T4 GPU
                  </div>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Free Colab tier
                  </p>
                </div>
              </div>

              <pre className={cn("relative mt-6", CODE_BLOCK)}>
                <code>{`early_stopping = EarlyStopping(
    monitor="val_loss",
    patience=3,
    restore_best_weights=True
)

history_lstm = lstm_model.fit(
    X_padded, y,
    epochs=30,
    batch_size=128,
    validation_split=0.1,
    callbacks=[early_stopping]
)`}</code>
              </pre>
            </div>
          </motion.div>

          <motion.div variants={revealSlow}>
            <div className={cn("group h-full rounded-3xl p-6", CARD_BASE)}>
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Notebook weight="duotone" className="size-5" />
                </span>
              </div>

              <h3 className="relative mt-5 font-heading text-lg font-semibold">
                Final numbers
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                The run that actually completed.
              </p>

              <dl className="relative mt-6 divide-y divide-border/60 rounded-xl border border-border/60">
                {TRAINING_TABLE.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <dt className="text-xs text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="font-heading text-sm font-medium">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function ChartSection() {
  return (
    <section
      id="chart"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The curve"
          title={
            <>
              Where the model <span className={GRADIENT_TEXT}>started learning</span>
            </>
          }
          subtitle="Nine epochs, then EarlyStopping pulled the plug. The validation line goes flat around epoch 6 — that's where the weights were restored from."
        />

        <motion.div
          variants={revealSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14"
        >
          <div className={cn("group rounded-3xl p-6 sm:p-10", CARD_BASE)}>
            <CardGlow />
            <div className="relative flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                  <ChartLine weight="duotone" className="size-3.5" />
                  LSTM Training vs Validation Accuracy
                </span>
                <h3 className="mt-4 font-heading text-xl font-semibold sm:text-2xl">
                  Nine epochs to a plateau
                </h3>
              </div>
              <div className="hidden shrink-0 rounded-full border border-border/60 bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground sm:block">
                batch: 128 · patience: 3
              </div>
            </div>

            <div className="relative mt-8">
              <AccuracyChart />
            </div>

            <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Best epoch
                </div>
                <div className="mt-1 font-heading text-base font-semibold">
                  6
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Train acc.
                </div>
                <div className="mt-1 font-heading text-base font-semibold">
                  12.22%
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Val. acc.
                </div>
                <div className="mt-1 font-heading text-base font-semibold">
                  10.58%
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Val. loss
                </div>
                <div className="mt-1 font-heading text-base font-semibold">
                  6.4747
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Backend() {
  return (
    <section
      id="backend"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The API"
          title={
            <>
              A small <span className={GRADIENT_TEXT}>FastAPI</span> between the LSTM and the browser
            </>
          }
          subtitle="The trained model is loaded once at startup, kept warm, and exposed behind a single POST endpoint. Everything else — Groq, voice, the frontend — talks to it through NEXT_PUBLIC_API_BASE_URL, with a local fallback baked in."
        />

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 lg:grid-cols-5"
        >
          <motion.div variants={revealSlow} className="lg:col-span-3">
            <div className={cn("group h-full rounded-3xl p-8", CARD_BASE)}>
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Code weight="duotone" className="size-5" />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  POST /predict
                </span>
              </div>

              <h3 className="relative mt-5 font-heading text-lg font-semibold">
                Endpoint contract
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                Takes a partial quote, returns the next predicted word from
                the LSTM plus a Groq completion for the whole sentence.
              </p>

              <pre className={cn("relative mt-5", CODE_BLOCK)}>
                <code>{`// active API base (env var OR local FastAPI fallback)
const API_BASE = "${API_BASE}";

// frontend call
const res = await fetch(\`\${API_BASE}/predict\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: partialQuote, top_k: 5 }),
});
const { predictions } = await res.json();`}</code>
              </pre>
            </div>
          </motion.div>

          <motion.div variants={revealSlow} className="lg:col-span-2">
            <div className={cn("group h-full rounded-3xl p-6", CARD_BASE)}>
              <CardGlow />
              <div className="relative flex items-start justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                  <Database weight="duotone" className="size-5" />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  .env.local
                </span>
              </div>

              <h3 className="relative mt-5 font-heading text-lg font-semibold">
                Environment
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                Only <span className="font-mono text-xs">NEXT_PUBLIC_</span>{" "}
                vars are readable from the browser — the Groq key stays
                server-side.
              </p>

              <div className="relative mt-6 space-y-3">
                {ENV_VARS.map((env, i) => (
                  <div
                    key={env.key}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[11px] text-primary">
                        {env.key}
                      </div>
                      {i === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-500">
                          <span className="size-1 animate-pulse rounded-full bg-emerald-500" />
                          active
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {env.value}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {env.hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function GroqSection() {
  return (
    <section
      id="groq"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Completion"
          title={
            <>
              Groq picks up where the <span className={GRADIENT_TEXT}>LSTM stops</span>
            </>
          }
          subtitle="The LSTM is great at a next-word guess and terrible at finishing a thought. Groq closes the gap."
        />

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 md:grid-cols-3"
        >
          {[
            {
              icon: Brain,
              tag: "TensorFlow / Keras",
              title: "LSTM predicts",
              description:
                "Reads the partial quote, returns the top next word as a single integer index.",
            },
            {
              icon: Lightning,
              tag: "Groq LPU",
              title: "Groq completes",
              description:
                "Takes the partial quote + the LSTM's guess, returns a full, coherent sentence in well under a second.",
            },
            {
              icon: Waveform,
              tag: "Web Speech API",
              title: "Voice reads it",
              description:
                "The browser speaks the finished quote back. No audio bundles, no TTS bills.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={revealSlow}
                className={cn("group rounded-2xl p-6", CARD_BASE)}
              >
                <CardGlow />
                <div className="relative flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                    <Icon weight="duotone" className="size-5" />
                  </span>
                </div>
                <span className="relative mt-6 block text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                  {item.tag}
                </span>
                <h3 className="relative mt-2 font-heading text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function Credits() {
  return (
    <section className="relative px-4 pb-24 pt-10 sm:px-6 md:px-10">
      <motion.div
        variants={revealSlow}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className={cn(
          "group relative mx-auto max-w-5xl rounded-3xl px-8 py-16 text-center sm:px-14",
          CARD_BASE,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/25 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-primary/20 blur-[110px]"
        />

        <div className="relative">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary">
            <Sparkle weight="duotone" className="size-6" />
          </span>

          <h2 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Everything is in the repo.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The notebook, the model weights, the FastAPI service, this
            frontend — all open. Fork it, retrain it, break it, ship it.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/prediction-lab"
              className="group/btn inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
            >
              Open Prediction Lab
              <ArrowRight
                weight="bold"
                className="size-4 transition-transform group-hover/btn:translate-x-0.5"
              />
            </Link>

            <a
              href={SOURCE_REPO}
              target="_blank"
              rel="noreferrer noopener"
              className="group/btn inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-6 py-3 text-sm font-medium backdrop-blur-xl transition-colors hover:border-primary/40"
            >
              <GithubLogo weight="bold" className="size-4" />
              Get the source
              <ArrowUpRight
                weight="bold"
                className="size-4 text-muted-foreground transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
              />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// Page wrapper

export default function ColophonPageWrapper() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTyping) return;

      if (event.code === "Space") {
        event.preventDefault();
        setMenuOpen((v) => !v);
      } else if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="relative min-h-screen scroll-smooth text-foreground">
      <MouseTorch />

      <TopBar onOpenMenu={() => setMenuOpen(true)} />

      <div className="relative z-10 flex">
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="relative min-w-0 flex-1">
          <div aria-hidden className="h-16" />

          <Hero />
          <Stats />
          <Dataset />
          <Preprocessing />
          <ModelArchitecture />
          <TrainingStory />
          <ChartSection />
          <Backend />
          <GroqSection />
          <Credits />

          <Footer />
        </main>
      </div>
    </div>
  );
}