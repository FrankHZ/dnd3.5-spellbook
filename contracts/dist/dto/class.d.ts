export type Class = {
    id: number;
    slug: string;
    name: string;
    prestige: boolean;
};
export type ClassListResponse = {
    includePrestige: boolean;
    items: Class[];
};
