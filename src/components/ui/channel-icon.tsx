import { cn } from "@/lib/utils";
import { Mail, MessageCircle, Phone, FileText, MessageSquare } from "lucide-react";

const CHANNEL_MAP = {
  email: { icon: Mail, label: "Email" },
  sms: { icon: MessageSquare, label: "SMS" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  phone: { icon: Phone, label: "Phone" },
  letter: { icon: FileText, label: "Letter" },
} as const;

type Channel = keyof typeof CHANNEL_MAP;

interface ChannelIconProps {
  channel: Channel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
} as const;

export function ChannelIcon({ channel, size = "md", className }: ChannelIconProps) {
  const config = CHANNEL_MAP[channel];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Icon
      className={cn(SIZE_MAP[size], className)}
      aria-label={config.label}
    />
  );
}

export function getChannelConfig(channel: string) {
  return CHANNEL_MAP[channel as Channel] ?? CHANNEL_MAP.email;
}
