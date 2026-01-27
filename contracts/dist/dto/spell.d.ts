export type SpellItem = {
    id: number;
    slug: string;
    name: string;
    rulebook: {
        id: number;
        abbr: string;
        name: string;
        slug: string;
    };
    page: number | null;
    school: {
        id: number;
        name: string;
        slug: string;
    } | null;
    subSchool: {
        id: number;
        name: string;
        slug: string;
    } | null;
    descriptors: Array<{
        id: number;
        name: string;
        slug: string;
    }>;
    components: SpellComponents;
    matchedClassLevels: Array<ClassLevel>;
    matchedDomainLevels: Array<DomainLevel>;
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
export type SpellByClassLevelResponse = {
    page: number;
    pageSize: number;
    total: number;
    level: number;
    classIds: number[];
    rulebookIds: number[];
    items: SpellItem[];
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
export type ClassLevel = {
    classId: number;
    classSlug: string;
    className: string;
    prestige: boolean;
    level: number;
    extra: string;
};
export type DomainLevel = {
    domainId: number;
    domainSlug: string;
    domainName: string;
    level: number;
    extra: string;
};
export type SpellDetail = SpellItem & {
    added: string;
    description: {
        text: string;
        html: string;
    };
    verified: {
        verified: boolean;
        verifiedAuthorId?: number | null;
        verifiedTime?: string | null;
    };
};
export type SpellBatchRequest = {
    ids: number[];
};
export type SpellBatchResponse = {
    ids: number[];
    items: SpellItem[];
    missingIds: number[];
};
