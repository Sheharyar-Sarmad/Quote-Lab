"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Copy,
  FilePdf,
  FileText,
  Flask,
  Lightning,
  List,
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

const FALLBACK_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are QuoteLab's completion engine. Given a partial quote, finish it in the style of the original author. Rules:
- One sentence. Maximum 25 words.
- Match the tone, voice, and cadence of the original fragment.
- No quotation marks around your output. No preamble. No explanation.
- If the fragment is already complete, return it polished.`;

const FOLLOWUP_SYSTEM_PROMPT = `You are QuoteLab's research assistant. The user is exploring quotes and AI completion.
Answer follow-up questions concisely, helpfully, and in a warm, literary tone.
Keep answers under 120 words unless the user explicitly asks for more depth.
If the user asks about the quote's meaning, author, or context — be precise.
Never use markdown headers or bullet lists unless asked. Speak plainly.`;

type GroqModel = {
  id: string;
  owned_by?: string;
  context_window?: number;
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
  "Who said this and when?",
  "Explain the deeper meaning",
  "Give me a similar quote",
  "Rewrite it in a modern voice",
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
   Speaking Waves — animated visualizer
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
          className={cn(
            "w-[3px] rounded-full bg-primary",
            barClassName,
          )}
          initial={{ height: "30%" }}
          animate={{
            height: ["25%", "100%", "45%", "90%", "30%"],
          }}
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

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (lower.includes("whisper")) return false;
  if (lower.includes("tts")) return false;
  if (lower.includes("guard")) return false;
  if (lower.includes("embed")) return false;
  return true;
}

function modelRank(model: GroqModel): number {
  const id = model.id.toLowerCase();
  if (id.includes("llama-3.3-70b")) return 100;
  if (id.includes("llama-3.1-70b")) return 90;
  if (id.includes("llama-3.1-8b")) return 80;
  if (id.includes("llama3-70b")) return 70;
  if (id.includes("llama3-8b")) return 60;
  if (id.includes("mixtral")) return 50;
  if (id.includes("gemma")) return 40;
  return 10;
}

function useGroqModels() {
  const [models, setModels] = useState<GroqModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GROQ_API_KEY) {
      setModels([{ id: FALLBACK_MODEL, owned_by: "Meta" }]);
      setError("Groq API key not configured — using fallback model.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
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

        const chatModels = all
          .filter((m) => m.active !== false && isChatModel(m.id))
          .sort((a, b) => {
            const byRank = modelRank(b) - modelRank(a);
            if (byRank !== 0) return byRank;
            return (b.context_window ?? 0) - (a.context_window ?? 0);
          });

        if (!cancelled) {
          if (chatModels.length === 0) {
            setModels([{ id: FALLBACK_MODEL, owned_by: "Meta" }]);
            setError("No chat models available — using fallback.");
          } else {
            setModels(chatModels);
          }
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string }).name === "AbortError") return;
        setModels([{ id: FALLBACK_MODEL, owned_by: "Meta" }]);
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
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setSupported(true);

    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const t = window.setTimeout(load, 300);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.clearTimeout(t);
    };
  }, []);

  return { voices, supported };
}

function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const [lastText, setLastText] = useState<string>("");
  const lastVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const speak = useCallback(
    (text: string, voice?: SpeechSynthesisVoice | null) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      if (!text.trim()) return;

      window.speechSynthesis.cancel();

      lastVoiceRef.current = voice ?? null;
      setLastText(text);

      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const replay = useCallback(() => {
    if (!lastText) return;
    speak(lastText, lastVoiceRef.current);
  }, [lastText, speak]);

  return { speak, stop, replay, speaking, lastText };
}

function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  const startListening = useCallback(() => {
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

    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening, supported };
}

/* ============================================================
   Helpers
   ============================================================ */

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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
  } = useSpeechToText(handlePromptVoice);

  const {
    isListening: isFollowUpListening,
    startListening: startFollowUpListening,
    stopListening: stopFollowUpListening,
  } = useSpeechToText(handleFollowUpVoice);

  useEffect(() => {
    if (selectedModel || groqModels.length === 0) return;
    const preferred =
      groqModels.find((m) => m.id === FALLBACK_MODEL) ?? groqModels[0];
    if (preferred) setSelectedModel(preferred.id);
  }, [groqModels, selectedModel]);

  useEffect(() => {
    if (selectedVoiceName || voices.length === 0) return;
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && v.default) ??
      voices.find((v) => v.lang.startsWith("en")) ??
      voices[0];
    if (preferred) setSelectedVoiceName(preferred.name);
  }, [voices, selectedVoiceName]);

  const selectedVoice = useMemo(() => {
    if (voices.length === 0) return null;
    return voices.find((v) => v.name === selectedVoiceName) ?? voices[0];
  }, [voices, selectedVoiceName]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
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
    async (userQuestion: string) => {
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
        if (!selectedModel) throw new Error("No model selected.");

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
            model: selectedModel,
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
        return "";
      } finally {
        setIsFollowUpStreaming(false);
        followUpAbortRef.current = null;
      }
    },
    [messages, prompt, completion, selectedModel, speak],
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
    if (!selectedModel) {
      setError("Waiting for Groq models to load. Try again in a moment.");
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

      const finished = await streamCompletion(trimmed, selectedModel).catch(
        (err: Error) => {
          setError(err.message);
          return "";
        },
      );

      if (autoSpeak && voiceSupported && finished) {
        speak(finished, selectedVoice);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsPredicting(false);
    }
  }, [
    prompt,
    topK,
    selectedModel,
    reset,
    triggerBanger,
    streamCompletion,
    autoSpeak,
    voiceSupported,
    speak,
    selectedVoice,
  ]);

  const handleSendFollowUp = useCallback(
    async (question?: string) => {
      const q = (question ?? followUpInput).trim();
      if (!q || isFollowUpStreaming) return;
      setFollowUpInput("");
      stop();
      await streamFollowUp(q);
    },
    [followUpInput, isFollowUpStreaming, streamFollowUp, stop],
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

  /* ─────────────────────────────────────────────────────────
     Downloads
     ───────────────────────────────────────────────────────── */

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
          lines.push(m.role === "user" ? "🧑  You:" : "🤖  QuoteLab:");
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

  /* ─────────────────────────────────────────────────────────
     Render
     ───────────────────────────────────────────────────────── */
  const hasResults = predictions.length > 0 || completion;

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
              {/* Hero */}
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

              {/* Console */}
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

                  {/* Controls */}
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
                    <div className="flex w-full flex-col gap-1.5 sm:min-w-[220px] sm:flex-1">
                      <label
                        htmlFor="model"
                        className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                      >
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
                      <div className="relative">
                        <select
                          id="model"
                          value={selectedModel}
                          onChange={(e) =>
                            setSelectedModel(e.target.value)
                          }
                          disabled={
                            isPredicting ||
                            modelsLoading ||
                            groqModels.length === 0
                          }
                          className="w-full appearance-none rounded-lg border border-border/60 bg-background/60 px-3 py-2 pr-9 text-xs backdrop-blur-xl focus:border-primary/60 focus:outline-none disabled:opacity-50"
                        >
                          {modelsLoading ? (
                            <option>Fetching models…</option>
                          ) : groqModels.length === 0 ? (
                            <option>No models available</option>
                          ) : (
                            groqModels.map((m) => {
                              const ctx = m.context_window
                                ? ` · ${Math.round(
                                    m.context_window / 1000,
                                  )}K ctx`
                                : "";
                              return (
                                <option key={m.id} value={m.id}>
                                  {m.id}
                                  {ctx}
                                </option>
                              );
                            })
                          )}
                        </select>
                        <CaretDown
                          weight="bold"
                          className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="topk"
                        className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        Suggestions
                      </label>
                      <select
                        id="topk"
                        value={topK}
                        onChange={(e) => setTopK(Number(e.target.value))}
                        disabled={isPredicting}
                        className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs backdrop-blur-xl focus:border-primary/60 focus:outline-none"
                      >
                        {[1, 3, 5, 7, 10].map((n) => (
                          <option key={n} value={n}>
                            Top {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAutoSpeak((v) => !v)}
                      aria-pressed={autoSpeak}
                      className={cn(
                        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
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

                  {/* Voice */}
                  <div className="mt-4 flex flex-col gap-1.5">
                    <label
                      htmlFor="voice"
                      className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      <span>Voice</span>
                      <span className="normal-case tracking-normal text-muted-foreground/60">
                        {voiceSupported
                          ? voices.length === 0
                            ? "loading…"
                            : `${voices.length} available`
                          : "not supported"}
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        id="voice"
                        value={selectedVoiceName}
                        onChange={(e) =>
                          setSelectedVoiceName(e.target.value)
                        }
                        disabled={!voiceSupported || voices.length === 0}
                        className="w-full appearance-none rounded-lg border border-border/60 bg-background/60 px-3 py-2 pr-9 text-xs backdrop-blur-xl focus:border-primary/60 focus:outline-none disabled:opacity-50"
                      >
                        {voices.length === 0 ? (
                          <option>Loading voices…</option>
                        ) : (
                          voices.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                              {v.default ? " — default" : ""}
                            </option>
                          ))
                        )}
                      </select>
                      <CaretDown
                        weight="bold"
                        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                      />
                    </div>
                  </div>

                  {modelsError && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
                      <Warning weight="duotone" className="size-3.5" />
                      {modelsError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePredict}
                      disabled={
                        isPredicting || !prompt.trim() || !selectedModel
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

                  {/* Speaking waves bar — appears when TTS is active */}
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

              {/* Results */}
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
                                    formatter={(value: number) => [
                                      `${(value * 100).toFixed(2)}%`,
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
                                      formatter: (v: number) =>
                                        `${(v * 100).toFixed(1)}%`,
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

              {/* Follow-up Chat */}
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

                      {/* Compact voice bar for the follow-up card */}
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

                      <div className="relative mt-5 max-h-[480px] space-y-3 overflow-y-auto pr-1 sm:max-h-[520px]">
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
                                  Ask anything about this quote
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

              {/* Pipeline explainer */}
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
      href: "https://github.com/Sheharyar-Sarmad/ai-zero-to-hero",
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

        <div className="flex flex-col gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center md:justify-between">
  <p className="text-xs align-middle text-center text-muted-foreground">
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