import { Button } from "~/components/ui/button";
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
  const selected = [...selectedClasses, ...selectedDomains];

  return (
    <aside className={cn("w-[320px] shrink-0 border-r pr-3", className)}>
      <div className="sticky top-3 space-y-4">
        {/* Selected (classes + domains) */}
        <div>
          <div className="text-sm font-medium">{t("Selected")}</div>
          <div className="mt-2 space-y-1">
            {selected.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t(
                  "None selected. Spell level uses the lowest available level.",
                )}
              </div>
            ) : (
              selected.map((opt) => (
                <div
                  key={`selected-${opt.type}-${opt.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {opt.type === "class" ? t("Class") : t("Domain")}
                      </span>
                      <div className="truncate">{opt.name}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onRemove(opt);
                    }}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Candidates (classes + domains) */}
        <div>
          <div className="text-sm font-medium">{t("Candidates")}</div>
          <div className="mt-2 space-y-1">
            {candidates.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t("No candidates.")}
              </div>
            ) : (
              candidates.map((c) => (
                <div
                  key={`candidates-${c.type}-${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {/* tiny tag so user knows if it's class or domain */}
                      <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {c.type === "class" ? t("Class") : t("Domain")}
                      </span>
                      <div>
                        <div className="truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("{{count}} occurrence(s)", { count: c.count })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onAdd(c);
                    }}
                  >
                    {t("Add")}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
