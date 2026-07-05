import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export function SpellComponentBadge({
  children,
  className,
  size = "compact",
}: {
  children: string;
  className?: string;
  size?: "compact" | "regular";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-sm border-foreground/25 bg-muted/45 font-semibold text-foreground/75",
        size === "regular"
          ? "min-h-6 min-w-0 px-2 py-1 text-xs leading-none"
          : "h-5 min-w-7 px-1.5 text-[10px] leading-none",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
