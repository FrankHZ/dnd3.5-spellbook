import { I18nNameOverlay } from "../i18n";

export type Domain = {
  id: number;
  slug: string;
  name: string;
};

export type DomainView = Domain & {
  i18n?: I18nNameOverlay | undefined;
};

export type DomainListResponse = {
  rulebookIds: number[];
  items: DomainView[];
};
