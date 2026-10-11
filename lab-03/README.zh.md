# Lab 03：Copilot Studio 内部模拟订餐与麦当劳 MCP 连通检查

[English](README.md) | [简体中文](README.zh.md)

**测试主线：**在 Copilot Studio 的 **Test** 窗格直接输入 **“今天有什么优惠券”**，检查真实 MCP 查询。这个问题不得进入模拟订餐主题，也不询问数量或预算。模拟订餐仅作为用户明确要求时的可选主题。

## 第一步：确认模拟与真实 MCP 的区别

1. 模拟主线不需要 Token，也不访问个人消费账户。
2. 教学汉堡12元、咖啡6元；教学券仅演示“已持有”和“可领取”分类，不参与算价，不是麦当劳今日价格或真实优惠。
3. 真实查询必须成功绑定 MCP 并取得工具结果。Agent 回答、连接器定义或模拟成功均不等于 MCP 已连通。
4. 曾在聊天公开的密钥应轮换，新密钥只由本人填写产品安全凭据框，不写入代码、Prompt、Markdown、截图或日志。

**完成检查：**学员能解释为什么18元模拟结果不能用作真实下单报价。

## 第二步：配置 Agent 的模拟指令

1. 在 Copilot Studio 选择自己的实验环境，打开 `Workshop-McDCouponAgent-Lab03`。首次操作可新建同名实验 Agent。
2. **Overview → Instructions → Edit**，粘贴 [全局指令](agent/instructions.txt)，选择 **Save**。
3. 关闭 Web Search，避免公开促销内容混入教学结果。
4. 保留生成式编排以按主题描述选择 `SimulateMeal`；不添加 Teams 渠道或外部写入工具。

![真实Studio：仅内部模拟的全局指令](screenshots/11-real-studio-instructions.png)

**完成检查：**Agent 不承诺自动提醒，不索取密钥、地址或支付信息。

## 第三步：创建内部模拟主题

1. **Topics → Add a topic → From blank**，命名 `SimulateMeal`。
2. 在 Trigger 的描述填写“仅在用户明确要求模拟订餐或教学套餐预算试算时使用；询问今天有什么优惠券、真实优惠查询时不得使用此主题”。
3. **More → Open code editor**，粘贴 [完整主题 YAML](agent/simulate-meal.topic.yaml)。
4. 等待代码解析完成，关闭代码编辑器，打开 **Topic checker**。确认没有错误后 **Save**。
5. 确认主题开启。此 YAML 是主题编辑器代码，不是 Agent 导入包。

![真实Studio：模拟主题与Number提问节点](screenshots/10-real-simulation-topic.png)

**完成检查：**主题包含说明消息、三个 Question、输入校验、算价、预算分支及免责声明，不含 HTTP、MCP、Teams 或 Agent flow 调用。

## 第四步：理解数值输入与校验

按主题的三个 Question 顺序输入：

| 变量 | Identify | 单位及范围 |
|---|---|---|
| BurgerQuantity | Number | 汉堡数量，0–10整数 |
| CoffeeQuantity | Number | 咖啡数量，0–10整数 |
| BudgetYuan | Number | 预算，元，0–1000整数 |

1. 至少选择一件商品。
2. Number 识别数字后，Condition 再检查范围和 `Mod(数量, 1) <> 0`，防止小数数量。
3. 非法输入明确显示错误并结束本次主题；重新输入“模拟订餐”开始。
4. 预算使用“元”，不要把本地示例的 `budgetFen`（分）直接填入此变量。

**完成检查：**`1.5`份汉堡、负数或两种数量均为0不能产生有效报价。

## 第五步：使用 Power Fx 算价

Set variable 节点写入：

```powerfx
Topic.TotalYuan = Topic.BurgerQuantity * 12 + Topic.CoffeeQuantity * 6
```

编辑器的 Value 实际为 `=Topic.BurgerQuantity * 12 + Topic.CoffeeQuantity * 6`。随后比较：

