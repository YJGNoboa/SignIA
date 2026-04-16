interface ResultCardProps {
  label: string;
  confidence: number;
  isTop?: boolean;
}

export function ResultCard({ label, confidence, isTop }: ResultCardProps) {
  const pct = Math.round(confidence * 100);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isTop ? "glass-card glow-primary" : "bg-secondary/50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold truncate ${
            isTop ? "text-primary text-lg" : "text-foreground"
          }`}
        >
          {label}
        </p>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isTop
                ? "bg-gradient-to-r from-primary to-accent"
                : "bg-muted-foreground/40"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span
        className={`text-sm font-mono font-bold ${
          isTop ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}
