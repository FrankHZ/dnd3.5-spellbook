export type SpellCoreItem = {
    id: number;
    slug: string;
    name: string;
    page: number | null;
    rulebook: {
        id: number;
        abbr: string;
    };
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
};
export type SpellNameSearchResponse = {
    page: number;
    pageSize: number;
    total: number;
    q: string;
    rulebookIds: number[];
    items: SpellCoreItem[];
};
export type SpellByClassLevelItem = SpellCoreItem & {
    matchedClassLevels: Array<{
        classId: number;
        classSlug: string;
        className: string;
        prestige: boolean;
        level: number;
        extra: string;
    }>;
};
export type SpellByClassLevelResponse = {
    page: number;
    pageSize: number;
    total: number;
    level: number;
    classIds: number[];
    rulebookIds: number[];
    items: SpellByClassLevelItem[];
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
export type SpellClassLevel = {
    classId: number;
    classSlug: string;
    className: string;
    prestige: boolean;
    level: number;
    extra: string;
};
export type SpellDomainLevel = {
    domainId: number;
    domainSlug: string;
    domainName: string;
    level: number;
    extra: string;
};
export type SpellDetail = {
    id: number;
    slug: string;
    name: string;
    added: string;
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
    casting: SpellCasting;
    description: {
        text: string;
        html: string;
    };
    classLevels: Array<SpellClassLevel>;
    domainLevels: Array<SpellDomainLevel>;
    verified: {
        verified: boolean;
        verifiedAuthorId?: number | null;
        verifiedTime?: string | null;
    };
    corrupt?: {
        level?: number | null;
    };
};
