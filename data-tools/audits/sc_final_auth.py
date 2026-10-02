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
    args = parser.parse_args()
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
    print(json.dumps({'fields': result['field-dispositions.jsonl'], 'report': result['report.json']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
