import React from 'react';
import { cn } from '@/lib/utils';

const ARCHETYPE_EMOJI: Record<string, string> = {
  lion: '🦁', owl: '🦉', dolphin: '🐬', fox: '🦊', bear: '🐻', bee: '🐝',
  wolf: '🐺', cat: '🐱', parrot: '🦜', elephant: '🐘', horse: '🐴', chameleon: '🦎',
};

interface ArchetypeChipProps {
  id: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export const ArchetypeChip: React.FC<ArchetypeChipProps> = ({ id, label, selected, onClick }) => {
  const emoji = ARCHETYPE_EMOJI[id] || '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-foreground border-border hover:bg-muted'
      )}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
};
