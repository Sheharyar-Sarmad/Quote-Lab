import type { Metadata } from "next";
import HomePageWrapper from "@/components/wrappers/HomePageWrapper";

export const metadata: Metadata = {
  title: "QuoteLab",
  description:
    "Complete any quote, powered by AI. An LSTM predicts the next word, Groq finishes the thought, and the browser reads it aloud.",
  openGraph: {
    title: "QuoteLab",
    description:
      "Complete any quote, powered by AI. An LSTM predicts the next word, Groq finishes the thought, and the browser reads it aloud.",
    images: [
      {
        url: "/meta_home_banner.png",
        width: 1600,
        height: 500,
        alt: "QuoteLab — Complete any quote, powered by AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuoteLab",
    description: "Complete any quote, powered by AI.",
    images: ["/meta_home_banner.png"],
  },
};

export default function Page() {
  return <HomePageWrapper />;
}