import type { EnglishRecord, Field } from "./qa";

/** Private inspection/activation handoff. Regenerate with authenticateDiceCloseout;
 * serialized output alone never grants acceptance or write authority. */
export type CloseoutProvenance = {
  issue: number;
  pr: number;
  publicHead: string;
  revision: string;
  path: string;
  row: number;
  sourceKey: string | null;
  historicalRevision: string | null;
  historicalContinuityAuthenticated: boolean;
};
export type CloseoutResidual = { ownerIssue: number; path: string; row: number };
export type CloseoutField = {
  targetId: number;
  rulebookId: number;
  field: Field;
  before: string | null;
  after: string;
  language: "zh" | "mixed";
  authority: "native-db-english" | "recovered-db-english" | "independent-db-english";
  provenance: CloseoutProvenance;
  residuals: CloseoutResidual[];
};
export type CloseoutTargetInput = {
  targetId: number;
  english: EnglishRecord;
  englishHtml: string | null;
  /** Complete stored rows, so a writer can compare exact target before-state. */
  chinese: Array<Record<string, unknown>>;
};
export type CloseoutRetained = {
  targetId: number;
  rulebookId: number;
  field: Field;
  reason: "existing-Chinese-unchanged" | "unaccepted-body" | "superseded";
  provenance: CloseoutProvenance;
};
export type DiceCloseout = {
  fields: CloseoutField[];
  targets: CloseoutTargetInput[];
  retained: CloseoutRetained[];
  report: {
    issue: 586;
    protectedRulebookIds: number[];
    sourceFiles: number;
    candidateOccurrences: number;
    existingTargets: number;
    fields: number;
    targets: number;
    byAuthority: Record<string, number>;
    retained: number;
    elapsedMs: number;
    peakRssKiB: number;
    operatorWrites: false;
    historicalContinuityAuthenticated: false;
  };
};
