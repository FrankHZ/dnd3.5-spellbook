import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type SpellMetaBadgeKind = "source" | "taxonomy" | "descriptor" | "scope";
type SpellMetaBadgeSize = "compact" | "regular";

const kindClasses: Record<SpellMetaBadgeKind, string> = {
  source: "border-transparent bg-muted/20 text-muted-foreground tracking-wide",
  taxonomy: "border-transparent bg-muted/55 text-foreground/80",
  descriptor: "border-border/70 bg-background/80 text-muted-foreground",
  scope: "border-border bg-background/70 text-muted-foreground",
};

const sizeClasses: Record<SpellMetaBadgeSize, string> = {
  compact: "h-5 px-1.5 text-[10px] leading-none",
  regular: "min-h-6 px-2 py-1 text-xs leading-none",
};

export function SpellMetaBadge({
  children,
  kind,
  size = "compact",
  className,
  ...props
}: {
  children: ReactNode;
  kind: SpellMetaBadgeKind;
  size?: SpellMetaBadgeSize;
  className?: string;
} & ComponentPropsWithoutRef<"span">) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex min-w-0 items-center rounded-sm font-medium",
        kindClasses[kind],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Badge>
  );
}
