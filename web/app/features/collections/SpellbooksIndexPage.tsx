import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useCollections } from "~/state/collections-state";
import { getCollectionDisplayName } from "./collection-display-name";

export default function SpellbooksIndexPage() {
  const { collections } = useCollections();
  const { t } = useTranslation("collections");
  const { t: tDefault } = useTranslation("collections-default");
  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Spellbooks</h1>
        <div className="text-sm text-muted-foreground">
          {t("Local-only collections.")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {collections.books.map((b) => (
          <Link
            key={b.id}
            to={`/spellbooks/${b.id}`}
            className="rounded-md border p-4 hover:bg-muted/40"
          >
            <div className="font-medium">
              {getCollectionDisplayName(b, tDefault)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {b.kind == "prepared"
                ? t("{{entryCount}} entries.", { entryCount: b.entries.length })
                : t("{{spellCount}} spells.", {
                    spellCount: b.spellIds.length,
                  })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
