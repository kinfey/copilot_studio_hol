import fs from "node:fs/promises";
import { preprocess, chunkByHeading, validateQueries, buildHybridQuery } from "./rag.mjs";
const root = new URL("../", import.meta.url);
const raw = await fs.readFile(new URL("data/runbook.raw.md", root), "utf8");
const metadata = JSON.parse(await fs.readFile(new URL("data/metadata.json", root), "utf8"));
const queries = validateQueries(JSON.parse(await fs.readFile(new URL("data/queries.example.json", root), "utf8")));
await fs.mkdir(new URL("output/", root), { recursive: true });
const clean = preprocess(raw);
await fs.writeFile(new URL("output/runbook.clean.md", root), clean);
await fs.writeFile(new URL("output/chunks.json", root), JSON.stringify(chunkByHeading(clean, metadata), null, 2) + "\n");
const requests = queries.map((query) => buildHybridQuery(query, {
  department: metadata.department, productLine: metadata.productLine, year: metadata.year,
  groupIds: metadata.allowedGroupIds
}));
await fs.writeFile(new URL("output/hybrid-requests.json", root), JSON.stringify(requests, null, 2) + "\n");
console.log("已生成清洗文档、语义章节块及三份混合检索请求；未调用搜索或ServiceNow。");
