import { useUserPrefs } from "~/state/user-prefs-state";
import type {
  DisplayPrefs,
  RulebookLabelStyle,
  SpellCardDetailMode,
  SpellListDensity,
} from "~/storage/userPrefs.type";

export function useDisplayPrefs() {
  const { state, setState } = useUserPrefs();
  const displayPrefs = state.displayPrefs;

  function setDisplayPrefs(patch: Partial<DisplayPrefs>) {
    setState((s) => {
      const nextDisplayPrefs = {
        ...s.displayPrefs,
        ...patch,
      };
      return {
        ...s,
        displayPrefs: nextDisplayPrefs,
        browsePrefs: {
          ...s.browsePrefs,
          cardView:
            nextDisplayPrefs.spellCardDetails === "full" ? "all" : "simple",
        },
      };
    });
  }

  function setSpellListDensity(spellListDensity: SpellListDensity) {
    setDisplayPrefs({ spellListDensity });
  }

  function setSpellCardDetails(spellCardDetails: SpellCardDetailMode) {
    setDisplayPrefs({ spellCardDetails });
  }

  function setZhSpellNamesWithEnglish(spellNamesWithEnglish: boolean) {
    setDisplayPrefs({
      zhDisplay: { ...displayPrefs.zhDisplay, spellNamesWithEnglish },
    });
  }

  function setZhClassDomainLabelsWithEnglish(
    classDomainLabelsWithEnglish: boolean,
  ) {
    setDisplayPrefs({
      zhDisplay: {
        ...displayPrefs.zhDisplay,
        classDomainLabelsWithEnglish,
      },
    });
  }

  function setZhFilterFacetLabelsWithEnglish(
    filterFacetLabelsWithEnglish: boolean,
  ) {
    setDisplayPrefs({
      zhDisplay: {
        ...displayPrefs.zhDisplay,
        filterFacetLabelsWithEnglish,
      },
    });
  }

  function setZhRulebookLabelStyle(rulebookLabelStyle: RulebookLabelStyle) {
    setDisplayPrefs({
      zhDisplay: { ...displayPrefs.zhDisplay, rulebookLabelStyle },
    });
  }

  return {
    ...displayPrefs,
    setSpellListDensity,
    setSpellCardDetails,
    setZhSpellNamesWithEnglish,
    setZhClassDomainLabelsWithEnglish,
    setZhFilterFacetLabelsWithEnglish,
    setZhRulebookLabelStyle,
  };
}
