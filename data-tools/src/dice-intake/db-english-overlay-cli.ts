import {cityscapeAcceptance as a} from "./db-english-handoff";
import {authenticateCityscapeInputs} from "./db-english-authentication";
import {loadEnglishRecords, type QaRecords} from "./qa";
import {cityscapeOverlayInput, CityscapeOverlayError} from "./db-english-overlay";
import {checkAcceptedOverlayArguments, runAcceptedOverlay} from "./accepted-overlay-cli";

export function checkOverlayArguments(argv: string[]) {checkAcceptedOverlayArguments(argv, a.revision);}
export function runCityscapeOverlay(argv: string[]) {
  return runAcceptedOverlay(argv, {directory: "issue-529", acceptedRevision: a.revision,
    schema: "cityscape-overlay-run.v1",
    reportFacts: {targets: a.targets, names: 8, fullyChineseBodies: 7, mixedBodies: 1, residualOwnerIssue: 160},
    authenticate(dataRoot, rules, content, rulesPath, contentPath) {
      const loaded: QaRecords = {english: loadEnglishRecords(rules), englishHtml: new Map(),
        chinese: new Map((content.prepare("SELECT spellId,name,descriptionText,descriptionHtml FROM I18nSpellText WHERE lang='zh' AND variant='chm'")
          .all() as {spellId: number; name: string | null; descriptionText: string | null; descriptionHtml: string | null}[]).map(r => [r.spellId, r])),
        books: rules.prepare("SELECT id,dnd_edition_id AS editionId,name FROM dnd_rulebook").all() as QaRecords["books"]};
      return cityscapeOverlayInput(authenticateCityscapeInputs(dataRoot, rulesPath, contentPath, loaded).evidence);
    }});
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/dice-intake/db-english-overlay-cli.ts")) {
  try {console.log(JSON.stringify(runCityscapeOverlay(process.argv.slice(2))));}
  catch (error) {
    console.error(error instanceof CityscapeOverlayError
      ? JSON.stringify({...error.result, failedStage: error.stage, error: error.message}) : String(error));
    process.exitCode = 1;
  }
}
