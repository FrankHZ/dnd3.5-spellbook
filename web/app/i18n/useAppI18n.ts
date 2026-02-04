import { usePersistedState } from "~/state/persisted-state";

export function useAppI18n() {
  const { state } = usePersistedState();

  const lang = (state.uiPrefs.lang ?? "en") as "en" | "zh";
  const variant = lang === "zh" ? state.uiPrefs.zhVariant : undefined;

  // For query keys, keep stable primitive strings
  const queryKey = {
    lang,
    variant: variant ?? "",
  };

  return { lang, variant, queryKey };
}
