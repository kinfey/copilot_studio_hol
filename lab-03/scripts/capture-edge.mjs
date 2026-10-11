import fs from "node:fs/promises";
import { chromium } from "playwright";
const root = new URL("../", import.meta.url);
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
try {
  const context = browser.contexts()[0];
  const page = await context.newPage();
  if (!(await page.evaluate(() => navigator.userAgent)).includes("Edg/")) {
    throw new Error("仅支持Microsoft Edge");
  }
  const manifest = JSON.parse(await fs.readFile(new URL("screenshots/manifest.json", root), "utf8"));
  for (const entry of manifest.filter((item) => item.kind === "官方文档")) {
    await page.goto(entry.source, { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: entry.heading, exact: true });
    await heading.waitFor();
    await heading.evaluate((element) => element.scrollIntoView({ block: "start" }));
    const box = await heading.boundingBox();
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    await page.screenshot({
      path: new URL(`screenshots/${entry.file}`, root).pathname,
      clip: {
        x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10),
        width: Math.min(880, viewport.width - box.x),
        height: Math.min(630, viewport.height - Math.max(0, box.y))
      }
    });
  }
  await page.close();
} finally {
  await browser.close();
}
