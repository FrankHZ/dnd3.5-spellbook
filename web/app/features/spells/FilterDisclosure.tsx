import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function FilterDisclosure({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: ReactNode;
  summary: ReactNode;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      className="group/filter-disclosure"
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-open/filter-disclosure:rotate-90 group-hover/filter-disclosure:text-accent-foreground" />
          <span className="min-w-0 truncate">{title}</span>
          <span className="min-w-0 truncate text-xs font-normal text-muted-foreground group-hover/filter-disclosure:text-accent-foreground">
            {summary}
          </span>
        </div>
      </summary>

      {open && <div className="mt-3 space-y-3">{children}</div>}
    </details>
  );
}
