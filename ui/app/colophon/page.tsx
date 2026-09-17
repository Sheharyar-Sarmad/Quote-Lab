import type { Metadata } from "next";
import ColophonPageWrapper from "@/components/wrappers/ColophonPageWrapper";

export const metadata: Metadata = {
  title: "Colophon",
  description:
    "How QuoteLab was built — the dataset, preprocessing, LSTM architecture, the two Colab T4 crashes, and the FastAPI plus Groq pipeline behind the prediction lab.",
  keywords: [
    "QuoteLab colophon",
    "LSTM training",
    "TensorFlow Keras",
    "TFLite",
    "Colab T4",
    "FastAPI backend",
    "Groq pipeline",
    "how it was built",
  ],
  openGraph: {
    title: "Colophon · QuoteLab",
    description:
      "How QuoteLab was built — the honest version. Dataset, model, training pitfalls, and deployment.",
    images: [
      {
        url: "/meta_colophon_banner.png",
        width: 1600,
        height: 500,
        alt: "QuoteLab Colophon — how this book was made",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Colophon · QuoteLab",
    description:
      "How QuoteLab was built — the honest version.",
    images: ["/meta_colophon_banner.png"],
  },
};

export default function Page() {
  return <ColophonPageWrapper />;
}