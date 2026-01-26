export type Edition = {
    id: number;
    name: string;
    system: string;
    slug: string;
    core: boolean;
};
export type Rulebook = {
    id: number;
    abbr: string;
    name: string;
    slug: string;
    edition: Edition;
};
export type EditionListResponse = {
    items: Edition[];
};
export type RulebookListResponse = {
    items: Rulebook[];
};
