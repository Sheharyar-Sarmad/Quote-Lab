"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  House,
  Sparkle,
  Flask,
  List,
  X,
  Sun,
  Moon,
  MoonStars,
  GithubLogo,
  LinkedinLogo,
  EnvelopeSimple,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

//  Constants

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: House },
  { label: "Colophon", href: "/colophon", icon: Sparkle },
  { label: "Prediction Lab", href: "/prediction-lab", icon: Flask },
] as const;

const SOCIALS = [
  {
    label: "GitHub",
    href: "https://github.com/Sheharyar-Sarmad",
    icon: GithubLogo,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/",
    icon: LinkedinLogo,
  },
  {
    label: "Email",
    href: "https://mail.google.com/mail/u/0/?fs=1&to=developersheharyar2010@gmail.com&tf=cm",
    icon: EnvelopeSimple,
  },
] as const;

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dim", label: "Dim", icon: MoonStars },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const DESKTOP_WIDTH = 256;
const DESKTOP_COLLAPSED_WIDTH = 76;
const SIDEBAR_STORAGE_KEY = "ql-sidebar-desktop";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

//  Animation variants

const EASE = [0.22, 1, 0.36, 1] as const;

const sidebarContainer: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 1.4,
      ease: EASE,
      delayChildren: 0.4,
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

const footerVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: EASE, delay: 0.2 },
  },
};

//  Sidebar root

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  useIsomorphicLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) setDesktopOpen(saved === "true");
    } catch {}
    setPrefsReady(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!prefsReady) return;
    const width = desktopOpen ? DESKTOP_WIDTH : DESKTOP_COLLAPSED_WIDTH;
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
  }, [desktopOpen, prefsReady]);

  useEffect(() => {
    if (!prefsReady) return;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(desktopOpen));
    } catch {}
  }, [desktopOpen, prefsReady]);

  return (
    <>
      {/* Desktop sidebar — STICKY so it stays pinned */}
      <motion.aside
        initial={false}
        animate={{
          width: desktopOpen ? DESKTOP_WIDTH : DESKTOP_COLLAPSED_WIDTH,
        }}
        transition={{ duration: 0.35, ease: EASE }}
        className="sticky top-0 z-20 hidden h-screen shrink-0 self-start overflow-hidden md:block"
      >
        <motion.div
          variants={sidebarContainer}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          className="flex h-full flex-col border-r border-border/60 bg-background/80 backdrop-blur-2xl"
          style={{
            width: desktopOpen ? DESKTOP_WIDTH : DESKTOP_COLLAPSED_WIDTH,
          }}
        >
          <SidebarContent
            pathname={pathname}
            animationMode="page"
            collapsed={!desktopOpen}
            onToggleCollapse={() => setDesktopOpen((v) => !v)}
          />
        </motion.div>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="drawer-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border/60 bg-background/95 backdrop-blur-2xl md:hidden"
            >
              <motion.div
                variants={sidebarContainer}
                initial="hidden"
                animate="visible"
                className="flex h-full flex-col"
              >
                <SidebarContent
                  pathname={pathname}
                  onLinkClick={onClose}
                  animationMode="drawer"
                  collapsed={false}
                />
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Sidebar content

type SidebarContentProps = {
  pathname: string;
  onLinkClick?: () => void;
  animationMode: "page" | "drawer";
  collapsed: boolean;
  onToggleCollapse?: () => void;
};

function SidebarContent({
  pathname,
  onLinkClick,
  animationMode,
  collapsed,
  onToggleCollapse,
}: SidebarContentProps) {
  const isDrawer = animationMode === "drawer";

  return (
    <>
      <motion.div
        variants={itemVariants}
        className={cn(
          "flex h-16 items-center border-b border-border/60",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link
          href="/"
          onClick={onLinkClick}
          className="flex items-center gap-2.5 font-heading text-lg font-semibold"
        >
          <motion.span
            whileHover={{ rotate: -6, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/5 ring-1 ring-border/60"
          >
            <Image
              src="/meta_logo.png"
              alt="QuoteLab"
              width={28}
              height={28}
              priority
              className="h-7 w-7 object-contain dark:invert-0 invert"
            />
          </motion.span>
          {!collapsed && (
            <span className="font-heading tracking-tight">QuoteLab</span>
          )}
        </Link>

        {!isDrawer && onToggleCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {collapsed ? (
                  <CaretRight weight="bold" className="h-3.5 w-3.5" />
                ) : (
                  <CaretLeft weight="bold" className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "bottom"}>
              {collapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        )}

        {isDrawer && onLinkClick && (
          <button
            onClick={onLinkClick}
            aria-label="Close sidebar"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X weight="bold" className="h-3.5 w-3.5" />
          </button>
        )}
      </motion.div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const linkContent = (
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-primary/10 text-foreground glow-ring"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`sidebar-active-${animationMode}`}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary"
                />
              )}
              <motion.span
                whileHover={{ scale: 1.12 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="grid shrink-0 place-items-center"
              >
                <item.icon
                  weight={isActive ? "fill" : "regular"}
                  className="h-4 w-4"
                />
              </motion.span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          return (
            <motion.div key={item.href} variants={itemVariants}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                linkContent
              )}
            </motion.div>
          );
        })}
      </nav>

      <motion.div
        variants={footerVariants}
        className={cn(
          "space-y-3 border-t border-border/60",
          collapsed ? "flex flex-col items-center gap-2 p-2" : "p-3",
        )}
      >
        <ThemeToggle collapsed={collapsed} />

        <div
          className={cn(
            "flex items-center justify-center",
            collapsed ? "flex-col gap-1" : "gap-1",
          )}
        >
          {SOCIALS.map((s) => (
            <Tooltip key={s.label}>
              <TooltipTrigger asChild>
                <motion.a
                  whileHover={{ y: -2, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <s.icon weight="fill" className="h-4 w-4" />
                </motion.a>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"}>
                {s.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {!collapsed && (
          <p className="text-center text-xs text-muted-foreground">
            Built by Sheharyar Sarmad
          </p>
        )}
      </motion.div>
    </>
  );
}

// Theme toggle

function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return collapsed ? (
      <div className="h-9 w-9 rounded-md border border-border/60 bg-muted/40" />
    ) : (
      <div className="h-9 w-full rounded-lg border border-border/60 bg-muted/40" />
    );
  }

  if (collapsed) {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex flex-col items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
      >
        {THEMES.map((t) => {
          const active = theme === t.value;
          return (
            <Tooltip key={t.value}>
              <TooltipTrigger asChild>
                <button
                  role="radio"
                  aria-checked={active}
                  aria-label={t.label}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "relative grid h-7 w-7 place-items-center rounded-md transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" weight="fill" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative flex h-9 w-full items-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
    >
      {THEMES.map((t) => {
        const active = theme === t.value;
        return (
          <button
            key={t.value}
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            onClick={() => setTheme(t.value)}
            className={cn(
              "relative grid h-8 flex-1 place-items-center rounded-md transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-pill"
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute inset-0 rounded-md bg-background shadow-sm"
              />
            )}
            <t.icon className="relative h-4 w-4" weight="fill" />
          </button>
        );
      })}
    </div>
  );
}

// Mobile trigger

export function SidebarTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onOpen}
      className="md:hidden"
      aria-label="Open sidebar"
    >
      <List className="h-5 w-5" />
    </Button>
  );
}
