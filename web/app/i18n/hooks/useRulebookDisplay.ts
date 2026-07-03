import type { RulebookMin } from "@dnd/contracts";
import { useCallback } from "react";

import { getRulebookDisplay } from "~/i18n/display/rulebook";

import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "./useAppI18n";
import { useMetaI18n } from "./useMetaI18n";

export function useRulebookDisplay() {
  const { lang } = useAppI18n();
  const meta = useMetaI18n();
  const { zhDisplay } = useDisplayPrefs();
  const rulebookDisplayLang =
    lang === "zh" && zhDisplay.rulebookLabelStyle === "english" ? "en" : lang;

  const rulebookDisplay = useCallback(
    (rulebook: RulebookMin | null | undefined) =>
      getRulebookDisplay(meta, rulebook, rulebookDisplayLang),
    [meta, rulebookDisplayLang],
  );

  return { rulebookDisplay };
}
