"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  suffix?: string;
  className?: string;
}

const VARIANT_STYLES = {
  default: "bg-primary/10 text-primary",
  success: "bg-status-active/10 text-status-active",
  warning: "bg-status-overdue/10 text-status-overdue",
  danger: "bg-status-critical/10 text-status-critical",
  info: "bg-info/10 text-info",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  loading = false,
  variant = "default",
  suffix = "",
  className,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (loading || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 600;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value, loading]);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 shadow-[var(--shadow-card)]",
        "transition-shadow duration-normal hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <div className="skeleton h-8 w-16 mt-1.5" />
          ) : (
            <p className="text-[28px] font-semibold tracking-tight mt-0.5 text-card-foreground font-mono animate-count-up">
              {displayValue}{suffix}
            </p>
          )}
        </div>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", VARIANT_STYLES[variant])}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
    </div>
  );
}
