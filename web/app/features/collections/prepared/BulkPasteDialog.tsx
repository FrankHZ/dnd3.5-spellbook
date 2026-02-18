import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

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
  const { preparedBook } = useCollections();
  const { queryKey } = useAppI18n();
  const { state } = useUserPrefs();
  const rulebookIds = state.selectedRulebookIds ?? [];

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const names = useMemo(() => parseTsvNames(text), [text]);

  // NEW: resolved rows + pick state
  const [rows, setRows] = useState<ResolvedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { metaName } = useMetaNames();
  const { name } = useAppI18n();

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
      // do NOT clear rows here: user may want to fix input and compare.
      // if you prefer: setRows(null);
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
      setError(e?.message ?? "Failed to resolve names");
    },
  });

  const canResolve = names.length > 0 && !mutation.isPending;

  const addableCount = useMemo(() => countAddableRows(rows), [rows]);

  function onClearPrepared() {
    preparedBook.clear(bookId);
  }

  function onClearInput() {
    setText("");
    setError(null);
    mutation.reset();
    // Keep rows so user can copy/fix from results if they want:
    // setRows(null);
  }

  function onResolve() {
    if (!canResolve) return;
    mutation.mutate();
  }

  function onAddSelected() {
    const ids = collectSelectedSpellIds(rows);
    if (ids.length === 0) return;

    // incremental add (duplicates allowed)
    for (const id of ids) preparedBook.add(bookId, id);
  }

  function onClose() {
    setOpen(false);
    setError(null);
    mutation.reset();
  }

  const summary = useMemo(() => summarizeRows(rows), [rows]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : onClose())}>
      <DialogTrigger asChild>
        <Button className={className} size="sm" variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Paste</DialogTitle>
          <DialogDescription>
            Paste spell names as TSV only. Use <b>Tab</b> between names (new
            lines are allowed). Spaces and commas are not delimiters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Magic Missile\tShield\tFireball\nHaste\tFly"}
            rows={8}
            disabled={mutation.isPending}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Parsed: <b>{names.length}</b> name(s)
            </div>
            <div className="truncate">
              Scope: <b>{rulebookIds.length}</b> rulebook(s)
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
                  Ready to add <b>{addableCount}</b> entry(ies)
                </div>
                <div className="mt-1 text-muted-foreground">
                  {summary.resolved} resolved · {summary.conflicts} conflict
                  {summary.conflicts !== 1 ? "s" : ""} · {summary.notFound} not
                  found
                </div>
              </div>

              {/* Conflicts */}
              {rows.some((r) => r.status === "ambiguous") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Conflicts</div>
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
                                            (picked)
                                          </span>
                                        )}
                                        {isDefault && !picked && (
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            (default)
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
                                      {picked ? "Picked" : "Pick"}
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
                    Conflicts are shown here. Default is pre-picked, but we can
                    choose a different candidate before adding.
                  </div>
                </div>
              )}

              {/* Not found */}
              {rows.some((r) => r.status === "not_found") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Not found</div>
                  <div className="max-h-40 overflow-auto rounded-md border">
                    {rows
                      .filter((r) => r.status === "not_found")
                      .map((r) => (
                        <div
                          key={r.key}
                          className="border-b p-2 text-sm last:border-b-0"
                        >
                          <div className="font-medium">{r.input}</div>
                          <div className="text-muted-foreground">Not found</div>
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
              Clear Input
            </Button>

            <Button
              variant="destructive"
              onClick={onClearPrepared}
              disabled={mutation.isPending}
            >
              Clear Prepared
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Close
            </Button>

            <Button onClick={onResolve} disabled={!canResolve}>
              {mutation.isPending ? "Resolving…" : "Resolve"}
            </Button>

            <Button
              onClick={onAddSelected}
              disabled={mutation.isPending || !rows || addableCount === 0}
            >
              Add Selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
