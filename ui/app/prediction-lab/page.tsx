import PredictionLabWrapper from "@/components/wrappers/PredictionLabWrapper";

export const metadata = {
  title: "Prediction Lab · QuoteLab",
  description:
    "Complete any quote — LSTM next-word prediction, Groq completion, and native voice synthesis.",
};

export default function Page() {
  return <PredictionLabWrapper />;
}