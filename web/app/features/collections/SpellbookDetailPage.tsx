import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
        <Card className="gap-0">
          <CardHeader className="gap-1 py-3">
            <CardTitle>{t("Spellbook not found")}</CardTitle>
            <CardDescription>
              {t("Unknown book id: {{bookId}}", { bookId })}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const pageClass = book.kind === "prepared" ? "page-wide" : "page-single";

  return (
    <div className={pageClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {getCollectionDisplayName(book, tDefault)}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {book.kind === "prepared" && <PreparedBookJsonActions book={book} />}
          {book.kind === "spellbook" && <SpellIdBookJsonActions book={book} />}

          <Button asChild size="xs" variant="outline">
            <Link to="/spellbooks">{t("Back")}</Link>
          </Button>
        </div>
      </div>

      {book.kind === "spellbook" && <SpellIdBookDetail book={book} />}
      {book.kind === "prepared" && <PreparedBookDetail book={book} />}
    </div>
  );
}
