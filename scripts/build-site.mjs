import fs from "node:fs/promises";
import path from "node:path";
import MarkdownIt from "markdown-it";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "_site");
const labs = [
  { folder: "lab-01", en: "Weekly sales reporting", zh: "销售周报自动化" },
  { folder: "lab-02", en: "Adaptive Cards & task review", zh: "交互卡片与任务审批" },
  { folder: "lab-03", en: "McDonald's MCP & simulation", zh: "麦当劳 MCP 与模拟订餐" },
  { folder: "lab-04-01", en: "IT Helpdesk & enterprise RAG", zh: "IT Helpdesk 与企业检索" },
  { folder: "lab-04-02", en: "Contract compliance & audit", zh: "合同合规与审计报告" }
];
const escape = (text) => MarkdownIt().utils.escapeHtml(text);
const themeScript = `(() => {
  const param = new URLSearchParams(window.location.search).get("scoutTheme");
  const theme =
    param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();`;
const styles = await fs.readFile(path.join(root, "scripts/site.css"), "utf8");
const client = await fs.readFile(path.join(root, "scripts/site-client.js"), "utf8");

function render(markdown) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  // CommonMark otherwise leaves bold CJK labels literal when punctuation touches the next word.
  md.inline.ruler.before("emphasis", "cjk-label", (state, silent) => {
    if (state.src.slice(state.pos, state.pos + 2) !== "**") return false;
    const end = state.src.indexOf("**", state.pos + 2);
    if (end < 0) return false;
    const label = state.src.slice(state.pos + 2, end);
    if (!/^[^*\n]+[：，。！？]$/.test(label)) return false;
    if (!silent) {
      state.push("strong_open", "strong", 1);
      state.push("text", "", 0).content = label;
      state.push("strong_close", "strong", -1);
    }
    state.pos = end + 2;
    return true;
  });
  const headings = [];
  const used = new Map();
  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const title = tokens[index + 1].content;
    const base = title.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "-") || "section";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    tokens[index].attrSet("id", id);
    if (tokens[index].tag === "h2") headings.push({ id, title });
    return self.renderToken(tokens, index, options);
  };
  const defaultLink = md.renderer.rules.link_open ?? ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = tokens[index].attrGet("href");
    if (href && !/^[a-z][a-z\d+.-]*:/i.test(href)) {
      tokens[index].attrSet("href", href.replace(/(^|\/)README(\.zh)?\.md(?=#|$)/, "$1index$2.html"));
    }
    return defaultLink(tokens, index, options, env, self);
  };
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    token.attrSet("alt", self.renderInlineAsText(token.children, options, env));
    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");
    return self.renderToken(tokens, index, options);
  };
  return { html: md.render(markdown), headings };
}

