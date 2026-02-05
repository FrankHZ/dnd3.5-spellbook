export type MetaI18nResponse = {
  i18n: { lang: "en" | "zh"; variant?: string | undefined };

  rulebooks: Record<number, { name?: string | undefined }>;

  classes: Record<number, { name?: string | undefined }>;
  domains: Record<number, { name?: string | undefined }>;

  schools: Record<number, { name?: string | undefined }>;
  subschools: Record<number, { name?: string | undefined }>;
  descriptors: Record<number, { name?: string | undefined }>;
};
