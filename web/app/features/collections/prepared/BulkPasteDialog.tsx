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

type BulkPasteDialogProps = {
  triggerLabel?: string;
  className?: string;
};

type CandidateItem = {
  id: number;
  name: string;
  rulebookId: number;
  rulebookName: string;
};

type ResolvedRow =
  | { key: string; input: string; status: "not_found" }
  | { key: string; input: string; status: "resolved"; spellId: number }
  | {
      key: string;
      input: string;
      status: "ambiguous";
      candidates: CandidateItem[];
      pickedId: number; // always set (default pick)
      defaultPickedId: number;
    };

function parseTsvNames(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/[\t\n]/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function BulkPasteDialog({
  triggerLabel = "Bulk Paste",
  className,
}: BulkPasteDialogProps) {
  const { addPrepared, clearPrepared } = useCollections();
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
      // Build rows in input order (backend should already preserve order)
      const nextRows: ResolvedRow[] = data.results.map((r, idx) => {
        const key = `${idx}-${r.input}`; // stable enough for this dialog session

        if (r.status === "resolved") {
          return {
            key,
            input: r.input,
            status: "resolved",
            spellId: r.spellId,
          };
        }

        if (r.status === "not_found") {
          return { key, input: r.input, status: "not_found" };
        }

        // ambiguous: default pick = first candidate (backend order)
        const candidates: CandidateItem[] = r.candidates.map((c) => ({
          id: c.id,
          name: name(c),
          rulebookId: c.rulebook.id,
          rulebookName: metaName("rulebooks", c.rulebook),
        }));

        candidates.sort(
          (a, b) => b.rulebookId - a.rulebookId || b.id - a.id, // stable fallback
        );

        const defaultPickedId = candidates[0]?.id ?? 0;

        return {
          key,
          input: r.input,
          status: "ambiguous",
          candidates,
          pickedId: defaultPickedId,
          defaultPickedId,
        };
      });

      setRows(nextRows);
    },
    onError: (e: any) => {
      setError(e?.message ?? "Failed to resolve names");
    },
  });

  const canResolve = names.length > 0 && !mutation.isPending;

  const addableCount = useMemo(() => {
    if (!rows) return 0;
    let n = 0;
    for (const r of rows) {
      if (r.status === "resolved") n += 1;
      if (r.status === "ambiguous" && r.pickedId > 0) n += 1;
    }
    return n;
  }, [rows]);

  function onClearPrepared() {
    clearPrepared();
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
    if (!rows) return;

    const ids: number[] = [];
    for (const r of rows) {
      if (r.status === "resolved") ids.push(r.spellId);
      else if (r.status === "ambiguous" && r.pickedId > 0) ids.push(r.pickedId);
    }

    // incremental add (duplicates allowed)
    for (const id of ids) addPrepared(id);
  }

  function onClose() {
    setOpen(false);
    setError(null);
    mutation.reset();
  }

  const summary = useMemo(() => {
    if (!rows) {
      return {
        resolved: 0,
        conflicts: 0,
        notFound: 0,
      };
    }

    let resolved = 0;
    let conflicts = 0;
    let notFound = 0;

    for (const r of rows) {
      if (r.status === "resolved") resolved += 1;
      else if (r.status === "ambiguous") conflicts += 1;
      else if (r.status === "not_found") notFound += 1;
    }

    return { resolved, conflicts, notFound };
  }, [rows]);

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
                                        setRows((prev) => {
                                          if (!prev) return prev;
                                          return prev.map((x) => {
                                            if (x.key !== row.key) return x;
                                            if (x.status !== "ambiguous")
                                              return x;
                                            return { ...x, pickedId: c.id };
                                          });
                                        });
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
