import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ApiError } from "~/api/http";
import { getSpellsByLevel } from "~/api/spells";

import Pager from "~/components/Pager";
import { Separator } from "~/components/ui/separator";
import { SpellCard } from "../../components/SpellCard";

import { useTranslation } from "react-i18next";
import { useAppI18n } from "~/i18n/useAppI18n";
import { Switch } from "~/components/ui/switch";
import { LevelSelector } from "./LevelSelector";
import { ClassAndDomainSelector } from "./ClassAndDomainSelector";
import { useBrowseQueryState } from "./useBrowseQueryState";
import { PAGE_SIZE } from "../constants";

function CardViewToggle({
  value,
  onChange,
}: {
  value: CardViewMode;
  onChange: (v: CardViewMode) => void;
}) {
  const showAll = value === "all";
  const { t } = useTranslation("spell-browse");
  return (
    <div className="rounded-md border p-3 space-y-2">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{t("Show details")}</span>
        <Switch
          checked={showAll}
          onCheckedChange={(checked) => onChange(checked ? "all" : "simple")}
        />
      </label>
    </div>
  );
}

type CardViewMode = "simple" | "all";

export default function BrowsePage() {
  const { queryKey } = useAppI18n();
  const { t } = useTranslation("spell-browse");

  const {
    level,
    classIds,
    domainIds,
    page,
    rulebookIds,
    setLevel,
    setClassIds,
    setDomainIds,
    setPage,
    hasValidSelection,
  } = useBrowseQueryState();

  const [cardView, setCardView] = useState<CardViewMode>("simple");
  const pageSize = PAGE_SIZE;

  const browseQuery = useQuery({
    queryKey: [
      "browse",
      {
        classIds,
        domainIds,
        level,
        rulebookIds: rulebookIds.join(","),
        page,
        pageSize,
        ...queryKey,
      },
    ],
    enabled: hasValidSelection,
    queryFn: ({ signal }) =>
      getSpellsByLevel({
        classIds,
        domainIds,
        level: level!, // safe because enabled guards it
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        page,
        pageSize,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const validationMessages: string[] = [];
  if (classIds.length === 0 && domainIds.length === 0)
    validationMessages.push("Select at least one class or domain.");
  if (level === null) validationMessages.push("Select a spell level (0-9).");

  const errorMessage = useMemo(() => {
    const err = browseQuery.error;
    if (!err) return null;
    if (err instanceof ApiError) return err.message; // message already normalized
    return "Request failed. Please try again.";
  }, [browseQuery.error]);

  const total = browseQuery.data?.total ?? 0;
  const items = browseQuery.data?.items ?? [];
  const bookCount = rulebookIds.length;

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <CardViewToggle value={cardView} onChange={setCardView} />
          <ClassAndDomainSelector
            classIds={classIds}
            domainIds={domainIds}
            onChangeClasses={setClassIds}
            onChangeDomains={setDomainIds}
          />
          <LevelSelector value={level} onChange={setLevel} />
        </div>
        <div className="space-y-3">
          {!hasValidSelection && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Before searching</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {validationMessages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {bookCount !== 0
              ? t("Using saved rulebook scope\: {{bookCount}} selected", {
                  ns: "spell-browse",
                  bookCount,
                })
              : t("Using default rulebook scope\: 3.5 core", {
                  ns: "spell-browse",
                })}
          </div>
          {hasValidSelection && (
            <div className="space-y-3">
              <Pager
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />

              <Separator />

              {errorMessage && (
                <div className="rounded-md border p-3">
                  <div className="font-medium">Couldn't load spells</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {errorMessage}
                  </div>
                </div>
              )}

              {!errorMessage &&
                !browseQuery.isLoading &&
                items.length === 0 && (
                  <div className="rounded-md border p-3">
                    <div className="font-medium">No spells found</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {t(
                        "No spells found for selected classes at level {{level}}.",
                        { level },
                      )}
                    </div>
                  </div>
                )}

              <div className="divide-y rounded-md border">
                {items.map((sp) => (
                  <SpellCard
                    key={sp.id}
                    spell={sp}
                    showActions={cardView == "all"}
                    showDetails={cardView == "all"}
                  />
                ))}
              </div>

              <Pager
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                showRangeText={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
