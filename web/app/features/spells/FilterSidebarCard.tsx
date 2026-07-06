import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
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
  const drawerId = useId();
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
        "self-start transition-[width]",
        open ? "md:w-80" : "md:w-11",
      )}
    >
      <div className="md:sticky md:top-3">
        {!open && (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between md:h-11 md:w-11 md:justify-center md:px-0"
            aria-expanded={false}
            aria-controls={drawerId}
            onClick={() => setOpen(true)}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate md:sr-only">{t("sidebar.title")}</span>
            </span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground md:hidden">
              {t("sidebar.open")}
            </span>
          </Button>
        )}

        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label={t("sidebar.close")}
            onClick={() => setOpen(false)}
          />
        )}

        {open && (
          <div
            id={drawerId}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col border-r bg-card text-card-foreground shadow-lg md:static md:z-auto md:h-auto md:w-80 md:rounded-lg md:border md:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b p-4">
              <div className="min-w-0 space-y-1">
                <div className="font-semibold leading-none">
                  {t("sidebar.title")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("sidebar.description")}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t("sidebar.close")}
                aria-expanded={true}
                aria-controls={drawerId}
                title={t("sidebar.close")}
                onClick={() => setOpen(false)}
              >
                <PanelLeftClose className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:max-h-[calc(100vh-7rem)]">
              {children}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