```powerfx
Topic.TotalYuan <= Topic.BudgetYuan
```

1. 在预算内：明确“试算在预算内，仅供教学参考”。
2. 超预算：明确“超出预算，请减少餐品或调整预算”，不输出成交确认。
3. 两个分支都说明未下单、未扣款、未核销，三个交易标志为 false。
4. 优惠券没有真实适用性证据，不凭标题给价格减免。

**完成检查：**计算来自主题节点，而非模型自由心算。

## 第六步：直接测试“今天有什么优惠券”

1. 打开 **Test**。若旧对话停在模拟主题的提问中，先展开测试窗格，选择 **New test session**，不要使用画布缩放的 Reset。
2. 直接输入 **今天有什么优惠券**，发送并等待该条消息之后的新回复。
3. 不输入“模拟订餐”，不填写餐品数量或预算。`SimulateMeal` 的描述已收窄，真实优惠问题不触发该主题。
4. MCP 已绑定时检查活动追踪中的实际只读工具调用、返回状态与查询时间；按“已有券”“可领取券”分组。
5. 未绑定时应明确无法查询真实优惠券，不能返回教学券、互联网促销或编造的“今天无券”。

![真实Studio Test：直接询问今天有什么优惠券](screenshots/17-real-today-coupons-test.png)

**实际结果：**Agent 回复“当前MCP尚未连通，无法查询今天的真实优惠券”，未进入模拟订餐。见[真实测试记录](output/today-coupons-test.real.json)。这验证了路由和明确失败提示，**不表示 MCP 连通成功**；继续第八、九步处理连接。

## 第七步：验证异常分支

每次用 **New test session** 开始独立对话，或完整结束主题后重新触发。必须等待本轮新提问后再发送，不能匹配旧问题而连续发送。

| 输入顺序 | 预期 |
|---|---|
| 1、1、25 | 合计18元，预算内 |
| 1、1、10 | 合计18元，超预算 |
| 1.5、1、25 | 非法数量，停止试算 |
| 0、0、25 | 至少选择一件，停止试算 |
| “领取教学券”或“确认支付” | 说明模拟限制，无账户写入 |

本轮按要求只测真实优惠问题，不运行模拟订餐。历史正常模拟用例已完成；超预算和非法数量仍需独立会话实测，不把代码检查冒充云端执行证据。

![历史真实Studio模拟：1汉堡1咖啡预算25元，合计18元](screenshots/12-real-studio-budget-pass.png)

**完成检查：**不能把“Send failed”当作业务校验通过；出现发送失败时重置会话再执行。

## 第八步：检查真实 MCP 是否绑定到这个 Agent

此步用于诊断真实服务，**不影响内部模拟主线**。

1. **Tools** 检查 MCP 是否已添加到当前 Agent。若显示 **Create your first tool**，说明当前没有工具绑定，即使外部连接器定义存在也无法调用。
2. 在同一环境的 **Power Apps → Custom connectors** 找到 `McD-Coupons-Lab03`。列表可能处于 iframe，Playwright 按框架中的目标连接器定位。
3. 检查端点为 `https://mcp.mcd.cn`，Streamable HTTP；`https://open.mcd.cn/mcp/doc` 是文档，不是 API。
4. 认证使用 API key → Header → `Authorization`。完整头值以本人平台生成配置为准，不能从公开掩码推断是否加 `Bearer`。

![真实Power Apps：已保存麦当劳MCP连接器定义](screenshots/15-real-connector-found.png)

![真实Agent Tools：尚未添加工具](screenshots/16-real-agent-no-tools.png)

![官方接入文档：端点与认证头](screenshots/01-official-mcd-endpoint.png)

**完成检查：**需要“个人连接创建成功 → Agent选中并绑定 → tools/list成功 → 只读调用返回”四层证据。当前只有连接器定义存在，尚未取得真实工具列表或优惠券结果。

## 第九步：处理连接创建的 DLP 阻塞

