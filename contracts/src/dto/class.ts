import type { I18nNameOverlay } from "../i18n.js";

export type Class = {
  id: number;
  slug: string;
  name: string;
  prestige: boolean;
};

export type ClassView = Class & {
  i18n?: I18nNameOverlay | undefined;
};

export type ClassListResponse = {
  includePrestige: boolean;
  rulebookIds: number[];
  items: ClassView[];
};
