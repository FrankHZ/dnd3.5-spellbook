import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useCollections } from "~/state/collections-state";
import { cn } from "~/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

import { resolveSpellNames } from "~/api/spells";
import { useUserPrefs } from "~/state/user-prefs-state";
import type { ResolveSpellNamesResponse } from "@dnd/contracts";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { Link } from "react-router";
import {
  collectSelectedSpellIds,
  countAddableRows,
  mapResolvedRows,
  parseTsvNames,
  setAmbiguousPickedId,
  summarizeRows,
  type ResolvedRow,
} from "./prepared-import-model";

type BulkPasteDialogProps = {
  bookId: string;
  triggerLabel?: string;
  className?: string;
};

export function BulkPasteDialog({
  bookId,
  triggerLabel = "Bulk Paste",
  className,
}: BulkPasteDialogProps) {
  const { t } = useTranslation("collections");
  const { preparedBook } = useCollections();
  const { queryKey, name } = useAppI18n();
  const { state } = useUserPrefs();
  const rulebookIds = state.selectedRulebookIds ?? [];
  const { metaName } = useMetaNames();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ResolvedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = useMemo(() => parseTsvNames(text), [text]);
  const addableCount = useMemo(() => countAddableRows(rows), [rows]);
  const summary = useMemo(() => summarizeRows(rows), [rows]);

  const mutation = useMutation({
    mutationKey: [
      "spells-resolve",
      { names, rulebookIds: rulebookIds.join(","), ...queryKey },
    ],
    mutationFn: async (): Promise<ResolveSpellNamesResponse> => {
      return resolveSpellNames(names, rulebookIds);
    },
    onMutate: () => {
      setError(null);
    },
    onSuccess: (data) => {
      setRows(
        mapResolvedRows(data, {
          getCandidateName: (c) => name(c),
          getRulebookName: (rb) => metaName("rulebooks", rb),
        }),
      );
    },
    onError: (e: any) => {
      setError(e?.message ?? t("bulk-paste.resolve-failed"));
    },
  });

  const canResolve = names.length > 0 && !mutation.isPending;

  function onClearPrepared() {
    preparedBook.clear(bookId);
  }

  function onClearInput() {
    setText("");
    setError(null);
    mutation.reset();
  }

  function onResolve() {
    if (!canResolve) return;
    mutation.mutate();
  }

  function onAddSelected() {
    const ids = collectSelectedSpellIds(rows);
    if (ids.length === 0) return;
    for (const id of ids) preparedBook.add(bookId, id);
  }

  function onClose() {
    setOpen(false);
    setError(null);
    mutation.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : onClose())}>
      <DialogTrigger asChild>
        <Button className={className} size="sm" variant="outline">
          {triggerLabel === "Bulk Paste" ? t("bulk-paste.title") : triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("bulk-paste.title")}</DialogTitle>
          <DialogDescription>{t("bulk-paste.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("bulk-paste.example-text")}
            rows={8}
            disabled={mutation.isPending}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>{t("bulk-paste.parsed-count", { count: names.length })}</div>
            <div className="truncate">
              {t("bulk-paste.rulebook-scope", { count: rulebookIds.length })}
            </div>
          </div>

          {error && (
            <Card className="gap-0 border-destructive/40">
              <CardHeader className="gap-1 py-2">
                <CardDescription className="text-destructive">
                  {error}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {rows && (
            <>
              <Card className="gap-0 bg-muted/30">
                <CardHeader className="gap-1 py-2">
                  <CardTitle className="text-sm font-medium">
                    {t("bulk-paste.ready-count", {
                      count: addableCount,
                    })}
                  </CardTitle>
                  <CardDescription>
                    {t("bulk-paste.resolve-summary",
                      {
                        resolved: summary.resolved,
                        conflicts: summary.conflicts,
                        notFound: summary.notFound,
                      },
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="gap-0">
                <CardHeader className="gap-1 px-4 py-2">
                  <CardDescription>
                    {t("bulk-paste.conflicts-help",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-2 pt-0">
                  {rows.some((r) => r.status === "ambiguous") && (
                    <div>
                      <Card className="gap-0 overflow-hidden">
                        <CardContent className="max-h-64 overflow-auto px-0 py-0">
                          {rows
                            .filter((r) => r.status === "ambiguous")
                            .map((r) => {
                              const row = r as Extract<
                                ResolvedRow,
                                { status: "ambiguous" }
                              >;
                              return (
                                <Card
                                  key={row.key}
                                  className="gap-0 py-0 rounded-none border-0 border-b last:border-b-0 shadow-none"
                                >
                                  <CardHeader className="gap-1 px-3 py-0">
                                    <CardTitle className="text-sm">
                                      {row.input}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-1 px-3 pb-2 pt-0 text-sm">
                                    {row.candidates.map((c) => {
                                      const picked = c.id === row.pickedId;
                                      const isDefault =
                                        c.id === row.defaultPickedId;

                                      return (
                                        <div
                                          key={c.id}
                                          className={cn(
                                            "flex items-center justify-between gap-2 rounded border px-2 py-0.5",
                                            picked ? "bg-muted/50" : "",
                                          )}
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 truncate">
                                              <Link
                                                to={`/spells/${c.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="truncate hover:underline"
                                              >
                                                {c.name} - {c.rulebookName}
                                              </Link>
                                              {isDefault && (
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                  {t("common.default")}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <Button
                                            size="sm"
                                            variant={
                                              picked ? "secondary" : "outline"
                                            }
                                            onClick={() => {
                                              setRows((prev) =>
                                                setAmbiguousPickedId(
                                                  prev,
                                                  row.key,
                                                  c.id,
                                                ),
                                              );
                                            }}
                                          >
                                            {picked ? t("bulk-paste.picked") : t("bulk-paste.pick")}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>

              {rows.some((r) => r.status === "not_found") && (
                <Card className="gap-0">
                  <CardHeader className="gap-1 px-4 py-1">
                    <CardTitle className="text-sm">{t("bulk-paste.not-found-title")}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid max-h-40 grid-cols-1 gap-1 overflow-auto px-4 pb-2 pt-0 sm:grid-cols-3">
                    {rows
                      .filter((r) => r.status === "not_found")
                      .map((r) => (
                        <div
                          key={r.key}
                          className="rounded-md border px-2 py-1 text-sm text-muted-foreground"
                        >
                          {r.input}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClearInput}
              disabled={mutation.isPending}
            >
              {t("bulk-paste.clear-input")}
            </Button>

            <Button
              variant="destructive"
              onClick={onClearPrepared}
              disabled={mutation.isPending}
            >
              {t("bulk-paste.clear-prepared")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              {t("actions.close")}
            </Button>

            <Button onClick={onResolve} disabled={!canResolve}>
              {mutation.isPending ? t("bulk-paste.resolving") : t("bulk-paste.resolve")}
            </Button>

            <Button
              onClick={onAddSelected}
              disabled={mutation.isPending || !rows || addableCount === 0}
            >
              {t("bulk-paste.add-selected")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
