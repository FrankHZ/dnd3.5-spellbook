import type { CSSProperties } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const TOASTER_STYLE = {
  "--normal-bg": "var(--popover, #ffffff)",
  "--normal-text": "var(--popover-foreground, #111827)",
  "--normal-border": "var(--border, #e5e7eb)",
  "--border-radius": "var(--radius, 0.5rem)",
} as CSSProperties;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={TOASTER_STYLE}
      {...props}
    />
  );
}
