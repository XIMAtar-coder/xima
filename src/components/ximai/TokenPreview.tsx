import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AssistantAvatar from "./AssistantAvatar";

// Debounce and throttle helpers
const debounce = <F extends (...args: any[]) => void>(fn: F, wait = 150) => {
  let t: number | undefined;
  return (...args: Parameters<F>) => {
    window.clearTimeout(t);
    // @ts-ignore
    t = window.setTimeout(() => fn(...args), wait);
  };
};
const throttle = <F extends (...args: any[]) => void>(fn: F, limit = 100) => {
  let inThrottle = false;
  return (...args: Parameters<F>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      window.setTimeout(() => (inThrottle = false), limit);
    }
  };
};

function getPreviewCopy(pathname: string, t: (k: string) => string) {
  if (pathname.startsWith("/profile") || pathname === "/dashboard") return t("ximai.preview.dashboard");
  if (pathname.startsWith("/development-plan")) return t("ximai.preview.dev_plan");
  if (pathname.startsWith("/opportunity")) return t("ximai.preview.opportunity");
  if (pathname.startsWith("/chat")) return t("ximai.preview.chat");
  return t("ximai.preview.default");
}

export const TokenPreview: React.FC<{ onOpenChat: () => void }> = ({ onOpenChat }) => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "ximai-token-preview-root";
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      el.remove();
    };
  }, []);

  // Wrap tokens "XIMA" and "XIMATAR" with focusable spans
  useEffect(() => {
    const TOKENS = ["XIMA", "XIMATAR"];

    const walkAndWrap = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const toProcess: Text[] = [];
      let node: any;
      while ((node = walker.nextNode())) {
        const text: Text = node as Text;
        if (!text.nodeValue) continue;
        if (text.parentElement && (text.parentElement.closest("#ximai-token-preview-root") || text.parentElement.closest("[data-ximai-skip]"))) continue;
        if (TOKENS.some((tk) => text.nodeValue!.includes(tk))) toProcess.push(text);
      }
      for (const text of toProcess) {
        const parent = text.parentElement!;
        const frag = document.createDocumentFragment();
        const parts = text.nodeValue!.split(/(XIMATAR|XIMA)/g);
        parts.forEach((part) => {
          if (part === "XIMA" || part === "XIMATAR") {
            const span = document.createElement("span");
            span.textContent = part;
            span.tabIndex = 0;
            span.setAttribute("role", "button");
            span.setAttribute("aria-label", t("ximai.preview.open_help"));
            span.className = "story-link focus:outline-none";
            span.dataset.ximaiToken = "1";
            frag.appendChild(span);
          } else if (part) {
            frag.appendChild(document.createTextNode(part));
          }
        });
        parent.replaceChild(frag, text);
      }
    };

    walkAndWrap();

    // Listener delegation
    const onEnter = debounce((e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.dataset.ximaiToken) return;
      triggerRectRef.current = target.getBoundingClientRect();
      setPos(calculatePosition(triggerRectRef.current));
      setVisible(true);
    }, 150);
    const onLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.dataset.ximaiToken) return;
      setVisible(false);
    };
    const onFocus = (e: Event) => onEnter(e);
    const onBlur = (e: Event) => onLeave(e);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    const onFirstTap = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.dataset.ximaiToken) return;
      triggerRectRef.current = target.getBoundingClientRect();
      setPos(calculatePosition(triggerRectRef.current));
      setVisible(true);
    };

    document.addEventListener("mouseenter", onEnter as any, true);
    document.addEventListener("mouseleave", onLeave as any, true);
    document.addEventListener("focus", onFocus as any, true);
    document.addEventListener("blur", onBlur as any, true);
    document.addEventListener("keydown", onKeyDown as any, true);
    document.addEventListener("click", onFirstTap as any, true);

    const onScroll = throttle(() => {
      if (!triggerRectRef.current) return;
      setPos(calculatePosition(triggerRectRef.current));
    }, 100);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll, true);

    return () => {
      document.removeEventListener("mouseenter", onEnter as any, true);
      document.removeEventListener("mouseleave", onLeave as any, true);
      document.removeEventListener("focus", onFocus as any, true);
      document.removeEventListener("blur", onBlur as any, true);
      document.removeEventListener("keydown", onKeyDown as any, true);
      document.removeEventListener("click", onFirstTap as any, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll, true);
      setVisible(false);
    };
  }, [pathname, t]);

  if (!portalEl) return null;
  const copy = getPreviewCopy(pathname, (k) => t(k));

  return createPortal(
    <div
      data-ximai-skip
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        minWidth: 280,
        maxWidth: 360,
        zIndex: 45,
        padding: 16,
        borderRadius: 20,
        border: "1px solid hsl(var(--border) / 0.25)",
        boxShadow: "0 4px 12px -4px rgba(0, 0, 0, 0.08)",
        background: "hsl(var(--background) / 0.95)",
        backdropFilter: "blur(8px)",
        color: "hsl(var(--foreground))",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.98)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}
      className="animate-fade-in"
      role="dialog"
      aria-modal="false"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <AssistantAvatar size={40} />
        <div>
          <div className="text-sm font-medium">XIM‑AI</div>
          <p className="text-xs text-muted-foreground mt-0.5">{copy}</p>
          <button
            onClick={onOpenChat}
            className="mt-2 text-xs inline-flex items-center gap-1 text-primary story-link"
          >
            {t("ximai.preview.open")}
          </button>
        </div>
      </div>
    </div>,
    portalEl
  );
};

function calculatePosition(rect: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const width = 320;
  const height = 120;
  // Prefer above, then below, keep inside viewport
  let top = rect.top - height - margin;
  if (top < 0) top = rect.bottom + margin;
  let left = Math.min(Math.max(rect.left - width / 2 + rect.width / 2, margin), vw - width - margin);
  // Safe areas (mobile notch)
  const safeRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-right)") || "0");
  const safeLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-left)") || "0");
  left = Math.max(left, safeLeft + margin);
  left = Math.min(left, vw - width - margin - safeRight);
  return { top, left };
}

export default TokenPreview;
