import fs from "node:fs/promises";
import { preprocess, chunkByHeading, validateQueries, buildHybridQuery } from "../../lab-04-01/scripts/rag.mjs";
const root = new URL("../", import.meta.url);
const read = async (file) => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
const metadata = await read("data/metadata.json");
const clean = preprocess(await fs.readFile(new URL("data/policy.raw.md", root), "utf8"));
const chunks = chunkByHeading(clean, metadata);
const audit = await read("data/audit.fixture.json");
const contract = await fs.readFile(new URL("data/contract.md", root), "utf8");
for (const row of audit.findings) {
  if (!contract.includes(row.contractQuote)) throw new Error(`合同原文不存在：${row.clauseId}`);
  const chunk = chunks.find((item) => item.title.includes(row.ruleId) && item.content.includes(row.ruleQuote));
  if (!chunk) throw new Error(`规则引用不存在：${row.ruleId}`);
  row.chunkId = chunk.id;
  row.sourceUrl = metadata.sourceUrl;
}
await fs.mkdir(new URL("output/", root), { recursive: true });
await fs.writeFile(new URL("output/policy.clean.md", root), clean);
await fs.writeFile(new URL("output/chunks.json", root), JSON.stringify(chunks, null, 2) + "\n");
await fs.writeFile(new URL("output/audit.checked.json", root), JSON.stringify(audit, null, 2) + "\n");
const requests = validateQueries(await read("data/queries.example.json")).map((query) => buildHybridQuery(query, {
  department: metadata.department, productLine: metadata.productLine, year: metadata.year,
  groupIds: metadata.allowedGroupIds
}));
await fs.writeFile(new URL("output/hybrid-requests.json", root), JSON.stringify(requests, null, 2) + "\n");
console.log("已校验合同与规则双引用，生成章节块和检索请求；未执行真实法务审计。");
