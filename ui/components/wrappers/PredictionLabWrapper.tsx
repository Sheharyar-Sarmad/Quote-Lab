"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  Brain,
  CaretDown,
  Check,
  Copy,
  FilePdf,
  FileText,
  Flask,
  Lightning,
  List,
  MagnifyingGlass,
  Microphone,
  PaperPlaneTilt,
  Play,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Stop,
  User,
  Waveform,
  Warning,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

/* ============================================================
   Debug logging
   ============================================================ */

const DEBUG = true;

function log(tag: string, ...args: unknown[]) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log(`%c[${tag}]`, "color:#8b5cf6;font-weight:bold", ...args);
}

function maskKey(key: string | undefined | null): string {
  if (!key) return "<empty>";
  if (key.length <= 12) return `${key.slice(0, 4)}…`;
  return `${key.slice(0, 8)}…${key.slice(-4)} (len=${key.length})`;
}

/* ============================================================
   Groq config
   ============================================================ */

const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS_ENDPOINT = "https://api.groq.com/openai/v1/models";
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "";

log("Boot", "GROQ_API_KEY =", maskKey(GROQ_API_KEY));
log("Boot", "API_BASE =", process.env.NEXT_PUBLIC_API_BASE_URL ?? "<empty>");

const SYSTEM_PROMPT = `You are QuoteLab's completion engine. Given a partial quote, finish it in the style of the original author. Rules:
- One sentence. Maximum 25 words.
- Match the tone, voice, and cadence of the original fragment.
- No quotation marks around your output. No preamble. No explanation.
- If the fragment is already complete, return it polished.`;

const PROJECT_CONTEXT = `## About QuoteLab (deep project knowledge)

You have full knowledge of how QuoteLab is built. Whenever the user asks about the model, its accuracy, training, preprocessing, or deployment, answer precisely using the facts below. Never invent numbers, dates, or names.

### Model architecture
- Embedding layer: 10,000 tokens × 50 dims (~500,000 params)
- LSTM layer: 128 units (~91,648 params)
- Dropout: 0.2 recurrent / 0.3 after
- Dense output: 10,000 units with softmax (~1,290,000 params)
- Total trainable params: ~1,881,648 (~7.18 MB)

### Training
- Dataset: 3,038 famous quotes (Einstein, Rowling, Austen, Monroe, Tolkien…)
- Unique vocabulary: 8,979 words (capped at 10,000)
- Training sequences generated: 85,271
- Max sequence length: 50 tokens (pre-padded)
- Optimizer: Adam
- Loss: sparse categorical cross-entropy
- Batch size: 128
- Max epochs: 30, EarlyStopping patience = 3
- Actual run: 9 epochs before early stop, best weights restored from epoch 6
- Final training accuracy: 12.22%
- Final validation accuracy: 10.58%
- Test set accuracy: 11.44%
- Training loss (final): 5.3739
- Validation loss (final): 6.4747

### Preprocessing pipeline (4 steps)
1. Lowercase every quote
2. Strip punctuation using str.maketrans("", "", string.punctuation)
3. Tokenize with Keras Tokenizer(num_words=10_000, oov_token="<OOV>")
4. pad_sequences with maxlen=50, padding="pre"

### Why LSTM over a SimpleRNN
- A SimpleRNN baseline hit only ~7.2% validation accuracy
- Same architecture otherwise (128 units, 50-dim embedding)
- LSTM's gates (forget/input/output) capture longer-range dependencies → 10.58%
- The final deployment uses the LSTM variant

### Training hurdles (the honest story)
- Colab's free T4 GPU crashed twice during training
- Each crash wasted roughly 1.5 hours of progress
- Total ~3 hours lost
- Fix: smaller batch size, capped vocabulary, shorter max sequence length, EarlyStopping to prevent overtraining

### Inference & deployment
- Model exported to TensorFlow Lite (.tflite) for fast CPU inference
- Original TFLite export used SELECT_TF_OPS (Flex ops) which failed on Windows/TF 2.21 with "FlexTensorListReserve" errors
- Fix: rebuilt the Keras model with unroll=True so the LSTM loop unrolls into pure built-in TFLite ops — no Flex delegate needed
- Backend: FastAPI + Uvicorn, deployed on Render (https://quote-lab.onrender.com)
- Endpoint: POST /predict — returns top-K next-word probabilities
- Frontend: Next.js 15, Tailwind, Framer Motion, Recharts
- LLM layer: Groq — finishes the sentence after the LSTM predicts the next word
- Voice: Web Speech API (SpeechRecognition for input, SpeechSynthesis for output)
- Exports: TXT + PDF research report generated client-side with jsPDF

### Why an LSTM + an LLM
The LSTM is trained on a small corpus and does well at next-word probability. It cannot finish a full sentence coherently. Groq's LLM picks up where the LSTM stops to produce a polished, in-voice completion.`;

const FOLLOWUP_SYSTEM_PROMPT = `You are QuoteLab's research assistant. The user is exploring quotes and AI-powered completion.

${PROJECT_CONTEXT}

## Style
- Warm, literary, precise.
- Keep answers under 120 words unless the user asks for more depth.
- Never use markdown headers or bullet lists unless asked.
- If the user asks about a quote's meaning, author, or context — be accurate.
- If the user asks about the model, training, accuracy, or pipeline — cite the exact numbers and details from the context above.
- Never invent metrics, authors, or dates.`;

type GroqModel = {
  id: string;
  owned_by?: string;
  context_window?: number;
  created?: number;
  active?: boolean;
};

type Prediction = { word: string; probability: number };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

/* ============================================================
   Constants
   ============================================================ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const CARD_BASE =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_40px_-20px_var(--primary)]";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const SAMPLE_PROMPTS = [
  "The world as we have created it",
  "It is our choices that show what we truly are",
  "Two things are infinite",
  "Not all those who wander",
] as const;

const FOLLOWUP_SUGGESTIONS = [
  "How accurate is the model?",
  "Why an LSTM and not a SimpleRNN?",
  "What was the hardest part of training?",
  "Explain the preprocessing pipeline",
] as const;

/* ============================================================
   Animation variants
   ============================================================ */

const reveal: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* ============================================================
   PremiumSelect — custom styled dropdown (portal-rendered)
   ============================================================ */

type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  keywords?: string;
};

function PremiumSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  loading = false,
  emptyLabel = "No options",
  loadingLabel = "Loading…",
  searchable = false,
  searchPlaceholder = "Search…",
  leadingIcon,
  maxPanelHeight = 360,
  ariaLabel,
  triggerClassName,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  leadingIcon?: React.ReactNode;
  maxPanelHeight?: number;
  ariaLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      const hay = `${o.label} ${o.hint ?? ""} ${
        o.keywords ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 240);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - panelWidth - 8,
    );
    setCoords({
      top: rect.bottom + 8,
      left,
      width: panelWidth,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = filtered.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
      if (searchable) {
        window.setTimeout(() => searchRef.current?.focus(), 50);
      }
    } else {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIndex]);

  const commit = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || loading) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commit(opt.value);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const displayLabel = loading
    ? loadingLabel
    : options.length === 0
      ? emptyLabel
      : selected?.label ?? placeholder;

  const panel = open && coords ? (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15, ease: EASE }}
      role="listbox"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 2147483000,
        maxHeight: Math.min(
          maxPanelHeight + (searchable ? 56 : 0) + 16,
          window.innerHeight - coords.top - 16,
        ),
      }}
      className="overflow-hidden rounded-2xl border border-primary/30 bg-[hsl(var(--background))] shadow-2xl shadow-primary/20 ring-1 ring-black/5 backdrop-blur-2xl"
    >
      {searchable && (
        <div className="border-b border-border/60 px-2.5 py-2.5">
          <div className="relative">
            <MagnifyingGlass
              weight="bold"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              onKeyDown={onKeyDown}
              className="w-full rounded-lg border border-border/60 bg-background/70 py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="overflow-y-auto py-1.5"
        style={{ maxHeight: maxPanelHeight }}
      >
        {loading ? (
          <div className="px-4 py-4 text-xs text-muted-foreground">
            {loadingLabel}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-4 text-xs text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          filtered.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                data-idx={idx}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => commit(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs transition-colors",
                  isActive && "bg-primary/15",
                  isSelected && "text-primary",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {opt.label}
                </span>
                {opt.hint && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {opt.hint}
                  </span>
                )}
                {isSelected && (
                  <Check
                    weight="bold"
                    className="size-3.5 shrink-0 text-primary"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  ) : null;

  return (
    <div className="relative w-full" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) updateCoords();
          setOpen((o) => !o);
        }}
        className={cn(
          "group flex w-full items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-xs font-medium backdrop-blur-xl transition-all",
          "border-border/60 bg-background/60 hover:border-primary/40",
          open && "border-primary/60 bg-background/80 ring-2 ring-primary/20",
          disabled && "cursor-not-allowed opacity-50",
          triggerClassName,
        )}
      >
        {leadingIcon && (
          <span className="inline-flex shrink-0 items-center text-primary">
            {leadingIcon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-foreground">
          {displayLabel}
        </span>
        {selected?.hint && !loading && options.length > 0 && (
          <span className="hidden shrink-0 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            {selected.hint}
          </span>
        )}
        <CaretDown
          weight="bold"
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>{panel}</AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/* ============================================================
   Speaking Waves
   ============================================================ */

function SpeakingWaves({
  className,
  barClassName,
  count = 5,
}: {
  className?: string;
  barClassName?: string;
  count?: number;
}) {
  return (
    <div
      className={cn("flex h-4 items-end gap-[3px]", className)}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className={cn("w-[3px] rounded-full bg-primary", barClassName)}
          initial={{ height: "30%" }}
          animate={{ height: ["25%", "100%", "45%", "90%", "30%"] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          }}
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   Mouse torch
   ============================================================ */

function MouseTorch() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
   Banger
   ============================================================ */

function Banger({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="banger-flash"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[100] bg-primary/60 mix-blend-screen"
          />
          <motion.div
            key="banger-ring"
            aria-hidden
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="pointer-events-none fixed left-1/2 top-1/2 z-[99] size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70"
          />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 140 + Math.random() * 80;
            return (
              <motion.span
                key={`banger-p-${i}`}
                aria-hidden
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 0.8, ease: EASE }}
                className="pointer-events-none fixed left-1/2 top-1/2 z-[100] size-1.5 rounded-full bg-primary"
              />
            );
          })}
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Groq models hook
   ============================================================ */

const NON_CHAT_PATTERNS = [
  "whisper",
  "tts",
  "guard",
  "embed",
  "moderation",
] as const;

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return !NON_CHAT_PATTERNS.some((p) => lower.includes(p));
}

function modelPriority(id: string): number {
  const lower = id.toLowerCase();
  if (lower.includes("llama-3.3-70b-versatile")) return 100;
  if (lower.includes("llama-3.3-70b")) return 90;
  return 0;
}

function useGroqModels() {
  const [models, setModels] = useState<GroqModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GROQ_API_KEY) {
      setModels([]);
      setError(
        "Groq API key not configured. Add NEXT_PUBLIC_GROQ_API_KEY to .env.local and restart the dev server.",
      );
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        log("GroqModels", "GET", GROQ_MODELS_ENDPOINT);
        const res = await fetch(GROQ_MODELS_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(
            `Failed to load models (${res.status}): ${body.slice(0, 200)}`,
          );
        }

        const data: { data?: GroqModel[] } = await res.json();
        const all = data.data ?? [];
        log("GroqModels", "returned", all.length, "models");

        const chatModels = all
          .filter((m) => m.active !== false && isChatModel(m.id))
          .sort((a, b) => {
            const pa = modelPriority(a.id);
            const pb = modelPriority(b.id);
            if (pa !== pb) return pb - pa;
            return (b.context_window ?? 0) - (a.context_window ?? 0);
          });

        log(
          "GroqModels",
          "usable:",
          chatModels.map((m) => m.id),
        );

        if (!cancelled) {
          if (chatModels.length === 0) {
            setModels([]);
            setError("No chat-capable models are currently available.");
          } else {
            setModels(chatModels);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string }).name === "AbortError") return;
        setModels([]);
        setError(
          err instanceof Error ? err.message : "Failed to load models.",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { models, loading, error };
}

/* ============================================================
   Voice hooks
   ============================================================ */

function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      log("Voice", "speechSynthesis NOT supported");
      return;
    }
    setSupported(true);
    log("Voice", "speechSynthesis supported — loading voices");

    let cancelled = false;

    const load = () => {
      if (cancelled) return;
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        setVoices((prev) =>
          prev.length === list.length &&
          prev.every((v, i) => v.name === list[i]?.name)
            ? prev
            : list,
        );
      }
    };

    const timers = [0, 100, 250, 500, 1000, 2000, 3500].map((ms) =>
      window.setTimeout(load, ms),
    );

    window.speechSynthesis.addEventListener("voiceschanged", load);
    const onVis = () => load();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { voices, supported };
}

function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const [lastText, setLastText] = useState<string>("");
  const lastVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeTimerRef = useRef<number | null>(null);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    log("Voice", "stop() called");
    clearResumeTimer();
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      log("Voice", "cancel() threw:", err);
    }
    utteranceRef.current = null;
    setSpeaking(false);
  }, [clearResumeTimer]);

  const speak = useCallback(
    (text: string, voice?: SpeechSynthesisVoice | null) => {
      log("Voice", "speak() invoked — text length:", text.length);

      if (typeof window === "undefined" || !window.speechSynthesis) {
        log("Voice", "ABORT — speechSynthesis unsupported.");
        return;
      }
      const clean = text.trim();
      if (!clean) {
        log("Voice", "ABORT — empty text.");
        return;
      }

      clearResumeTimer();
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        log("Voice", "cancel() threw:", err);
      }

      const allVoices = window.speechSynthesis.getVoices();
      log("Voice", "getVoices() at speak time:", allVoices.length);

      let resolvedVoice: SpeechSynthesisVoice | null = voice ?? null;
      if (resolvedVoice) {
        log("Voice", "using explicit voice:", resolvedVoice.name);
      }
      if (!resolvedVoice && lastVoiceRef.current) {
        const stillExists = allVoices.some(
          (v) => v.name === lastVoiceRef.current?.name,
        );
        if (stillExists) {
          resolvedVoice = lastVoiceRef.current;
          log("Voice", "reusing lastVoice:", resolvedVoice.name);
        }
      }
      if (!resolvedVoice && allVoices.length > 0) {
        resolvedVoice =
          allVoices.find((v) => v.default) ??
          allVoices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
          allVoices[0];
        log("Voice", "fallback voice chosen:", resolvedVoice?.name);
      }

      lastVoiceRef.current = resolvedVoice;
      setLastText(clean);

      window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(clean);
        if (resolvedVoice) {
          utterance.voice = resolvedVoice;
          utterance.lang = resolvedVoice.lang || "en-US";
        }
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          log("Voice", "▶ utterance started");
          setSpeaking(true);
          clearResumeTimer();
          resumeTimerRef.current = window.setInterval(() => {
            const syn = window.speechSynthesis;
            if (!syn.speaking) {
              clearResumeTimer();
              return;
            }
            if (syn.paused) {
              log("Voice", "detected paused — calling resume()");
              try {
                syn.resume();
              } catch (err) {
                log("Voice", "resume() threw:", err);
              }
            }
          }, 5000);
        };

        utterance.onend = () => {
          log("Voice", "■ utterance ended");
          clearResumeTimer();
          utteranceRef.current = null;
          setSpeaking(false);
        };

        utterance.onerror = (event) => {
          const reason = (event as SpeechSynthesisErrorEvent).error;
          log("Voice", "✖ utterance error:", reason);
          if (reason !== "interrupted" && reason !== "canceled") {
            // eslint-disable-next-line no-console
            console.warn("[Voice] utterance error:", reason);
          }
          clearResumeTimer();
          utteranceRef.current = null;
          setSpeaking(false);
        };

        utteranceRef.current = utterance;

        try {
          log("Voice", "calling speechSynthesis.speak()");
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          log("Voice", "speak() threw:", err);
          setSpeaking(false);
        }
      }, 60);
    },
    [clearResumeTimer],
  );

  const replay = useCallback(() => {
    if (!lastText) return;
    log("Voice", "replay()");
    speak(lastText, lastVoiceRef.current);
  }, [lastText, speak]);

  useEffect(() => {
    return () => {
      clearResumeTimer();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, [clearResumeTimer]);

  return { speak, stop, replay, speaking, lastText };
}

/* ------------------------------------------------------------
   Speech-to-Text — bulletproof, auto-restarting
   Fixes the Chrome `continuous=false` early-abort + no-speech loop
   ------------------------------------------------------------ */

const STT_MAX_RETRIES = 8;

function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultRef = useRef(onResult);

  // User *intends* to be listening right now (separate from session state)
  const intentRef = useRef(false);
  const retriesRef = useRef(0);
  const restartingRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR));
    log("Voice", "SpeechRecognition supported:", Boolean(SR));

    return () => {
      intentRef.current = false;
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* ignore */
      }
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    log("Voice", "stopListening() — user cancelled");
    intentRef.current = false;
    retriesRef.current = 0;
    restartingRef.current = false;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert(
        "Your browser does not support Speech Recognition. Try Chrome or Edge.",
      );
      return;
    }

    // If already listening, treat as stop (toggle)
    if (intentRef.current) {
      stopListening();
      return;
    }

    setSttError(null);
    intentRef.current = true;
    retriesRef.current = 0;
    restartingRef.current = false;

    // 1. Prime the microphone — this is THE key step for Chrome
    try {
      const tracksAlive =
        streamRef.current &&
        streamRef.current
          .getAudioTracks()
          .some((t) => t.readyState === "live");
      if (!tracksAlive) {
        log("Voice", "requesting mic permission via getUserMedia…");
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        log("Voice", "mic permission granted");
      } else {
        log("Voice", "reusing live mic stream");
      }
    } catch (err) {
      log("Voice", "getUserMedia failed:", err);
      setSttError(
        "Microphone access denied — allow mic access in your browser and try again.",
      );
      intentRef.current = false;
      return;
    }

    // 2. Tear down any prior recognition
    try {
      recognitionRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    await new Promise((r) => window.setTimeout(r, 150));

    // 3. Build the recognition session
    const rec = new SR();
    rec.continuous = true;          // ← keeps session alive during pauses
    rec.interimResults = true;      // ← surfaces text as you speak
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    const scheduleRestart = () => {
      if (restartingRef.current) return;
      if (!intentRef.current) return;

      if (retriesRef.current >= STT_MAX_RETRIES) {
        log("Voice", "max retries reached — giving up");
        setSttError("Didn't catch that — tap the mic and try again.");
        intentRef.current = false;
        setIsListening(false);
        return;
      }

      restartingRef.current = true;
      retriesRef.current++;
      log("Voice", `silent restart #${retriesRef.current}`);
      window.setTimeout(() => {
        restartingRef.current = false;
        if (!intentRef.current) return;
        try {
          rec.start();
        } catch (err) {
          log("Voice", "restart start() threw:", err);
          // If start() fails, recreate the whole recognition object
          try {
            startListening();
          } catch {
            /* ignore */
          }
        }
      }, 120);
    };

    rec.onstart = () => {
      log("Voice", "STT started — speak now");
      setIsListening(true);
      setSttError(null);
    };

    rec.onend = () => {
      log("Voice", "STT ended");
      // With continuous=true, onend only fires on error or user-stop.
      // If the user still intends to listen, restart silently.
      if (intentRef.current) {
        scheduleRestart();
      } else {
        setIsListening(false);
      }
    };

    rec.onerror = (event: any) => {
      const reason = event?.error;
      log("Voice", "STT error:", reason);

      // Recoverable: silent auto-restart
      if (reason === "no-speech" || reason === "aborted") {
        if (intentRef.current) {
          scheduleRestart();
        }
        return;
      }

      // Terminal errors
      if (reason === "not-allowed" || reason === "service-not-allowed") {
        setSttError("Microphone permission denied.");
      } else if (reason === "audio-capture") {
        setSttError("No microphone detected.");
      } else if (reason === "network") {
        setSttError("Network error during recognition.");
      } else {
        setSttError(`Recognition error: ${reason}`);
      }
      intentRef.current = false;
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const combined = (final || interim).trim();
      log("Voice", "STT result:", combined, "isFinal:", Boolean(final));

      if (final.trim()) {
        // Success — reset the retry counter so long dictations keep working
        retriesRef.current = 0;
        onResultRef.current(final.trim());
      } else if (interim.trim()) {
        onResultRef.current(interim.trim());
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      log("Voice", "recognition.start() threw:", err);
      setSttError("Could not start recognition — try again.");
      intentRef.current = false;
      setIsListening(false);
    }
  }, [stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    supported,
    error: sttError,
  };
}

