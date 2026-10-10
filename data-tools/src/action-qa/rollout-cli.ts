const {ACTION_ROLLOUT_REVISION}=require('@dnd/contracts') as typeof import('@dnd/contracts',{with:{'resolution-mode':'import'}});
import {runAcceptedOverlay} from '../dice-intake/accepted-overlay-cli';
import {AcceptedOverlayError} from '../dice-intake/accepted-overlay';
import {authenticateActionRollout} from './rollout';
export function runActionRollout(argv:string[]) {
  return runAcceptedOverlay(argv,{directory:'issue-637',acceptedRevision:ACTION_ROLLOUT_REVISION,
    schema:'action-clause-rollout-run.v1',reportFacts:{acceptedClauses:40,acceptedNames:0,wholeBodyReviewed:false,prerequisite:'completed629'},
    authenticate:(root,rules)=>authenticateActionRollout(root,rules)});
}
if(require.main===module) {
  try {console.log(JSON.stringify(runActionRollout(process.argv.slice(2))));}
  catch(error) {console.error(error instanceof AcceptedOverlayError?JSON.stringify({...error.result,failedStage:error.stage,error:error.message}):String(error));process.exitCode=1;}
}
