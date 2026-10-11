interface SaleRow {
  OrderId: string;
  SaleDate: string;
  Region: string;
  Product: string;
  Units: string | number;
  RevenueCNY: string | number;
  Status: string;
}

interface RankedRevenue {
  name: string;
  revenueCNY: number;
}

interface Metrics {
  reportDate: string;
  weekStart: string;
  previousWeekStart: string;
  cutoff: string;
  currency: string;
  orderCount: number;
  units: number;
  revenueCNY: number;
  previousRevenueCNY: number;
  wowPercent: number | null;
  topRegion: RankedRevenue;
  topProduct: RankedRevenue;
  regionRevenue: RankedRevenue[];
  excludedPending: number;
  sourceRowCount: number;
  dataAsOf: string;
}

function isoDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`日期必须为 YYYY-MM-DD：${value}`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`无效日期：${value}`);
  }
  return date;
}

function amount(value: string | number, field: string): number {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error(`${field} 必须为数字或数字文本`);
  }
  if (typeof value === "string" && !/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error(`${field} 必须为非负数，最多两位小数：${value}`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 ||
      Math.abs(number * 100 - Math.round(number * 100)) > 0.00001 ||
      !Number.isSafeInteger(Math.round(number * 100))) {
    throw new Error(`${field} 超出允许范围：${value}`);
  }
  return number;
}

function rank(totals: Map<string, number>): RankedRevenue[] {
  return Array.from(totals, ([name, cents]) => ({ name, revenueCNY: cents / 100 }))
    .sort((a, b) => b.revenueCNY - a.revenueCNY ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function calculateMetrics(rows: SaleRow[], reportDate: string, dataAsOf: string): Metrics {
  const cutoff = isoDay(reportDate);
  const asOf = new Date(dataAsOf);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(dataAsOf) ||
      !Number.isFinite(asOf.getTime()) ||
      new Date(asOf.getTime() + 8 * 3600000).toISOString().slice(0, 10) !== reportDate) {
    throw new Error("dataAsOf 必须是报告日期当天（UTC+8）的 UTC ISO 时间");
  }
  if (!Array.isArray(rows)) throw new Error("销售数据必须为数组");
  const start = new Date(cutoff);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  const previousCutoff = new Date(cutoff);
  previousCutoff.setUTCDate(previousCutoff.getUTCDate() - 7);
  const regions = new Map<string, number>();
  const products = new Map<string, number>();
  const seen = new Set<string>();
  let currentCents = 0, previousCents = 0, orderCount = 0, units = 0, pending = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") throw new Error("销售行必须为对象");
    for (const field of ["OrderId", "SaleDate", "Region", "Product", "Status"] as const) {
      if (typeof row[field] !== "string" || !row[field].trim()) {
        throw new Error(`字段 ${field} 缺失或为空`);
      }
    }
    if (seen.has(row.OrderId)) throw new Error(`重复订单：${row.OrderId}`);
    seen.add(row.OrderId);
    const day = isoDay(row.SaleDate);
    const cents = Math.round(amount(row.RevenueCNY, "RevenueCNY") * 100);
    const rowUnits = amount(row.Units, "Units");
    if (!Number.isSafeInteger(rowUnits)) throw new Error("Units 必须为整数");
    if (!["Completed", "Pending", "Cancelled"].includes(row.Status)) {
      throw new Error(`未知订单状态：${row.Status}`);
    }
    if (row.Status === "Pending" && day >= start && day <= cutoff) pending++;
    if (row.Status !== "Completed") continue;
    if (day >= previousStart && day <= previousCutoff) previousCents += cents;
    if (day >= start && day <= cutoff) {
      currentCents += cents;
      units += rowUnits;
      orderCount++;
      regions.set(row.Region, (regions.get(row.Region) ?? 0) + cents);
      products.set(row.Product, (products.get(row.Product) ?? 0) + cents);
    }
    if (!Number.isSafeInteger(currentCents) || !Number.isSafeInteger(previousCents) ||
        !Number.isSafeInteger(units)) throw new Error("汇总超出安全数值范围");
  }
  if (!orderCount) throw new Error("本期没有已完成订单；停止生成销售周报并通知负责人");
  const rankedRegions = rank(regions);
  const rankedProducts = rank(products);
  return {
    reportDate, weekStart: start.toISOString().slice(0, 10),
    previousWeekStart: previousStart.toISOString().slice(0, 10),
    cutoff: reportDate, currency: "CNY", orderCount, units,
    revenueCNY: currentCents / 100, previousRevenueCNY: previousCents / 100,
    wowPercent: previousCents === 0 ? null :
      Math.round((currentCents - previousCents) / previousCents * 10000) / 100,
    topRegion: rankedRegions[0], topProduct: rankedProducts[0],
    regionRevenue: rankedRegions, excludedPending: pending,
    sourceRowCount: rows.length, dataAsOf
  };
}

function main(
  workbook: ExcelScript.Workbook,
  rowsJson: string,
  reportDate: string,
  dataAsOf: string
): string {
  const rows: SaleRow[] = JSON.parse(rowsJson);
  return JSON.stringify(calculateMetrics(rows, reportDate, dataAsOf));
}