此前从既有连接器直接 **Create connection**，用户自行填写凭据后，产品明确返回：

`Connection creation/edit ... has been blocked by Data Loss Prevention (DLP) policy ...`

![真实连接错误：DLP阻止创建连接](screenshots/09-real-dlp-block.png)

1. 这是已确认的连接创建阻塞，不是已证实的无效 Token。取消 Teams 不等于麦当劳连接器获准使用。
2. 将环境、连接器名称、目标主机 `mcp.mcd.cn`、错误截图及“仅本人只读优惠查询、Studio内模拟”用途，通过内部渠道提交管理员。无需审批 Teams 数据组合，因为本版不使用 Teams。
3. 管理员检查所有适用 **Data policies**。环境级策略按连接器名称分类，租户级策略按主机 URL 模式分类；只批准必要实验范围，不关闭整个策略。
4. 未获批准时不换域名、代理、环境或连接器名称规避，不反复要求用户输入密钥。
5. 批准生效后，从原连接器重新创建个人连接，确认真实记录出现，再到 Studio **Add and configure**。
6. 关闭 **Allow all**，仅启用 `query-my-coupons`、`available-coupons`、`now-time-info`。下单、领券、取消、积分、抽奖、地址写入工具保持禁用。
7. 只读查询在活动追踪中取得真实返回，才能称 MCP 连通。失败不能说“没有优惠券”，模拟券不能替代返回结果。
8. 无论将来真实查询是否成功，都保留内部算价主题，不调用 `create-order` 模拟：该工具会创建真实订单。

当前[工具配置](config/tool-policy.json)是 `enabled=[]`，表示未启用外部 MCP，不代表已在云端应用真实工具白名单。[诊断记录](output/connection-diagnosis.json)保存阻塞状态，不含凭据。

## 第十步：保存成果与结束实验

1. 保存 Agent 指令和 Topic；在 Test 内运行不需要发布到 Teams。
2. 查看 [虚构优惠券](data/coupons.simulated.json)、[菜单](data/menu.simulated.json)、[本地购物车](data/cart.simulated.json)、[本地模拟结果](output/order.simulated.json)。
3. 本地模拟与 Studio 主题是两个独立实现，本地使用“分”、Studio使用“元”；相同1＋1套餐应分别得到1800分和18元。
4. 运行：

   ```bash
   node lab-03/scripts/simulate.mjs
   node --test lab-03/tests/simulate.test.mjs
   ```

5. [schedule.json](config/schedule.json)标记 `cancelled`、Teams及定时通知均禁用。旧晨报消息与定时截图是历史附件，不作为本版操作步骤。
6. 不共享个人凭据，撤销不再需要的 Token 时先检查本人其他集成是否仍使用。

## 真实操作状态

| 内容 | 状态 |
|---|---|
| Studio模拟全局指令 | 已保存 |
| SimulateMeal主题 | 已保存，Topic checker零错误 |
| 直接询问今天有什么优惠券 | 已实测，明确MCP未连通，没有进入模拟订餐 |
| 1汉堡＋1咖啡，预算25元 | 真实Test返回18元和未交易说明 |
| 超预算与非法数量独立会话 | 待完成云端实测；主题已包含分支 |
| MCP连接器定义 | 真实存在 |
| MCP绑定及真实优惠券查询 | 尚未连通，此前连接创建被DLP阻止 |
| Teams与每日08:00通知 | 已取消，不启用 |
| 真实领券、订单、支付 | 未执行 |

截图来源见 [manifest.json](screenshots/manifest.json)。历史截图仅说明当时的配置或错误，不证明目前连通。

## 官方参考

- [麦当劳 MCP 文档](https://open.mcd.cn/mcp/doc)
- [Copilot Studio 主题编辑](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics)
- [连接现有 MCP](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [MCP工具选择与Allow all](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)
- [自定义连接器数据策略](https://learn.microsoft.com/en-us/power-platform/admin/dlp-custom-connector-parity)
