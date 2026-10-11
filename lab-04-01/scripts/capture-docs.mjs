import fs from "node:fs/promises";
import { chromium } from "playwright";
const root = new URL("../../", import.meta.url);
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
try {
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const ua = await page.evaluate(() => navigator.userAgent);
  if (!ua.includes("Edg/")) throw new Error("仅允许 Microsoft Edge，不使用 Chrome");
  for (const directory of ["lab-04-01", "lab-04-02"]) {
    const manifest = JSON.parse(await fs.readFile(new URL(`${directory}/screenshots/manifest.json`, root), "utf8"));
    for (const entry of manifest.filter((item) => item.kind === "官方文档")) {
      await page.goto(entry.source, { waitUntil: "domcontentloaded" });
      await page.locator("h1").evaluate((element) => element.scrollIntoView({ block: "start" }));
      const box = await page.locator("h1").boundingBox();
      const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      await page.screenshot({
        path: new URL(`${directory}/screenshots/${entry.file}`, root).pathname,
        clip: {
          x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10),
          width: Math.min(870, viewport.width - box.x),
          height: Math.min(700, viewport.height - Math.max(0, box.y))
        }
      });
      console.log(`${directory}/screenshots/${entry.file}`);
    }
  }
  await page.close();
} finally {
  await browser.close();
}
