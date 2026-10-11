import fs from "node:fs/promises";
import { renderCard } from "./contracts.mjs";
const root = new URL("../", import.meta.url);
const read = async (file) => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
const request = await read("data/request.json");
const analysis = await read("data/analysis-example.json");
const card = renderCard(await read("cards/task-review.template.json"), analysis, request);
await fs.mkdir(new URL("output/", root), { recursive: true });
await fs.writeFile(new URL("output/task-review.example.json", root), JSON.stringify(card, null, 2) + "\n");
await fs.writeFile(new URL("output/task-record.example.json", root), JSON.stringify({
  provenance: "离线模拟验收样例，非 Teams、Planner、To-Do 或真实 Agent 执行",
  requestId: request.requestId,
  decision: "approve",
  assignedAlias: "self",
  status: "Created",
  taskBackend: "Planner",
  taskId: "SIMULATED-TASK-001",
  dueAtUtc: request.dueAtUtc,
  remindAtUtc: request.remindAtUtc,
  reminderStatus: "Pending",
  meaning: "仅示例说明提醒计划已登记；不表示提醒已送达"
}, null, 2) + "\n");
console.log("已保存离线示例卡片与任务记录；未部署资源、未创建真实任务、未发送提醒。");
