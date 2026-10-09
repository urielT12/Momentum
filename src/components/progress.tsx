// Calorie ring and macro bars for the Today screen.

export function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = eaten > goal;
  const remaining = Math.abs(goal - eaten);

  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-surface-2" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={over ? "stroke-danger" : "stroke-accent"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums">{remaining.toLocaleString()}</span>
        <span className="text-xs text-muted">{over ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  value,
  goal,
  colorClass,
}: {
  label: string;
  value: number;
  goal: number;
  colorClass: string;
}) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">
          <span className="text-foreground">{Math.round(value)}</span> / {goal} g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
