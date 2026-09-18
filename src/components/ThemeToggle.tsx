import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-sm hover:bg-[var(--glass-bg-hover)] transition-all duration-200 ease-out active:scale-95"
      aria-label="Toggle theme"
    >
      <Sun
        className={`h-[18px] w-[18px] text-muted-foreground absolute transition-all duration-200 ease-out ${
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        }`}
        strokeWidth={1.5}
      />
      <Moon
        className={`h-[18px] w-[18px] text-muted-foreground absolute transition-all duration-200 ease-out ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        }`}
        strokeWidth={1.5}
      />
    </button>
  );
};
