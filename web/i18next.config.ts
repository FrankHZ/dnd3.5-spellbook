import { defineConfig } from "i18next-cli";

export const IGNORED = ["metamagic", "collections-default"];
export default defineConfig({
  locales: ["en", "zh"],
  extract: {
    input: "app/**/*.{js,jsx,ts,tsx}",
    output: "extracted/{{language}}/{{namespace}}.json",
    keySeparator: ">",
    nsSeparator: "::",
    ignoreNamespaces: ["metamagic"],
  },
});
