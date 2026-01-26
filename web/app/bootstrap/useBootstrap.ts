import { useQuery } from "@tanstack/react-query";
import { getClasses, getEditions, getRulebooks } from "~/api/bootstrap";

export function useBootstrap(includePrestige: boolean) {
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
    queryKey: ["bootstrap", "classes", includePrestige],
    queryFn: ({ signal }) => getClasses(includePrestige, signal),
    staleTime: Infinity,
  });

  return {
    editions,
    rulebooks,
    classes,
    isLoading: editions.isLoading || rulebooks.isLoading || classes.isLoading,
    error: editions.error || rulebooks.error || classes.error,
  };
}
