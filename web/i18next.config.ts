import { defineConfig } from "i18next-cli";

export const IGNORED = [
  "metamagic",
  "collections-default",
  "spell-filter-vocabulary",
];
export default defineConfig({
  locales: ["en", "zh"],
  extract: {
    input: "app/**/*.{js,jsx,ts,tsx}",
    output: "extracted/{{language}}/{{namespace}}.json",
    keySeparator: ">",
    nsSeparator: "::",
    ignoreNamespaces: IGNORED,
  },
});
