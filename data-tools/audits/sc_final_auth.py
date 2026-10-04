"""Authenticate the selected final SC candidate from durable sources, not DB snapshots."""
import argparse
import json
from pathlib import Path
import re
from sc_coverage import Evidence, require
from sc_final_binding import CANDIDATE, exact_candidate, derive_final, compare_candidate, authenticate_reader_notes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ['code-root', 'helper-revision', 'runtime-root', 'data-root', 'rules-db', 'content-db', 'accepted-baseline']:
        parser.add_argument('--' + key, required=True)
    parser.add_argument('--accepted-english-title', action='store_true')
    parser.add_argument('--accepted-source-pairs', action='store_true')
    parser.add_argument('--accepted-source-fidelity', action='store_true')
    args = parser.parse_args()
    require(not args.accepted_source_pairs or args.accepted_english_title, 'source corrections require accepted English title predecessor')
    require(not args.accepted_source_fidelity or args.accepted_source_pairs, 'source fidelity requires accepted #461 predecessor')
    if args.accepted_source_fidelity:
        from sc_source_fidelity import ACCEPTANCE, COMMENT
        require(ACCEPTANCE is not None and COMMENT is not None, 'Issue467 independent source acceptance pending')
    exact_candidate(args.accepted_baseline)
    require(re.fullmatch(r'[0-9a-f]{40}', args.helper_revision) is not None, 'exact helper revision required')
    code = Evidence(args.code_root, args.helper_revision)
    require(code.git('rev-parse', 'HEAD') == args.helper_revision, 'helper revision must be current checkout HEAD')
    paths = ['data-tools/audits', 'data-tools/src/dice-intake', 'data-tools/src/rules',
             'data-tools/src/rules-content', 'data-tools/src/short-desc', 'data-tools/src/shared', 'data-tools/pdf-extract/src',
             'server/db/content/migrations', 'server/src/services/spells/spells.provenance.ts']
    require(not code.git('diff', args.helper_revision, '--', *paths) and
            not code.git('status', '--porcelain', '--', *paths), 'dirty/stale source authentication helpers')
    args.final_rules = True
    result = derive_final(args)
    compare_candidate(Evidence(args.data_root, CANDIDATE), result)
    result = authenticate_reader_notes(args, result)
    if args.accepted_english_title:
        from sc_prismatic_ray import authenticate
        result = authenticate(args, result)
    if args.accepted_source_pairs:
        from sc_source_pairs import authenticate
        result = authenticate(args, result)
    if args.accepted_source_fidelity:
        from sc_source_fidelity import authenticate
        result = authenticate(args, result)
    print(json.dumps({'fields': result['field-dispositions.jsonl'], 'report': result['report.json']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
