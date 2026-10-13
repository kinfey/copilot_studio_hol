import fs from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import AdmZip from "adm-zip";
import YAML from "yaml";
import { parseSales, calculate, officeMain, simulateReport, validateReport, emailHtml } from "../scripts/runtime.mjs";

const root = new URL("../", import.meta.url);
const rows = parseSales(await fs.readFile(new URL("data/sales.csv", root), "utf8"));
const reportDate = "2026-10-09", dataAsOf = "2026-10-09T09:00:00Z";
const metrics = calculate(rows, reportDate, dataAsOf);
const clone = () => structuredClone(rows);

test("本期、上周同期、环比和领先分布符合精确验收值", () => {
  assert.equal(metrics.revenueCNY, 112000);
  assert.equal(metrics.previousRevenueCNY, 60000);
  assert.equal(metrics.wowPercent, 86.67);
  assert.equal(metrics.orderCount, 6);
  assert.equal(metrics.units, 91);
  assert.equal(metrics.excludedPending, 1);
  assert.deepEqual(metrics.topRegion, { name: "华东", revenueCNY: 47000 });
  assert.deepEqual(metrics.topProduct, { name: "订阅B", revenueCNY: 63000 });
  assert.equal(metrics.regionRevenue.reduce((sum, row) => sum + row.revenueCNY, 0), 112000);
});
test("实际 Office Script main 输入和返回可解析 JSON", () => {
  assert.deepEqual(JSON.parse(officeMain(JSON.stringify(rows), reportDate, dataAsOf)), metrics);
});
test("周末、未来日期、Pending 不计入周五本期或上周同期", () => {
  const changed = clone();
  for (const row of changed) {
    if (["S006", "S007", "S014", "S015", "S016"].includes(row.OrderId)) row.RevenueCNY = "999999";
  }
  assert.equal(calculate(changed, reportDate, dataAsOf).revenueCNY, 112000);
  assert.equal(calculate(changed, reportDate, dataAsOf).previousRevenueCNY, 60000);
});
test("上周为零时环比为 null，而不是 Infinity 或零", () => {
  const current = rows.filter((row) => row.SaleDate >= "2026-10-05");
  const m = calculate(current, reportDate, dataAsOf);
  assert.equal(m.wowPercent, null);
  assert.match(simulateReport(m).summary, /环比不可计算/);
});
test("空本期明确报错", () => {
  assert.throws(() => calculate([], reportDate, dataAsOf), /没有已完成订单/);
});
test("重复订单明确报错", () => {
  assert.throws(() => calculate([...rows, rows[0]], reportDate, dataAsOf), /重复订单/);
});
test("错误日期、序列号日期与非法金额不能静默转成零", () => {
  for (const [field, value] of [
    ["SaleDate", "2026-02-30"], ["SaleDate", "46304"], ["RevenueCNY", ""],
    ["RevenueCNY", "-1"], ["RevenueCNY", "1,000"], ["RevenueCNY", "1.001"],
    ["Units", "1.5"], ["Status", "Unknown"], ["Region", ""]
  ]) {
    const changed = clone(); changed[0][field] = value;
    assert.throws(() => calculate(changed, reportDate, dataAsOf), undefined, `${field}: ${value}`);
  }
});
test("数字类型金额和精确到分的加总", () => {
  const small = [
    { ...rows[7], RevenueCNY: 0.1, Units: 1 },
    { ...rows[8], RevenueCNY: 0.2, Units: 1 }
  ];
  assert.equal(calculate(small, reportDate, dataAsOf).revenueCNY, 0.3);
});
test("读取时间必须与报告本地日期对齐", () => {
  assert.throws(() => calculate(rows, reportDate, "2026-10-10T09:00:00Z"), /dataAsOf/);
  assert.throws(() => calculate(rows, reportDate, "not-a-time"), /dataAsOf/);
});
test("结构化输出通过 schema 和全部复制指标核对", () => {
  assert.doesNotThrow(() => validateReport(simulateReport(metrics), metrics));
  for (const key of ["revenueCNY", "orderCount", "units", "previousRevenueCNY", "wowPercent"]) {
    const report = simulateReport(metrics); report[key] += 1;
    assert.throws(() => validateReport(report, metrics), /指标不一致/);
  }
  const report = simulateReport(metrics); report.topProduct = { name: "错误产品", revenueCNY: 1 };
  assert.throws(() => validateReport(report, metrics), /指标不一致/);
});
test("结构缺失、主题换行和额外收件人字段不能通过", () => {
  const extra = simulateReport(metrics); extra.to = "unexpected@example.com";
  assert.throws(() => validateReport(extra, metrics), /结构错误/);
  const missing = simulateReport(metrics); delete missing.summary;
  assert.throws(() => validateReport(missing, metrics), /结构错误/);
  const newline = simulateReport(metrics); newline.emailSubject += "\nBcc: injected";
  assert.throws(() => validateReport(newline, metrics), /结构错误/);
});
test("HTML 邮件仅转义纯文本，不执行模型生成标签", () => {
  const report = simulateReport(metrics); report.emailBody = '<img src=x onerror="alert(1)">\n下一行';
  const html = emailHtml(report, metrics);
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("<br>下一行"));
});
test("Sales XLSX 含真实 Table 和 16 条原始数据，无公式错误", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(new URL("data/sales.xlsx", root).pathname);
  const sheet = workbook.getWorksheet("Sales");
  assert.equal(sheet.getTable("SalesTable").table.tableRef, "A1:G17");
  assert.equal(sheet.rowCount, 17);
  assert.equal(sheet.getCell("B2").value, "2026-09-28");
  assert.equal(sheet.getCell("F9").value, 20000);
  sheet.eachRow((row) => row.eachCell((cell) => {
    assert.ok(!cell.value?.error);
  }));
});
test("Word 模板包含 12 个唯一纯文本内容控件", async () => {
  const zip = new AdmZip(await fs.readFile(new URL("templates/weekly-report-template.docx", root)));
  const xml = zip.readAsText("word/document.xml");
  const names = Array.from(xml.matchAll(/<w:alias w:val="([^"]+)"/g), (m) => m[1]);
  assert.equal(names.length, 12);
  assert.equal(new Set(names).size, 12);
  assert.equal((xml.match(/<w:text w:multiLine="1"/g) ?? []).length, 12);
  assert.ok(!xml.includes("CONTROL_"));
});
test("帮助主题是合法 YAML，非伪造的 Agent 导入清单", async () => {
  const topic = YAML.parse(await fs.readFile(new URL("agent/help-topic.yaml", root), "utf8"));
  assert.equal(topic.kind, "AdaptiveDialog");
  assert.equal(topic.beginDialog.intent.triggerQueries.length, 5);
  assert.equal(topic.beginDialog.actions[0].kind, "SendActivity");
});
test("全部教材本地链接和 PNG 截图存在，浏览器明确为 Edge", async () => {
  const md = await fs.readFile(new URL("README.md", root), "utf8");
  const links = Array.from(md.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g), (m) => m[1]);
  for (const link of links) {
    if (!/^(https?:|#)/.test(link)) {
      await fs.access(new URL(link.split("#")[0], root));
    }
  }
  const manifest = JSON.parse(await fs.readFile(new URL("screenshots/manifest.json", root), "utf8"));
  assert.equal(manifest.channel, "msedge");
  assert.match(manifest.userAgent, /Edg\//);
  const publicDocumentation = manifest.images.filter((image) => image.source === "microsoft-learn-public-documentation");
  assert.equal(publicDocumentation.length, 3);
  for (const image of manifest.images) {
    if (image.source !== "microsoft-learn-public-documentation") {
      assert.equal(image.kind, "actual-product-rerun");
      assert.match(image.method, /Playwright \+ Microsoft Edge/);
      assert.ok(["https://copilotstudio.preview.microsoft.com", "https://make.preview.powerautomate.com"].includes(image.source));
      assert.match(image.capturedAt, /^\d{4}-\d{2}-\d{2}T/);
    }
    const file = await fs.readFile(new URL(`screenshots/${image.file}`, root));
    assert.deepEqual(file.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.ok(file.length > (image.source === "microsoft-learn-public-documentation" ? 20000 : 100));
  }
  for (const link of links.filter((link) => /^screenshots\/rerun-.*\.png$/.test(link))) {
    assert.ok(manifest.images.some((image) => `screenshots/${image.file}` === link));
  }
});
test("只交付 Markdown 实验及配套文件，不包含本地页面", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("package.json", root), "utf8"));
  assert.equal(packageJson.scripts.demo, undefined);
  for (const name of ["demo", "scripts/serve.mjs", "output/demo-email.html"]) {
    await assert.rejects(fs.access(new URL(name, root)), { code: "ENOENT" });
  }
});
