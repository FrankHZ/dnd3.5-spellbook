import { useQuery } from "@tanstack/react-query";
import {
  getClasses,
  getDomains,
  getEditions,
  getRulebooks,
} from "~/api/bootstrap";
import { getMetaI18n } from "~/api/meta";
import { useAppI18n } from "~/i18n/useAppI18n";
import { usePersistedState } from "~/state/persisted-state";

export function useBootstrap(includePrestige?: boolean) {
  const { state } = usePersistedState();
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
    staleTime: Infinity,
  });

  const domains = useQuery({
    queryKey: ["bootstrap", "domains", { rulebookKey, ...queryKey }],
    queryFn: ({ signal }) => getDomains(state.selectedRulebookIds, signal),
    staleTime: Infinity,
  });

  const metaI18n = useQuery({
    queryKey: ["metaI18n", { rulebookKey, ...queryKey }],
    enabled: lang === "zh", // meta is empty in en, skip network
    queryFn: ({ signal }) => getMetaI18n(signal),
    staleTime: 10 * 60 * 1000,
  });

  return {
    editions,
    rulebooks,
    classes,
    domains,
    metaI18n,
    isLoading:
      editions.isLoading ||
      rulebooks.isLoading ||
      classes.isLoading ||
      domains.isLoading ||
      metaI18n.isLoading,
    error:
      editions.error ||
      rulebooks.error ||
      classes.error ||
      domains.error ||
      metaI18n.error,
  };
}
