import assert from "node:assert/strict";

import { validatePhbErrataInventoryRow } from "./errata-inventory";

const base = {
  schemaVersion: 1,
  entryId: "sample",
  printedName: "Sample",
  phbPages: [1],
  errataPages: [2],
  disposition: "applicable",
  overlayPolicy: "targeted-replacement",
  reviewRequired: false,
  note: "Fixture note.",
};

assert.deepEqual(validatePhbErrataInventoryRow(base), []);
assert.deepEqual(
  validatePhbErrataInventoryRow({
    ...base,
    operationHints: [
      { kind: "replace-text", target: "old", replacement: "new" },
    ],
  }),
  [],
);
assert.match(
  validatePhbErrataInventoryRow({
    ...base,
    operationHints: [{ kind: "replace-text", target: "", replacement: "new" }],
  }).join("\n"),
  /operationHints\[0\]\.target/u,
);
assert.match(
  validatePhbErrataInventoryRow({ ...base, overlayPolicy: "none" }).join("\n"),
  /applicable rows require an overlay policy/,
);
assert.match(
  validatePhbErrataInventoryRow({
    ...base,
    disposition: "already-incorporated",
  }).join("\n"),
  /already-incorporated rows must use overlayPolicy none/,
);
console.log("PHB errata inventory portable tests passed");
