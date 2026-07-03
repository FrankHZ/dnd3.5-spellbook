import { useUserPrefs } from "~/state/user-prefs-state";
import type { GroupMode } from "./BrowseOptionsToggle";

export function useBrowsePrefs() {
  const { state, setState } = useUserPrefs();

  const groupMode = state.browsePrefs?.groupMode ?? "grouped";

  function setGroupMode(v: GroupMode) {
    setState((s) => ({
      ...s,
      browsePrefs: { ...(s.browsePrefs ?? {}), groupMode: v },
    }));
  }

  return { groupMode, setGroupMode };
}
