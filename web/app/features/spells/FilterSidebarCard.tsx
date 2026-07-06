import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export function FilterSidebarCard({
  children,
  defaultOpen = true,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation("spell-filters");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="gap-0 self-start">
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {open ? (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            )}
            <span className="truncate">{t("sidebar.title")}</span>
          </span>
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            {open ? t("sidebar.hide") : t("sidebar.show")}
          </span>
        </Button>

        <div className={cn("space-y-4 md:block", !open && "hidden")}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
