import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";

function getIsDesktop() {
  if (typeof window === "undefined") return true;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function FilterSidebarCard({
  children,
  desktopDefaultOpen = true,
  mobileDefaultOpen = false,
}: {
  children: ReactNode;
  desktopDefaultOpen?: boolean;
  mobileDefaultOpen?: boolean;
}) {
  const { t } = useTranslation("spell-filters");
  const sidebarId = useId();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(() =>
    getIsDesktop() ? desktopDefaultOpen : mobileDefaultOpen,
  );

  useEffect(() => {
    setOpen(isDesktop ? desktopDefaultOpen : mobileDefaultOpen);
  }, [desktopDefaultOpen, isDesktop, mobileDefaultOpen]);

  return (
    <aside
      className={cn(
        "w-full shrink-0 self-start transition-[width]",
        open ? "md:w-80" : "md:w-11",
      )}
    >
      <div className="md:sticky md:top-3">
        {!open && (
          <div className="app-side-card-collapsed md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between md:h-11 md:w-11 md:justify-center md:px-0"
              aria-expanded={false}
              aria-controls={sidebarId}
              onClick={() => setOpen(true)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate md:sr-only">
                  {t("sidebar.title")}
                </span>
              </span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground md:hidden">
                {t("sidebar.open")}
              </span>
            </Button>
          </div>
        )}

        {open && (
          <Card id={sidebarId} className="app-side-card">
            <CardHeader className="app-side-card-header">
              <CardTitle>{t("sidebar.title")}</CardTitle>
              <CardDescription>{t("sidebar.description")}</CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t("sidebar.close")}
                  aria-expanded={true}
                  aria-controls={sidebarId}
                  title={t("sidebar.close")}
                  onClick={() => setOpen(false)}
                >
                  <PanelLeftClose className="size-4" aria-hidden="true" />
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent className="app-side-card-content app-side-card-scroll-md app-side-sections space-y-4">
              {children}
            </CardContent>
          </Card>
        )}
      </div>
    </aside>
  );
}
