import React, { lazy, Suspense, useCallback, useRef, useState } from "react";
import { useXimAI } from "@/context/XimAIProvider";
import { TokenPreview } from "./TokenPreview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LazyChat = lazy(() => import("./ChatWidget").then(m => ({ default: m.ChatWidget })));

/**
 * XIM-AI launcher — Pentagon variant.
 * Stylized after the XIMA radar pentagon: deep-navy background, blue filled pentagon
 * with vertex dots and the XIMA "X" mark at the center. Single launcher, owned by ChatEntry.
 */
const PentagonMark: React.FC = () => {
  // Regular pentagon with flat top — points at angles -90, -18, 54, 126, 198 (deg)
  // Computed for viewBox 64x64, center (32, 32), radius 22
  const pts = "32,10 52.93,25.21 44.94,49.79 19.06,49.79 11.07,25.21";
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ximai-pent-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ximai-pent-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* filled pentagon */}
      <polygon
        points={pts}
        fill="url(#ximai-pent-fill)"
        stroke="url(#ximai-pent-stroke)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      {/* vertex dots */}
      <g fill="#ffffff">
        <circle cx="32" cy="10" r="1.8" />
        <circle cx="52.93" cy="25.21" r="1.8" />
        <circle cx="44.94" cy="49.79" r="1.8" />
        <circle cx="19.06" cy="49.79" r="1.8" />
        <circle cx="11.07" cy="25.21" r="1.8" />
      </g>
      {/* XIMA "X" mark in the center */}
      <g
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.95"
      >
        <line x1="25" y1="26" x2="39" y2="40" />
        <line x1="39" y1="26" x2="25" y2="40" />
      </g>
    </svg>
  );
};

export const ChatEntry: React.FC = () => {
  useXimAI();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

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
      {/* Pentagon launcher: dark-navy disc as backdrop + blue pentagon mark.
          z-40 stays below shadcn Dialog/Sheet overlays (z-50). */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={launcherRef}
              aria-label="XIM-AI"
              className="group fixed z-40 bottom-5 right-5 md:bottom-6 md:right-6
                         h-14 w-14
                         rounded-2xl
                         flex items-center justify-center
                         bg-[#0b1e3f] hover:bg-[#0d2554]
                         ring-1 ring-white/10 hover:ring-white/20
                         shadow-[0_10px_30px_-10px_rgba(29,78,216,0.55)]
                         hover:shadow-[0_14px_36px_-10px_rgba(59,130,246,0.7)]
                         transition-all duration-200 ease-out
                         hover:-translate-y-0.5
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                         ximai-pentagon-entrance"
              onMouseEnter={() => setMounted(true)}
              onFocus={() => setMounted(true)}
              onClick={openChat}
            >
              <span className="block h-9 w-9 transition-transform duration-200 group-hover:scale-110 ximai-pentagon-pulse">
                <PentagonMark />
              </span>
              <span className="sr-only">XIM-AI</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            XIM-AI
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* One-time entrance + pulse animation (scoped, no global CSS pollution) */}
      <style>{`
        @keyframes ximai-pent-in {
          0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .ximai-pentagon-entrance {
          animation: ximai-pent-in 360ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes ximai-pent-pulse {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(59,130,246,0)); }
          50%      { filter: drop-shadow(0 0 6px rgba(59,130,246,0.55)); }
        }
        .ximai-pentagon-pulse {
          animation: ximai-pent-pulse 1.8s ease-in-out 1;
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

