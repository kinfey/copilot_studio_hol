import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export function preprocess(raw) {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(Workshop INTERNAL — training header|Page \d+ of \d+)$/.test(line.trim())) continue;
    if (line.includes("\t")) {
      const rows = [];
      while (i < lines.length && lines[i].includes("\t")) rows.push(lines[i++].split("\t"));
      i--;
      assert.ok(rows.every((row) => row.length === rows[0].length), "表格列数不一致，停止转换");
      const cell = (value) => value.replaceAll("|", "\\|").trim();
      result.push(`| ${rows[0].map(cell).join(" | ")} |`);
      result.push(`| ${rows[0].map(() => "---").join(" | ")} |`);
      result.push(...rows.slice(1).map((row) => `| ${row.map(cell).join(" | ")} |`));
    } else result.push(line);
  }
  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function chunkByHeading(markdown, metadata, maxCharacters = 6000) {
  assert.ok(metadata.documentId && metadata.sourceUrl && metadata.allowedGroupIds?.length);
  const chunks = [];
  const headings = [];
  let body = [];
  const flush = () => {
    if (!body.some((line) => line.trim())) return;
    const content = [...headings.filter(Boolean).map((title, index) => `${"#".repeat(index + 1)} ${title}`), ...body].join("\n");
    assert.ok(content.length <= maxCharacters, "章节过长：需按子标题/段落人工细分，不截断表格或句子");
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
    chunks.push({
      id: `${metadata.documentId}-${hash}`, documentId: metadata.documentId,
      title: headings.filter(Boolean).join(" / "), content,
      department: metadata.department, productLine: metadata.productLine,
      year: metadata.year, status: metadata.status, allowedGroupIds: metadata.allowedGroupIds,
      sourceUrl: metadata.sourceUrl
    });
    body = [];
  };
  for (const line of markdown.split("\n")) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      flush();
      headings.length = match[1].length;
      headings[match[1].length - 1] = match[2];
    } else body.push(line);
  }
  flush();
  return chunks;
}

export function validateQueries(value) {
  assert.deepEqual(Object.keys(value), ["queries"]);
  assert.ok(Array.isArray(value.queries) && value.queries.length === 3, "必须恰好3个子问题");
  const texts = value.queries.map((query) => {
    assert.deepEqual(Object.keys(query), ["text"]);
    assert.equal(typeof query.text, "string");
    assert.ok(query.text.trim() && [...query.text].length <= 240);
    return query.text.trim();
  });
  assert.equal(new Set(texts).size, 3, "子问题不得重复");
  return texts;
}

const quote = (value) => {
  assert.ok(typeof value === "string" && value.trim());
  return `'${value.replaceAll("'", "''")}'`;
};
export function buildHybridQuery(query, trustedScope) {
  const { department, productLine, year, groupIds } = trustedScope;
  assert.ok(query.trim() && Number.isInteger(year));
  assert.ok(Array.isArray(groupIds) && groupIds.length && groupIds.every((id) => /^[A-Za-z0-9-]+$/.test(id)), "授权组不能为空或含分隔符");
  return {
    search: query, queryType: "semantic", semanticConfiguration: "lab04-semantic",
    filter: `department eq ${quote(department)} and productLine eq ${quote(productLine)} and year eq ${year} and status eq 'Approved' and allowedGroupIds/any(g: search.in(g, '${groupIds.join(",")}', ','))`,
    vectorFilterMode: "preFilter",
    vectorQueries: [{ kind: "text", text: query, fields: "contentVector", k: 50 }],
    select: "id,documentId,title,content,sourceUrl,department,productLine,year,status",
    top: 5
  };
}

export function gateResults(results, minimumRerankerScore = 2.5) {
  assert.ok(Number.isFinite(minimumRerankerScore) && minimumRerankerScore >= 0 && minimumRerankerScore <= 4);
  const best = new Map();
  for (const result of results) {
    const score = result["@search.rerankerScore"];
    assert.ok(Number.isFinite(score) && score >= 0 && score <= 4, "缺少语义重排分数，不拿BM25/RRF分数替代");
    assert.ok(result.id && result.content && result.title);
    const url = new URL(result.sourceUrl);
    assert.equal(url.protocol, "https:");
    assert.ok(!url.hostname.endsWith(".invalid"), "上线引用必须是真实可访问文档URL");
    if (score < minimumRerankerScore) continue;
    if (!best.has(result.id) || score > best.get(result.id)["@search.rerankerScore"]) best.set(result.id, result);
  }
  return [...best.values()].sort((a, b) => b["@search.rerankerScore"] - a["@search.rerankerScore"]).slice(0, 15);
}
