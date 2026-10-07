export type Lang = "en" | "zh";

export type I18nContext = {
  lang: Lang;
  variant?: string | undefined;
};

export type I18nNameOverlay = {
  lang: "zh";
  variant?: string | undefined;
  name?: string | undefined;
};

export type I18nSpellSummaryOverlay = {
  lang: Lang;
  variant?: string | undefined;
  shortDescription?: string | undefined;
  sourceKey?: string | undefined;
};

export type I18nSpellOverlay = {
  nameProvenance?: SpellFieldProvenance | undefined;
  lang?: "zh" | undefined;
  variant?: string | undefined;
  name?: string | undefined;
  summary?: I18nSpellSummaryOverlay | undefined;
};

/** Safe field metadata for the selected effective overlay; private evidence stays internal. */
export type SpellFieldProvenance = {
  schemaVersion: 1;
  language: Lang;
  acceptedRevision: string;
  /** Review is independent of the original field owner, including retained CHM. */
  review?: { disposition: "source-reviewed-retention" | "accepted-native-source-bound" |
    "accepted" | "accepted-with-source-issues"; acceptedRevision: string;
    originalEntryReviewed: true; sourceQuestionIds: string[] } | {
      kind: "DB-English"; disposition: "DB-English-reviewed"; acceptedRevision: string;
      composition?: "Chinese" | "mixed";
      residual?: {kind: "retained-DB-English"; clauses: 1; ownerIssue: 160};
    };
  /** Current reviewed body authority; origin below is the original field owner. */
  amendment?: { kind: "accepted-body-amendment"; acceptedRevision: string;
    priorAcceptedRevision: string; status: "accepted" | "accepted-with-source-issues";
    priorAmendment?: { acceptedRevision: string; status: "accepted" | "accepted-with-source-issues" } };
  origin:
    | { kind: "native" | "chm"; sourceKey: string }
    | { kind: "independent" | "english"; sourceKey: null };
};
