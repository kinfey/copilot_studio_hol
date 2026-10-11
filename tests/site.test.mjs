import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "_site");
const folders = ["", "lab-01", "lab-02", "lab-03", "lab-04-01", "lab-04-02"];
execFileSync(process.execPath, [path.join(root, "scripts/build-site.mjs")], { cwd: root, stdio: "pipe" });

test("all twelve bilingual pages contain navigation, content, and theme support", async () => {
  for (const folder of folders) {
    for (const language of ["en", "zh"]) {
      const html = await fs.readFile(path.join(site, folder, language === "zh" ? "index.zh.html" : "index.html"), "utf8");
      assert.match(html, new RegExp(`<html lang="${language === "zh" ? "zh-CN" : "en"}">`));
      assert.match(html, /data-theme/);
      assert.match(html, /<main id="main">/);
      assert.match(html, /<article>[\s\S]*?<h1 /);
      assert.match(html, /href="index.zh.html"/);
      assert.match(html, /href="index.html"/);
      if (folder) assert.ok((html.match(/<h2 /g) ?? []).length >= 7);
    }
  }
});

test("every local HTML link, screenshot, download, and anchor resolves", async () => {
  for (const folder of folders) {
    for (const filename of ["index.html", "index.zh.html"]) {
      const file = path.join(site, folder, filename);
      const html = await fs.readFile(file, "utf8");
      for (const [, encoded] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const link = encoded.replaceAll("&amp;", "&");
        if (/^[a-z][a-z\d+.-]*:/i.test(link)) continue;
        const [pathname, fragment] = link.split("#");
        const target = path.resolve(path.dirname(file), decodeURIComponent(pathname || filename));
        assert.ok(target === site || target.startsWith(site + path.sep), `Link escapes site: ${link}`);
        await fs.access(target);
        if (fragment && target.endsWith(".html")) {
          const content = target === file ? html : await fs.readFile(target, "utf8");
          assert.ok(content.includes(`id="${decodeURIComponent(fragment)}"`), `Missing anchor: ${link} in ${file}`);
        }
      }
    }
  }
});

test("Chinese bold labels render without changing code examples", async () => {
  const html = await fs.readFile(path.join(site, "lab-02/index.zh.html"), "utf8");
  assert.ok(html.includes("<strong>场景：</strong>"));
  assert.ok(!html.includes("**场景：**"));
  const sales = await fs.readFile(path.join(site, "lab-01/index.zh.html"), "utf8");
  assert.ok(sales.includes("&lt;br&gt;"));
});

test("no dependencies, credentials, or local account paths are shipped", async () => {
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      assert.ok(!["node_modules", ".env", ".DS_Store", ".git"].includes(entry.name));
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (/\.(md|html|mjs|json|txt|yaml|ts)$/.test(entry.name)) {
        assert.doesNotMatch(await fs.readFile(file, "utf8"), /\/Users\/[^/\s]+\//);
      }
    }
  };
  await walk(site);
});
