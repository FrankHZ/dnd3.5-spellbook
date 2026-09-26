import assert from "node:assert/strict";
import { parseDiceFile } from "./parse";
import { compareBody, reconcile, type PublicationMap, type Rulebook, type Target } from "./reconcile";

const input = `测试书
版本：未知

火光术（Light Fire）（测试书）
变化系
等级：法师1
距离：接触
咒法系（创造）（力场）
豁免检定：无（无害）（测试书）
你可以提到伪标题（False Header）（测试书），但它仍在正文。
表：效果
轮数 | 效果
1 | 发光
尾段仍需保留。

同名术（Same Name）（测试书）
防护系
等级：法师2
正文甲。

重印术（Reprint）（测试书）（另一本）
变化系
等级：法师3
跨书内容。

缺名术（?）（测试书）
变化系
等级：法师4
正文乙。`;
const parsed = parseDiceFile("测试书.txt", Buffer.from(input, "utf8"));
assert.equal(parsed.records.length, 4);
assert.match(parsed.preamble, /版本：未知/);
assert.match(parsed.records[0]!.rawBody, /尾段仍需保留/);
assert.match(parsed.records[0]!.bodyHtml, /1 \| 发光/);
assert.equal(parsed.records[3]!.problems.includes("malformed-header"), true);
assert.equal(parsed.records[0]!.startLine, 4);
assert.throws(() => parseDiceFile("bad.txt", Uint8Array.from([0xff])), /encoded data|encoding/i);
const alternateHeaders = parseDiceFile("测试书.txt", Buffer.from(
  "测试书\n\n空格术（Spaced） （测试书）\n变化系\n等级：法师1\n正文。\n\n无书术（No Book）\n变化系\n等级：法师2\n正文。\n\n坏边界（Broken（测试书）\n变化系\n等级：法师3\n正文。", "utf8"));
assert.equal(alternateHeaders.records.length, 3);
assert.equal(alternateHeaders.records[0]!.enName, "Spaced");
assert.deepEqual(alternateHeaders.records[1]!.bookLabels, []);
assert.ok(alternateHeaders.records[2]!.problems.includes("malformed-header"));
const badTable = parseDiceFile("测试书.txt", Buffer.from("测试书\n\n表术（Table Spell）（测试书）\n变化系\n等级：法师1\n甲 | 乙\n甲 | 乙 | 丙", "utf8"));
assert.ok(badTable.records[0]!.problems.includes("malformed-table"));

const mappings: PublicationMap[] = [
  { file: "测试书.txt", rulebookIds: [10], editionIds: [5], status: "mapped", basis: "synthetic" },
  { file: "另一本.txt", rulebookIds: [11], editionIds: [5], status: "mapped", basis: "synthetic" },
];
const rulebooks: Rulebook[] = [
  { id: 10, editionId: 5, name: "Test" }, { id: 11, editionId: 5, name: "Other" },
];
const targets: Target[] = [
  { id: 1, rulebookId: 10, enName: "Light Fire", zhName: "火光术", zhBody: null },
  { id: 2, rulebookId: 10, enName: "Same Name", zhName: "同名术", zhBody: "正文甲。" },
  { id: 3, rulebookId: 11, enName: "Same Name", zhName: "同名术", zhBody: "另一正文" },
  { id: 4, rulebookId: 10, enName: "Reprint", zhName: null, zhBody: null },
  { id: 5, rulebookId: 11, enName: "Reprint", zhName: null, zhBody: null },
  { id: 6, rulebookId: 10, enName: "Uncovered", zhName: null, zhBody: null },
];
const result = reconcile(parsed.records, mappings, rulebooks, targets, "revision");
assert.equal(result.candidates[0]!.targetId, 1);
assert.equal(result.candidates[1]!.targetId, 2);
assert.equal(result.candidates[1]!.publicationRulebookIds[0], 10);
assert.equal(result.candidates[2]!.classification, "ambiguous-unmatched");
assert.equal(result.candidates[3]!.classification, "malformed-incomplete");
assert.equal(result.targetDispositions.find((row) => row.targetId === 6)!.disposition, "fallback-English");
assert.equal(result.targetDispositions.find((row) => row.targetId === 3)!.disposition, "fallback-existing-Chinese");
assert.deepEqual(reconcile(parsed.records, mappings, rulebooks, targets, "revision"), result);
assert.notEqual(reconcile(parsed.records, mappings, rulebooks, targets, "new-revision").candidates[0]!.sourceKey, result.candidates[0]!.sourceKey);
const duplicate = reconcile([parsed.records[1]!, { ...parsed.records[1]!, startLine: 100, ordinal: 99 }], mappings, rulebooks, targets, "revision");
assert.equal(duplicate.candidates[0]!.duplicateDecision, "review-required");
assert.equal(duplicate.targetDispositions.find((row) => row.targetId === 2)!.sourceKeys.length, 2);
assert.equal(compareBody("甲 乙", "甲乙"), "formatting-only");
assert.equal(compareBody("1 |甲", "1 |乙"), "substantive");
assert.equal(compareBody("尾段缺失", "尾段完整"), "substantive");
console.log("dice intake portable tests passed");
