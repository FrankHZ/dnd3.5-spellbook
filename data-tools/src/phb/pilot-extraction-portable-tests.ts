import assert from "node:assert/strict";

import { compareTokenMultisets } from "./pilot-extraction";

function run() {
  assert.deepEqual(
    compareTokenMultisets("Magic missile missile", "magic missile"),
    {
      pdfTokenCount: 3,
      mineruTokenCount: 2,
      sharedTokenCount: 2,
      tokenRecall: 0.666667,
      tokenPrecision: 1,
    },
  );
  assert.deepEqual(
    compareTokenMultisets("Caster's target", "Caster’s target"),
    {
      pdfTokenCount: 2,
      mineruTokenCount: 2,
      sharedTokenCount: 2,
      tokenRecall: 1,
      tokenPrecision: 1,
    },
  );
  assert.equal(compareTokenMultisets("", "").tokenRecall, 1);
  console.log("PHB pilot extraction portable tests passed");
}

run();
