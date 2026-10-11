import assert from "node:assert/strict";

function text(value, maximum, label, allowEmpty = false) {
  assert.equal(typeof value, "string", `${label} 必须为字符串`);
  assert.ok([...value].length <= maximum, `${label} 超过长度限制`);
  if (!allowEmpty) assert.ok(value.trim().length > 0, `${label} 不可为空`);
}

export function validateAnalysis(value) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), "分析必须为对象");
  assert.deepEqual(Object.keys(value).sort(),
    ["title", "summary", "category", "needsClarification", "clarificationQuestion", "riskNotes"].sort());
  text(value.title, 80, "title");
  text(value.summary, 400, "summary");
  assert.ok(["sales", "operations", "other"].includes(value.category), "非法 category");
  assert.equal(typeof value.needsClarification, "boolean");
  text(value.clarificationQuestion, 200, "clarificationQuestion", true);
  assert.equal(value.needsClarification, value.clarificationQuestion.trim().length > 0,
    "需澄清标志与问题不一致");
  assert.ok(Array.isArray(value.riskNotes) && value.riskNotes.length <= 3);
  value.riskNotes.forEach((risk) => {
    assert.deepEqual(Object.keys(risk), ["text"]);
    text(risk.text, 120, "riskNotes.text", true);
  });
  return value;
}

export function validateTimes(request) {
  const times = ["submittedAtUtc", "dueAtUtc", "remindAtUtc"].map((key) => {
    assert.match(request[key], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${key} 必须为 UTC`);
    const time = Date.parse(request[key]);
    assert.ok(Number.isFinite(time) && new Date(time).toISOString() === request[key].replace("Z", ".000Z"),
      `${key} 是非法日期`);
    return time;
  });
  assert.ok(times[0] < times[2] && times[2] < times[1], "要求提交 < 提醒 < 截止");
  return request;
}

export function renderCard(template, analysis, request) {
  validateAnalysis(analysis);
  assert.equal(analysis.needsClarification, false, "需澄清的申请不能送审");
  validateTimes(request);
  text(request.requestId, 100, "requestId");
  const card = structuredClone(template);
  const local = (utc) => `${new Date(Date.parse(utc) + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ")} UTC+8`;
  card.body[0].text = analysis.title;
  card.body[1].text = analysis.summary;
  card.body[2].text = `请求编号：${request.requestId}\n截止：${local(request.dueAtUtc)}\n` +
    `提醒：${local(request.remindAtUtc)}\n仅授权审核人可以提交；批准与指派均会创建任务。`;
  for (const action of card.actions) action.data.requestId = request.requestId;
  assert.ok(Buffer.byteLength(JSON.stringify(card), "utf8") < 28000, "卡片超过实验消息限制");
  return card;
}

export function resolveDecision(response, request, trustedResponderId, reviewerId, status = "AwaitingDecision") {
  assert.equal(status, "AwaitingDecision", "过期或已处理的申请不可再次创建任务");
  assert.ok(trustedResponderId && reviewerId && trustedResponderId === reviewerId, "非授权审核人");
  assert.ok(response && typeof response === "object" && !Array.isArray(response));
  assert.ok(Object.keys(response).every((key) =>
    ["requestId", "decision", "assigneeKey", "reviewComment"].includes(key)), "非法响应字段");
  assert.equal(response.requestId, request.requestId, "请求编号不匹配");
  assert.ok(["approve", "reject", "assign"].includes(response.decision), "未知按钮");
  if (response.assigneeKey !== undefined) {
    assert.ok(request.allowedAssigneeKeys.includes(response.assigneeKey), "负责人不在白名单");
  }
  const comment = response.reviewComment ?? "";
  text(comment, 500, "reviewComment", true);
  if (response.decision === "reject") {
    assert.ok(comment.trim().length > 0, "打回必须说明原因");
    return { status: "Rejected", createTask: false, assigneeKey: null, reviewComment: comment };
  }
  const assigneeKey = response.decision === "approve" ? request.defaultAssigneeKey : response.assigneeKey;
  assert.ok(request.allowedAssigneeKeys.includes(assigneeKey), "负责人不在白名单");
  return { status: "CreatingTask", createTask: true, assigneeKey, reviewComment: comment };
}