function page(markdown, folder, language) {
  const zh = language === "zh";
  const prefix = folder ? "../" : "./";
  const filename = zh ? "index.zh.html" : "index.html";
  const title = markdown.match(/^# (.+)$/m)?.[1] ?? "Copilot Studio Workshop";
  const { html, headings } = render(markdown);
  const nav = labs.map((lab) => `<a class="sidebar-link" ${folder === lab.folder ? 'aria-current="page"' : ""} href="${prefix}${lab.folder}/${filename}"><span class="nav-number">${lab.folder.replace("lab-", "")}</span><span>${escape(lab[language])}</span></a>`).join("");
  const toc = headings.map(({ id, title }) => `<a class="article-toc-link" href="#${escape(id)}">${escape(title)}</a>`).join("");
  const sequence = [{ folder: "", en: "Workshop overview", zh: "实验总览" }, ...labs];
  const position = sequence.findIndex((item) => item.folder === folder);
  const adjacent = (item, next) => item ? `<a class="page-nav-item ${next ? "next" : ""}" href="${prefix}${item.folder ? item.folder + "/" : ""}${filename}"><span>${zh ? next ? "下一个实验" : "上一个实验" : next ? "Next" : "Previous"}</span><strong>${escape(item[language])}</strong></a>` : "<span></span>";
  const searchData = JSON.stringify(searchIndex[language].map((item) => ({ ...item, href: prefix + item.href }))).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="${zh ? "zh-CN" : "en"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escape(title)} — Copilot Studio hands-on workshop">
<title>${escape(title)} | Copilot Studio HOL</title>
<script>${themeScript}</script>
<style>${styles}</style>
</head>
<body>
<a class="skip" href="#main">${zh ? "跳转到正文" : "Skip to content"}</a>
<header class="site-header"><div class="header-inner"><div class="header-left"><button class="icon-button menu-toggle" id="menu-toggle" aria-controls="sidebar" aria-expanded="false" aria-label="${zh ? "切换实验导航" : "Toggle navigation"}">☰</button><a class="brand" href="${prefix}${filename}"><span class="brand-mark" aria-hidden="true">CS</span><span><strong>Copilot Studio HOL</strong><small>${zh ? "智能体实战工作坊" : "Hands-on Agent Workshop"}</small></span></a></div><nav class="header-actions" aria-label="${zh ? "搜索、语言与主题" : "Search, language and theme"}"><div class="search-shell"><span aria-hidden="true">⌕</span><input id="search-input" type="search" placeholder="${zh ? "搜索实验文档..." : "Search documentation..."}" aria-label="${zh ? "搜索实验文档" : "Search documentation"}" autocomplete="off"><div id="search-results" class="search-results" aria-live="polite" data-empty="${zh ? "没有匹配的内容" : "No matching sections"}"></div></div><a class="header-button" href="${zh ? "index.html" : "index.zh.html"}" lang="${zh ? "en" : "zh-CN"}">${zh ? "English" : "中文"}</a><button class="icon-button" id="theme-toggle" aria-label="${zh ? "切换颜色主题" : "Toggle color theme"}">◐</button><a class="header-button" href="https://github.com/kinfey/copilot_studio_hol">GitHub</a></nav></div></header>
<div class="sidebar-overlay" id="sidebar-overlay"></div>
<aside class="sidebar" id="sidebar" aria-label="${zh ? "实验导航" : "Lab navigation"}"><nav class="sidebar-nav"><div class="sidebar-section-title">${zh ? "实战实验" : "Tutorial"}</div><a class="sidebar-link overview" href="${prefix}${filename}" ${!folder ? 'aria-current="page"' : ""}><span class="nav-number">⌂</span><span>${zh ? "实验总览" : "Workshop overview"}</span></a>${nav}</nav></aside>
<div class="docs-layout"><div class="content-shell">
<main id="main" class="main-content"><nav class="breadcrumbs" aria-label="${zh ? "面包屑导航" : "Breadcrumb"}"><a href="${prefix}${filename}">${zh ? "实验文档" : "Documentation"}</a><span>/</span><span>${folder ? escape(folder.toUpperCase()) : zh ? "实验总览" : "Workshop overview"}</span></nav><div class="document-meta"><span>${folder ? escape(folder.toUpperCase()) : zh ? "实验介绍" : "WORKSHOP GUIDE"}</span><a href="${zh ? "README.zh.md" : "README.md"}">${zh ? "下载 Markdown" : "Download Markdown"}</a></div><article class="article">${html}</article><nav class="page-nav" aria-label="${zh ? "实验顺序" : "Page navigation"}">${adjacent(sequence[position - 1], false)}${adjacent(sequence[position + 1], true)}</nav><footer class="site-footer">${zh ? "以实验手册的真实执行记录为准；模拟数据不证明云端集成成功。" : "Refer to the manuals' actual execution records. Simulated data does not prove successful cloud integration."}</footer></main>
<aside class="article-toc" aria-label="${zh ? "本页目录" : "On this page"}"><div class="article-toc-title">${zh ? "本页目录" : "On this page"}</div>${toc}</aside>
</div></div>
<button class="icon-button scroll-top" id="scroll-top" aria-label="${zh ? "返回顶部" : "Back to top"}">↑</button>
<script id="search-data" type="application/json">${searchData}</script>
<script>
document.querySelectorAll("article table").forEach(table => {
  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll";
  table.before(wrapper);
  wrapper.append(table);
});
${client}
</script>
</body>
</html>\n`;
}

const searchIndex = { en: [], zh: [] };
for (const folder of ["", ...labs.map((lab) => lab.folder)]) {
  for (const language of ["en", "zh"]) {
    const filename = language === "zh" ? "index.zh.html" : "index.html";
    const markdown = await fs.readFile(path.join(root, folder, language === "zh" ? "README.zh.md" : "README.md"), "utf8");
    const base = folder ? folder + "/" : "";
    searchIndex[language].push({ title: markdown.match(/^# (.+)$/m)[1], href: base + filename, text: markdown });
    for (const heading of render(markdown).headings) {
      searchIndex[language].push({ title: heading.title, href: base + filename + "#" + heading.id, text: heading.title });
    }
  }
}
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, ".nojekyll"), "");
for (const asset of ["scripts/build-site.mjs", "scripts/site.css", "scripts/site-client.js", ".github/workflows/pages.yml"]) {
  await fs.mkdir(path.dirname(path.join(output, asset)), { recursive: true });
  await fs.copyFile(path.join(root, asset), path.join(output, asset));
}
for (const folder of ["", ...labs.map((lab) => lab.folder)]) {
  const dest = path.join(output, folder);
  await fs.mkdir(dest, { recursive: true });
  if (folder) {
    await fs.cp(path.join(root, folder), dest, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(path.join(root, folder), source);
        return !relative.split(path.sep).some((part) => part.startsWith(".") || ["node_modules", "__pycache__"].includes(part));
      }
    });
  }
  for (const language of ["en", "zh"]) {
    const readme = language === "zh" ? "README.zh.md" : "README.md";
    const markdown = await fs.readFile(path.join(root, folder, readme), "utf8");
    await fs.writeFile(path.join(dest, readme), markdown);
    await fs.writeFile(path.join(dest, language === "zh" ? "index.zh.html" : "index.html"), page(markdown, folder, language));
  }
}
console.log("Built 12 bilingual HTML pages with local screenshots and downloadable lab assets in _site/.");
