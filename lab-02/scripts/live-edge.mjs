import { chromium } from "playwright";

export async function connectEdge() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  context.setDefaultTimeout(15000);
  const page = context.pages()[0];
  const userAgent = await page.evaluate(() => navigator.userAgent);
  if (!userAgent.includes("Edg/")) throw new Error("Lab 2 仅允许使用 Microsoft Edge");
  return { browser, context };
}

export async function pasteEditor(page, editor, text) {
  await page.bringToFront();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin
  });
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
  await editor.press("Meta+A");
  await editor.press("Meta+V");
}
