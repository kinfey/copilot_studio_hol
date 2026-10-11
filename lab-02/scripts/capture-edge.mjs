import path from "node:path";
import fs from "node:fs/promises";
import { connectEdge } from "./live-edge.mjs";

const [urlFragment, selector, name] = process.argv.slice(2);
if (!urlFragment || !selector || !/^[\w-]+\.png$/.test(name ?? "")) {
  throw new Error("用法：npm run screenshots -- <页面URL片段> <仅实验内容的CSS选择器> <文件名.png>");
}
const root = new URL("../screenshots/", import.meta.url);
await fs.mkdir(root, { recursive: true });
const { browser, context } = await connectEdge();
try {
  const pages = context.pages().filter((page) => page.url().includes(urlFragment));
  if (pages.length !== 1) throw new Error("页面必须唯一匹配，不能猜测截图页面");
  const page = pages[0];
  await page.bringToFront();
  const target = page.locator(selector);
  if (await target.count() !== 1) throw new Error("截图区域必须唯一匹配");
  await target.screenshot({ path: path.join(root.pathname, name) });
  console.log(`已保存真实 Edge 截图：screenshots/${name}；发布前请检查账号与无关业务内容。`);
} finally {
  await browser.close();
}
