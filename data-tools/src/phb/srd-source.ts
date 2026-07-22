import crypto from "node:crypto";
import fs from "node:fs";

import AdmZip from "adm-zip";

import {
  committedFileCommit,
  resolveInside,
  sha256File,
} from "./source-manifest";

export const PHB_SRD_SOURCE_MANIFEST_RELATIVE_PATH =
  "phb35/source/srd-spells-manifest.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export type SrdMemberRole = "spell-list" | "spell-description" | "support";

export type SrdSourceMember = {
  name: string;
  role: SrdMemberRole;
  bytes: number;
  sha256: string;
};

export type SrdSourceManifest = {
  schemaVersion: 1;
  workspace: "phb35";
  status: "proposed" | "accepted";
  document: {
    title: string;
    edition: "3.5";
    publisher: "Wizards of the Coast";
    authorshipNote: string;
  };
  archive: {
    host: "Internet Archive";
    itemId: string;
    itemUrl: string;
    artifactUrl: string;
    archivedOn: string;
    provenanceNote: string;
  };
  package: {
    relativePath: string;
    mediaType: "application/zip";
    bytes: number;
    sha256: string;
  };
  members: SrdSourceMember[];
};

export type VerifiedSrdSource = {
  manifest: SrdSourceManifest;
  manifestPath: string;
  manifestSha256: string;
  manifestCommit: string;
  packagePath: string;
  entries: Map<string, Buffer>;
};

export function parseSrdSourceManifestText(text: string): SrdSourceManifest {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `PHB SRD source manifest is not valid JSON: ${errorMessage(error)}`,
    );
  }
  const errors = validateSrdSourceManifest(value);
  if (errors.length > 0) {
    throw new Error(
      `PHB SRD source manifest is invalid:\n${errors.join("\n")}`,
    );
  }
  return value as SrdSourceManifest;
}

export function validateSrdSourceManifest(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) return ["manifest must be a JSON object"];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (value.workspace !== "phb35") errors.push("workspace must be phb35");
  if (value.status !== "proposed" && value.status !== "accepted") {
    errors.push("status must be proposed or accepted");
  }
  validateDocument(value.document, errors);
  validateArchive(value.archive, errors);
  validatePackage(value.package, errors);

  if (!Array.isArray(value.members) || value.members.length === 0) {
    errors.push("members must be a non-empty array");
  } else {
    const names = new Set<string>();
    value.members.forEach((member, index) => {
      validateMember(member, index, errors);
      if (isRecord(member) && typeof member.name === "string") {
        if (names.has(member.name)) {
          errors.push(`members[${index}].name is duplicated`);
        }
        names.add(member.name);
      }
    });
    const spellFiles = value.members.filter(
      (member) => isRecord(member) && member.role === "spell-description",
    );
    const listFiles = value.members.filter(
      (member) => isRecord(member) && member.role === "spell-list",
    );
    if (spellFiles.length !== 9) {
      errors.push("members must contain all nine spell-description RTF files");
    }
    if (listFiles.length !== 2) {
      errors.push("members must contain both spell-list RTF files");
    }
  }
  return errors;
}

