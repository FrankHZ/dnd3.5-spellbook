import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useCollections } from "~/state/collections-state";
import { getCollectionDisplayName } from "./collection-display-name";

export default function SpellbooksIndexPage() {
  const { collections } = useCollections();
  const { t } = useTranslation("collections");
  const { t: tDefault } = useTranslation("collections-default");
  return (
    <div className="page-single">
      <div className="space-y-1 px-1">
        <h1 className="text-lg font-semibold">{t("Spellbooks")}</h1>
        <div className="text-sm text-muted-foreground">
          {t("Local-only collections.")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {collections.books.map((b) => (
          <Card
            key={b.id}
            className="gap-0 p-1 transition-colors hover:bg-muted/30"
          >
            <CardHeader className="gap-1 py-3">
              <CardTitle className="text-base">
                <Link to={`/spellbooks/${b.id}`} className="hover:underline">
                  {getCollectionDisplayName(b, tDefault)}
                </Link>
              </CardTitle>
              <CardDescription>
                {b.kind == "prepared"
                  ? t("{{entryCount}} entries.", {
                      entryCount: b.entries.length,
                    })
                  : t("{{spellCount}} spells.", {
                      spellCount: b.spellIds.length,
                    })}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
