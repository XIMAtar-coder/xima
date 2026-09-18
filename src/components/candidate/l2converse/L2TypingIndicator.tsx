type Props = { counterpartName: string };

export function L2TypingIndicator({ counterpartName }: Props) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
        {counterpartName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase() || '')
          .join('')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">
          {counterpartName} sta scrivendo…
        </p>
        <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted px-4 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
