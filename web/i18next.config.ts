import { defineConfig } from "i18next-cli";

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
