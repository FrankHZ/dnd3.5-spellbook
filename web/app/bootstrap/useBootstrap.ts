import { useQuery } from "@tanstack/react-query";
import {
  getClasses,
  getDomains,
  getEditions,
  getRulebooks,
} from "~/api/bootstrap";
import { useAppI18n } from "~/i18n/useAppI18n";
import { usePersistedState } from "~/state/persisted-state";

export function useBootstrap(includePrestige: boolean) {
  const { state } = usePersistedState();
  const { queryKey } = useAppI18n();
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

  return {
    editions,
    rulebooks,
    classes,
    domains,
    isLoading: editions.isLoading || rulebooks.isLoading || classes.isLoading,
    error: editions.error || rulebooks.error || classes.error,
  };
}
