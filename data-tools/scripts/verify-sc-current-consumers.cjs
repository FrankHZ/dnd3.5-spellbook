/** Read-only real HTTP consumer audit. Inputs/report are private, worktree-local files.
 * Build contracts/server first. No source adjudication or DB writes happen here. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => {
  if (i % 2 === 0) pairs.push([value.replace(/^--/, ''), all[i + 1]]);
  return pairs;
}, []));
const input = key => {
  assert(args[key], `Missing --${key}`);
  const file = fs.realpathSync(path.resolve(root, args[key]));
  const relative = path.relative(path.join(root, 'data-tools/out'), file);
  assert(!relative.startsWith('..') && !path.isAbsolute(relative), `${key} must be in this worktree output`);
  return file;
};
const currentPath = input('content-db'), beforePath = input('before-overlay'), rulesPath = input('rules-db');
const projection = fs.readFileSync(input('projection'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(projection.length, 1002);
assert(args.report && path.isAbsolute(args.report) && !fs.existsSync(args.report), 'Require a new absolute private --report file');
assert(process.env.DATA_REPO_PATH, 'Require configured external DATA_REPO_PATH');
const privateRoot = fs.realpathSync(path.resolve(root, process.env.DATA_REPO_PATH));
const reportDirectory = fs.realpathSync(path.dirname(path.resolve(args.report)));
assert.equal(reportDirectory, fs.realpathSync(path.join(privateRoot, 'dice-qa/books/86/issue-341')),
  'Source-bearing report must be in the new private issue-341 directory');
assert(!path.relative(root, reportDirectory).split(path.sep).every(part => part !== '..'), 'Private data must be external');
const current = new Database(currentPath, { readonly: true, fileMustExist: true });
const before = new Database(beforePath, { readonly: true, fileMustExist: true });
current.pragma('query_only = ON'); before.pragma('query_only = ON');
const count = { requests: 0, details: 0, listItems: 0, resolved: 0, amended: 0, mixed: 0,
  retainedNames: 0, retainedBodies: 0, summaryRows: 0, correctedSummaries: 0, searchQueries: 0, nameSearch: 0 };
const samples = [];
const processes = [];
const syntheticState = path.join(root, 'data-tools/out/issue-341-unused-synthetic-state.sqlite');
assert(!fs.existsSync(syntheticState), 'The synthetic unused app-state locator must not exist');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const effective = { lang: 'zh', variant: 'effective' };
async function start(content, port) {
  const url = `http://127.0.0.1:${port}`;
  let occupied = false;
  try { occupied = (await fetch(url + '/health')).ok; } catch {}
  assert(!occupied, `Port ${port} is already serving an API; stop that test process first`);
  const child = spawn(process.execPath, [path.join(root, 'server/dist/src/index.js')], { cwd: root,
    env: { ...process.env, NODE_OPTIONS: '', NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port),
      SPELL_READ_SOURCE: 'content', RULES_DATABASE_URL: `file:${rulesPath.replaceAll('\\', '/')}`,
      CONTENT_DATABASE_URL: `file:${content.replaceAll('\\', '/')}`,
      APP_STATE_DATABASE_URL: `file:${syntheticState.replaceAll('\\', '/')}` },
    stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  processes.push(child);
  let errors = ''; child.stderr.on('data', value => errors += value);
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url + '/api/status/app')).ok) return url; } catch {}
    assert(child.exitCode === null, errors);
    await sleep(100);
  }
  throw new Error('Disposable API did not start: ' + errors);
}
async function http(base, endpoint, query = {}, body) {
  const response = await fetch(base + '/api/spells' + endpoint + '?' + new URLSearchParams(query),
    body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json(); count.requests++;
  assert.equal(response.status, 200, JSON.stringify({ endpoint, status: response.status, value }));
  return value;
}
function privacy(value) {
  const serialized = JSON.stringify(value);
  for (const token of ['activeAmendment', 'acceptedRow', 'sourcePages', 'originalInput', 'originalEvidence',
    'ProvenanceJson', 'dice-qa/', 'G:/spell-book/', 'G:\\spell-book\\', 'sourceQuote', 'extractPath'])
    assert(!serialized.includes(token), `Private provenance leaked: ${token}`);
}
function metadata(field) {
  const o = field.origin, a = o.activeAmendment;
  return { schemaVersion: 1, language: o.kind === 'english' ? 'en' : 'zh',
    acceptedRevision: '6a73f4d64682325c67e2c40595008344fb5c3be5',
    origin: { kind: o.kind, sourceKey: o.sourceKey }, ...(a ? { amendment: {
      kind: 'accepted-body-amendment', acceptedRevision: a.revision,
      priorAcceptedRevision: a.prior.revision, status: a.status } } : {}) };
}
function summary(id, lang) {
  const row = current.prepare('SELECT * FROM I18nSpellSummaryText WHERE spellId=? AND lang=? AND variant=?').get(id, lang, lang === 'zh' ? 'chm' : 'imarvin');
  return row ? { lang, variant: row.variant, shortDescription: row.summaryText, sourceKey: row.sourceKey } : undefined;
}
function list(item, row) {
  assert.equal(item.id, row.targetId); assert.equal(item.rulebook.id, 86);
  assert.equal(item.i18n.name, row.name.text);
  assert.deepEqual(item.i18n.nameProvenance, metadata(row.name));
  assert.deepEqual(item.i18n.summary, summary(row.targetId, 'zh'));
  assert.equal(item.i18n.bodyProvenance, undefined);
  privacy(item);
}
function stripped(value) {
  const copy = structuredClone(value); delete copy.i18n; return copy;
}
async function main() {
  // Protection audit: writer changed only its SC overlay/marker; search changes are derived.
  const protectedTables = [];
  for (const { name } of before.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
    if (name.startsWith('SpellSearch') || name === 'RulesContentBuild') continue;
    const where = name === 'I18nSpellText' ? " WHERE NOT (lang='zh' AND variant='effective' AND rulebookId=86)" : '';
    const cols = before.prepare(`PRAGMA table_info("${name}")`).all().map(c => `"${c.name}"`).join(',');
    const rows = db => db.prepare(`SELECT ${cols} FROM "${name}"${where}`).all().map(JSON.stringify).sort();
    assert.deepEqual(rows(current), rows(before), name); protectedTables.push(name);
  }
  const oldDocuments = db => db.prepare("SELECT * FROM SpellSearchDocument WHERE NOT (lang='zh' AND variant='effective') ORDER BY spellId,lang,variant").all();
  assert.deepEqual(oldDocuments(current), oldDocuments(before), 'All old variant search documents remain exact');
  const oldUrl = await start(beforePath, 3411), url = await start(currentPath, 3412);
  const rowById = new Map(projection.map(row => [row.targetId, row]));
  // Validate every detail and unchanged default/chm/en, including mechanics and relationships.
  for (const row of projection) {
    const detail = await http(url, '/' + row.targetId, effective);
    assert.equal(detail.i18n.name, row.name.text);
    assert.deepEqual(detail.i18n.description, { html: row.body.html ?? undefined, text: row.body.text });
    assert.deepEqual(detail.i18n.nameProvenance, metadata(row.name));
    assert.deepEqual(detail.i18n.bodyProvenance, metadata(row.body));
    assert.deepEqual(detail.i18n.summary, summary(row.targetId, 'zh')); privacy(detail);
    for (const query of [{}, { lang: 'zh' }, { lang: 'zh', variant: 'chm' }, { lang: 'en', variant: 'effective' }]) {
      const [old, now] = await Promise.all([http(oldUrl, '/' + row.targetId, query), http(url, '/' + row.targetId, query)]);
      assert.deepEqual(now, old, `${row.targetId} legacy ${JSON.stringify(query)}`);
      assert.deepEqual(stripped(detail), stripped(now), 'English, mechanics and relationships');
      if (!query.lang) assert.deepEqual(now.i18n?.summary, summary(row.targetId, 'en'));
    }
    count.details++;
    if (row.body.origin.activeAmendment) { count.amended++; samples.push(detail); }
    if (row.name.origin.kind === 'english' || row.body.origin.kind === 'english') count.mixed++;
    if (['chm', 'english'].includes(row.name.origin.kind)) count.retainedNames++;
    if (['chm', 'english'].includes(row.body.origin.kind)) count.retainedBodies++;
    if (detail.i18n.summary) count.summaryRows++;
    const named = await http(url, '/search', { ...effective, q: row.name.text, rulebookIds: '86', pageSize: '100' });
    assert(named.items.some(item => item.id === row.targetId), `Name search ${row.targetId}`);
    named.items.forEach(item => list(item, rowById.get(item.id))); count.nameSearch++;
    if (['native', 'independent'].includes(row.name.origin.kind)) {
      for (const context of [{ lang: 'zh' }, { lang: 'zh', variant: 'chm' }]) {
        const query = { ...context, q: row.name.text, rulebookIds: '86', pageSize: '100' };
        const old = await http(oldUrl, '/search', query), now = await http(url, '/search', query);
        assert.deepEqual(now, old, 'Old name-search results remain exact');
      }
    }
  }
  for (let i = 0; i < projection.length; i += 50) {
    const rows = projection.slice(i, i + 50);
    const batch = await http(url, '/batch', effective, { ids: rows.map(row => row.targetId) });
    assert.equal(batch.items.length, rows.length);
    batch.items.forEach(item => { list(item, rowById.get(item.id)); count.listItems++; });
    const resolve = await http(url, '/resolve', effective, { names: rows.map(row => row.name.text), rulebookIds: [86] });
    assert.equal(resolve.results.length, rows.length);
    resolve.results.forEach((result, j) => {
      const items = result.status === 'resolved' ? [result.spell] : result.candidates;
      assert(items?.some(item => item.id === rows[j].targetId), `Resolve ${rows[j].targetId}`);
      items.forEach(item => list(item, rowById.get(item.id))); count.resolved++;
    }); privacy(resolve);
  }
  // Derived documents must contain precisely current field values and summary fallback.
  const documents = current.prepare("SELECT * FROM SpellSearchDocument WHERE lang='zh' AND variant='effective'").all();
  for (const row of projection) {
    const doc = documents.find(doc => doc.spellId === row.targetId);
    assert(doc); assert.equal(doc.name, row.name.text); assert.equal(doc.body, row.body.text);
    const expected = summary(row.targetId, 'zh');
    assert.equal(doc.summary, expected?.shortDescription ?? ''); privacy(doc);
  }
  async function search(q, query = {}) {
    count.searchQueries++;
    return http(url, '/search', { ...effective, mode: 'full', q, rulebookIds: '86', pageSize: '200', ...query });
  }
  // Find current-only Chinese tokens using stored CHM documents, then exercise actual scoped FTS.
  const focused = projection.filter(row => row.body.origin.activeAmendment);
  const reconciliation = JSON.parse(fs.readFileSync(path.join(path.dirname(input('projection')), 'reconciliation.json'), 'utf8'));
  assert.equal(reconciliation.newlyAcceptedBodies.length, 147);
  focused.push(rowById.get(reconciliation.newlyAcceptedBodies[0]));
  focused.push(...projection.filter(row => ['chm', 'english'].includes(row.body.origin.kind)));
  const searchEvidence = [];
  for (const row of focused) {
    const chm = current.prepare("SELECT * FROM SpellSearchDocument WHERE spellId=? AND lang='zh' AND variant='chm'").get(row.targetId);
    const oldText = chm ? [chm.name, chm.aliases, chm.summary, chm.mechanics, chm.body].join('\n') : '';
    const candidates = row.body.text.match(/[\p{Script=Han}]{4,}/gu) ?? [];
    let token;
    for (const sentence of candidates.filter(sentence => sentence.length >= 8).concat(candidates)) {
      const width = Math.min(8, sentence.length);
      for (let i = 0; i <= sentence.length - width; i++) {
        const trial = sentence.slice(i, i + width);
        if (!oldText.includes(trial)) { token = trial; break; }
      }
      if (token) break;
    }
    const distinct = Boolean(token); token ??= candidates[0]?.slice(0, 4) ?? row.name.text;
    const found = await search(token);
    for (let page = 2; !found.items.some(item => item.id === row.targetId) && (page - 1) * found.pageSize < found.total; page++)
      found.items.push(...(await search(token, { page })).items);
    assert(found.items.some(item => item.id === row.targetId), `Search ${row.targetId}: ${token}`);
    found.items.forEach(item => assert.equal(item.rulebook.id, 86)); privacy(found);
    if (distinct) assert(!(await search(token, { variant: 'chm' })).items.some(item => item.id === row.targetId));
    assert(!(await search(token, { rulebookIds: '6' })).items.some(item => item.id === row.targetId));
    searchEvidence.push({ id: row.targetId, token, distinct, effective: found });
    if (row.targetId === focused[0].targetId) {
      const entry = current.prepare("SELECT ownerLegacyId,level FROM SpellListEntry WHERE rulebookId=86 AND listType='class' AND spellId=(SELECT id FROM SpellContent WHERE legacySpellId=?) LIMIT 1").get(row.targetId);
      assert(entry);
      const filtered = await search(token, { classIds: entry.ownerLegacyId, level: entry.level });
      assert(filtered.items.some(item => item.id === row.targetId));
      assert.equal((await search(token, { classIds: '999999' })).total, 0);
    }
  }
  const corrected = current.prepare("SELECT * FROM I18nSpellSummaryText WHERE sourceKey LIKE 'summary-review:323:%'").all();
  assert.equal(corrected.length, 29);
  for (const row of corrected) {
    const detail = await http(url, '/' + row.spellId, row.lang === 'zh' ? effective : { lang: 'en' });
    assert.equal(detail.i18n.summary.shortDescription, row.summaryText); count.correctedSummaries++;
    const q = row.summaryText.match(/[\p{Script=Han}]{3,}|[a-zA-Z]{4,}/u)?.[0];
    assert(q);
    const result = await search(q, row.lang === 'en' ? { lang: 'en' } : {});
    // A common token can span more than one page: verify the scoped DB FTS match too.
    assert(result.total > 0);
    const doc = current.prepare('SELECT summary FROM SpellSearchDocument WHERE spellId=? AND lang=? AND variant=?')
      .get(row.spellId, row.lang, row.lang === 'zh' ? 'effective' : 'default');
    assert(doc.summary.includes(row.summaryText));
  }
  for (const id of [100, 2441, 848]) {
    assert(!rowById.has(id));
    const old = await http(oldUrl, '/' + id, effective), now = await http(url, '/' + id, effective);
    assert.deepEqual(now, old); assert.equal(now.i18n?.nameProvenance, undefined); privacy(now);
  }
  const duplicate = current.prepare(`SELECT canonicalName FROM SpellContent GROUP BY canonicalName
    HAVING SUM(sourceRulebookId=86)>0 AND SUM(sourceRulebookId<>86)>0 ORDER BY canonicalName LIMIT 1`).get();
  assert(duplicate);
  const siblings = current.prepare('SELECT legacySpellId,sourceRulebookId FROM SpellContent WHERE canonicalName=?').all(duplicate.canonicalName);
  const related = await http(url, '/resolve', effective, { names: [duplicate.canonicalName],
    rulebookIds: [...new Set(siblings.map(row => row.sourceRulebookId))] });
  assert.equal(related.results[0].status, 'ambiguous');
  assert.deepEqual(related.results[0].candidates.map(item => item.id).sort((a,b)=>a-b), siblings.map(row=>row.legacySpellId).sort((a,b)=>a-b));
  related.results[0].candidates.filter(item => rowById.has(item.id)).forEach(item => list(item, rowById.get(item.id)));
  privacy(related);
  // Browse uses existing class relations; union of all SC owners reaches the projection.
  const owners = current.prepare("SELECT DISTINCT ownerLegacyId FROM SpellListEntry WHERE rulebookId=86 AND listType='class'").all();
  const seen = new Set();
  for (let page = 1; ; page++) {
    const browse = await http(url, '/by-level', { ...effective, rulebookIds: '86',
      classIds: owners.map(row => row.ownerLegacyId).join(','), level: 'all', page, pageSize: 200 });
    const items = browse.groups.flatMap(group => group.items);
    for (const item of items) { list(item, rowById.get(item.id)); seen.add(item.id); }
    if (items.length === 0 || page * browse.pageSize >= browse.total) break;
  }
  assert(seen.size > 900);
  assert(!fs.existsSync(syntheticState), 'No app-state connection should have opened');
  fs.writeFileSync(args.report, JSON.stringify({ count, protectedTables, browseDistinctIds: seen.size,
    newlyAcceptedBodies: reconciliation.newlyAcceptedBodies.length, samples, searchEvidence,
    relatedCrossBookIds: siblings.map(row=>row.legacySpellId), oldSearchDocumentsExact: true,
    allPassed: true, operatorAccess: false, appStateAccess: false }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ allPassed: true, count, browseDistinctIds: seen.size, protectedTables: protectedTables.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  for (const child of processes) child.kill(); current.close(); before.close();
});
