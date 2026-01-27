export type Domain = {
    id: number;
    slug: string;
    name: string;
};
export type DomainListResponse = {
    rulebookIds: number[];
    items: Domain[];
};
