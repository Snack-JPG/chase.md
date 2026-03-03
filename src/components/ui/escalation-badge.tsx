import { cn } from "@/lib/utils";

const LEVEL_STYLES = {
  1: "bg-level-1-bg text-level-1",
  2: "bg-level-2-bg text-level-2",
  3: "bg-level-3-bg text-level-3",
  4: "bg-level-4-bg text-level-4",
  5: "bg-level-5-bg text-level-5",
} as const;

const LEVEL_LABELS: Record<number, string> = {
  1: "Friendly",
  2: "Follow-up",
  3: "Urgent",
  4: "Serious",
  5: "Final",
};

// Map escalation level strings from DB to numeric levels
const ESCALATION_MAP: Record<string, number> = {
  gentle: 1,
  reminder: 1,
  firm: 2,
  urgent: 3,
  escalate: 4,
  final: 5,
};

interface EscalationBadgeProps {
  level: number | string;
  showLabel?: boolean;
  className?: string;
}

export function EscalationBadge({ level, showLabel = true, className }: EscalationBadgeProps) {
  const numLevel = typeof level === "string" ? (ESCALATION_MAP[level] ?? 1) : level;
  const clampedLevel = Math.max(1, Math.min(5, numLevel)) as 1 | 2 | 3 | 4 | 5;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
        LEVEL_STYLES[clampedLevel],
        className
      )}
      role="status"
    >
      Lvl {clampedLevel}
      {showLabel && <span className="font-normal">&middot; {LEVEL_LABELS[clampedLevel]}</span>}
    </span>
  );
}
