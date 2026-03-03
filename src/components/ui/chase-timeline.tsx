"use client";

import { cn } from "@/lib/utils";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { Check, Clock, Eye, EyeOff, X } from "lucide-react";
import { format } from "date-fns";

const LEVEL_COLORS = {
  1: { dot: "bg-level-1", line: "bg-level-1/30", label: "text-level-1" },
  2: { dot: "bg-level-2", line: "bg-level-2/30", label: "text-level-2" },
  3: { dot: "bg-level-3", line: "bg-level-3/30", label: "text-level-3" },
  4: { dot: "bg-level-4", line: "bg-level-4/30", label: "text-level-4" },
  5: { dot: "bg-level-5", line: "bg-level-5/30", label: "text-level-5" },
} as const;

interface TimelineStep {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  channel: "email" | "sms" | "whatsapp" | "phone" | "letter";
  label: string;
  date?: Date | string | null;
  status: "completed" | "current" | "scheduled";
  deliveryStatus?: "delivered" | "opened" | "failed" | "not_opened" | null;
  messagePreview?: string | null;
  clientActions?: string[];
}

interface ChaseTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function ChaseTimeline({ steps, className }: ChaseTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {steps.map((step, index) => {
        const colors = LEVEL_COLORS[step.level];
        const isLast = index === steps.length - 1;
        const isFuture = step.status === "scheduled";

        return (
          <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[15px] top-8 w-[2px] bottom-0",
                  isFuture ? "border-l-2 border-dashed border-border" : colors.line
                )}
              />
            )}

            {/* Circle */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isFuture ? "bg-muted" : colors.dot,
                  step.status === "current" && "ring-4 ring-primary/20 animate-status-pulse"
                )}
              >
                <ChannelIcon
                  channel={step.channel}
                  size="sm"
                  className={isFuture ? "text-muted-foreground" : "text-white"}
                />
              </div>
            </div>

            {/* Content */}
            <div className={cn("flex-1 min-w-0 pt-0.5", isFuture && "opacity-50")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[13px] font-semibold", colors.label)}>
                  Lvl {step.level}
                </span>
                <span className="text-[13px] text-foreground font-medium">
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[12px] text-muted-foreground">
                    {format(new Date(step.date), "d MMM")}
                  </span>
                )}
                {step.status === "current" && (
                  <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    NOW
                  </span>
                )}
              </div>

              {/* Delivery status */}
              {step.deliveryStatus && (
                <div className="flex items-center gap-2 mt-1.5">
                  <DeliveryBadge status={step.deliveryStatus} />
                </div>
              )}

              {/* Message preview */}
              {step.messagePreview && (
                <p className="text-[12px] text-muted-foreground mt-1.5 line-clamp-2 italic">
                  &ldquo;{step.messagePreview}&rdquo;
                </p>
              )}

              {/* Client actions */}
              {step.clientActions?.map((action, i) => (
                <div key={i} className="flex items-center gap-1.5 mt-1 text-[12px] text-status-active">
                  <Check className="w-3 h-3" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeliveryBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    delivered: { icon: Check, label: "Delivered", className: "text-status-active" },
    opened: { icon: Eye, label: "Opened", className: "text-info" },
    not_opened: { icon: EyeOff, label: "Not opened", className: "text-muted-foreground" },
    failed: { icon: X, label: "Failed", className: "text-status-critical" },
  };

  const c = config[status];
  if (!c) return null;
  const Icon = c.icon;

  return (
    <span className={cn("flex items-center gap-1 text-[12px]", c.className)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}
