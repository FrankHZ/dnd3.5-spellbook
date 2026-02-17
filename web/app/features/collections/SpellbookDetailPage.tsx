import { Link, useParams } from "react-router";

import { useCollections } from "~/state/collections-state";

import { getBook } from "~/storage/collections";
import { SpellIdBookDetail } from "./SpellIdBookDetail";
import { PreparedBookDetail } from "./prepared/PreparedBookDetail";

export default function SpellbookDetailPage() {
  const { id } = useParams();
  const bookId = id ?? "";

  const { collections } = useCollections();
  const book = getBook(collections, bookId) ?? null;

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

  return (
    <div className="p-4 space-y-4 max-w-8xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{book.name}</h1>
        </div>

        <Link to="/spellbooks" className="text-sm underline">
          Back
        </Link>
      </div>

      {book.kind === "spellbook" && <SpellIdBookDetail book={book} />}
      {book.kind === "prepared" && <PreparedBookDetail book={book} />}
    </div>
  );
}
