import { useQuery } from "@tanstack/react-query";
import {
  getClasses,
  getDomains,
  getEditions,
  getRulebooks,
} from "~/api/bootstrap";
import { usePersistedState } from "~/state/persisted-state";

export function useBootstrap(includePrestige: boolean) {
  const { state } = usePersistedState();

  const editions = useQuery({
    queryKey: ["bootstrap", "editions"],
    queryFn: ({ signal }) => getEditions(signal),
    staleTime: Infinity,
  });

  const rulebooks = useQuery({
    queryKey: ["bootstrap", "rulebooks"],
    queryFn: ({ signal }) => getRulebooks(signal),
    staleTime: Infinity,
  });

  const classes = useQuery({
    queryKey: [
      "bootstrap",
      "classes",
      includePrestige,
      state.selectedRulebookIds,
    ],
    queryFn: ({ signal }) =>
      getClasses(includePrestige, state.selectedRulebookIds, signal),
    staleTime: Infinity,
  });

  const domains = useQuery({
    queryKey: ["bootstrap", "domains", state.selectedRulebookIds],
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
