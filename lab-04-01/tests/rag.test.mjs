import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { preprocess, chunkByHeading, buildHybridQuery, validateQueries, gateResults } from "../scripts/rag.mjs";
const root = new URL("../", import.meta.url);
const metadata = JSON.parse(await fs.readFile(new URL("data/metadata.json", root), "utf8"));
const raw = await fs.readFile(new URL("data/runbook.raw.md", root), "utf8");

test("只清洗已知页眉页脚，表格完整转换", () => {
  const clean = preprocess(raw);
  assert.ok(!clean.includes("Page 1 of 2"));
  assert.ok(clean.includes("| 证书链 | 检查中间证书是否完整 |"));
  assert.ok(clean.includes("不关闭 TLS 校验"));
  assert.throws(() => preprocess("A\tB\n1\t2\t3"));
});
test("按章节切分，保留父标题和每块权限元数据", () => {
  const chunks = chunkByHeading(preprocess(raw), metadata);
  assert.equal(chunks.length, 2);
  assert.ok(chunks[0].title.includes("AGW-401"));
  assert.ok(!chunks[0].content.includes("## AGW-429"));
  assert.ok(chunks.every((c) => c.content.includes("# AtlasGateway 2.1") && c.allowedGroupIds.length));
  assert.throws(() => chunkByHeading(preprocess(raw), metadata, 50));
});
test("必须3个非重复问题", () => {
  assert.throws(() => validateQueries({ queries: [{ text: "一个" }] }));
  assert.throws(() => validateQueries({ queries: Array(3).fill({ text: "重复" }) }));
});
test("检索同时含关键词和向量，并预过滤部门/产品/年份/ACL", () => {
  const scope = { department: "IT", productLine: "Atlas'Gateway", year: 2026, groupIds: ["G-1"] };
  const request = buildHybridQuery("AGW-401", scope);
  assert.equal(request.vectorFilterMode, "preFilter");
  assert.equal(request.vectorQueries[0].k, 50);
  assert.ok(request.filter.includes("Atlas''Gateway"));
  assert.ok(request.filter.includes("allowedGroupIds/any"));
  assert.throws(() => buildHybridQuery("AGW-401", { ...scope, groupIds: [] }));
});
test("只用语义重排分数门控，去重且最多15项", () => {
  const row = { id: "c1", title: "证书", content: "证据", sourceUrl: "https://learn.microsoft.com/", "@search.rerankerScore": 3 };
  assert.equal(gateResults([row, row]).length, 1);
  assert.equal(gateResults([{ ...row, "@search.rerankerScore": 1 }]).length, 0);
  assert.throws(() => gateResults([{ ...row, "@search.rerankerScore": undefined, "@search.score": 3 }]));
  assert.throws(() => gateResults([{ ...row, sourceUrl: "https://example.invalid/doc" }]));
});
test("两个手册链接存在，引用截图登记为真实产品或官方文档", async () => {
  for (const directory of ["lab-04-01", "lab-04-02"]) {
    const base = new URL(`../../${directory}/`, import.meta.url);
    const markdown = await fs.readFile(new URL("README.md", base), "utf8");
    const manifest = JSON.parse(await fs.readFile(new URL("screenshots/manifest.json", base), "utf8"));
    for (const [, link] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(link)) continue;
      await fs.access(new URL(link, base));
      if (link.startsWith("screenshots/") && link.endsWith(".png")) {
        assert.ok(manifest.some((entry) => `screenshots/${entry.file}` === link));
      }
    }
  }
});
