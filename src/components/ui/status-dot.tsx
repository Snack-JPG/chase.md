import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  active: "bg-status-active",
  overdue: "bg-status-overdue",
  critical: "bg-status-critical",
  complete: "bg-status-complete",
  paused: "bg-status-paused",
  draft: "bg-status-draft",
} as const;

type StatusVariant = keyof typeof STATUS_COLORS;

interface StatusDotProps {
  status: StatusVariant;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
} as const;

export function StatusDot({ status, size = "md", pulse = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        SIZE_MAP[size],
        STATUS_COLORS[status],
        pulse && "animate-status-pulse",
        className
      )}
      role="img"
      aria-label={`Status: ${status}`}
    />
  );
}

// Helper to derive status from business logic
export function getClientStatus(daysOverdue: number | null, isComplete: boolean, isPaused: boolean): StatusVariant {
  if (isComplete) return "complete";
  if (isPaused) return "paused";
  if (daysOverdue === null) return "draft";
  if (daysOverdue > 30) return "critical";
  if (daysOverdue > 14) return "overdue";
  return "active";
}