export function readAndVerifySrdSourceManifest(
  dataRoot: string,
): VerifiedSrdSource {
  const manifestPath = resolveInside(
    dataRoot,
    PHB_SRD_SOURCE_MANIFEST_RELATIVE_PATH,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`PHB SRD source manifest not found: ${manifestPath}`);
  }
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = parseSrdSourceManifestText(manifestText);
  if (manifest.status !== "accepted") {
    throw new Error("PHB SRD source manifest must be accepted before use");
  }
  const packagePath = resolveInside(dataRoot, manifest.package.relativePath);
  if (!fs.existsSync(packagePath)) {
    throw new Error(`Pinned PHB SRD package not found: ${packagePath}`);
  }
  const stat = fs.statSync(packagePath);
  if (!stat.isFile())
    throw new Error(`PHB SRD package is not a file: ${packagePath}`);
  if (stat.size !== manifest.package.bytes) {
    throw new Error(
      `PHB SRD package byte size changed (${manifest.package.bytes} -> ${stat.size})`,
    );
  }
  const packageSha256 = sha256File(packagePath);
  if (packageSha256 !== manifest.package.sha256) {
    throw new Error(
      `PHB SRD package SHA-256 changed (${manifest.package.sha256} -> ${packageSha256})`,
    );
  }

  const zip = new AdmZip(packagePath);
  const entries = new Map(
    zip
      .getEntries()
      .filter((entry) => !entry.isDirectory)
      .map((entry) => [entry.entryName, entry.getData()] as const),
  );
  const expectedNames = new Set(manifest.members.map((member) => member.name));
  const unexpected = Array.from(entries.keys()).filter(
    (name) => !expectedNames.has(name),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `PHB SRD package has unexpected members: ${unexpected.join(", ")}`,
    );
  }
  for (const member of manifest.members) {
    const bytes = entries.get(member.name);
    if (!bytes)
      throw new Error(`PHB SRD package member is missing: ${member.name}`);
    if (bytes.length !== member.bytes) {
      throw new Error(
        `${member.name} byte size changed (${member.bytes} -> ${bytes.length})`,
      );
    }
    const actual = sha256Buffer(bytes);
    if (actual !== member.sha256) {
      throw new Error(
        `${member.name} SHA-256 changed (${member.sha256} -> ${actual})`,
      );
    }
  }
  return {
    manifest,
    manifestPath,
    manifestSha256: sha256Buffer(Buffer.from(manifestText, "utf8")),
    manifestCommit: committedFileCommit(dataRoot, manifestPath),
    packagePath,
    entries,
  };
}

function validateDocument(value: unknown, errors: string[]) {
  if (!isRecord(value)) return errors.push("document must be an object");
  if (!nonempty(value.title)) errors.push("document.title is required");
  if (value.edition !== "3.5") errors.push("document.edition must be 3.5");
  if (value.publisher !== "Wizards of the Coast") {
    errors.push("document.publisher must be Wizards of the Coast");
  }
  if (!nonempty(value.authorshipNote)) {
    errors.push("document.authorshipNote is required");
  }
}

function validateArchive(value: unknown, errors: string[]) {
  if (!isRecord(value)) return errors.push("archive must be an object");
  if (value.host !== "Internet Archive") {
    errors.push("archive.host must be Internet Archive");
  }
  for (const field of ["itemId", "provenanceNote"] as const) {
    if (!nonempty(value[field])) errors.push(`archive.${field} is required`);
  }
  for (const field of ["itemUrl", "artifactUrl"] as const) {
    if (!httpUrl(value[field])) errors.push(`archive.${field} must be HTTP(S)`);
  }
  if (
    typeof value.archivedOn !== "string" ||
    !DATE_PATTERN.test(value.archivedOn)
  ) {
    errors.push("archive.archivedOn must use YYYY-MM-DD");
  }
}

function validatePackage(value: unknown, errors: string[]) {
  if (!isRecord(value)) return errors.push("package must be an object");
  if (!safeRelativePath(value.relativePath)) {
    errors.push("package.relativePath must stay inside the data repository");
  }
  if (value.mediaType !== "application/zip") {
    errors.push("package.mediaType must be application/zip");
  }
  positiveInteger(value.bytes, "package.bytes", errors);
  sha256(value.sha256, "package.sha256", errors);
}

function validateMember(value: unknown, index: number, errors: string[]) {
  const prefix = `members[${index}]`;
  if (!isRecord(value)) return errors.push(`${prefix} must be an object`);
  if (!nonempty(value.name) || !/^[^/\\]+\.rtf$/iu.test(value.name as string)) {
    errors.push(`${prefix}.name must be a root RTF filename`);
  }
  if (!(
    value.role === "spell-list" ||
    value.role === "spell-description" ||
    value.role === "support"
  )) {
    errors.push(`${prefix}.role is invalid`);
  }
  positiveInteger(value.bytes, `${prefix}.bytes`, errors);
  sha256(value.sha256, `${prefix}.sha256`, errors);
}

function positiveInteger(value: unknown, name: string, errors: string[]) {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    errors.push(`${name} must be a positive integer`);
  }
}

function sha256(value: unknown, name: string, errors: string[]) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    errors.push(`${name} must be lowercase SHA-256`);
  }
}

function safeRelativePath(value: unknown) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !/^[a-z]:/iu.test(value) &&
    !value.replace(/\\/gu, "/").split("/").includes("..")
  );
}

function httpUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Buffer(value: Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
