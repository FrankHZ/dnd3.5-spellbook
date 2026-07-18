import i18next from "i18next";
import { describe, expect, it } from "vitest";

import enCollections from "../../../public/locales/en/collections.json";
import zhCollections from "../../../public/locales/zh/collections.json";
import {
  getCollectionImportErrorMessage,
  type CollectionImportError,
} from "./collection-import";

async function translateError(
  lang: "en" | "zh",
  error: CollectionImportError,
) {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: lang,
    fallbackLng: "en",
    keySeparator: ">",
    ns: ["collections"],
    defaultNS: "collections",
    resources: {
      en: { collections: enCollections },
      zh: { collections: zhCollections },
    },
  });

  return getCollectionImportErrorMessage(
    error,
    i18n.getFixedT(lang, "collections"),
  );
}

describe("collection import error localization", () => {
  it("localizes invalid root and field shapes in English and Chinese", async () => {
    const invalidRoot = {
      code: "INVALID_ROOT",
      details: { actualType: "array" },
    } satisfies CollectionImportError;
    const invalidField = {
      code: "INVALID_ARRAY_FIELD",
      details: { field: "preparedEntries", actualType: "object" },
    } satisfies CollectionImportError;

    await expect(translateError("en", invalidRoot)).resolves.toBe(
      "The import file must contain a JSON object.",
    );
    await expect(translateError("zh", invalidRoot)).resolves.toBe(
      "导入文件必须包含 JSON 对象。",
    );
    await expect(translateError("en", invalidField)).resolves.toBe(
      "Invalid import data: preparedEntries must be an array.",
    );
    await expect(translateError("zh", invalidField)).resolves.toBe(
      "导入数据无效：preparedEntries 必须是数组。",
    );
  });

  it("keeps expected schema details visible in both languages", async () => {
    const error = {
      code: "SCHEMA_VERSION_MISMATCH",
      details: { expectedVersion: 1, receivedVersion: 2 },
    } satisfies CollectionImportError;

    await expect(translateError("en", error)).resolves.toBe(
      "Unsupported import schema. Expected version 1.",
    );
    await expect(translateError("zh", error)).resolves.toBe(
      "不支持此导入文件版本，需要版本 1。",
    );
  });
});