/* ============================================================
   Helpers
   ============================================================ */

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function isModelError(msg: string): boolean {
  return /model|not found|unavailable|decommissioned|does not exist|invalid.*model|400|404/i.test(
    msg,
  );
}

/* ============================================================
   Main component
   ============================================================ */

export default function PredictionLabWrapper() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [topK, setTopK] = useState(5);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [completion, setCompletion] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bangerKey, setBangerKey] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [brokenModels, setBrokenModels] = useState<Set<string>>(
    () => new Set(),
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowUpStreaming, setIsFollowUpStreaming] = useState(false);

  const completionAbortRef = useRef<AbortController | null>(null);
  const followUpAbortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const shakeControls = useAnimationControls();

  const { voices, supported: voiceSupported } = useSpeechVoices();
  const { speak, stop, replay, speaking, lastText } = useSpeak();
  const {
    models: groqModels,
    loading: modelsLoading,
    error: modelsError,
  } = useGroqModels();

  const visibleModels = useMemo(
    () => groqModels.filter((m) => !brokenModels.has(m.id)),
    [groqModels, brokenModels],
  );

  const markModelBroken = useCallback((id: string) => {
    setBrokenModels((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const autoSpeakRef = useRef(autoSpeak);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceSupportedRef = useRef(voiceSupported);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);
  useEffect(() => {
    voiceSupportedRef.current = voiceSupported;
  }, [voiceSupported]);

  const handlePromptVoice = useCallback((text: string) => {
    setPrompt((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const handleFollowUpVoice = useCallback((text: string) => {
    setFollowUpInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const {
    isListening: isPromptListening,
    startListening: startPromptListening,
    stopListening: stopPromptListening,
    supported: sttSupported,
    error: promptSttError,
  } = useSpeechToText(handlePromptVoice);

  const {
    isListening: isFollowUpListening,
    startListening: startFollowUpListening,
    stopListening: stopFollowUpListening,
  } = useSpeechToText(handleFollowUpVoice);

  useEffect(() => {
    if (visibleModels.length === 0) return;
    const stillValid = visibleModels.some((m) => m.id === selectedModel);
    if (!stillValid) {
      setSelectedModel(visibleModels[0].id);
    }
  }, [visibleModels, selectedModel]);

  useEffect(() => {
    if (selectedVoiceName || voices.length === 0) return;
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && v.default) ??
      voices.find((v) => v.lang.startsWith("en")) ??
      voices[0];
    if (preferred) {
      log("Voice", "auto-selected voice:", preferred.name);
      setSelectedVoiceName(preferred.name);
    }
  }, [voices, selectedVoiceName]);

  const selectedVoice = useMemo(() => {
    if (voices.length === 0) return null;
    return voices.find((v) => v.name === selectedVoiceName) ?? voices[0];
  }, [voices, selectedVoiceName]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
    if (selectedVoice) log("Voice", "selectedVoice set:", selectedVoice.name);
  }, [selectedVoice]);

  useEffect(() => {
    return () => {
      completionAbortRef.current?.abort();
      followUpAbortRef.current?.abort();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (predictions.length === 0 && !completion) return;
    const id = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
    return () => window.clearTimeout(id);
  }, [predictions.length, completion]);

  useEffect(() => {
    if (messages.length === 0) return;
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const reset = useCallback(() => {
    completionAbortRef.current?.abort();
    followUpAbortRef.current?.abort();
    completionAbortRef.current = null;
    followUpAbortRef.current = null;
    setPredictions([]);
    setCompletion("");
    setMessages([]);
    setFollowUpInput("");
    setError(null);
    setIsPredicting(false);
    setIsCompleting(false);
    setIsFollowUpStreaming(false);
    stop();
  }, [stop]);

  const triggerBanger = useCallback(() => {
    setBangerKey((k) => k + 1);
    shakeControls.start({
      x: [0, -6, 5, -4, 3, 0],
      y: [0, 4, -5, 3, -2, 0],
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }, [shakeControls]);

  const streamCompletion = useCallback(
    async (text: string, model: string) => {
      setIsCompleting(true);
      setCompletion("");
      completionAbortRef.current?.abort();
      const controller = new AbortController();
      completionAbortRef.current = controller;

      try {
        if (!GROQ_API_KEY) {
          throw new Error(
            "Groq API key is missing. Add NEXT_PUBLIC_GROQ_API_KEY to .env.local and restart the dev server.",
          );
        }
        if (!model) throw new Error("No Groq model selected.");

        const res = await fetch(GROQ_CHAT_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Finish this quote: "${text}"` },
            ],
            temperature: 0.8,
            max_tokens: 60,
            top_p: 0.95,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          let message = `Groq request failed (${res.status})`;
          try {
            const parsed = JSON.parse(detail);
            message = parsed?.error?.message ?? message;
          } catch {
            if (detail) message = detail;
          }
          throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;

            try {
              const json = JSON.parse(payload);
              const delta: string | undefined =
                json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setCompletion(accumulated);
              }
            } catch {
              /* ignore */
            }
          }
        }

        return accumulated;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return "";
        throw err;
      } finally {
        setIsCompleting(false);
        completionAbortRef.current = null;
      }
    },
    [],
  );

  const streamFollowUp = useCallback(
    async (userQuestion: string, modelId: string) => {
      setIsFollowUpStreaming(true);

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: userQuestion,
      };
      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      followUpAbortRef.current?.abort();
      const controller = new AbortController();
      followUpAbortRef.current = controller;

      try {
        if (!GROQ_API_KEY) throw new Error("Groq API key missing.");
        if (!modelId) throw new Error("No model selected.");

        const history: {
          role: "system" | "user" | "assistant";
          content: string;
        }[] = [{ role: "system", content: FOLLOWUP_SYSTEM_PROMPT }];

        if (prompt.trim()) {
          history.push({
            role: "system",
            content: `Context — the original quote fragment was: "${prompt.trim()}"${
              completion ? ` and was completed as: "${completion}"` : ""
            }.`,
          });
        }

        const priorMessages = messages.filter(
          (m) => !m.streaming && m.content.trim().length > 0,
        );
        for (const m of priorMessages) {
          history.push({ role: m.role, content: m.content });
        }
        history.push({ role: "user", content: userQuestion });

        const res = await fetch(GROQ_CHAT_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: history,
            temperature: 0.7,
            max_tokens: 300,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          let message = `Groq request failed (${res.status})`;
          try {
            const parsed = JSON.parse(detail);
            message = parsed?.error?.message ?? message;
          } catch {
            if (detail) message = detail;
          }
          throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;

            try {
              const json = JSON.parse(payload);
              const delta: string | undefined =
                json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated }
                      : m,
                  ),
                );
              }
            } catch {
              /* ignore */
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );

        if (
          autoSpeakRef.current &&
          voiceSupportedRef.current &&
          accumulated.trim().length > 0
        ) {
          speak(accumulated, selectedVoiceRef.current);
        }

        return accumulated;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return "";
        const msg = err instanceof Error ? err.message : "Follow-up failed.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠ ${msg}`, streaming: false }
              : m,
          ),
        );
        throw err;
      } finally {
        setIsFollowUpStreaming(false);
        followUpAbortRef.current = null;
      }
    },
    [messages, prompt, completion, speak],
  );

  const handlePredict = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Type a few words to get started.");
      return;
    }
    if (trimmed.split(/\s+/).length < 2) {
      setError("Give the model at least two words of context.");
      return;
    }
    if (visibleModels.length === 0) {
      setError("No Groq models are available. Please try again later.");
      return;
    }

    reset();
    setIsPredicting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, top_k: topK }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Prediction failed (${res.status})`);
      }

      const data = (await res.json()) as { predictions: Prediction[] };
      setPredictions(data.predictions ?? []);
      setIsPredicting(false);

      triggerBanger();

      const tried = new Set<string>();
      let currentModel = selectedModel || visibleModels[0].id;
      let finalText = "";
      let finalError: string | null = null;

      while (tried.size < visibleModels.length) {
        if (tried.has(currentModel)) break;
        tried.add(currentModel);

        try {
          finalText = await streamCompletion(trimmed, currentModel);
          finalError = null;
          break;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Something went wrong";
          finalError = msg;

          if (!isModelError(msg)) break;

          log("Groq", "model failed:", currentModel, "→", msg);
          markModelBroken(currentModel);

          const next = visibleModels.find((m) => !tried.has(m.id));
          if (!next) break;
          log("Groq", "falling back to:", next.id);
          currentModel = next.id;
          setSelectedModel(next.id);
        }
      }

      if (finalError) {
        setError(finalError);
      } else if (finalText && autoSpeak && voiceSupported) {
        speak(finalText, selectedVoice);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsPredicting(false);
    }
  }, [
    prompt,
    topK,
    selectedModel,
    visibleModels,
    reset,
    triggerBanger,
    streamCompletion,
    markModelBroken,
    autoSpeak,
    voiceSupported,
    speak,
    selectedVoice,
  ]);

  const handleSendFollowUp = useCallback(
    async (question?: string) => {
      const q = (question ?? followUpInput).trim();
      if (!q || isFollowUpStreaming) return;
      if (visibleModels.length === 0) {
        setError("No Groq models available.");
        return;
      }
      setFollowUpInput("");
      stop();

      const tried = new Set<string>();
      let currentModel = selectedModel || visibleModels[0].id;
      let lastError: string | null = null;

      while (tried.size < visibleModels.length) {
        if (tried.has(currentModel)) break;
        tried.add(currentModel);

        try {
          await streamFollowUp(q, currentModel);
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Follow-up failed";
          lastError = msg;
          if (!isModelError(msg)) break;

          markModelBroken(currentModel);
          const next = visibleModels.find((m) => !tried.has(m.id));
          if (!next) break;
          currentModel = next.id;
          setSelectedModel(next.id);
        }
      }

      if (lastError) setError(lastError);
    },
    [
      followUpInput,
      isFollowUpStreaming,
      streamFollowUp,
      stop,
      visibleModels,
      selectedModel,
      markModelBroken,
    ],
  );

  const handleSample = useCallback(
    (sample: string) => {
      setPrompt(sample);
      reset();
    },
    [reset],
  );

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  const buildReportText = useCallback(() => {
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════");
    lines.push("  QuoteLab — Research Report");
    lines.push("═══════════════════════════════════════════");
    lines.push("");
    lines.push(`Generated : ${new Date().toLocaleString()}`);
    lines.push(`Groq model: ${selectedModel || "N/A"}`);
    lines.push(`Top-K     : ${topK}`);
    lines.push("");
    lines.push("── PROMPT ─────────────────────────────────");
    lines.push(prompt || "(empty)");
    lines.push("");
    lines.push("── GROQ COMPLETION ────────────────────────");
    lines.push(completion || "(none)");
    lines.push("");
    lines.push("── LSTM NEXT-WORD PREDICTIONS ─────────────");
    predictions.forEach((p, i) => {
      lines.push(
        `  #${i + 1}  ${p.word.padEnd(15)}  ${(p.probability * 100).toFixed(2)}%`,
      );
    });
    if (predictions.length === 0) lines.push("  (none)");
    lines.push("");
    lines.push("── FOLLOW-UP CONVERSATION ─────────────────");
    if (messages.length === 0) {
      lines.push("  (no follow-up questions)");
    } else {
      messages
        .filter((m) => m.content.trim())
        .forEach((m) => {
          lines.push("");
          lines.push(m.role === "user" ? "  You:" : "  QuoteLab:");
          lines.push(m.content);
        });
    }
    lines.push("");
    lines.push("───────────────────────────────────────────");
    lines.push("Generated by QuoteLab · AI Research Lab");
    return lines.join("\n");
  }, [prompt, completion, predictions, selectedModel, topK, messages]);

  const handleDownloadTxt = useCallback(() => {
    const text = buildReportText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuoteLab_Report_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [buildReportText]);

  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxWidth = pageWidth - margin * 2;

    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("QuoteLab Research Report", pageWidth / 2, 20, {
      align: "center",
    });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 255);
    doc.text("AI-Powered Quote Completion & Analysis", pageWidth / 2, 27, {
      align: "center",
    });

    let y = 46;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 5;
    doc.text(`Groq model: ${selectedModel || "N/A"}`, margin, y);
    y += 5;
    doc.text(`Top-K: ${topK}`, margin, y);
    y += 10;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 27, 75);
    doc.text("Prompt", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 30);
    const splitPrompt = doc.splitTextToSize(prompt || "(empty)", maxWidth);
    doc.text(splitPrompt, margin, y);
    y += splitPrompt.length * 5.5 + 8;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 27, 75);
    doc.text("Groq Completion", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    const splitCompletion = doc.splitTextToSize(
      completion || "(no completion generated)",
      maxWidth,
    );
    doc.text(splitCompletion, margin, y);
    y += splitCompletion.length * 6 + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 27, 75);
    doc.text("LSTM Next-Word Predictions", margin, y);

    autoTable(doc, {
      startY: y + 4,
      head: [["Rank", "Predicted Word", "Probability"]],
      body: predictions.length
        ? predictions.map((p, i) => [
            `#${i + 1}`,
            p.word,
            `${(p.probability * 100).toFixed(2)}%`,
          ])
        : [["—", "(no predictions)", "—"]],
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      bodyStyles: { textColor: 30 },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 14
      : y + 60;

    if (messages.filter((m) => m.content.trim()).length > 0) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 24;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 27, 75);
      doc.text("Follow-Up Conversation", margin, y);
      y += 8;

      for (const m of messages) {
        if (!m.content.trim()) continue;
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 24;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(
          m.role === "user" ? 99 : 168,
          102,
          m.role === "user" ? 241 : 85,
        );
        doc.text(m.role === "user" ? "You" : "QuoteLab", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 40);
        const wrapped = doc.splitTextToSize(m.content, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5.5 + 6;
      }
    }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160);
      doc.text(
        `QuoteLab · Page ${i} of ${pages} · generated by AI Research Lab`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" },
      );
    }

    doc.save(`QuoteLab_Report_${Date.now()}.pdf`);
  }, [prompt, completion, predictions, selectedModel, topK, messages]);

  const hasResults = predictions.length > 0 || completion;

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      visibleModels.map((m) => ({
        value: m.id,
        label: m.id,
        hint: m.context_window
          ? `${Math.round(m.context_window / 1000)}K CTX`
          : undefined,
        keywords: m.owned_by,
      })),
    [visibleModels],
  );

  const topKOptions = useMemo<SelectOption[]>(
    () =>
      [1, 3, 5, 7, 10].map((n) => ({
        value: String(n),
        label: `Top ${n}`,
      })),
    [],
  );

  const voiceOptions = useMemo<SelectOption[]>(
    () =>
      voices.map((v) => ({
        value: v.name,
        label: v.name,
        hint: v.lang,
        keywords: v.default ? "default" : "",
      })),
    [voices],
  );

  return (
    <div className="relative min-h-screen scroll-smooth text-foreground">
      <MouseTorch />
      <Banger trigger={bangerKey} />

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-3 z-[60] inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/40 hover:text-foreground md:hidden"
      >
        <List weight="bold" className="size-5" />
      </button>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 px-4 pl-16 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:left-[var(--sidebar-w)] md:pl-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur-xl"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          QuoteLab · Prediction Lab
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/colophon"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            Colophon
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex">
        <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="relative min-w-0 flex-1">
          <div aria-hidden className="h-16" />

          <motion.div
            animate={shakeControls}
            className="px-3 py-8 sm:px-6 sm:py-12 md:px-10"
          >
            <div className="mx-auto max-w-5xl">
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex flex-col items-center text-center"
              >
                <motion.span
                  variants={reveal}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary backdrop-blur-xl"
                >
                  <Flask weight="duotone" className="size-3.5" />
                  Prediction Lab
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[9px]">
                    <span className="size-1 animate-pulse rounded-full bg-primary" />
                    LIVE
                  </span>
                </motion.span>

                <motion.h1
                  variants={reveal}
                  className="mt-6 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl"
                >
                  Finish the thought.
                </motion.h1>

                <motion.p
                  variants={reveal}
                  className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm md:text-base"
                >
                  Type or dictate a partial quote. The LSTM predicts the next
                  word, Groq completes the sentence, and you can ask
                  follow-ups by voice or text — answers play back aloud.
                </motion.p>
              </motion.div>

              <motion.div
                variants={reveal}
                initial="hidden"
                animate="show"
                className={cn("mt-8 p-4 sm:mt-12 sm:p-6 md:p-8", CARD_BASE)}
              >
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="prompt"
                      className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]"
                    >
                      Partial quote
                    </label>
                    {sttSupported && (
                      <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
                        {isPromptListening ? "listening…" : "voice ready"}
                      </span>
                    )}
                  </div>

                  <div className="relative mt-3">
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handlePredict();
                        }
                      }}
                      rows={3}
                      placeholder="e.g. The world as we have created it"
                      className="w-full resize-none rounded-2xl border border-border/60 bg-background/60 px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-xl transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-base"
                      disabled={isPredicting}
                    />

                    {sttSupported && (
                      <button
                        type="button"
                        onClick={
                          isPromptListening
                            ? stopPromptListening
                            : startPromptListening
                        }
                        disabled={isPredicting}
                        aria-label={
                          isPromptListening
                            ? "Stop dictation"
                            : "Start dictation"
                        }
                        className={cn(
                          "absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border transition-all",
                          isPromptListening
                            ? "animate-pulse border-primary bg-primary/20 text-primary shadow-[0_0_20px_-2px_var(--primary)]"
                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          isPredicting && "cursor-not-allowed opacity-50",
                        )}
                        title={
                          isPromptListening
                            ? "Stop dictation"
                            : "Dictate your quote"
                        }
                      >
                        <Microphone weight="bold" className="size-4" />
                      </button>
                    )}

                    <div className="pointer-events-none absolute bottom-3 right-3 hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                      ⌘ + Enter
                    </div>
                  </div>

                  {promptSttError && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
                      <Warning weight="duotone" className="size-3.5" />
                      {promptSttError}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {SAMPLE_PROMPTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSample(s)}
                        disabled={isPredicting}
                        className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50 sm:px-3 sm:text-[11px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Lightning
                            weight="fill"
                            className="size-3 text-primary"
                          />
                          Groq model
                        </span>
                        {modelsLoading && (
                          <span className="normal-case tracking-normal text-muted-foreground/60">
                            loading…
                          </span>
                        )}
                      </label>
                      <PremiumSelect
                        id="model"
                        value={selectedModel}
                        onChange={setSelectedModel}
                        options={modelOptions}
                        loading={modelsLoading}
                        loadingLabel="Fetching models…"
                        emptyLabel="No models available"
                        disabled={
                          isPredicting ||
                          modelsLoading ||
                          visibleModels.length === 0
                        }
                        searchable
                        searchPlaceholder="Search models…"
                        leadingIcon={
                          <Lightning weight="fill" className="size-3.5" />
                        }
                        maxPanelHeight={380}
                        ariaLabel="Select Groq model"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Suggestions
                      </label>
                      <PremiumSelect
                        id="topk"
                        value={String(topK)}
                        onChange={(v) => setTopK(Number(v))}
                        options={topKOptions}
                        disabled={isPredicting}
                        maxPanelHeight={300}
                        ariaLabel="Select top-K suggestions"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setAutoSpeak((v) => !v)}
                      aria-pressed={autoSpeak}
                      className={cn(
                        "inline-flex h-[46px] items-center justify-center gap-2 rounded-xl border px-4 text-xs font-medium transition-colors",
                        autoSpeak
                          ? "border-primary/40 bg-primary/10 text-foreground shadow-[0_0_16px_-6px_var(--primary)]"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {autoSpeak ? (
                        <SpeakerHigh weight="fill" className="size-3.5" />
                      ) : (
                        <SpeakerSlash weight="fill" className="size-3.5" />
                      )}
                      Auto-speak
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5">
                    <label className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Voice</span>
                      <span className="normal-case tracking-normal text-muted-foreground/60">
                        {voiceSupported
                          ? voices.length === 0
                            ? "loading…"
                            : `${voices.length} available`
                          : "not supported"}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <PremiumSelect
                          id="voice"
                          value={selectedVoiceName}
                          onChange={setSelectedVoiceName}
                          options={voiceOptions}
                          loading={voices.length === 0}
                          loadingLabel="Loading voices…"
                          emptyLabel={
                            voiceSupported
                              ? "No voices available"
                              : "Not supported"
                          }
                          disabled={!voiceSupported || voices.length === 0}
                          searchable
                          searchPlaceholder="Search voices by name or language…"
                          maxPanelHeight={400}
                          ariaLabel="Select speech synthesis voice"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          log(
                            "Voice",
                            "Test button clicked — voiceSupported:",
                            voiceSupported,
                            "selectedVoice:",
                            selectedVoice?.name,
                          );
                          if (!voiceSupported) return;
                          speak(
                            "This is the selected voice. It is now working.",
                            selectedVoice,
                          );
                        }}
                        disabled={!voiceSupported || voices.length === 0}
                        className="inline-flex h-[46px] shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3.5 text-xs font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        title="Hear a sample in this voice"
                      >
                        <SpeakerHigh weight="fill" className="size-3.5" />
                        Test
                      </button>
                    </div>
                  </div>

                  {modelsError && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
                      <Warning weight="duotone" className="size-3.5" />
                      {modelsError}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePredict}
                      disabled={
                        isPredicting ||
                        !prompt.trim() ||
                        visibleModels.length === 0
                      }
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-5 py-3 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:text-sm"
                    >
                      {isPredicting ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                          Predicting…
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt weight="bold" className="size-4" />
                          Predict next word
                          <ArrowRight
                            weight="bold"
                            className="hidden size-4 transition-transform group-hover:translate-x-0.5 sm:block"
                          />
                        </>
                      )}
                    </button>

                    {speaking && (
                      <button
                        type="button"
                        onClick={stop}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-3 text-xs font-medium text-primary backdrop-blur-xl transition-colors hover:bg-primary/20 sm:px-5 sm:text-sm"
                      >
                        <Stop weight="fill" className="size-4" />
                        Stop voice
                      </button>
                    )}

                    {!speaking && lastText && (
                      <button
                        type="button"
                        onClick={replay}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-3 text-xs font-medium backdrop-blur-xl transition-colors hover:border-primary/40 sm:px-5 sm:text-sm"
                      >
                        <Play weight="fill" className="size-4" />
                        Replay voice
                      </button>
                    )}

                    {hasResults && (
                      <>
                        <button
                          type="button"
                          onClick={handleDownloadTxt}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-3 text-xs font-medium backdrop-blur-xl transition-colors hover:border-primary/40 sm:px-5 sm:text-sm"
                        >
                          <FileText weight="bold" className="size-4" />
                          <span className="hidden sm:inline">Export </span>TXT
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-3 text-xs font-medium backdrop-blur-xl transition-colors hover:border-primary/40 sm:px-5 sm:text-sm"
                        >
                          <FilePdf weight="bold" className="size-4" />
                          <span className="hidden sm:inline">Export </span>PDF
                        </button>
                        <button
                          type="button"
                          onClick={reset}
                          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          Clear all
                        </button>
                      </>
                    )}
                  </div>

                  <AnimatePresence>
                    {speaking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          marginTop: 16,
                        }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 backdrop-blur-xl">
                          <span className="inline-flex size-8 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                            <SpeakerHigh
                              weight="fill"
                              className="size-4"
                            />
                          </span>
                          <SpeakingWaves count={5} />
                          <span className="text-xs font-medium text-foreground">
                            Speaking…
                          </span>
                          <button
                            type="button"
                            onClick={stop}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-primary/40"
                          >
                            <Stop weight="fill" className="size-3" />
                            Stop
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive sm:text-sm"
                      >
                        <Warning
                          weight="duotone"
                          className="mt-0.5 size-4 shrink-0"
                        />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <div ref={resultsRef} className="scroll-mt-24">
                <AnimatePresence>
                  {hasResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 32, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 24, scale: 0.98 }}
                      transition={{ duration: 0.65, ease: EASE }}
                      className="mt-8 grid gap-4 sm:gap-5 lg:grid-cols-5"
                    >
                      <div className="lg:col-span-2">
                        <div className={cn("h-full p-4 sm:p-6", CARD_BASE)}>
                          <div className="relative flex items-start justify-between">
                            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary shadow-[0_0_20px_-4px_var(--primary)] sm:size-11">
                              <Brain
                                weight="duotone"
                                className="size-5"
                              />
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              LSTM · top {predictions.length}
                            </span>
                          </div>

                          <h3 className="relative mt-4 font-heading text-base font-semibold sm:mt-5 sm:text-lg">
                            Next-word candidates
                          </h3>

                          <div className="relative mt-4 h-[240px] w-full sm:h-[280px]">
                            {predictions.length > 0 ? (
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <BarChart
                                  data={predictions}
                                  layout="vertical"
                                  margin={{
                                    top: 4,
                                    right: 48,
                                    left: 4,
                                    bottom: 4,
                                  }}
                                  barCategoryGap={10}
                                >
                                  <defs>
                                    <linearGradient
                                      id="barGradientPrimary"
                                      x1="0"
                                      y1="0"
                                      x2="1"
                                      y2="0"
                                    >
                                      <stop
                                        offset="0%"
                                        stopColor="#8b5cf6"
                                        stopOpacity={1}
                                      />
                                      <stop
                                        offset="100%"
                                        stopColor="#ec4899"
                                        stopOpacity={1}
                                      />
                                    </linearGradient>
                                    <linearGradient
                                      id="barGradientMuted"
                                      x1="0"
                                      y1="0"
                                      x2="1"
                                      y2="0"
                                    >
                                      <stop
                                        offset="0%"
                                        stopColor="#6366f1"
                                        stopOpacity={0.55}
                                      />
                                      <stop
                                        offset="100%"
                                        stopColor="#a855f7"
                                        stopOpacity={0.55}
                                      />
                                    </linearGradient>
                                  </defs>

                                  <XAxis
                                    type="number"
                                    hide
                                    domain={[0, "dataMax"]}
                                  />

                                  <YAxis
                                    dataKey="word"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                      fontSize: 12,
                                      fill: "currentColor",
                                      fontWeight: 500,
                                    }}
                                    width={56}
                                  />

                                  <Tooltip
                                    cursor={{
                                      fill: "rgba(139,92,246,0.08)",
                                    }}
                                    formatter={(value) => [
                                      `${(Number(value ?? 0) * 100).toFixed(2)}%`,
                                      "Probability",
                                    ]}
                                    contentStyle={{
                                      backgroundColor:
                                        "rgba(15,15,20,0.95)",
                                      border:
                                        "1px solid rgba(139,92,246,0.4)",
                                      borderRadius: "10px",
                                      color: "#fff",
                                      fontSize: "12px",
                                      padding: "8px 12px",
                                      boxShadow:
                                        "0 8px 32px rgba(139,92,246,0.25)",
                                    }}
                                    labelStyle={{
                                      color: "#fff",
                                      fontWeight: 600,
                                      marginBottom: 4,
                                    }}
                                  />

                                  <Bar
                                    dataKey="probability"
                                    radius={[0, 6, 6, 0]}
                                    barSize={18}
                                    animationDuration={900}
                                    animationEasing="ease-out"
                                    label={{
                                      position: "right",
                                      formatter: (v) =>
                                        `${(Number(v) * 100).toFixed(1)}%`,
                                      fill: "currentColor",
                                      fontSize: 11,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {predictions.map((_, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={
                                          index === 0
                                            ? "url(#barGradientPrimary)"
                                            : "url(#barGradientMuted)"
                                        }
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                No predictions yet.
                              </div>
                            )}
                          </div>

                          <ul className="relative mt-4 space-y-1.5">
                            {predictions.slice(0, 3).map((p, i) => (
                              <motion.li
                                key={`${p.word}-${i}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: 0.3 + i * 0.08,
                                  duration: 0.35,
                                }}
                                className={cn(
                                  "flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs",
                                  i === 0
                                    ? "border-primary/40 bg-primary/10"
                                    : "border-border/40 bg-muted/10",
                                )}
                              >
                                <span className="font-heading font-medium">
                                  <span className="mr-2 font-mono text-[10px] text-muted-foreground">
                                    #{i + 1}
                                  </span>
                                  {p.word}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {(p.probability * 100).toFixed(1)}%
                                </span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <div className={cn("h-full p-4 sm:p-6", CARD_BASE)}>
                          <div className="relative flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex size-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary transition-shadow sm:size-11",
                                isCompleting &&
                                  "shadow-[0_0_24px_-2px_var(--primary)]",
                              )}
                            >
                              <Lightning
                                weight="duotone"
                                className="size-5"
                              />
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isCompleting && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                                  Streaming
                                </span>
                              )}
                              {completion && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(completion)}
                                  aria-label="Copy quote"
                                  className="inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                >
                                  <Copy
                                    weight="bold"
                                    className="size-3.5"
                                  />
                                </button>
                              )}
                              {completion && voiceSupported && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    speaking
                                      ? stop()
                                      : speak(completion, selectedVoice)
                                  }
                                  aria-label={speaking ? "Stop" : "Speak"}
                                  className={cn(
                                    "inline-flex size-8 items-center justify-center rounded-full border transition-colors",
                                    speaking
                                      ? "border-primary/40 bg-primary/15 text-primary"
                                      : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                  )}
                                >
                                  {speaking ? (
                                    <Stop
                                      weight="bold"
                                      className="size-3.5"
                                    />
                                  ) : (
                                    <Play
                                      weight="fill"
                                      className="size-3.5"
                                    />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <h3 className="relative mt-4 font-heading text-base font-semibold sm:mt-5 sm:text-lg">
                            Groq completion
                          </h3>

                          <div className="relative mt-4 min-h-[120px] sm:min-h-[140px]">
                            <p className="font-heading text-lg font-medium leading-snug text-balance sm:text-xl md:text-2xl">
                              {completion ? (
                                <>
                                  &ldquo;{completion}
                                  {isCompleting && (
                                    <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" />
                                  )}
                                  &rdquo;
                                </>
                              ) : (
                                <span className="text-muted-foreground">
                                  {isCompleting
                                    ? "Waiting for first token…"
                                    : "—"}
                                </span>
                              )}
                            </p>
                          </div>

                          {completion && (
                            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                              <span className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                {selectedModel} · Groq LPU
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                {completion.split(/\s+/).length} words
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {hasResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="mt-6"
                  >
                    <div className={cn("p-4 sm:p-6 md:p-8", CARD_BASE)}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary shadow-[0_0_20px_-4px_var(--primary)] sm:size-11">
                            <Sparkle
                              weight="duotone"
                              className="size-5"
                            />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-heading text-base font-semibold sm:text-lg">
                              Ask follow-ups
                            </h3>
                            <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                              {selectedModel || "—"}
                              {autoSpeak && voiceSupported && (
                                <span className="ml-2 inline-flex items-center gap-1 text-primary">
                                  <SpeakerHigh
                                    weight="fill"
                                    className="size-3"
                                  />
                                  voice on
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {messages.length > 0 && (
                          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {messages.filter((m) => m.role === "user").length}{" "}
                            q
                          </span>
                        )}
                      </div>

                      <AnimatePresence>
                        {speaking && (
                          <motion.div
                            initial={{
                              opacity: 0,
                              height: 0,
                              marginTop: 0,
                            }}
                            animate={{
                              opacity: 1,
                              height: "auto",
                              marginTop: 12,
                            }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.25, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 py-2 backdrop-blur-xl sm:px-4 sm:py-2.5">
                              <span className="inline-flex size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                                <SpeakerHigh
                                  weight="fill"
                                  className="size-3.5"
                                />
                              </span>
                              <SpeakingWaves count={4} />
                              <span className="text-[11px] font-medium text-foreground">
                                Speaking answer…
                              </span>
                              <button
                                type="button"
                                onClick={stop}
                                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-medium transition-colors hover:border-primary/40"
                              >
                                <Stop weight="fill" className="size-3" />
                                Stop
                              </button>
                            </div>
                          </motion.div>
                        )}
                        {!speaking && lastText && messages.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 flex items-center gap-2"
                          >
                            <button
                              type="button"
                              onClick={replay}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                            >
                              <Play weight="fill" className="size-3" />
                              Replay last voice
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative mt-5 space-y-3 pr-1">
                        {messages.length === 0 && (
                          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background/40 to-transparent p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                                <Sparkle
                                  weight="fill"
                                  className="size-4"
                                />
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground sm:text-sm">
                                  Ask anything about this quote or the model
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                  Type below, or tap the mic to speak. The
                                  answer plays back in your selected voice.
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {FOLLOWUP_SUGGESTIONS.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleSendFollowUp(s)}
                                  disabled={isFollowUpStreaming}
                                  className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50 sm:px-3 sm:text-[11px]"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <AnimatePresence initial={false}>
                          {messages.map((m) => (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className={cn(
                                "flex gap-2 sm:gap-3",
                                m.role === "user"
                                  ? "flex-row-reverse"
                                  : "flex-row",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border sm:size-8",
                                  m.role === "user"
                                    ? "border-primary/40 bg-primary/15 text-primary"
                                    : "border-border/60 bg-background/60 text-muted-foreground",
                                )}
                              >
                                {m.role === "user" ? (
                                  <User
                                    weight="bold"
                                    className="size-3.5"
                                  />
                                ) : (
                                  <Sparkle
                                    weight="fill"
                                    className="size-3.5"
                                  />
                                )}
                              </span>
                              <div
                                className={cn(
                                  "max-w-[88%] rounded-2xl border px-3 py-2.5 text-xs leading-relaxed sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-sm",
                                  m.role === "user"
                                    ? "border-primary/40 bg-primary/10 text-foreground"
                                    : "border-border/60 bg-background/60 text-foreground",
                                )}
                              >
                                {m.content ? (
                                  <p className="whitespace-pre-wrap">
                                    {m.content}
                                    {m.streaming && (
                                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
                                    )}
                                  </p>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                                    <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                                    <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                                  </span>
                                )}
                                {m.role === "assistant" && m.content && (
                                  <div className="mt-2 flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(m.content)
                                      }
                                      className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                    >
                                      <Copy
                                        weight="bold"
                                        className="size-3"
                                      />
                                      Copy
                                    </button>
                                    {voiceSupported && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          speak(
                                            m.content,
                                            selectedVoice,
                                          )
                                        }
                                        className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                      >
                                        <Play
                                          weight="fill"
                                          className="size-3"
                                        />
                                        Speak
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <div ref={chatEndRef} />
                      </div>

                      <div className="relative mt-4 sm:mt-5">
                        <div className="relative">
                          <textarea
                            value={followUpInput}
                            onChange={(e) =>
                              setFollowUpInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                !e.shiftKey
                              ) {
                                e.preventDefault();
                                handleSendFollowUp();
                              }
                            }}
                            rows={2}
                            placeholder="Ask a follow-up by text or tap the mic…"
                            className="w-full resize-none rounded-2xl border border-border/60 bg-background/60 px-3 py-3 pr-24 text-xs text-foreground placeholder:text-muted-foreground/60 backdrop-blur-xl transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:px-4 sm:text-sm"
                            disabled={isFollowUpStreaming}
                          />

                          {sttSupported && (
                            <button
                              type="button"
                              onClick={
                                isFollowUpListening
                                  ? stopFollowUpListening
                                  : startFollowUpListening
                              }
                              disabled={isFollowUpStreaming}
                              aria-label={
                                isFollowUpListening
                                  ? "Stop dictation"
                                  : "Dictate follow-up"
                              }
                              className={cn(
                                "absolute right-12 top-3 inline-flex size-8 items-center justify-center rounded-full border transition-all sm:right-14 sm:size-9",
                                isFollowUpListening
                                  ? "animate-pulse border-primary bg-primary/20 text-primary shadow-[0_0_20px_-2px_var(--primary)]"
                                  : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                isFollowUpStreaming &&
                                  "cursor-not-allowed opacity-50",
                              )}
                              title={
                                isFollowUpListening
                                  ? "Stop dictation"
                                  : "Dictate follow-up"
                              }
                            >
                              <Microphone
                                weight="bold"
                                className="size-3.5 sm:size-4"
                              />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendFollowUp()}
                            disabled={
                              !followUpInput.trim() ||
                              isFollowUpStreaming
                            }
                            aria-label="Send follow-up"
                            className={cn(
                              "absolute right-2 top-3 inline-flex size-8 items-center justify-center rounded-full border transition-all sm:right-3 sm:size-9",
                              followUpInput.trim() &&
                                !isFollowUpStreaming
                                ? "border-primary/40 bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90"
                                : "cursor-not-allowed border-border/60 bg-background/60 text-muted-foreground/60",
                            )}
                          >
                            {isFollowUpStreaming ? (
                              <span className="size-4 animate-spin rounded-full border-2 border-current/40 border-t-current" />
                            ) : (
                              <PaperPlaneTilt
                                weight="bold"
                                className="size-3.5 sm:size-4"
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      {messages.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                          <span className="mr-auto text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Export full report
                          </span>
                          <button
                            type="button"
                            onClick={handleDownloadTxt}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium backdrop-blur-xl transition-colors hover:border-primary/40 sm:px-4 sm:py-2 sm:text-xs"
                          >
                            <FileText weight="bold" className="size-3.5" />
                            TXT
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-medium backdrop-blur-xl transition-colors hover:border-primary/40 sm:px-4 sm:py-2 sm:text-xs"
                          >
                            <FilePdf weight="bold" className="size-3.5" />
                            PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 md:grid-cols-3"
              >
                {[
                  {
                    icon: Brain,
                    tag: "TensorFlow / Keras",
                    title: "LSTM predicts",
                    body: "Your partial quote is tokenized, padded to 50, and run through the TFLite interpreter.",
                  },
                  {
                    icon: Lightning,
                    tag: "Groq LPU",
                    title: "Groq completes",
                    body: "The fragment is streamed to whichever Groq model you picked above for a full, in-voice sentence.",
                  },
                  {
                    icon: Waveform,
                    tag: "Web Speech API",
                    title: "Voice reads it",
                    body: "speechSynthesis speaks the finished quote and every follow-up in whichever voice you selected.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      variants={reveal}
                      className={cn("p-4 sm:p-6", CARD_BASE)}
                    >
                      <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary sm:size-11">
                        <Icon weight="duotone" className="size-5" />
                      </span>
                      <span className="mt-4 block text-[10px] font-medium uppercase tracking-[0.18em] text-primary sm:mt-5 sm:text-[11px]">
                        {item.tag}
                      </span>
                      <h3 className="mt-2 font-heading text-sm font-semibold sm:text-base">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {item.body}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>

          <Footer />
        </main>
      </div>
    </div>
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
    {
      label: "Source repo",
      href: "https://github.com/Sheharyar-Sarmad/Quote-Lab",
      external: true,
    },
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
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
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