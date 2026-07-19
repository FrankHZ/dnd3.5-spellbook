import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { PageHeader } from "~/components/PageHeader";
import { useCollections } from "~/state/collections-state";
import { getCollectionDisplayName } from "./collection-display-name";

export default function SpellbooksIndexPage() {
  const { collections } = useCollections();
  const { t } = useTranslation("collections");
  const { t: tDefault } = useTranslation("collections-default");
  return (
    <div className="page-single">
      <PageHeader
        title={t("books.title")}
        description={t("books.local-only-description")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {collections.books.map((b) => (
          <Link
            key={b.id}
            to={`/spellbooks/${b.id}`}
            className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="app-directory-card h-full gap-0 p-1">
              <CardHeader className="gap-1 py-3">
                <CardTitle className="text-base">
                  {getCollectionDisplayName(b, tDefault)}
                </CardTitle>
                <CardDescription>
                  {b.kind == "prepared"
                    ? t("books.entry-summary", {
                        entryCount: b.entries.length,
                      })
                    : t("books.spell-summary", {
                        spellCount: b.spellIds.length,
                      })}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
