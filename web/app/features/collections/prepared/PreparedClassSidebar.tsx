import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";

export type OptionType = "class" | "domain";

type Option = {
  type: OptionType;
  id: number;
  name: string;
};

export type ClassOption = Option & { type: "class" };
export type DomainOption = Option & { type: "domain" };

export type Candidate = Option & {
  count: number;
};

const DESKTOP_QUERY = "(min-width: 1024px)";

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

function PreparedTypePill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-sm border-border/70 bg-background/80 px-1.5 py-0 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export function PreparedClassAndDomainSidebar({
  selectedClasses,
  selectedDomains,
  candidates,
  onAdd,
  onRemove,
  className,
}: {
  selectedClasses: ClassOption[];
  selectedDomains: DomainOption[];
  candidates: Candidate[];
  onAdd: (option: Option) => void;
  onRemove: (option: Option) => void;
  className?: string;
}) {
  const { t } = useTranslation("collections");
  const sidebarId = useId();
  const isDesktop = useIsDesktop();
  const [candidateFilter, setCandidateFilter] = useState("");
  const [collapsed, setCollapsed] = useState(() => !getIsDesktop());
  const selected = [...selectedClasses, ...selectedDomains];
  const hasCandidates = candidates.length > 0;
  const filteredCandidates = useMemo(() => {
    const query = candidateFilter.trim().toLowerCase();
    if (!query) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      candidate.name.toLowerCase().includes(query),
    );
  }, [candidateFilter, candidates]);

  useEffect(() => {
    setCollapsed(!isDesktop);
  }, [isDesktop]);

  return (
    <aside
      className={cn(
        "w-full shrink-0 self-start transition-[width]",
        collapsed ? "lg:w-11" : "lg:w-[320px]",
        className,
      )}
    >
      <div className="lg:sticky lg:top-3">
        {collapsed && (
          <div className="app-side-card-collapsed lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between lg:h-11 lg:w-11 lg:justify-center lg:px-0"
              onClick={() => setCollapsed(false)}
              aria-expanded={false}
              aria-controls={sidebarId}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate lg:sr-only">
                  {t("prepared.sidebar.title")}
                </span>
              </span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground lg:hidden">
                {t("prepared.sidebar.show")}
              </span>
            </Button>
          </div>
        )}

        {!collapsed && (
          <Card id={sidebarId} className="app-side-card">
            <CardHeader className="app-side-card-header">
              <CardTitle>{t("prepared.sidebar.title")}</CardTitle>
              <CardDescription>
                {t("prepared.sidebar.description")}
              </CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t("prepared.sidebar.hide")}
                  aria-expanded={true}
                  aria-controls={sidebarId}
                  title={t("prepared.sidebar.hide")}
                  onClick={() => setCollapsed(true)}
                >
                  <PanelLeftClose className="size-4" aria-hidden="true" />
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent className="app-side-card-content app-side-card-scroll-lg space-y-4">
              <section className="space-y-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium leading-none">
                    {t("prepared.sidebar.selected")}
                  </h3>
                  {selected.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("prepared.sidebar.none-selected-help")}
                    </p>
                  ) : null}
                </div>

                {selected.length !== 0 && (
                  <div className="max-h-48 space-y-1 overflow-auto pr-1">
                    {selected.map((opt) => (
                      <div
                        key={`selected-${opt.type}-${opt.id}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <PreparedTypePill>
                              {opt.type === "class"
                                ? t("common.class")
                                : t("common.domain")}
                            </PreparedTypePill>
                            <div className="min-w-0 truncate">{opt.name}</div>
                          </div>
                        </div>

                        <Button
                          size="xs"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => onRemove(opt)}
                        >
                          {t("actions.remove")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-medium leading-none">
                  {t("prepared.sidebar.candidates")}
                </h3>
                {hasCandidates && (
                  <Input
                    value={candidateFilter}
                    onChange={(e) => setCandidateFilter(e.target.value)}
                    placeholder={t("prepared.sidebar.filter-candidates")}
                  />
                )}
                {!hasCandidates ? (
                  <div className="text-sm text-muted-foreground">
                    {t("prepared.sidebar.no-candidates")}
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("prepared.sidebar.no-matching-candidates")}
                  </div>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-auto pr-1">
                    {filteredCandidates.map((candidate) => (
                      <div
                        key={`candidates-${candidate.type}-${candidate.id}`}
                        className="flex items-stretch justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-stretch gap-2">
                            <PreparedTypePill className="self-stretch">
                              {candidate.type === "class"
                                ? t("common.class")
                                : t("common.domain")}
                            </PreparedTypePill>
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{candidate.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t("prepared.sidebar.occurrence-count", {
                                  count: candidate.count,
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="xs"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => onAdd(candidate)}
                        >
                          {t("actions.add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        )}
      </div>
    </aside>
  );
}
