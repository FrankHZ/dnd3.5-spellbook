import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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
  const [candidateFilter, setCandidateFilter] = useState("");
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <aside
      className={cn(
        "w-full shrink-0",
        collapsed ? "lg:w-10" : "lg:w-[320px]",
        className,
      )}
    >
      <div className="space-y-3 lg:sticky lg:top-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start gap-2",
            collapsed && "lg:justify-center lg:px-0",
          )}
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-controls="prepared-sidebar-panels"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span className={cn(collapsed && "lg:hidden")}>
            {collapsed ? t("Show sidebar") : t("Hide sidebar")}
          </span>
        </Button>

        {!collapsed && (
          <div id="prepared-sidebar-panels" className="space-y-3">
            <Card className="gap-0">
              <CardHeader className="gap-1 py-3">
                <CardTitle className="text-base">{t("Selected")}</CardTitle>
                <CardDescription>
                  {t("None selected. Spell level uses the lowest available level.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {selected.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("None")}</div>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-auto pr-1">
                    {selected.map((opt) => (
                      <div
                        key={`selected-${opt.type}-${opt.id}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              {opt.type === "class" ? t("Class") : t("Domain")}
                            </span>
                            <div className="min-w-0 truncate">{opt.name}</div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => onRemove(opt)}
                        >
                          {t("Remove")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gap-0">
              <CardHeader className="gap-1 py-3">
                <CardTitle className="text-base">{t("Candidates")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {hasCandidates && (
                  <Input
                    value={candidateFilter}
                    onChange={(e) => setCandidateFilter(e.target.value)}
                    placeholder={t("Filter candidates...")}
                  />
                )}
                {!hasCandidates ? (
                  <div className="text-sm text-muted-foreground">
                    {t("No candidates.")}
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("No matching candidates.")}
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
                            <span className="inline-flex shrink-0 items-center self-stretch rounded border px-1.5 text-[11px] text-muted-foreground">
                              {candidate.type === "class"
                                ? t("Class")
                                : t("Domain")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{candidate.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t("{{count}} occurrence(s)", {
                                  count: candidate.count,
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => onAdd(candidate)}
                        >
                          {t("Add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </aside>
  );
}
