import type { SpellDetailView, SpellItemView } from "@dnd/contracts";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { searchSpellsByName } from "~/api/spells";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { useAppI18n } from "~/i18n/useAppI18n";
import { useUserPrefs } from "~/state/user-prefs-state";

const RELATED_SEARCH_PAGE_SIZE = 50;
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

function normalizeSpellName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

type VariantMatchContext =
  | {
      baseQuery: string;
      baseName: string;
      family: "modifier";
    }
  | {
      baseQuery: string;
      baseName: string;
      family: "roman";
      currentNumeral: string;
    }
  | {
      baseQuery: string;
      baseName: string;
      family: "base";
    };

function getVariantMatchContext(name: string): VariantMatchContext {
  const normalized = name.trim().replace(/\s+/g, " ");
  const modifierMatch = normalized.match(/^(.*?),\s*(.+)$/);

  if (modifierMatch) {
    const base = modifierMatch[1]?.trim();

    if (base) {
      return {
        baseQuery: base,
        baseName: normalizeSpellName(base),
        family: "modifier",
      };
    }
  }

  const numeralMatch = normalized.match(
    /^(.*?)\s+(I|II|III|IV|V|VI|VII|VIII|IX)$/i,
  );

  if (numeralMatch) {
    const base = numeralMatch[1]?.trim();
    const currentNumeral = (numeralMatch[2] ?? "").toUpperCase();

    if (base) {
      return {
        baseQuery: base,
        baseName: normalizeSpellName(base),
        family: "roman",
        currentNumeral,
      };
    }
  }

  return {
    baseQuery: normalized,
    baseName: normalizeSpellName(normalized),
    family: "base",
  };
}

function isVariantMatch(name: string, context: VariantMatchContext) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const normalizedLower = normalizeSpellName(normalized);

  if (context.family === "modifier" || context.family === "base") {
    if (normalizedLower === context.baseName) {
      return context.family === "modifier";
    }

    const modifierMatch = normalized.match(/^(.*?),\s*(.+)$/);
    if (!modifierMatch) {
      return false;
    }

    return normalizeSpellName(modifierMatch[1] ?? "") === context.baseName;
  }

  const numeralMatch = normalized.match(/^(.*?)\s+(I|II|III|IV|V|VI|VII|VIII|IX)$/i);
  if (!numeralMatch) {
    return false;
  }

  const itemBase = normalizeSpellName(numeralMatch[1] ?? "");
  const itemNumeral = (numeralMatch[2] ?? "").toUpperCase();

  return itemBase === context.baseName && itemNumeral !== context.currentNumeral;
}

function sortRelatedSpells(items: SpellItemView[]) {
  return [...items].sort((a, b) => {
    const rulebookCompare = (a.rulebook?.abbr ?? "").localeCompare(
      b.rulebook?.abbr ?? "",
    );

    if (rulebookCompare !== 0) {
      return rulebookCompare;
    }

    const pageA = a.page ?? Number.MAX_SAFE_INTEGER;
    const pageB = b.page ?? Number.MAX_SAFE_INTEGER;

    if (pageA !== pageB) {
      return pageA - pageB;
    }

    return a.id - b.id;
  });
}

function RelatedSpellList({
  title,
  items,
}: {
  title: string;
  items: SpellItemView[];
}) {
  const { nameWithEn } = useAppI18n();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="divide-y px-0 py-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <Button asChild variant="link" className="h-auto px-0 py-0 font-medium">
                <Link to={`/spells/${item.id}`}>{nameWithEn(item)}</Link>
              </Button>
              <div className="shrink-0 text-xs text-muted-foreground">
                <span className="font-mono">{item.rulebook?.abbr ?? "-"}</span>
                {item.page ? <span> - p. {item.page}</span> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RelatedSpellsSection({
  spell,
}: {
  spell: SpellDetailView;
}) {
  const { t } = useTranslation("spell-detail");
  const { lang, name } = useAppI18n();
  const { state } = useUserPrefs();
  const rulebookIds = state.selectedRulebookIds;
  const resolvedRulebookIds = rulebookIds.length > 0 ? rulebookIds : undefined;
  const localizedName =
    lang === "en" ? "" : (spell.i18n?.name?.trim().replace(/\s+/g, " ") ?? "");

  const relatedQuery = useQuery({
    queryKey: [
      "spell-related",
      { id: spell.id, name: spell.name, localizedName, lang, rulebookIds },
    ],
    queryFn: async ({ signal }) => {
      const exactName = normalizeSpellName(spell.name);
      const localizedExactName =
        localizedName && normalizeSpellName(localizedName) !== exactName
          ? normalizeSpellName(localizedName)
          : null;
      const variantContext = getVariantMatchContext(spell.name);
      const [sameNameResponse, localizedSameNameResponse, variantResponse] =
        await Promise.all([
          searchSpellsByName({
            q: spell.name,
            rulebookIds: resolvedRulebookIds,
            page: 1,
            pageSize: RELATED_SEARCH_PAGE_SIZE,
            signal,
          }),
          localizedExactName
            ? searchSpellsByName({
                q: localizedName,
                rulebookIds: resolvedRulebookIds,
                page: 1,
                pageSize: RELATED_SEARCH_PAGE_SIZE,
                signal,
              })
            : Promise.resolve(null),
          searchSpellsByName({
            q: variantContext.baseQuery,
            rulebookIds: resolvedRulebookIds,
            page: 1,
            pageSize: RELATED_SEARCH_PAGE_SIZE,
            signal,
          }),
        ]);

      const sameName = new Map<number, SpellItemView>();

      for (const response of [sameNameResponse, localizedSameNameResponse]) {
        if (!response) {
          continue;
        }

        for (const item of response.items as SpellItemView[]) {
          if (item.id === spell.id) {
            continue;
          }

          const itemName = normalizeSpellName(item.name);
          const itemResolvedName =
            localizedExactName !== null ? normalizeSpellName(name(item)) : null;

          if (
            itemName === exactName ||
            (localizedExactName !== null &&
              itemResolvedName === localizedExactName)
          ) {
            sameName.set(item.id, item);
          }
        }
      }

      const variants = new Map<number, SpellItemView>();

      for (const item of variantResponse.items as SpellItemView[]) {
        if (item.id === spell.id) {
          continue;
        }

        if (normalizeSpellName(item.name) === exactName) {
          continue;
        }

        if (!isVariantMatch(item.name, variantContext)) {
          continue;
        }

        variants.set(item.id, item);
      }

      return {
        sameName: sortRelatedSpells(Array.from(sameName.values())),
        variants: sortRelatedSpells(Array.from(variants.values())),
      };
    },
  });

  if (relatedQuery.isLoading) {
    return (
      <Card className="gap-0">
        <CardHeader className="py-3">
          <CardDescription>{t("Loading related spells...")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (relatedQuery.isError) {
    return null;
  }

  const sameName = relatedQuery.data?.sameName ?? [];
  const variants = relatedQuery.data?.variants ?? [];

  if (sameName.length === 0 && variants.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label={t("Related Spells")}>
      <div>
        <h2 className="text-base font-semibold">{t("Related Spells")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Exact-name matches and supported English variant forms.")}
        </p>
      </div>
      <RelatedSpellList title={t("Same Name")} items={sameName} />
      <RelatedSpellList title={t("Variant Forms")} items={variants} />
    </section>
  );
}
