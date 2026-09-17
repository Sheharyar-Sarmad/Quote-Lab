"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Brain,
  ChatCircleDots,
  Code,
  Cpu,
  EnvelopeSimple,
  GithubLogo,
  GitFork,
  Lightning,
  LinkedinLogo,
  List,
  Microphone,
  Notebook,
  Rocket,
  ShieldCheck,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __lenis?: import("lenis").default;
  }
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const GRADIENT_TEXT =
  "bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent";

const CARD_BASE =
  "relative overflow-hidden border border-border/60 bg-background/40 backdrop-blur-xl transition-colors hover:border-primary/40";

const HEADER_HEIGHT_CSS = "4rem";

/* Single source of truth for repo links */
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

function ScrollFade({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.22, 0.78, 1],
    [0.25, 1, 1, 0.25],
  );
  const y = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], [48, 0, 0, -48]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}

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

function CardIconButton() {
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground backdrop-blur-xl transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground">
      <ArrowUpRight weight="bold" className="size-4" />
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
            transition={{
              duration: 0.9,
              delay: delay + index * 0.06,
              ease: EASE,
            }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function SplitTextOnScroll({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={
              inView ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }
            }
            transition={{
              duration: 0.9,
              delay: delay + index * 0.05,
              ease: EASE,
            }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 200, damping: 18, mass: 0.4 });

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
      y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [strength, x, y],
  );

  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function TiltCard({
  children,
  className,
  href,
  label,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 18 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 18 });

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      rotateY.set(px * 12);
      rotateX.set(-py * 12);
    },
    [rotateX, rotateY],
  );

  const reset = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const card = (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "group relative h-full overflow-hidden rounded-2xl",
        CARD_BASE,
        className,
      )}
    >
      {children}
    </motion.div>
  );

  if (!href) {
    return <div className="h-full [perspective:1200px]">{card}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="block h-full [perspective:1200px]"
    >
      {card}
    </a>
  );
}

