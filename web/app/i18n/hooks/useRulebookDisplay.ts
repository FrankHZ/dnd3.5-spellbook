import type { RulebookMin } from "@dnd/contracts";
import { useCallback } from "react";

import { getRulebookDisplay } from "~/i18n/display/rulebook";

import { useAppI18n } from "./useAppI18n";
import { useMetaI18n } from "./useMetaI18n";

export function useRulebookDisplay() {
  const { lang } = useAppI18n();
  const meta = useMetaI18n();

  const rulebookDisplay = useCallback(
    (rulebook: RulebookMin | null | undefined) =>
      getRulebookDisplay(meta, rulebook, lang),
    [lang, meta],
  );

  return { rulebookDisplay };
}
