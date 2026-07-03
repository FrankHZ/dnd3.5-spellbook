import type { I18nSpellOverlay } from "../i18n.js";
import type { Class } from "./class.js";
import type { Domain } from "./domain.js";
import type { RulebookMin } from "./rulebook.js";

export type SpellID = number;

export type SpellTaxonomyFilterIds = {
  schoolIds: number[];
  subschoolIds: number[];
  descriptorIds: number[];
};

export type SpellNameSearchQuery = SpellTaxonomyFilterIds & {
  q: string;
  rulebookIds: number[];
  classIds: number[];
  domainIds: number[];
  level: number | "all" | null;
  page: number;
  pageSize: number;
};

export type SpellByLevelQuery = SpellTaxonomyFilterIds & {
  classIds: number[];
  domainIds: number[];
  level: number | "all";
  rulebookIds: number[];
  page: number;
  pageSize: number;
};

export type SpellItem = {
  id: SpellID;
  slug: string;
  name: string;

  rulebook: RulebookMin;
  page: number | null;

  school: { id: number; name: string; slug: string } | null;
  subSchool: { id: number; name: string; slug: string } | null;
  descriptors: Array<{ id: number; name: string; slug: string }>;
  components: SpellComponents;

  classLevels: Array<ClassLevel>;
  domainLevels: Array<DomainLevel>;

  casting: SpellCasting;

  corrupt?: {
    level?: number | null;
  };
};

export type SpellItemView = SpellItem & {
  i18n?: I18nSpellOverlay | undefined;
};

export type SpellNameSearchResponse = {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  rulebookIds: number[];
  schoolIds: number[];
  subschoolIds: number[];
  descriptorIds: number[];
  items: SpellItemView[];
};

export type SpellsByLevelGroup = {
  level: number;
  items: SpellItemView[];
};

export type SpellByLevelResponse = {
  page: number;
  pageSize: number;
  total: number;
  classIds: number[];
  domainIds: number[];
  rulebookIds: number[];
  schoolIds: number[];
  subschoolIds: number[];
  descriptorIds: number[];
  groups: SpellsByLevelGroup[];
};

export type SpellComponents = {
  V: boolean;
  S: boolean;
  M: boolean;
  AF: boolean;
  DF: boolean;
  XP: boolean;
  metabreath: boolean;
  truename: boolean;
  corrupt: boolean;
  extra?: string | null;
};

export type SpellCasting = {
  castingTime?: string | null;
  range?: string | null;
  target?: string | null;
  effect?: string | null;
  area?: string | null;
  duration?: string | null;
  savingThrow?: string | null;
  spellResistance?: string | null;
};

type SpellLevelBase = {
  level: number;
  extra: string;
};

export type ClassLevel = Class & SpellLevelBase;

export type DomainLevel = Domain & SpellLevelBase;

export type SpellDetail = SpellItem & {
  added: string; // ISO date

  description: {
    text: string;
    html: string;
  };
  verified: {
    verified: boolean;
    verifiedAuthorId?: number | null;
    verifiedTime?: string | null; // ISO
  };
};

export type I18nSpellDetailOverlay = I18nSpellOverlay & {
  sourceKey?: string | undefined;
  description?:
    | {
        text?: string | undefined;
        html?: string | undefined;
      }
    | undefined;
};

export type SpellDetailView = SpellDetail & {
  i18n?: I18nSpellDetailOverlay | undefined;
};

export type SpellBatchRequest = {
  ids: number[];
};

export type SpellBatchResponse = {
  ids: number[];
  items: SpellItemView[];
  missingIds: number[];
};
