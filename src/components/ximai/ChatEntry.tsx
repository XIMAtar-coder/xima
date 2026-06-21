import React, { lazy, Suspense, useCallback, useRef, useState } from "react";
import { useXimAI } from "@/context/XimAIProvider";
import { TokenPreview } from "./TokenPreview";
import AssistantAvatar from "./AssistantAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LazyChat = lazy(() => import("./ChatWidget").then(m => ({ default: m.ChatWidget })));

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
      {/* Discreet launcher: small, bottom-right, translucent at rest, full on hover.
          z-40 stays below shadcn Dialog/Sheet overlays (z-50) so it never covers modals. */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={launcherRef}
              aria-label="XIM-AI"
              className="group fixed z-40 bottom-4 right-4 md:bottom-6 md:right-6
                         h-11 w-11 rounded-full
                         flex items-center justify-center
                         bg-background/60 hover:bg-background
                         border border-border/40 hover:border-border
                         opacity-70 hover:opacity-100 focus-visible:opacity-100
                         shadow-sm hover:shadow-md
                         backdrop-blur-md
                         transition-all duration-200 ease-out
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onMouseEnter={() => setMounted(true)}
              onFocus={() => setMounted(true)}
              onClick={openChat}
            >
              <AssistantAvatar
                size={22}
                className="pointer-events-none transition-transform duration-200 group-hover:scale-110"
                isActive={mounted}
              />
              <span className="sr-only">XIM-AI</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            XIM-AI
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
