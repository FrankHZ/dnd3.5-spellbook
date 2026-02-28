import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { useCollections } from "~/state/collections-state";
import { getBook } from "~/storage/collections";
import { PreparedBookDetail } from "./prepared/PreparedBookDetail";
import { PreparedBookJsonActions } from "./prepared/PreparedBookJsonActions";
import { SpellIdBookDetail } from "./spell-id/SpellIdBookDetail";
import { SpellIdBookJsonActions } from "./spell-id/SpellIdBookJsonActions";
import { getCollectionDisplayName } from "./collection-display-name";

export default function SpellbookDetailPage() {
  const { t } = useTranslation("collections");
  const { t: tDefault } = useTranslation("collections-default");
  const { id } = useParams();
  const bookId = id ?? "";
  const { collections } = useCollections();
  const book = getBook(collections, bookId) ?? null;

  if (!book) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">{t("Spellbook not found")}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t("Unknown book id: {{bookId}}", { bookId })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-8xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {getCollectionDisplayName(book, tDefault)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {book.kind === "prepared" && <PreparedBookJsonActions book={book} />}
          {book.kind === "spellbook" && <SpellIdBookJsonActions book={book} />}

          <Link to="/spellbooks" className="text-sm underline">
            {t("Back")}
          </Link>
        </div>
      </div>

      {book.kind === "spellbook" && <SpellIdBookDetail book={book} />}
      {book.kind === "prepared" && <PreparedBookDetail book={book} />}
    </div>
  );
}
