import { useBootstrap } from "~/bootstrap/useBootstrap";

export function useMetaI18n() {
  const boot = useBootstrap();
  return boot.metaI18n.data;
}
