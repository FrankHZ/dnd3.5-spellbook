import type { I18nNameOverlay } from "../i18n.js";

export type RulebookId = number;

export type Edition = {
  id: number;
  name: string;
  system: string;
  slug: string;
  core: boolean;
};

export type RulebookMin = {
  id: RulebookId;
  abbr: string;
  name: string;
};

export type Rulebook = RulebookMin & {
  slug: string;
  edition: Edition;
};

export type RulebookView = Rulebook & {
  i18n?: I18nNameOverlay | undefined;
};

export type EditionListResponse = {
  items: Edition[];
};

export type RulebookListResponse = {
  items: Rulebook[];
};
