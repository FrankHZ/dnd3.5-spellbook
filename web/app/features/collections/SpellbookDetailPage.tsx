import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/PageHeader";
import { StatusCard } from "~/components/StatusCard";
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
      <div className="page-single">
        <StatusCard
          title={t("books.not-found-title")}
          description={t("books.unknown-id", { bookId })}
        />
      </div>
    );
  }

  const pageClass = book.kind === "prepared" ? "page-wide" : "page-single";

  return (
    <div className={pageClass}>
      <PageHeader
        title={getCollectionDisplayName(book, tDefault)}
        actions={
          <>
            {book.kind === "prepared" && (
              <PreparedBookJsonActions book={book} />
            )}
            {book.kind === "spellbook" && (
              <SpellIdBookJsonActions book={book} />
            )}

            <Button asChild size="xs" variant="outline">
              <Link to="/spellbooks">{t("actions.back")}</Link>
            </Button>
          </>
        }
      />

      {book.kind === "spellbook" && <SpellIdBookDetail book={book} />}
      {book.kind === "prepared" && <PreparedBookDetail book={book} />}
    </div>
  );
}
