const {ACTION_CORRECTION_REVISION} = require("@dnd/contracts") as typeof import("@dnd/contracts", {with: {"resolution-mode":"import"}});
import {runAcceptedOverlay} from "../dice-intake/accepted-overlay-cli";
import {AcceptedOverlayError} from "../dice-intake/accepted-overlay";
import {authenticateActionCorrections} from "./corrections";

export function runActionCorrections(argv: string[]) {
  return runAcceptedOverlay(argv,{directory:'issue-629',acceptedRevision:ACTION_CORRECTION_REVISION,
    schema:'action-clause-correction-run.v1',reportFacts:{acceptedClauses:7,acceptedNames:0,wholeBodyReviewed:false},
    authenticate:(root,rules)=>authenticateActionCorrections(root,rules)});
}
if (require.main===module) {
  try {console.log(JSON.stringify(runActionCorrections(process.argv.slice(2))));}
  catch(error) {console.error(error instanceof AcceptedOverlayError
    ? JSON.stringify({...error.result,failedStage:error.stage,error:error.message}):String(error));process.exitCode=1;}
}
