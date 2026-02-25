import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAppI18n } from "~/i18n/useAppI18n";
import { useCollections } from "~/state/collections-state";
import { cn } from "~/lib/utils";

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
import { useMetaNames } from "~/i18n/useMetaNames";
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
      setError(e?.message ?? t("Failed to resolve names"));
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
          {triggerLabel === "Bulk Paste" ? t("Bulk Paste") : triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Bulk Paste")}</DialogTitle>
          <DialogDescription>{t("bulk-paste-description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("Magic Missile\tShield\tFireball\nHaste\tFly")}
            rows={8}
            disabled={mutation.isPending}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>{t("Parsed: {{count}} name(s)", { count: names.length })}</div>
            <div className="truncate">
              {t("Scope: {{count}} rulebook(s)", { count: rulebookIds.length })}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm">
              {error}
            </div>
          )}

          {rows && (
            <div className="rounded-md border p-2 space-y-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div>
                  {t("Ready to add {{count}} entry(ies)", {
                    count: addableCount,
                  })}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {t(
                    "{{resolved}} resolved | {{conflicts}} conflict(s) | {{notFound}} not found",
                    {
                      resolved: summary.resolved,
                      conflicts: summary.conflicts,
                      notFound: summary.notFound,
                    },
                  )}
                </div>
              </div>

              {rows.some((r) => r.status === "ambiguous") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Conflicts")}</div>
                  <div className="max-h-64 overflow-auto rounded-md border">
                    {rows
                      .filter((r) => r.status === "ambiguous")
                      .map((r) => {
                        const row = r as Extract<
                          ResolvedRow,
                          { status: "ambiguous" }
                        >;
                        return (
                          <div
                            key={row.key}
                            className="border-b p-2 text-sm last:border-b-0"
                          >
                            <div className="font-medium">{row.input}</div>

                            <div className="mt-2 space-y-1">
                              {row.candidates.map((c) => {
                                const picked = c.id === row.pickedId;
                                const isDefault = c.id === row.defaultPickedId;

                                return (
                                  <div
                                    key={c.id}
                                    className={cn(
                                      "flex items-center justify-between gap-2 rounded border px-2 py-1",
                                      picked ? "bg-muted/50" : "",
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate">
                                        <Link
                                          to={`/spells/${c.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="hover:underline block truncate"
                                        >
                                          {c.name} - {c.rulebookName}
                                        </Link>

                                        {picked && (
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            {t("(picked)")}
                                          </span>
                                        )}
                                        {isDefault && !picked && (
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            {t("(default)")}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant={picked ? "secondary" : "outline"}
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
                                      {picked ? t("Picked") : t("Pick")}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(
                      "Conflicts are shown here. Default is pre-picked, but we can choose a different candidate before adding.",
                    )}
                  </div>
                </div>
              )}

              {rows.some((r) => r.status === "not_found") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("Not found")}</div>
                  <div className="max-h-40 overflow-auto rounded-md border">
                    {rows
                      .filter((r) => r.status === "not_found")
                      .map((r) => (
                        <div
                          key={r.key}
                          className="border-b p-2 text-sm last:border-b-0"
                        >
                          <div className="font-medium">{r.input}</div>
                          <div className="text-muted-foreground">
                            {t("Not found")}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClearInput}
              disabled={mutation.isPending}
            >
              {t("Clear Input")}
            </Button>

            <Button
              variant="destructive"
              onClick={onClearPrepared}
              disabled={mutation.isPending}
            >
              {t("Clear Prepared")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              {t("Close")}
            </Button>

            <Button onClick={onResolve} disabled={!canResolve}>
              {mutation.isPending ? t("Resolving...") : t("Resolve")}
            </Button>

            <Button
              onClick={onAddSelected}
              disabled={mutation.isPending || !rows || addableCount === 0}
            >
              {t("Add Selected")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
