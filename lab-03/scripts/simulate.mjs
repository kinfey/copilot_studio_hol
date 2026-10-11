import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function simulateOrder(cart, menu) {
  assert.equal(cart.mode, "simulation", "仅允许模拟模式");
  assert.deepEqual(Object.keys(cart).sort(), ["budgetFen", "items", "mode"]);
  assert.ok(Number.isSafeInteger(cart.budgetFen) && cart.budgetFen >= 0 && cart.budgetFen <= 100000);
  assert.ok(Array.isArray(cart.items) && cart.items.length > 0 && cart.items.length <= 20);
  const catalog = new Map(menu.items.map((item) => [item.id, item]));
  const used = new Set();
  const items = cart.items.map((item) => {
    assert.deepEqual(Object.keys(item).sort(), ["id", "quantity"]);
    assert.ok(!used.has(item.id), "重复餐品需合并数量");
    used.add(item.id);
    assert.ok(Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10);
    const product = catalog.get(item.id);
    assert.ok(product, "餐品不在教学菜单");
    assert.ok(Number.isSafeInteger(product.unitPriceFen) && product.unitPriceFen >= 0);
    return { ...product, quantity: item.quantity, subtotalFen: product.unitPriceFen * item.quantity };
  });
  const totalFen = items.reduce((sum, item) => sum + item.subtotalFen, 0);
  assert.ok(Number.isSafeInteger(totalFen));
  return {
    mode: "simulation",
    notice: "模拟订餐，未创建真实订单，未扣款，未核销优惠券。价格为虚构教学数据。",
    items, totalFen, budgetFen: cart.budgetFen,
    withinBudget: totalFen <= cart.budgetFen,
    orderCreated: false, paymentRequired: false, couponRedeemed: false
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL("../", import.meta.url);
  const read = async (file) => JSON.parse(await fs.readFile(new URL(file, root), "utf8"));
  const result = simulateOrder(await read("data/cart.simulated.json"), await read("data/menu.simulated.json"));
  await fs.mkdir(new URL("output/", root), { recursive: true });
  await fs.writeFile(new URL("output/order.simulated.json", root), JSON.stringify(result, null, 2) + "\n");
  console.log("已保存本地模拟订餐结果，未调用麦当劳订单API。");
}
