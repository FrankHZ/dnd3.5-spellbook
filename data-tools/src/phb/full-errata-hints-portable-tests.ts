import assert from "node:assert/strict";

import {
  parsePhbFullErrataHint,
  validatePhbFullErrataHint,
} from "./full-errata-hints";

const row = {
  schemaVersion: 1,
  entryId: "sample",
  operationHints: [{ kind: "replace-text", target: "old", replacement: "new" }],
  note: "The source instruction uses ellipses.",
};
assert.deepEqual(parsePhbFullErrataHint(JSON.stringify(row)), row);
assert.match(
  validatePhbFullErrataHint({
    ...row,
    operationHints: [{ kind: "replace-text", target: "", replacement: "new" }],
  }).join("\n"),
  /operationHints\[0\]\.target/u,
);
console.log("PHB full errata-hint portable tests passed");
