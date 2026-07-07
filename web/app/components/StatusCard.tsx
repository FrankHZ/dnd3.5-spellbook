import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

export function StatusCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const hasBody = Boolean(children || actions);

  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="gap-1 py-3">
        {title ? <CardTitle className="text-base">{title}</CardTitle> : null}
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      {hasBody ? (
        <CardContent className="space-y-3 pt-0">
          {children}
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
