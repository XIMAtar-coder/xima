import { useEffect, useState } from 'react';

export const useVisibleSections = () => {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('section[id]')) as HTMLElement[];
    const ids = sections.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const nowVisible = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).id);
        setVisible((prev) => Array.from(new Set([...prev, ...nowVisible].filter((id) => ids.includes(id)))));
      },
      { threshold: 0.25 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return visible;
};
