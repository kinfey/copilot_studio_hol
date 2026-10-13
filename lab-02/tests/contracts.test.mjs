import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { renderCard, resolveDecision, validateAnalysis, validateTimes } from "../scripts/contracts.mjs";

const root = new URL("../", import.meta.url);
const read = async (file) => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
const request = await read("data/request.json");
const analysis = await read("data/analysis-example.json");
const template = await read("cards/task-review.template.json");
const response = (decision, extra = {}) => ({ requestId: request.requestId, decision, ...extra });

test("三按钮卡片使用 1.4，关联编号且小于 28KB", () => {
  const card = renderCard(template, analysis, request);
  assert.equal(card.version, "1.4");
  assert.deepEqual(card.actions.map((a) => a.data.decision), ["approve", "reject", "assign"]);
  assert.ok(card.actions.every((a) => a.type === "Action.Submit" && a.data.requestId === request.requestId));
  assert.ok(Buffer.byteLength(JSON.stringify(card)) < 28000);
  assert.notDeepEqual(card, template);
});
test("用户文本作为字符串安全序列化", () => {
  const summary = '包含引号 " 和换行\n以及 \\\\';
  const card = renderCard(template, { ...analysis, summary }, request);
  assert.equal(JSON.parse(JSON.stringify(card)).body[1].text, summary);
});
test("分析只允许六字段和 text 对象数组", () => {
  assert.equal(validateAnalysis(analysis), analysis);
  assert.throws(() => validateAnalysis({ ...analysis, riskNotes: ["风险"] }));
  assert.throws(() => validateAnalysis({ ...analysis, assigneeId: "outside" }));
  assert.throws(() => validateAnalysis({ ...analysis, needsClarification: true, clarificationQuestion: "" }));
  assert.throws(() => renderCard(template, { ...analysis, needsClarification: true, clarificationQuestion: "目标是什么？" }, request));
});
test("日期必须合法且提交早于提醒，提醒早于截止", () => {
  validateTimes(request);
  assert.throws(() => validateTimes({ ...request, dueAtUtc: "2026-02-30T09:00:00Z" }));
  assert.throws(() => validateTimes({ ...request, remindAtUtc: request.dueAtUtc }));
  assert.throws(() => validateTimes({ ...request, dueAtUtc: "2026-10-13T09:00:00+08:00" }));
});
test("批准使用默认负责人，指派使用白名单", () => {
  assert.equal(resolveDecision(response("approve", { assigneeKey: "backup" }), request, "reviewer", "reviewer").assigneeKey, "self");
  assert.equal(resolveDecision(response("assign", { assigneeKey: "backup" }), request, "reviewer", "reviewer").assigneeKey, "backup");
  assert.throws(() => resolveDecision(response("assign", { assigneeKey: "outside" }), request, "reviewer", "reviewer"));
  assert.throws(() => resolveDecision(response("assign"), request, "reviewer", "reviewer"));
});
test("打回需原因且不创建任务", () => {
  assert.throws(() => resolveDecision(response("reject"), request, "reviewer", "reviewer"));
  assert.equal(resolveDecision(response("reject", { reviewComment: "补充目标" }), request, "reviewer", "reviewer").createTask, false);
});
test("身份、状态、编号及按钮都必须可信", () => {
  assert.throws(() => resolveDecision(response("approve"), request, "intruder", "reviewer"));
  assert.throws(() => resolveDecision(response("approve"), request, "reviewer", "reviewer", "Created"));
  assert.throws(() => resolveDecision(response("approve", { requestId: "forged" }), request, "reviewer", "reviewer"));
  assert.throws(() => resolveDecision(response("delete"), request, "reviewer", "reviewer"));
  assert.throws(() => resolveDecision(response("approve", { responderObjectId: "forged" }), request, "reviewer", "reviewer"));
});
test("手册所有本地链接都存在，截图均有来源登记", async () => {
  const markdown = await fs.readFile(new URL("README.md", root), "utf8");
  const manifest = await read("screenshots/manifest.json");
  for (const [, link] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(link)) continue;
    await fs.access(new URL(link, root));
    if (/^screenshots\/.*\.png$/.test(link)) assert.ok(manifest.some((entry) => `screenshots/${entry.file}` === link));
  }
});
