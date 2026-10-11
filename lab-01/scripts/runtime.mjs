import fs from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import Ajv from "ajv";

const root = new URL("../", import.meta.url);
const source = await fs.readFile(new URL("agent/metrics.ts", root), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 }
}).outputText;
const context = vm.createContext({});
vm.runInContext(`${compiled}\nthis.calculate = calculateMetrics; this.officeMain = main;`, context);
export function calculate(rows, reportDate, dataAsOf) {
  return JSON.parse(JSON.stringify(context.calculate(rows, reportDate, dataAsOf)));
}
export function officeMain(rowsJson, reportDate, dataAsOf) {
  return context.officeMain({}, rowsJson, reportDate, dataAsOf);
}

export function parseSales(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error("销售 CSV 列数不匹配");
    return Object.fromEntries(headers.map((key, index) => [key, values[index]]));
  });
}

const schema = JSON.parse(await fs.readFile(new URL("agent/report.schema.json", root), "utf8"));
const validate = new Ajv({ allErrors: true }).compile(schema);
export function validateReport(report, metrics) {
  if (!validate(report)) throw new Error(`报告结构错误：${JSON.stringify(validate.errors)}`);
  for (const key of [
    "reportDate", "revenueCNY", "orderCount", "units", "previousRevenueCNY", "wowPercent"
  ]) {
    if (report[key] !== metrics[key]) throw new Error(`AI 指标不一致：${key}`);
  }
  for (const key of ["topRegion", "topProduct"]) {
    if (report[key].name !== metrics[key].name ||
        report[key].revenueCNY !== metrics[key].revenueCNY) {
      throw new Error(`AI 指标不一致：${key}`);
    }
  }
  if (!report.emailSubject.includes(metrics.reportDate) ||
      !report.emailSubject.includes("销售周报")) {
    throw new Error("邮件主题必须包含报告日期和销售周报");
  }
  return report;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

export function emailHtml(report, metrics) {
  validateReport(report, metrics);
  return `<h2>${escapeHtml(report.emailSubject)}</h2>` +
    `<p>人民币 ${metrics.revenueCNY.toLocaleString("zh-CN")} 元 / ` +
    `${metrics.orderCount} 单 / ${metrics.units} 件</p>` +
    `<p>${escapeHtml(report.emailBody).replace(/\r?\n/g, "<br>")}</p>` +
    `<p>口径：${metrics.weekStart} 至 ${metrics.cutoff}；读取快照：` +
    `${escapeHtml(metrics.dataAsOf)}。附件为 Word 报告。</p>`;
}

// This deterministic fixture is not an AI or a Copilot Studio deployment.
export function simulateReport(metrics) {
  const wow = metrics.wowPercent === null ? "上期为零，环比不可计算" :
    `较上周同期${metrics.wowPercent >= 0 ? "增长" : "下降"} ${Math.abs(metrics.wowPercent)}%`;
  const summary = `本期（${metrics.weekStart} 至 ${metrics.cutoff}）已完成销售 ` +
    `${metrics.revenueCNY.toLocaleString("zh-CN")} 元，共 ${metrics.orderCount} 单、` +
    `${metrics.units} 件，${wow}。${metrics.topRegion.name}以 ` +
    `${metrics.topRegion.revenueCNY.toLocaleString("zh-CN")} 元领先，` +
    `${metrics.topProduct.name}贡献 ${metrics.topProduct.revenueCNY.toLocaleString("zh-CN")} 元。` +
    "统计基于读取时快照，不包含待完成订单；现有数据不足以解释增长原因。";
  return {
    reportDate: metrics.reportDate, revenueCNY: metrics.revenueCNY,
    orderCount: metrics.orderCount, units: metrics.units,
    previousRevenueCNY: metrics.previousRevenueCNY, wowPercent: metrics.wowPercent,
    topRegion: metrics.topRegion, topProduct: metrics.topProduct,
    summary,
    risks: [{ text: `本期待完成订单 ${metrics.excludedPending} 单未计入业绩。` },
      { text: "日期列无时间戳，金额反映读取快照，不是严格的 17:00 逐笔截止。"}],
    nextActions: [{ text: "核对待完成订单状态，确认后纳入下一次报告。" },
      { text: "补充业务原因与目标数据，再判断区域及产品表现。" }],
    emailSubject: `${metrics.reportDate} 销售周报（草稿）`,
    emailBody: `${summary}\n\n风险：待完成订单未计入；日期列没有时间戳。\n\n` +
      "下周建议：核对订单状态，补充目标与原因数据。请审阅 Word 附件后再发送。",
    pptOutline: [
      { title: "本周销售概览", body: `${metrics.revenueCNY} 元，${metrics.orderCount} 单，${wow}。` },
      { title: "区域与产品分布", body: `${metrics.topRegion.name} ${metrics.topRegion.revenueCNY} 元；` +
        `${metrics.topProduct.name} ${metrics.topProduct.revenueCNY} 元。` },
      { title: "风险与下一步", body: "核对待完成订单，补充目标和业务原因；所有建议需人工确认。" }
    ]
  };
}
