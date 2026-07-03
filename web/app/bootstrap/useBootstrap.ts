import type { ClassView, DomainView } from "@dnd/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getClasses,
  getDomains,
  getEditions,
  getRulebooks,
} from "~/api/bootstrap";
import { getMetaI18n, getSpellFilterVocabulary } from "~/api/meta";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useUserPrefs } from "~/state/user-prefs-state";

export function useBootstrap(includePrestige?: boolean) {
  const { state } = useUserPrefs();
  includePrestige = includePrestige ?? state.includePrestige;
  const { queryKey, lang } = useAppI18n();
  const rulebookKey = state.selectedRulebookIds.join(",");

  const editions = useQuery({
    queryKey: ["bootstrap", "editions", { ...queryKey }],
    queryFn: ({ signal }) => getEditions(signal),
    staleTime: Infinity,
  });

  const rulebooks = useQuery({
    queryKey: ["bootstrap", "rulebooks", { ...queryKey }],
    queryFn: ({ signal }) => getRulebooks(signal),
    staleTime: Infinity,
  });

  const classes = useQuery({
    queryKey: [
      "bootstrap",
      "classes",
      {
        includePrestige,
        rulebookKey,
        ...queryKey,
      },
    ],
    queryFn: ({ signal }) =>
      getClasses(includePrestige, state.selectedRulebookIds, signal),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  const domains = useQuery({
    queryKey: ["bootstrap", "domains", { rulebookKey, ...queryKey }],
    queryFn: ({ signal }) => getDomains(state.selectedRulebookIds, signal),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  const metaI18n = useQuery({
    queryKey: ["metaI18n", { ...queryKey }],
    enabled: lang === "zh", // meta is empty in en, skip network
    queryFn: ({ signal }) => getMetaI18n(signal),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  const spellFilterVocabulary = useQuery({
    queryKey: ["metaFilters", { ...queryKey }],
    queryFn: ({ signal }) => getSpellFilterVocabulary(signal),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  // convenience
  const classById = useMemo(() => {
    const m = new Map<number, ClassView>();
    for (const c of classes.data?.items ?? []) m.set(c.id, c);
    return m;
  }, [classes.data]);

  const domainById = useMemo(() => {
    const m = new Map<number, DomainView>();
    for (const d of domains.data?.items ?? []) m.set(d.id, d);
    return m;
  }, [domains.data]);

  return {
    editions,
    rulebooks,
    classes,
    classById,
    domains,
    domainById,
    metaI18n,
    spellFilterVocabulary,
    isLoading:
      (editions.isPending && !editions.data) ||
      (rulebooks.isPending && !rulebooks.data) ||
      (classes.isPending && !classes.data) ||
      (domains.isPending && !domains.data) ||
      (metaI18n.isFetching && !metaI18n.data) ||
      (spellFilterVocabulary.isPending && !spellFilterVocabulary.data),
    error:
      editions.error ||
      rulebooks.error ||
      classes.error ||
      domains.error ||
      metaI18n.error ||
      spellFilterVocabulary.error,
  };
}
