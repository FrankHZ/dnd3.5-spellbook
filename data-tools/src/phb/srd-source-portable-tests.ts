import assert from "node:assert/strict";

import { validateSrdSourceManifest } from "./srd-source";

const members = [
  ...["A-B", "C", "D-E", "F-G", "H-L", "M-O", "P-R", "S", "T-Z"].map(
    (part) => ({
      name: `Spells${part}.rtf`,
      role: "spell-description",
      bytes: 1,
      sha256: "a".repeat(64),
    }),
  ),
  ...["I", "II"].map((part) => ({
    name: `SpellList${part}.rtf`,
    role: "spell-list",
    bytes: 1,
    sha256: "b".repeat(64),
  })),
  {
    name: "MagicOverview.rtf",
    role: "support",
    bytes: 1,
    sha256: "c".repeat(64),
  },
];

const manifest = {
  schemaVersion: 1,
  workspace: "phb35",
  status: "accepted",
  document: {
    title: "System Reference Document",
    edition: "3.5",
    publisher: "Wizards of the Coast",
    authorshipNote: "Fixture authorship evidence.",
  },
  archive: {
    host: "Internet Archive",
    itemId: "fixture",
    itemUrl: "https://example.test/item",
    artifactUrl: "https://example.test/item/spells.zip",
    archivedOn: "2016-01-19",
    provenanceNote: "Fixture mirror provenance.",
  },
  package: {
    relativePath: "artifacts/srd35/Spells.zip",
    mediaType: "application/zip",
    bytes: 1,
    sha256: "d".repeat(64),
  },
  members,
};

assert.deepEqual(validateSrdSourceManifest(manifest), []);
assert.match(
  validateSrdSourceManifest({ ...manifest, members: members.slice(1) }).join(
    "\n",
  ),
  /all nine spell-description/u,
);
assert.match(
  validateSrdSourceManifest({
    ...manifest,
    package: { ...manifest.package, relativePath: "../Spells.zip" },
  }).join("\n"),
  /stay inside/u,
);

console.log("PHB SRD source portable tests passed");
