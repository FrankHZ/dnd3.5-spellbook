const {SAVE_CORRECTION_REVISION}=require('@dnd/contracts') as typeof import('@dnd/contracts',{with:{'resolution-mode':'import'}});
import {runAcceptedOverlay} from '../dice-intake/accepted-overlay-cli';
import {AcceptedOverlayError} from '../dice-intake/accepted-overlay';
import {authenticateSaveCorrections} from './corrections';
export function runSaveCorrections(argv:string[]) {
  return runAcceptedOverlay(argv,{directory:'issue-645',acceptedRevision:SAVE_CORRECTION_REVISION,
    schema:'save-clause-corrections-run.v1',reportFacts:{acceptedClauses:15,acceptedNames:0,wholeBodyReviewed:false,prerequisite:'completed629-637'},
    authenticate:(root,rules)=>authenticateSaveCorrections(root,rules)});
}
if(require.main===module) {
  try {console.log(JSON.stringify(runSaveCorrections(process.argv.slice(2))));}
  catch(error) {console.error(error instanceof AcceptedOverlayError?JSON.stringify({...error.result,failedStage:error.stage,error:error.message}):String(error));process.exitCode=1;}
}
