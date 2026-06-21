import React, { lazy, Suspense, useCallback, useRef, useState } from "react";
import { useXimAI } from "@/context/XimAIProvider";
import { TokenPreview } from "./TokenPreview";
import { useTheme } from "next-themes";
import { Logo } from "@/components/Logo";

const LazyChat = lazy(() => import("./ChatWidget").then(m => ({ default: m.ChatWidget })));

export const ChatEntry: React.FC = () => {
  useXimAI();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const logoTone = resolvedTheme === "dark" ? "white" : "dark";

  const openChat = useCallback(() => {
    if (!mounted) setMounted(true);
    setOpen(true);
  }, [mounted]);

  const closeChat = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  return (
    <div data-ximai-skip>
      {/* XIMA brand launcher — logo only, no background fill.
          z-40 stays below shadcn Dialog/Sheet overlays (z-50). */}
      <button
        ref={launcherRef}
        aria-label="XIM-AI"
        className="group fixed z-40 bottom-5 right-5 md:bottom-6 md:right-6
                   h-14 w-14
                   flex items-center justify-center
                   bg-transparent border-0
                   cursor-pointer
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                   ximai-logo-entrance"
        onMouseEnter={() => { setHovered(true); if (!mounted) setMounted(true); }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => { if (!mounted) setMounted(true); }}
        onClick={openChat}
      >
        {/* Brand mark — XIMA symbol, theme-aware for contrast */}
        <span className="block h-10 w-auto transition-transform duration-200 group-hover:scale-110 ximai-logo-pulse">
          <Logo
            variant="symbol"
            tone={logoTone}
            className="h-full w-auto drop-shadow-[0_3px_10px_rgba(59,130,246,0.45)]"
            alt="XIM-AI"
          />
        </span>
        <span className="sr-only">XIM-AI</span>

        {/* Hover label pill */}
        <span
          className={`
            absolute right-full mr-3
            whitespace-nowrap px-3.5 py-1.5 rounded-full
            bg-white/90 dark:bg-[#0b1e3f]/90 backdrop-blur-sm
            text-sm font-semibold text-foreground
            shadow-[0_4px_16px_-4px_rgba(0,0,0,0.15)]
            transition-all duration-200 ease-out
            ${hovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}
          `}
        >
          Chiedi a XIMA AI
        </span>
      </button>

      {/* Entrance + pulse animation (scoped) */}
      <style>{`
        @keyframes ximai-logo-in {
          0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .ximai-logo-entrance {
          animation: ximai-logo-in 360ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes ximai-logo-pulse {
          0%, 100% { filter: drop-shadow(0 3px 10px rgba(59,130,246,0.25)); }
          50%      { filter: drop-shadow(0 3px 14px rgba(59,130,246,0.65)); }
        }
        .ximai-logo-pulse {
          animation: ximai-logo-pulse 1.8s ease-in-out 1;
          animation-delay: 480ms;
        }
      `}</style>

      {/* Token-based preview */}
      <TokenPreview onOpenChat={openChat} />

      {/* Lazy chat (launcher always hidden inside the widget — ChatEntry owns the launcher) */}
      {mounted && (
        <Suspense fallback={null}>
          <LazyChat controlledOpen={open} onOpenChange={(v) => (v ? setOpen(true) : closeChat())} hideLauncher />
        </Suspense>
      )}
    </div>
  );
};

export default ChatEntry;

