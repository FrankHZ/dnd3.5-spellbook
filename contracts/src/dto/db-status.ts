export type DbRoleStatus = {
  configured: boolean;
  scheme?: string | undefined;
  fileName?: string | undefined;
  exists?: boolean | undefined;
  matchesContent?: boolean | undefined;
};

export type DbStatusReadSource = "content" | "rules";

export type RulesContentBuildStatus = {
  id: string;
  sourceKind: string;
  sourceSha256?: string | undefined;
  generatorVersion: string;
  generatedAt: string;
  spellCount: number;
  issueCount: number;
  parentRepoCommit?: string | undefined;
  dataRepoCommit?: string | undefined;
  rulesManifestSha256?: string | undefined;
  rulesDbSha256?: string | undefined;
  migrationSetSha256?: string | undefined;
};

export type ContentDbTableCounts = {
  rulebookContent: number;
  spellContent: number;
  spellTaxonomyFacet: number;
  spellComponent: number;
  spellMechanicFacet: number;
  rulesContentIssue: number;
};

export type ContentDbStatus = {
  status: "ok" | "missing_metadata" | "error";
  latestBuild: RulesContentBuildStatus | null;
  tableCounts: ContentDbTableCounts | null;
  error?: string | undefined;
};

export type DbStatusResponse = {
  activeSpellReadSource: DbStatusReadSource;
  databases: {
    rules: DbRoleStatus;
    content: DbRoleStatus;
    contentAlias: DbRoleStatus;
    appState: DbRoleStatus;
  };
  content: ContentDbStatus;
};
