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
  title: "QuoteLab",
  description:
    "Next-word prediction powered by an LSTM trained on famous quotes, with Groq follow-ups and voice interaction.",
  keywords: [
    "LSTM",
    "Next Word Prediction",
    "Quote Completion",
    "Groq",
    "FastAPI",
    "Next.js",
  ],
  authors: [{ name: "Sheharyar Sarmad" }],
  openGraph: {
    title: "QuoteLab",
    description:
      "Next-word prediction powered by an LSTM trained on famous quotes.",
    type: "website",
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