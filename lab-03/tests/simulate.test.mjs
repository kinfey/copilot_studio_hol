import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { simulateOrder } from "../scripts/simulate.mjs";
const root = new URL("../", import.meta.url);
const read = async (file) => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
const cart = await read("data/cart.simulated.json");
const menu = await read("data/menu.simulated.json");
test("模拟合计正确，没有真实订单或支付", () => {
  const result = simulateOrder(cart, menu);
  assert.equal(result.totalFen, 1800);
  assert.equal(result.withinBudget, true);
  assert.equal(result.orderCreated, false);
  assert.equal(result.paymentRequired, false);
  assert.equal(result.couponRedeemed, false);
  assert.ok(!("orderId" in result) && !("payH5Url" in result));
});
test("超预算明确标识，不伪装成功购买", () => {
  assert.equal(simulateOrder({ ...cart, budgetFen: 1000 }, menu).withinBudget, false);
});
test("拒绝真实模式、未知餐品、负数量和外来字段", () => {
  assert.throws(() => simulateOrder({ ...cart, mode: "real" }, menu));
  assert.throws(() => simulateOrder({ ...cart, items: [{ id: "UNKNOWN", quantity: 1 }] }, menu));
  assert.throws(() => simulateOrder({ ...cart, items: [{ id: "SIM-COFFEE", quantity: -1 }] }, menu));
  assert.throws(() => simulateOrder({ ...cart, couponCode: "not-allowed" }, menu));
  assert.throws(() => simulateOrder({ ...cart, items: [cart.items[0], cart.items[0]] }, menu));
});
test("Studio手动模拟不启用MCP、Teams或定时通知", async () => {
  const policy = await read("config/tool-policy.json");
  assert.equal(policy.allowAll, false);
  assert.ok(policy.forbidden.every((tool) => !policy.enabled.includes(tool)));
  assert.deepEqual(policy.enabled, []);
  assert.equal(policy.externalMcpEnabled, false);
  const schedule = await read("config/schedule.json");
  assert.equal(schedule.mode, "studio-manual-simulation");
  assert.equal(schedule.enabled, false);
  assert.equal(schedule.teamsEnabled, false);
  assert.equal(schedule.dailyNotificationEnabled, false);
  const config = await read("config/mcp.example.json");
  assert.equal(config.mcpServers["mcd-mcp"].url, "https://mcp.mcd.cn");
  assert.ok(config.mcpServers["mcd-mcp"].headers.Authorization.startsWith("<YOUR_"));
});
test("Studio主题包含确定性计算和非法输入、超预算分支", async () => {
  const topic = await fs.readFile(new URL("agent/simulate-meal.topic.yaml", root), "utf8");
  assert.match(topic, /Topic\.BurgerQuantity \* 12 \+ Topic\.CoffeeQuantity \* 6/);
  assert.match(topic, /NumberPrebuiltEntity/);
  assert.match(topic, /Mod\(Topic\.BurgerQuantity, 1\)/);
  assert.match(topic, /超出预算/);
  assert.doesNotMatch(topic, /InvokeFlowAction|HttpRequestAction/);
  const coupons = await read("data/coupons.simulated.json");
  assert.equal(coupons.mode, "simulation");
});
test("真实优惠问题不得触发模拟订餐，测试证据明确未连通", async () => {
  const instructions = await fs.readFile(new URL("agent/instructions.txt", root), "utf8");
  assert.match(instructions, /今天有什么优惠券/);
  assert.match(instructions, /不进入SimulateMeal/);
  const result = await read("output/today-coupons-test.real.json");
  assert.equal(result.question, "今天有什么优惠券");
  assert.equal(result.mcpConnected, false);
  assert.equal(result.couponsRetrieved, false);
  assert.match(result.transcript, /You said: 今天有什么优惠券/);
});
test("手册附件存在，所有截图有来源", async () => {
  const markdown = await fs.readFile(new URL("README.md", root), "utf8");
  const manifest = await read("screenshots/manifest.json");
  for (const [, link] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(link)) continue;
    await fs.access(new URL(link, root));
    if (link.startsWith("screenshots/") && link.endsWith(".png")) {
      assert.ok(manifest.some((item) => `screenshots/${item.file}` === link));
    }
  }
});
