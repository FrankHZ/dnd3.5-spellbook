import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ApiError } from "~/api/http";
import { getSpellsByLevel } from "~/api/spells";
import Pager from "~/components/Pager";
import { SpellCard } from "~/components/SpellCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { useAppI18n } from "~/i18n/useAppI18n";

import { PAGE_SIZE } from "../constants";
import { BrowseOptionsToggle } from "./BrowseOptionsToggle";
import { ClassAndDomainSelector } from "./ClassAndDomainSelector";
import { LevelSelector } from "./LevelSelector";
import { useBrowsePrefs } from "./useBrowsePref";
import { useBrowseQueryState } from "./useBrowseQueryState";

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

  const { cardView, setCardView, groupMode, setGroupMode } = useBrowsePrefs();
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
        level: level!,
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        page,
        pageSize,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const validationMessages: string[] = [];
  if (classIds.length === 0 && domainIds.length === 0) {
    validationMessages.push(t("Select at least one class or domain."));
  }
  if (level === null) {
    validationMessages.push(t("Select a spell level (0-9)."));
  }

  const errorMessage = useMemo(() => {
    const err = browseQuery.error;
    if (!err) return null;
    if (err instanceof ApiError) return err.message;
    return t("Request failed. Please try again.");
  }, [browseQuery.error, t]);

  const total = browseQuery.data?.total ?? 0;
  const groups = browseQuery.data?.groups;
  const bookCount = rulebookIds.length;
  const hasSpellData = groups?.flatMap((group) => group.items).length !== 0;
  const scopeDescription =
    bookCount !== 0
      ? t("Using saved rulebook scope: {{bookCount}} selected", {
          ns: "spell-browse",
          bookCount,
        })
      : t("Using default rulebook scope: 3.5 core", {
          ns: "spell-browse",
        });

  return (
    <div className="page-side">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="gap-0 self-start">
          <CardContent className="space-y-4">
            <BrowseOptionsToggle
              cardView={cardView}
              onCardViewChange={setCardView}
              groupMode={groupMode}
              onGroupModeChange={setGroupMode}
            />
            <Separator />
            <ClassAndDomainSelector
              classIds={classIds}
              domainIds={domainIds}
              onChangeClasses={setClassIds}
              onChangeDomains={setDomainIds}
            />
            <Separator />
            <LevelSelector value={level} onChange={setLevel} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="space-y-1 px-1">
            <div className="text-sm text-muted-foreground">
              {scopeDescription}
            </div>
          </div>

          {!hasValidSelection && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-1">
                <CardDescription>
                  {t("Choose at least one class or domain, then set a spell level.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {hasValidSelection && errorMessage && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-1">
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {hasValidSelection &&
            !errorMessage &&
            !browseQuery.isLoading &&
            !hasSpellData && (
              <Card className="gap-0">
                <CardHeader className="gap-1">
                  <CardDescription>
                    {t(
                      "No spells found for selected classes at level {{level}}.",
                      { level },
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          {hasValidSelection && hasSpellData && (
            <Card className="gap-0 overflow-hidden py-2">
              <CardContent className="space-y-3 px-0 py-1">
                <div className="px-6">
                  <Pager
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                  />
                </div>

                <Separator className="my-0" />

                <div className="divide-y">
                  {groupMode === "grouped"
                    ? groups?.map((group) => (
                        <div key={group.level} className="divide-y">
                          <div className="bg-muted/30 px-3 py-2 text-center text-sm font-medium tracking-wide">
                            {t("Level {{level}}", {
                              ns: "spell-browse",
                              level: group.level,
                            })}
                          </div>

                          {group.items.map((spell) => (
                            <SpellCard
                              key={`${group.level}-${spell.id}`}
                              spell={spell}
                              showActions={cardView === "all"}
                              showDetails={cardView === "all"}
                            />
                          ))}
                        </div>
                      ))
                    : groups
                        ?.flatMap((group) => group.items)
                        .map((spell) => (
                          <SpellCard
                            key={spell.id}
                            spell={spell}
                            showActions={cardView === "all"}
                            showDetails={cardView === "all"}
                          />
                        ))}
                </div>

                <Separator />

                <div className="px-6">
                  <Pager
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    showRangeText={false}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
