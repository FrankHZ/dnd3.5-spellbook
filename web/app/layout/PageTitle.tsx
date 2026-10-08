import { useLocation, useMatch } from "react-router";
import { useTranslation } from "react-i18next";
import { useSpellDetail } from "~/features/spells/useSpellDetail";
import { getCollectionDisplayName } from "~/features/collections/collection-display-name";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useCollections } from "~/state/collections-state";
import { getBook } from "~/storage/collections";

const SITE_TITLE = "D&D 3.5 Spellbook";

export default function PageTitle() {
  const { pathname } = useLocation();
  const spellMatch = useMatch("/spells/:id");
  const bookMatch = useMatch("/spellbooks/:id");
  const { query } = useSpellDetail(spellMatch?.params.id);
  const { spellName } = useAppI18n();
  const { collections } = useCollections();
  const { t } = useTranslation([
    "topbar",
    "publications",
    "collections",
    "collections-default",
    "settings",
    "about",
  ]);

  const pageNames: Record<string, string> = {
    "/search": t("nav.search"),
    "/publications": t("page.title", { ns: "publications" }),
    "/spellbooks": t("books.title", { ns: "collections" }),
    "/settings": t("page.title", { ns: "settings" }),
    "/about": t("page.title", { ns: "about" }),
  };
  let pageName = pageNames[pathname];
  if (spellMatch) {
    pageName = query.isSuccess ? spellName(query.data) : t("nav.spell");
  } else if (bookMatch) {
    const book = getBook(collections, bookMatch.params.id ?? "");
    pageName = book
      ? getCollectionDisplayName(book, (key) =>
          t(key, { ns: "collections-default" }),
        )
      : t("books.title", { ns: "collections" });
  }

  // React hoists this single title into head and updates it with route/query state.
  return <title>{pageName ? `${pageName} — ${SITE_TITLE}` : SITE_TITLE}</title>;
}
