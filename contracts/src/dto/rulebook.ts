import type { I18nNameOverlay } from "../i18n.js";

export type RulebookId = number;

export type PublicationCategory =
  | "core"
  | "supplement"
  | "setting"
  | "magazine"
  | "other";

export type PublicationSourceKind =
  | "rulebook"
  | "magazine"
  | "web"
  | "other";

export type PublicationReviewStatus = "accepted" | "review" | "deferred";

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
  displayAbbr?: string | undefined;
  displayName?: string | undefined;
  publicationCategory?: PublicationCategory | undefined;
  publicationFamily?: string | undefined;
  publicationSourceKind?: PublicationSourceKind | undefined;
  publicationDisplayOrder?: number | undefined;
  publicationReviewStatus?: PublicationReviewStatus | undefined;
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
