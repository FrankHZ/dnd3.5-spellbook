import crypto from "node:crypto";
import fs from "node:fs";

import { resolveInside } from "./source-manifest";

export const PHB_EFFECTIVE_ENGLISH_AUTHORITY_POLICY = {
  schemaVersion: 1,
  revision: "official-srd-default-v1",
  defaultAuthority: {
    rulesText: "official-srd-3.5",
    mechanicsFields: "official-srd-3.5",
    printedName: "official-srd-3.5",
  },
  phbAuthority: {
    source: "phb-3.5-plus-accepted-errata",
    exceptions: [
      "srd-omission",
      "product-identity-name",
      "phb-only-content",
      "class-list-short-description",
      "page-table-layout-structure",
    ],
  },
  existingDatabaseRole: "comparison-only",
} as const;

export const PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH =
  "phb35/review/srd-adjudication-manifest.json";

export type PhbAuthorityPolicyReference = {
  revision: string;
  sha256: string;
};

export function currentPhbAuthorityPolicyReference(): PhbAuthorityPolicyReference {
  return {
    revision: PHB_EFFECTIVE_ENGLISH_AUTHORITY_POLICY.revision,
    sha256: hashJson(PHB_EFFECTIVE_ENGLISH_AUTHORITY_POLICY),
  };
}

export function verifyPhbEnglishReviewAuthorityPolicy(dataRoot: string) {
  const manifestPath = resolveInside(
    dataRoot,
    PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      "PHB English review authority policy is missing; rebuild the effective English pipeline before review",
    );
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    inputs?: { authorityPolicy?: unknown };
  };
  const expected = currentPhbAuthorityPolicyReference();
  const actual = manifest.inputs?.authorityPolicy;
  if (!isAuthorityPolicyReference(actual)) {
    throw new Error(
      `PHB English review authority policy is stale: missing ${expected.revision}`,
    );
  }
  if (
    actual.revision !== expected.revision ||
    actual.sha256 !== expected.sha256
  ) {
    throw new Error(
      `PHB English review authority policy is stale: ${actual.revision} -> ${expected.revision}`,
    );
  }
  return expected;
}

function isAuthorityPolicyReference(
  value: unknown,
): value is PhbAuthorityPolicyReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.revision === "string" &&
    typeof record.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(record.sha256)
  );
}

function hashJson(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}
