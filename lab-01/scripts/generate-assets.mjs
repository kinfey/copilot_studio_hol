import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import AdmZip from "adm-zip";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, ShadingType, Footer, PageNumber
} from "docx";
import { parseSales, calculate, simulateReport, validateReport } from "./runtime.mjs";

const root = new URL("../", import.meta.url);
const write = (name, contents) => fs.writeFile(new URL(name, root), contents);
await fs.mkdir(new URL("templates/", root), { recursive: true });
await fs.mkdir(new URL("output/", root), { recursive: true });
const csv = await fs.readFile(new URL("data/sales.csv", root), "utf8");
const rows = parseSales(csv);
const metrics = calculate(rows, "2026-10-09", "2026-10-09T09:00:00Z");
const report = validateReport(simulateReport(metrics), metrics);
await write("data/sales.json", JSON.stringify(rows, null, 2) + "\n");
await write("data/expected-metrics.json", JSON.stringify(metrics, null, 2) + "\n");
await write("agent/prompt-output-example.json", JSON.stringify(report, null, 2) + "\n");
await write("output/demo-report.json", JSON.stringify({
  provenance: "确定性本地教学模拟，非真实 AI 或云端 Agent 执行", metrics, report
}, null, 2) + "\n");
await write("output/demo-ppt-outline.md", "# 销售周报 PPT 大纲（教学模拟）\n\n" +
  report.pptOutline.map((slide, index) => `## ${index + 1}. ${slide.title}\n\n${slide.body}\n`).join("\n") +
  "\n本文件不是 PPTX。请在 PowerPoint 中依 Word 报告创建演示文稿并人工审阅。\n");

const workbook = new ExcelJS.Workbook();
workbook.creator = "Workshop";
const sheet = workbook.addWorksheet("Sales", { views: [{ state: "frozen", ySplit: 1 }] });
const headers = Object.keys(rows[0]);
sheet.addTable({
  name: "SalesTable", ref: "A1", headerRow: true, totalsRow: false,
  style: { theme: "TableStyleMedium2", showRowStripes: true },
  columns: headers.map((name) => ({ name, filterButton: true })),
  rows: rows.map((row) => headers.map((key) =>
    ["Units", "RevenueCNY"].includes(key) ? Number(row[key]) : row[key]))
});
sheet.columns.forEach((column, index) => { column.width = [16, 18, 14, 16, 12, 20, 18][index]; });
sheet.eachRow((row) => row.eachCell((cell) => {
  cell.font = { name: "Arial", size: 11 };
}));
sheet.getRow(1).eachCell((cell) => {
  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
});
sheet.getColumn(6).numFmt = '#,##0.00;(#,##0.00);"-"';
const notes = workbook.addWorksheet("说明");
[
  ["项目", "说明"],
  ["数据性质", "全部为教学模拟，无真实客户或销售数据"],
  ["数据来源", "Source: data/sales.csv, 2026-10-11, workshop synthetic fixture"],
  ["货币", "RevenueCNY 为人民币元，最多两位小数"],
  ["日期", "SaleDate 为 YYYY-MM-DD 文本，不是 Excel 日期序列号"],
  ["一行一单", "OrderId 唯一，仅 Completed 纳入销售；Pending/Cancelled 排除"],
  ["演示报告日期", "2026-10-09（固定测试日期，非实际当天）"],
  ["环比口径", "本周一至周五 vs 上周一至周五"],
  ["日期粒度限制", "没有交易时间戳，只能基于读取时快照统计"],
  ["表", "Sales 工作表包含真实 Excel Table：SalesTable"]
].forEach((row) => notes.addRow(row));
notes.columns = [{ width: 22 }, { width: 90 }];
notes.eachRow((row) => row.eachCell((cell) => { cell.font = { name: "Arial", size: 11 }; }));
await workbook.xlsx.writeFile(new URL("data/sales.xlsx", root).pathname);

const p = (text, heading) => new Paragraph({
  ...(heading ? { heading } : {}), spacing: { after: 160 },
  children: [new TextRun(text)]
});
const controls = ["ReportDate", "Period", "Revenue", "Orders", "Units", "WoW",
  "TopRegion", "TopProduct", "Summary", "Risks", "NextActions", "DataAsOf"];
const labels = ["报告日期", "统计期间", "销售额（CNY）", "已完成订单", "销售件数",
  "环比（上周同期）", "领先区域", "领先产品", "本周摘要", "风险", "下一步", "读取快照"];
const values = [
  metrics.reportDate, `${metrics.weekStart} 至 ${metrics.cutoff}`,
  `${metrics.revenueCNY.toLocaleString("zh-CN")} 元`, `${metrics.orderCount} 单`,
  `${metrics.units} 件`, `${metrics.wowPercent}%`,
  `${metrics.topRegion.name} / ${metrics.topRegion.revenueCNY} 元`,
  `${metrics.topProduct.name} / ${metrics.topProduct.revenueCNY} 元`,
  report.summary, report.risks.map((item) => item.text).join("\n"),
  report.nextActions.map((item) => item.text).join("\n"), metrics.dataAsOf
];
function document(template) {
  const table = new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [2600, 6426],
    rows: controls.slice(0, 8).map((name, index) => new TableRow({
      children: [
        new TableCell({ width: { size: 2600, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          shading: { fill: "EAF1FC", type: ShadingType.CLEAR }, children: [p(labels[index])] }),
        new TableCell({ width: { size: 6426, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [p(template ? `CONTROL_${name}` : values[index])] })
      ]
    }))
  });
  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({
        children: [new TextRun("Workshop / 教学模拟 / "), new TextRun({ children: [PageNumber.CURRENT] })]
      })] }) },
      children: [p("每周销售报告", HeadingLevel.TITLE),
        p("教学模拟｜模板固定排版，Prompt 不负责生成任意 Word 格式"),
        table,
        ...controls.slice(8).flatMap((name, offset) => {
          const index = offset + 8;
          return [p(labels[index], HeadingLevel.HEADING_1),
            ...((template ? [`CONTROL_${name}`] : values[index].split("\n")).map((value) => p(value)))];
        })
      ]
    }]
  });
}
const template = new AdmZip(await Packer.toBuffer(document(true)));
let xml = template.readAsText("word/document.xml");
for (const [index, name] of controls.entries()) {
  const marker = new RegExp(`<w:r(?:\\s[^>]*)?>((?:(?!<w:r[\\s>])[\\s\\S])*?)<w:t[^>]*>CONTROL_${name}<\\/w:t><\\/w:r>`);
  if (!marker.test(xml)) throw new Error(`Word 模板标记缺失：${name}`);
  xml = xml.replace(marker, `<w:sdt><w:sdtPr><w:alias w:val="${name}"/>` +
    `<w:tag w:val="${name}"/><w:id w:val="${1000 + index}"/><w:text w:multiLine="1"/>` +
    `</w:sdtPr><w:sdtContent><w:r><w:t>填写${labels[index]}</w:t></w:r></w:sdtContent></w:sdt>`);
}
template.updateFile("word/document.xml", Buffer.from(xml));
await write("templates/weekly-report-template.docx", template.toBuffer());
await write("output/demo-weekly-report.docx", await Packer.toBuffer(document(false)));
console.log("已生成销售 Excel Table、12 个 Word 纯文本内容控件、指标和本地模拟报告。");
