import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export function SpellComponentBadge({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-5 min-w-7 items-center rounded-sm border-foreground/25 bg-muted/45 px-1.5 text-[10px] font-semibold leading-none text-foreground/75",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
