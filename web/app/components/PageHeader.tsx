import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "app-page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="app-page-title text-lg font-semibold leading-7">
          {title}
        </h1>
        {description ? (
          <div className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div className="app-action-rail flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
