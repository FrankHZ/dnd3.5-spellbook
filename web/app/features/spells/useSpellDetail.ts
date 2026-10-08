import { useQuery } from "@tanstack/react-query";
import { getSpellDetail } from "~/api/spells";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";

export function useSpellDetail(id: string | undefined) {
  const { queryKey } = useAppI18n();
  const idNum = Number(id);
  const isValidId = Number.isInteger(idNum) && idNum > 0;
  const query = useQuery({
    queryKey: ["spellDetail", { idNum, ...queryKey }],
    enabled: isValidId,
    queryFn: ({ signal }) => getSpellDetail(idNum, signal),
  });
  return { idNum, isValidId, query };
}