function Counter({
  to,
  duration = 2,
  suffix = "",
}: {
  to: number;
  duration?: number;
  suffix?: string;
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
      {Math.round(value).toLocaleString("en-US")}
      {suffix}
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
        align === "center"
          ? "items-center text-center"
          : "items-start text-left",
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

function FramedImage({
  src,
  alt,
  size = 200,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/15 dark:ring-white/20",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-primary/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
    </div>
  );
}

const MARQUEE_ITEMS = [
  "TensorFlow",
  "Keras",
  "LSTM",
  "RNN",
  "NumPy",
  "Pandas",
  "Python",
  "FastAPI",
  "Pydantic",
  "Uvicorn",
  "Next.js 15",
  "React 19",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
  "Framer Motion",
  "Phosphor Icons",
  "Groq LPU",
  "Web Speech API",
  "Vercel",
  "Colab T4 GPU",
] as const;

const STATS = [
  { value: 3038, label: "Quotes trained on", suffix: "" },
  { value: 10000, label: "Vocabulary tokens", suffix: "" },
  { value: 8979, label: "Unique words", suffix: "" },
  { value: 50, label: "Max sequence length", suffix: "" },
] as const;

const PIPELINE = [
  {
    step: "01",
    tag: "TensorFlow / Keras",
    title: "LSTM predicts",
    description:
      "A from-scratch LSTM reads your input and predicts the most likely next word — trained on 3,038 famous quotes across 8,979 unique words.",
    href: "https://www.tensorflow.org/api_docs/python/tf/keras/layers/LSTM",
    icon: Brain,
  },
  {
    step: "02",
    tag: "Groq LPU",
    title: "Groq completes",
    description:
      "Groq's ultra-fast LLM picks up where the LSTM leaves off — crafting a full, context-aware quote completion in real time.",
    href: "https://groq.com",
    icon: Lightning,
  },
  {
    step: "03",
    tag: "Web Speech API",
    title: "Voice speaks",
    description:
      "Text-to-speech reads the completed quote aloud using the browser's native speech synthesis — no audio bundles, no third-party TTS bills.",
    href: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API",
    icon: Waveform,
  },
] as const;

const FEATURES = [
  {
    icon: Lightning,
    title: "Sub-100ms inference",
    description:
      "FastAPI + optimized model loading keeps latency minimal so the UX feels instant.",
  },
  {
    icon: ShieldCheck,
    title: "Input validation",
    description:
      "Every payload is schema-checked with Pydantic before it touches the model.",
  },
  {
    icon: Rocket,
    title: "Deploy-ready",
    description:
      "Containerized FastAPI backend + Vercel frontend — one push to ship.",
  },
  {
    icon: ChatCircleDots,
    title: "Context-aware",
    description:
      "Groq keeps completions coherent by picking up where the LSTM stops.",
  },
] as const;

const QUOTES = [
  {
    text: "The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.",
    author: "Albert Einstein",
  },
  {
    text: "It is our choices, Harry, that show what we truly are, far more than our abilities.",
    author: "J.K. Rowling",
  },
  {
    text: "There are only two ways to live your life. One is as though nothing is a miracle. The other is as though everything is a miracle.",
    author: "Albert Einstein",
  },
  {
    text: "Imperfection is beauty, madness is genius and it's better to be absolutely ridiculous than absolutely boring.",
    author: "Marilyn Monroe",
  },
  {
    text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.",
    author: "Albert Einstein",
  },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
] as const;

const MODEL_CONFIG = [
  { label: "Architecture", value: "Embedding → LSTM → Dense" },
  { label: "Embedding dim", value: "16" },
  { label: "LSTM units", value: "128" },
  { label: "Vocab size", value: "10,000" },
  { label: "Sequence len", value: "50 tokens" },
  { label: "Optimizer", value: "Adam" },
  { label: "Loss", value: "Sparse categorical CE" },
  { label: "Dropout", value: "0.2 / 0.3" },
  { label: "Early stopping", value: "patience = 3" },
] as const;

const TECH_STACK = [
  { name: "TensorFlow", href: "https://www.tensorflow.org" },
  { name: "Keras", href: "https://keras.io" },
  { name: "NumPy", href: "https://numpy.org" },
  { name: "Pandas", href: "https://pandas.pydata.org" },
  { name: "FastAPI", href: "https://fastapi.tiangolo.com" },
  { name: "Pydantic", href: "https://docs.pydantic.dev" },
  { name: "Uvicorn", href: "https://www.uvicorn.org" },
  { name: "Next.js 15", href: "https://nextjs.org" },
  { name: "React", href: "https://react.dev" },
  { name: "TypeScript", href: "https://www.typescriptlang.org" },
  { name: "Tailwind CSS", href: "https://tailwindcss.com" },
  { name: "shadcn/ui", href: "https://ui.shadcn.com" },
  { name: "Framer Motion", href: "https://www.framer.com/motion/" },
  { name: "Phosphor Icons", href: "https://phosphoricons.com" },
  { name: "Groq", href: "https://groq.com" },
  { name: "Colab", href: "https://colab.research.google.com" },
] as const;

const CONNECT_CARDS = [
  {
    icon: GithubLogo,
    title: "GitHub Profile",
    handle: "@Sheharyar-Sarmad",
    href: "https://github.com/Sheharyar-Sarmad",
  },
  {
    icon: GitFork,
    title: "Source Repo",
    handle: "Quote-Lab",
    href: SOURCE_REPO,
  },
  {
    icon: LinkedinLogo,
    title: "LinkedIn",
    handle: "Sheharyar Sarmad",
    href: "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/",
  },
  {
    icon: EnvelopeSimple,
    title: "Email",
    handle: "developersheharyar2010@gmail.com",
    href: "https://mail.google.com/mail/u/0/?fs=1&to=developersheharyar2010@gmail.com&tf=cm",
  },
] as const;

const FOOTER_LINKS = {
  product: [
    { label: "Prediction Lab", href: "/prediction-lab", external: false },
    { label: "About", href: "/about", external: false },
    { label: "How it works", href: "#how", external: false },
    { label: "Model", href: "#model", external: false },
  ],
  connect: [
    {
      label: "GitHub",
      href: "https://github.com/Sheharyar-Sarmad",
      external: true,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/",
      external: true,
    },
    {
      label: "Email",
      href: "https://mail.google.com/mail/u/0/?fs=1&to=developersheharyar2010@gmail.com&tf=cm",
      external: true,
    },
    { label: "Source repo", href: SOURCE_REPO, external: true },
  ],
  builtWith: [
    { label: "TensorFlow", href: "https://www.tensorflow.org", external: true },
    { label: "FastAPI", href: "https://fastapi.tiangolo.com", external: true },
    { label: "Next.js", href: "https://nextjs.org", external: true },
    { label: "Groq", href: "https://groq.com", external: true },
  ],
} as const;

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={ref}
      id="top"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT_CSS})` }}
      className="relative isolate flex flex-col items-center justify-center overflow-hidden px-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/20 to-background"
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 -z-10 size-[420px] rounded-full bg-primary/25 blur-[120px]"
        animate={{ y: [0, -28, 0], x: [0, 22, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-6 -z-10 size-[360px] rounded-full bg-primary/20 blur-[110px]"
        animate={{ y: [0, 26, 0], x: [0, -18, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ y: contentY }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-xl"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Powered by TensorFlow · Groq · Voice
        </motion.span>

        <h1 className="mt-7 font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl md:text-7xl lg:text-8xl">
          <SplitTextOnMount text="Complete any quote," delay={0.15} />
          <br />
          <SplitTextOnMount
            text="powered by AI."
            delay={0.35}
            className={GRADIENT_TEXT}
          />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: EASE }}
          className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
        >
          QuoteLab is a full-stack AI experiment that predicts the next word
          using a from-scratch LSTM (TensorFlow / Keras) trained on 3,038 famous
          quotes, then lets Groq finish the thought and voice bring it to life.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Magnetic>
            <Link
              href="/prediction-lab"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
            >
              Open Prediction Lab
              <ArrowRight
                weight="bold"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Magnetic>

          <Magnetic>
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-6 py-3 text-sm font-medium backdrop-blur-xl transition-colors hover:border-primary/40"
            >
              How it works
              <ArrowUpRight
                weight="bold"
                className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </Magnetic>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <section className="relative border-y border-border/60 bg-background/40 py-5 backdrop-blur-xl">
      <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <motion.div
          className="flex shrink-0 items-center gap-10 pr-10"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
        >
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex shrink-0 items-center gap-10 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
            >
              {item}
              <span className="size-1 rounded-full bg-primary/60" />
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="relative px-4 py-20 sm:px-6 md:px-10">
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
              <Counter to={stat.value} suffix={stat.suffix} />
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

function HowItWorks() {
  return (
    <section
      id="how"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From raw text to a{" "}
              <span className={GRADIENT_TEXT}>spoken reply</span>
            </>
          }
          subtitle="Three stages, one request. Each layer is independently documented and open in the repo."
        />

        <motion.div
          variants={revealSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 flex justify-center"
        >
          <div className="group relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-border/60 ring-1 ring-white/15 dark:ring-white/20 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)]">
            <div className="relative aspect-[16/10]">
              <Image
                src="/groq-pipeline.png"
                alt="TensorFlow LSTM → Groq → Web Speech pipeline"
                fill
                sizes="(max-width: 640px) 100vw, 520px"
                className="object-cover opacity-80"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/25 via-background/40 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-xl">
              <Sparkle weight="fill" className="size-3 text-primary" />
              Pipeline
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 md:grid-cols-3"
        >
          {PIPELINE.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                variants={revealSlow}
                className="h-full"
              >
                <TiltCard href={item.href} label={item.title} className="p-6">
                  <CardGlow />
                  <div className="relative flex items-start justify-between">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                      <Icon weight="duotone" className="size-5" />
                    </span>
                    <span className="font-heading text-xs font-medium tracking-[0.2em] text-muted-foreground">
                      {item.step}
                    </span>
                  </div>
                  <div className="relative mt-6">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                      {item.tag}
                    </span>
                    <h3 className="mt-2 font-heading text-lg font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="relative mt-6 flex items-center justify-between">
                    <CardButton label="Read the docs" />
                    <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                      <ArrowUpRight weight="bold" className="size-3.5" />
                    </span>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Why it holds up"
          title={
            <>
              Built for{" "}
              <span className={GRADIENT_TEXT}>real latency budgets</span>
            </>
          }
          subtitle="Not a demo that falls over the moment a real user types something unexpected."
        />
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={reveal}
                className={cn("group rounded-2xl p-6", CARD_BASE)}
              >
                <CardGlow />
                <div className="relative flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                    <Icon weight="duotone" className="size-5" />
                  </span>
                  <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    <Sparkle weight="bold" className="size-3.5" />
                  </span>
                </div>
                <h3 className="relative mt-5 font-heading text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <div className="relative mt-5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="h-px flex-1 bg-border/60" />
                  <span>0{index + 1}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function Quotes() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = QUOTES.length;

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, total]);

  const go = (next: number) => setIndex((next + total) % total);
  const active = QUOTES[index];

  return (
    <section className="relative px-4 py-20 sm:px-6 md:px-10">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="The data"
          title={
            <>
              Trained on the words of{" "}
              <span className={GRADIENT_TEXT}>the greats</span>
            </>
          }
          subtitle="3,038 quotes. 8,979 unique words. One model that learned them all."
        />
        <motion.div
          variants={revealSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className={cn("group mt-14 rounded-3xl p-8 sm:p-12", CARD_BASE)}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url(/quote-pattern.png)",
              backgroundSize: "400px 400px",
              backgroundRepeat: "repeat",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-background/60 to-primary/[0.06]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/25 blur-3xl"
          />

          <div className="relative">
            <div className="flex items-start justify-between">
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                <ChatCircleDots weight="duotone" className="size-5" />
              </span>
              <span className="font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-6 min-h-[160px] sm:min-h-[140px]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={index}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <p className="font-heading text-xl font-medium leading-snug text-balance sm:text-2xl md:text-3xl">
                    &ldquo;{active.text}&rdquo;
                  </p>
                  <footer className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    — {active.author}
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <button
                type="button"
                aria-label="Previous quote"
                onClick={() => go(index - 1)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <ArrowLeft weight="bold" className="size-4" />
              </button>

              <div className="flex flex-1 gap-2">
                {QUOTES.map((quote, i) => (
                  <button
                    key={quote.author}
                    type="button"
                    aria-label={`Go to quote ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-border/60"
                  >
                    {i === index ? (
                      <motion.span
                        key={`progress-${index}-${paused}`}
                        className="block h-full rounded-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: paused ? "0%" : "100%" }}
                        transition={{
                          duration: paused ? 0 : 6,
                          ease: "linear",
                        }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Next quote"
                onClick={() => go(index + 1)}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <ArrowRight weight="bold" className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ModelSection() {
  return (
    <section
      id="model"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Under the hood"
          title={
            <>
              Built from scratch.{" "}
              <span className={GRADIENT_TEXT}>Trained on a notebook.</span>
            </>
          }
          subtitle="Written in TensorFlow / Keras, trained on Colab's free T4 GPU, then wrapped in a FastAPI service."
        />
        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 lg:grid-cols-5"
        >
          <motion.div variants={revealSlow} className="lg:col-span-3">
            <a
              href="https://www.tensorflow.org/tutorials/text/text_generation"
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                "group flex h-full flex-col rounded-3xl p-8",
                CARD_BASE,
              )}
            >
              <Image
                src="/lstm-architecture.png"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="pointer-events-none object-cover opacity-[0.12] dark:opacity-[0.18]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.10] via-background/85 to-primary/[0.06]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/25 blur-3xl"
              />

              <div className="relative flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                    <Cpu weight="duotone" className="size-3.5" />
                    Model config
                  </span>
                  <h3 className="mt-4 font-heading text-2xl font-semibold sm:text-3xl">
                    quote-lstm-v1
                  </h3>
                </div>
                <CardIconButton />
              </div>

              <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                A single-layer LSTM over a 10k-token vocabulary, trained on
                3,038 quotes across 8,979 unique words. Small enough to reason
                about, sharp enough to predict the next word reliably.
              </p>

              <dl className="relative mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {MODEL_CONFIG.map((row) => (
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

              <div className="relative mt-8 flex items-center justify-between">
                <CardButton label="View tutorial" />
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  TensorFlow Docs
                </span>
              </div>
            </a>
          </motion.div>

          <div className="flex flex-col gap-5 lg:col-span-2">
            <motion.div variants={revealSlow} className="flex-1">
              <a
                href="https://github.com/Sheharyar-Sarmad/Quote-Lab/blob/main/model/notebooks/Qoute_Completion.ipynb"
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "group flex h-full flex-col rounded-3xl p-6",
                  CARD_BASE,
                )}
              >
                <CardGlow />
                <div className="relative flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                    <Notebook weight="duotone" className="size-5" />
                  </span>
                  <CardIconButton />
                </div>
                <h3 className="relative mt-5 font-heading text-lg font-semibold">
                  Training notebook
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  Data cleaning, tokenization, sequence generation, padding,
                  model definition, and training — all reproducible.
                </p>
                <div className="relative mt-5 flex items-center justify-between">
                  <CardButton label="Open notebook" />
                </div>
              </a>
            </motion.div>

            <motion.div variants={revealSlow} className="flex-1">
              <a
                href="https://fastapi.tiangolo.com"
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "group flex h-full flex-col rounded-3xl p-6",
                  CARD_BASE,
                )}
              >
                <CardGlow />
                <div className="relative flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                    <Code weight="duotone" className="size-5" />
                  </span>
                  <CardIconButton />
                </div>
                <h3 className="relative mt-5 font-heading text-lg font-semibold">
                  FastAPI server
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  Loads the trained model, exposes a clean JSON API, and
                  integrates Groq for full-quote completion.
                </p>
                <div className="relative mt-5 flex items-center justify-between">
                  <CardButton label="Read docs" />
                </div>
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function VoiceSection() {
  return (
    <section className="relative px-4 py-20 sm:px-6 md:px-10">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Voice loop"
          title={
            <>
              It talks back, <span className={GRADIENT_TEXT}>natively</span>
            </>
          }
          subtitle="No audio bundles, no third-party TTS bills. The browser does the speaking."
        />
        <motion.div
          variants={revealSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 flex flex-col items-center"
        >
          <div className="relative flex items-center justify-center">
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-3xl bg-primary/25 blur-3xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.75, 0.45] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              aria-hidden
              className="absolute inset-4 rounded-3xl border border-primary/20"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <FramedImage
              src="/voice-wave.png"
              alt="Voice waveform illustration"
              size={200}
              className="relative"
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <a
                href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API"
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-6 py-3 text-sm font-medium backdrop-blur-xl transition-colors hover:border-primary/40"
              >
                <Microphone weight="bold" className="size-4 text-primary" />
                Web Speech API docs
                <ArrowUpRight
                  weight="bold"
                  className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </Magnetic>

            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl">
              <Waveform weight="duotone" className="size-3.5 text-primary" />
              SpeechRecognition · SpeechSynthesis
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TechStack() {
  return (
    <section
      id="stack"
      className="relative scroll-mt-24 px-4 py-20 sm:px-6 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Tech stack"
          title={
            <>
              Everything is <span className={GRADIENT_TEXT}>documented</span>
            </>
          }
          subtitle="Sixteen pieces, each linked to the exact docs page used while building it."
        />
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {TECH_STACK.map((tech) => (
            <motion.a
              key={tech.name}
              variants={reveal}
              href={tech.href}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                "group flex items-center justify-between gap-3 rounded-2xl px-5 py-4",
                CARD_BASE,
              )}
            >
              <CardGlow />
              <span className="relative inline-flex items-center gap-2.5">
                <span className="inline-flex size-7 items-center justify-center rounded-lg border border-border/60 bg-primary/10 text-primary">
                  <Code weight="duotone" className="size-3.5" />
                </span>
                <span className="truncate text-sm font-medium">
                  {tech.name}
                </span>
              </span>
              <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground backdrop-blur-xl transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowUpRight weight="bold" className="size-3.5" />
              </span>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Connect() {
  return (
    <section
      id="connect"
      className="relative scroll-mt-24 overflow-hidden px-4 py-24 sm:px-6 md:px-10"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Image
          src="/hero-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-15 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-background/80 to-primary/[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col items-center text-center"
        >
          <motion.span
            variants={reveal}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-xl"
          >
            <Sparkle weight="fill" className="size-3.5 text-primary" />
            Built in public
          </motion.span>

          <h2 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            <SplitTextOnScroll text="Built in public." className="block" />
            <SplitTextOnScroll
              text="Follow the journey."
              className={cn("mt-1 block", GRADIENT_TEXT)}
              delay={0.2}
            />
          </h2>

          <motion.p
            variants={reveal}
            className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            Every model, every API, every pixel of this project is documented
            and shipped in the open. Explore the code, follow the build, or
            reach out.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerSlow}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CONNECT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={revealSlow}
                className="h-full"
              >
                <Magnetic className="h-full">
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn(
                      "group flex h-full flex-col gap-6 rounded-2xl p-6",
                      CARD_BASE,
                    )}
                  >
                    <CardGlow />
                    <div className="relative flex items-start justify-between">
                      <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                        <Icon weight="duotone" className="size-5" />
                      </span>
                      <CardIconButton />
                    </div>
                    <div className="relative mt-auto text-left">
                      <h3 className="font-heading text-base font-semibold">
                        {card.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {card.handle}
                      </p>
                    </div>
                    <div className="relative flex items-center justify-between">
                      <CardButton label="Open" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        External
                      </span>
                    </div>
                  </a>
                </Magnetic>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTA() {
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.08]"
        />

        <div className="relative">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary">
            <Rocket weight="duotone" className="size-6" />
          </span>

          <h2 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            <SplitTextOnScroll text="Start at zero." />{" "}
            <SplitTextOnScroll
              text="Ship at hero."
              className={GRADIENT_TEXT}
              delay={0.2}
            />
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Clone the repo, run the notebook, deploy the app. The whole pipeline
            is yours to break and rebuild.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic>
              <Link
                href="/prediction-lab"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
              >
                Open Prediction Lab
                <ArrowRight
                  weight="bold"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </Magnetic>

            <Magnetic>
              <a
                href={SOURCE_REPO}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-6 py-3 text-sm font-medium backdrop-blur-xl transition-colors hover:border-primary/40"
              >
                <GithubLogo weight="bold" className="size-4" />
                Get the source
                <ArrowUpRight
                  weight="bold"
                  className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </Magnetic>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

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
              <span className="font-heading text-base font-semibold tracking-tight">
                QuoteLab
              </span>
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
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
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

        <div className="flex flex-col gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center md:justify-between">
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

export default function HomePageWrapper() {
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash || hash === "#") return;

      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;

      const lenis = window.__lenis;
      if (lenis) {
        lenis.scrollTo(target, { offset: -80, immediate: true });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "auto" });
      }
    };

    const id = window.setTimeout(scrollToHash, 250);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className="relative min-h-screen scroll-smooth text-foreground"
      style={{ scrollPaddingTop: "5rem" }}
    >
      <MouseTorch />

      <div className="relative z-10 flex">
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="fixed left-4 top-3 z-50 inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/40 hover:text-foreground md:hidden"
          >
            <List weight="bold" className="size-5" />
          </button>

          <header className="fixed inset-x-0 top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 pl-16 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:left-[var(--sidebar-w)] md:pl-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur-xl">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              QuoteLab
            </span>

            <nav className="hidden items-center gap-1 md:flex">
              {(
                [
                  { label: "How it works", href: "#how" },
                  { label: "Model", href: "#model" },
                  { label: "Stack", href: "#stack" },
                  { label: "Connect", href: "#connect" },
                ] as const
              ).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </header>

          <div aria-hidden className="h-16" />

          <Hero />

          <ScrollFade>
            <Marquee />
          </ScrollFade>
          <ScrollFade>
            <Stats />
          </ScrollFade>
          <ScrollFade>
            <HowItWorks />
          </ScrollFade>
          <ScrollFade>
            <Features />
          </ScrollFade>
          <ScrollFade>
            <Quotes />
          </ScrollFade>
          <ScrollFade>
            <ModelSection />
          </ScrollFade>
          <ScrollFade>
            <VoiceSection />
          </ScrollFade>
          <ScrollFade>
            <TechStack />
          </ScrollFade>
          <ScrollFade>
            <Connect />
          </ScrollFade>
          <ScrollFade>
            <FinalCTA />
          </ScrollFade>

          <Footer />
        </main>
      </div>
    </div>
  );
}
