import ColophonPageWrapper from "@/components/wrappers/ColophonPageWrapper";

export const metadata = {
  title: "Colophon · QuoteLab",
  description:
    "How QuoteLab was built — dataset, preprocessing, LSTM architecture, the T4 crashes, and the FastAPI + Groq pipeline behind the prediction lab.",
};

export default function Page() {
  return <ColophonPageWrapper />;
}