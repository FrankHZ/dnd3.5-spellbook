import {AcceptedOverlayError} from "./accepted-overlay";
import assert from "node:assert/strict";
import {authenticateDiceCloseout, closeoutAcceptance} from "./closeout";
import {closeoutOverlayInput, closeoutRevision} from "./closeout-overlay";
import {runAcceptedOverlay} from "./accepted-overlay-cli";

export function runDiceCloseoutOverlay(argv: string[]) {
  assert.equal(closeoutRevision, closeoutAcceptance.revision, "writer/consumer accepted handoff revision differs");
  return runAcceptedOverlay(argv, {directory: "issue-587", acceptedRevision: closeoutRevision, schema: "dice-closeout-overlay-run.v1",
    authenticate: (dataRoot, rulesDb, contentDb) => closeoutOverlayInput(authenticateDiceCloseout({dataRoot, rulesDb, contentDb}))});
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/dice-intake/closeout-overlay-cli.ts")) {
  try {console.log(JSON.stringify(runDiceCloseoutOverlay(process.argv.slice(2))));}
  catch (error) {
    console.error(error instanceof AcceptedOverlayError
      ? JSON.stringify({...error.result, failedStage: error.stage, error: error.message}) : String(error));
    process.exitCode = 1;
  }
}
