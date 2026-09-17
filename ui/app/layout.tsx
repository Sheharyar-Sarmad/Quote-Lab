import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quote-lab-dun.vercel.app"),

  title: {
    default: "QuoteLab",
    template: "%s · QuoteLab",
  },
  description:
    "Complete any quote, powered by AI. An LSTM predicts the next word, Groq finishes the thought, and the browser reads it aloud.",

  keywords: [
    "QuoteLab",
    "quote completion",
    "next word prediction",
    "LSTM",
    "RNN",
    "TensorFlow",
    "Keras",
    "TFLite",
    "FastAPI",
    "Next.js",
    "Groq",
    "LLM",
    "AI",
    "machine learning",
    "deep learning",
    "NLP",
    "natural language processing",
    "voice AI",
    "Web Speech API",
    "Sheharyar Sarmad",
    "AI zero to hero",
  ],

  authors: [
    {
      name: "Sheharyar Sarmad",
      url: "https://github.com/Sheharyar-Sarmad",
    },
  ],
  creator: "Sheharyar Sarmad",
  publisher: "Sheharyar Sarmad",

  icons: {
    icon: [
      { url: "/meta_logo.png", type: "image/png" },
    ],
    shortcut: "/meta_logo.png",
    apple: "/meta_logo.png",
  },

  openGraph: {
    type: "website",
    siteName: "QuoteLab",
    title: "QuoteLab",
    description: "Complete any quote, powered by AI.",
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

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-transparent text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          themes={["light", "dim", "dark"]}
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}