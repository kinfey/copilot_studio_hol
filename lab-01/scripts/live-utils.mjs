import { chromium } from "playwright";

export async function connectEdge() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  context.setDefaultTimeout(10000);
  const userAgent = await context.pages()[0].evaluate(() => navigator.userAgent);
  if (!userAgent.includes("Edg/")) throw new Error("自动化会话必须是 Microsoft Edge");
  return { browser, context };
}

export async function pasteEditor(page, editor, content) {
  await page.bringToFront();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin
  });
  await page.evaluate((text) => navigator.clipboard.writeText(text), content);
  await editor.press("Meta+A");
  await editor.press("Meta+V");
}
