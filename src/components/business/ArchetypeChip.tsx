import React from 'react';
import { cn } from '@/lib/utils';

interface ArchetypeChipProps {
  id: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export const ArchetypeChip: React.FC<ArchetypeChipProps> = ({ id, label, selected, onClick }) => {
  const isAll = id === 'all';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border-2',
        selected
          ? 'bg-primary/10 text-foreground border-primary shadow-sm'
          : 'bg-background text-foreground border-border hover:border-primary/50'
      )}
    >
      {isAll ? (
        <span className="w-5 h-5 flex items-center justify-center text-xs">★</span>
      ) : (
        <img
          src={`/ximatars/${id}.png`}
          alt={label}
          className="w-5 h-5 rounded-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {label}
    </button>
  );
};
