import { usePersistedState } from "~/state/persisted-state";
import type { CardViewMode, GroupMode } from "./BrowseOptionsToggle";

export function useBrowsePrefs() {
  const { state, setState } = usePersistedState();

  const cardView = state.browsePrefs?.cardView ?? "simple";
  const groupMode = state.browsePrefs?.groupMode ?? "grouped";

  function setCardView(v: CardViewMode) {
    setState((s) => ({
      ...s,
      browsePrefs: { ...(s.browsePrefs ?? {}), cardView: v, groupMode },
    }));
  }

  function setGroupMode(v: GroupMode) {
    setState((s) => ({
      ...s,
      browsePrefs: { ...(s.browsePrefs ?? {}), groupMode: v, cardView },
    }));
  }

  return { cardView, groupMode, setCardView, setGroupMode };
}
