import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
await fs.mkdir(new URL("screenshots/", root), { recursive: true });
let browser;
const manifest = { capturedAt: new Date().toISOString(), browser: "Microsoft Edge",
  channel: "msedge", notice: "仅截取公开 Microsoft Learn 文档，不创建本地演示页面", images: [] };
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  manifest.version = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1, locale: "zh-CN" });
  manifest.userAgent = await page.evaluate(() => navigator.userAgent);
  assert.match(manifest.userAgent, /Edg\//, "只能使用 Microsoft Edge 截图");
  const references = [
    ["11-official-recurrence.png", "https://learn.microsoft.com/en-us/power-automate/run-scheduled-tasks", "Configure cloud flow triggers and actions"],
    ["12-official-prompt.png", "https://learn.microsoft.com/en-us/microsoft-copilot-studio/nlu-prompt-node", "Configure and test a prompt with the prompt editor"],
    ["13-official-execute-agent.png", "https://learn.microsoft.com/en-us/connectors/microsoftcopilotstudio/", "Execute Agent and wait"]
  ];
  for (const [name, sourceUrl, heading] of references) {
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    const target = page.getByRole("heading", { name: heading, exact: true });
    await target.waitFor({ timeout: 30000 });
    await target.scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.top < innerHeight && rect.bottom > 0;
      }).map((image) => image.complete ? Promise.resolve() :
        new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })));
    });
    assert.match(await page.evaluate(() => navigator.userAgent), /Edg\//);
    await page.screenshot({ path: new URL(`screenshots/${name}`, root).pathname });
    manifest.images.push({ file: name, source: "microsoft-learn-public-documentation",
      url: sourceUrl, caption: "Microsoft Learn 公开官方文档页面，非登录租户配置" });
  }
  await fs.writeFile(new URL("screenshots/manifest.json", root), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`已用 Microsoft Edge ${manifest.version} 获取 ${manifest.images.length} 张截图。`);
} finally {
  if (browser) await browser.close();
}
