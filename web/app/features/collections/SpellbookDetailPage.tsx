import { Link, useParams } from "react-router";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { useCollections } from "~/state/collections-state";
import { getSpellDetail } from "~/api/spells";
import { Separator } from "~/components/ui/separator";
import { SpellCard } from "~/components/SpellCard";
import type { SpellDetail } from "@dnd/contracts";

const MAX_LOAD = 100;

export default function SpellbookDetailPage() {
  const { id } = useParams();
  const bookId = id ?? "";

  const { collections, toggleDefault, togglePrepared } = useCollections();

  const book = collections.books.find((b) => b.id === bookId) ?? null;

  if (!book) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">Spellbook not found</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Unknown book id: {bookId}
          </div>
        </div>
      </div>
    );
  }

  // Guard: avoid too many parallel requests
  const spellIdsToLoad = book.spellIds.slice(0, MAX_LOAD);
  const truncated = book.spellIds.length > MAX_LOAD;

  const queries = useQueries({
    queries: spellIdsToLoad.map((spellId) => ({
      queryKey: ["spellDetail", spellId],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getSpellDetail(spellId, signal),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const hasError = queries.some((q) => q.isError);

  const spells = useMemo(() => {
    // keep only successful ones, stable sort by name for nicer UX
    const items = queries
      .map((q) => q.data)
      .filter(Boolean) as Array<SpellDetail>;
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [queries]);

  function removeFromThisBook(spellId: number) {
    // MVP: only default + prepared exist; toggle is remove if present
    if (book?.id === "default") toggleDefault(spellId);
    else if (book?.id === "prepared") togglePrepared(spellId);
    // if later you add custom books, you'll add a generic toggleBook(bookId, spellId)
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{book.name}</h1>
          <div className="text-sm text-muted-foreground">
            {book.spellIds.length} spell(s)
            {truncated ? ` (showing first ${MAX_LOAD})` : ""}
          </div>
        </div>

        <Link to="/spellbooks" className="text-sm underline">
          Back
        </Link>
      </div>

      <Separator />

      {book.spellIds.length === 0 && (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          Empty.
        </div>
      )}

      {book.spellIds.length > 0 && (
        <>
          {isLoading && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Loading spells…
            </div>
          )}

          {hasError && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Some spells failed to load</div>
              <div className="mt-1 text-sm text-muted-foreground">
                You can still open loaded spells. (This will be solved post-MVP
                with batch fetch.)
              </div>
            </div>
          )}

          <div className="divide-y rounded-md border">
            {spells.map((sp) => (
              <SpellCard key={sp.id} spell={sp} showActions={true} />
            ))}
          </div>

          {truncated && (
            <div className="text-xs text-muted-foreground">
              Too many spells to load individually in MVP. Post-MVP we’ll use a
              batch endpoint.
            </div>
          )}
        </>
      )}
    </div>
  );
}
