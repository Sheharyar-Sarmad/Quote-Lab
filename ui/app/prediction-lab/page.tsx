import type { Metadata } from "next";
import PredictionLabWrapper from "@/components/wrappers/PredictionLabWrapper";

export const metadata: Metadata = {
  title: "Prediction Lab",
  description:
    "Complete any quote — LSTM next-word prediction, Groq completion, and native voice synthesis. Type or dictate a partial quote and hear the finished thought.",
  keywords: [
    "Prediction Lab",
    "next word prediction",
    "LSTM inference",
    "Groq completion",
    "voice synthesis",
    "quote completion demo",
    "live AI demo",
  ],
  openGraph: {
    title: "Prediction Lab · QuoteLab",
    description:
      "Predict the next word with an LSTM, complete the sentence with Groq, and hear it read aloud.",
    images: [
      {
        url: "/meta_prediction_banner.png",
        width: 1600,
        height: 500,
        alt: "QuoteLab Prediction Lab — LSTM, Groq, and voice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prediction Lab · QuoteLab",
    description:
      "Predict the next word with an LSTM, complete the sentence with Groq.",
    images: ["/meta_prediction_banner.png"],
  },
};

export default function Page() {
  return <PredictionLabWrapper />;
}