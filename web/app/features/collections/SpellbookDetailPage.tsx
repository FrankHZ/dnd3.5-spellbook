import { Link, useParams } from "react-router";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { useCollections } from "~/state/collections-state";
import { getSpellDetail, getSpellsBatch } from "~/api/spells";
import { Separator } from "~/components/ui/separator";
import { SpellCard } from "~/components/SpellCard";

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

  const ids = book.spellIds;
  const batchQuery = useQuery({
    queryKey: ["spellbook-batch", bookId, ids.join(",")],
    queryFn: ({ signal }) => getSpellsBatch(ids, signal),
    enabled: ids.length > 0,
  });

  const isLoading = batchQuery.isLoading;
  const hasError = batchQuery.isError;

  const spells = batchQuery.data?.items ?? [];
  const missingIds = batchQuery.data?.missingIds ?? [];

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
                Please try again later.
              </div>
            </div>
          )}

          {missingIds.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              Some spells are missing (deleted or unavailable):{" "}
              {missingIds.join(", ")}
            </div>
          )}

          <div className="divide-y rounded-md border">
            {spells.map((sp) => (
              <SpellCard key={sp.id} spell={sp} showActions={true} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
