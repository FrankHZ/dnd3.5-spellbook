import { I18nNameOverlay } from "../i18n";
import { Class } from "./class";
import { Domain } from "./domain";
import { RulebookMin } from "./rulebook";

export type SpellID = number;

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

export type SpellNameSearchResponse = {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  rulebookIds: number[];
  items: SpellItem[];
};

export type SpellItemView = SpellItem & {
  i18n?: I18nNameOverlay | undefined;
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

export type I18nSpellDetailOverlay = I18nNameOverlay & {
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
