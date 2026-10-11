import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const profile = process.env.EDGE_WORKSHOP_PROFILE ?? path.join(os.homedir(), ".copilot-studio-hol", "edge-profile");
await fs.mkdir(new URL("../screenshots/", import.meta.url), { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: "msedge",
  headless: false,
  viewport: { width: 1440, height: 1000 },
  args: ["--remote-debugging-port=9223", "--remote-debugging-address=127.0.0.1"]
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("https://copilotstudio.microsoft.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.screenshot({ path: new URL("../screenshots/14-real-copilot-entry.png", import.meta.url).pathname });
console.log("Microsoft Edge 已打开 Copilot Studio。请在浏览器内手动登录。CDP: http://127.0.0.1:9223");
const flowPage = await context.newPage();
await flowPage.goto("https://make.powerautomate.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.bringToFront();
await new Promise((resolve) => context.on("close", resolve));
