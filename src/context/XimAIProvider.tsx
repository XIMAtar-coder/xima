import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import type { XimaPillars } from '@/types';

export interface XimAIContextValue {
  route: string;
  lang: string;
  user: { id?: string; name?: string } | null;
  scores: XimaPillars | null;
  visibleSections: string[];
  setLang: (lang: string) => void;
  navigateTo: (path: string) => void;
}

const XimAIContext = createContext<XimAIContextValue | null>(null);

interface ProviderProps { children: React.ReactNode; navigate?: (path: string) => void }

export const XimAIProvider: React.FC<ProviderProps> = ({ children, navigate }) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { user } = useUser();
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [botLang, setBotLang] = useState<string>(i18n.language || 'en');

  useEffect(() => {
    setBotLang(i18n.language || 'en');
  }, [i18n.language]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('section[id]')) as HTMLElement[];
    const ids = sections.map((s) => s.id);
    if (ids.length === 0) {
      setVisibleSections([]);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).id);
        setVisibleSections((prev) => {
          const set = new Set([...prev, ...visible].filter((id) => ids.includes(id)));
          return Array.from(set);
        });
      },
      { threshold: 0.2 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  const value = useMemo<XimAIContextValue>(() => ({
    route: location.pathname,
    lang: botLang,
    user: user ? { id: user.id, name: user.name } : null,
    scores: user?.pillars ?? null,
    visibleSections,
    setLang: setBotLang,
    navigateTo: (path: string) => navigate?.(path),
  }), [location.pathname, botLang, user, visibleSections, navigate]);

  return <XimAIContext.Provider value={value}>{children}</XimAIContext.Provider>;
};

export const useXimAI = () => {
  const ctx = useContext(XimAIContext);
  if (!ctx) throw new Error('useXimAI must be used within XimAIProvider');
  return ctx;
};
