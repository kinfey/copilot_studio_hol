# Lab 03: In-Studio Order Simulation and McDonald's MCP Connectivity Checks

[English](README.md) | [简体中文](README.zh.md)

**Primary test:** In the Copilot Studio **Test** pane, enter **“今天有什么优惠券”** (“What coupons are available today?”) to check a real MCP query. This question must not enter the simulated ordering topic or ask for quantities or a budget. Simulated ordering is an optional topic used only when explicitly requested.

## Step One: Distinguish Simulation from a Real MCP Connection

> **Rerun — 2026-10-13:** Playwright controlled Microsoft Edge and reused the existing Workshop agent. The direct coupon question, five independent simulation cases, and two transaction-boundary questions were actually executed. No real coupons, claims, orders, or payments were requested through an external tool.

1. The simulation path does not require a token or access a personal consumer account.
2. The teaching burger costs CNY 12 and the coffee CNY 6. Teaching coupons demonstrate only the “already held” and “available to claim” categories. They do not affect the calculation and are not today's McDonald's prices or real offers.
3. A real query requires a successfully bound MCP server and actual tool results. An agent response, a connector definition, or a successful simulation does not prove MCP connectivity.
4. Rotate any key previously exposed in chat. Enter the replacement only in the product's secure credential field; never put it in code, prompts, Markdown, screenshots, or logs.

**Completion check:** Explain why the CNY 18 simulation result cannot be used as a real order quote.

## Step Two: Configure the Agent's Simulation Instructions

1. Select your experiment environment in Copilot Studio and open `Workshop-McDCouponAgent-Lab03`. For a first-time setup, create an experiment agent with this name.
2. Go to **Overview → Instructions → Edit**, paste the [global instructions](agent/instructions.txt), and select **Save**.
3. Disable Web Search so public promotions do not contaminate the teaching results.
4. Keep generative orchestration enabled to select `SimulateMeal` by its topic description. Do not add a Teams channel or external write tools.

![Actual Studio configuration: instructions for in-Studio simulation](screenshots/11-real-studio-instructions.png)

![2026-10-13: existing simulation and real-query boundaries inspected](screenshots/rerun-2026-10-13-01-instructions.png)

**Completion check:** The agent does not promise automatic reminders or request keys, addresses, or payment information.

## Step Three: Create the Internal Simulation Topic

1. Select **Topics → Add a topic → From blank** and name it `SimulateMeal`.
2. Set the Trigger description to: “Use only when the user explicitly requests simulated ordering or a teaching meal budget calculation. Do not use this topic for questions about today's coupons or real offers.” The supplied YAML preserves this description in Chinese for the existing agent.
3. Select **More → Open code editor** and paste the [complete topic YAML](agent/simulate-meal.topic.yaml).
4. Wait for parsing to finish, close the code editor, and open **Topic checker**. Select **Save** only after confirming there are no errors.
5. Confirm the topic is enabled. This YAML is code for the topic editor, not an agent import package.

![Actual Studio: simulation topic and Number question nodes](screenshots/10-real-simulation-topic.png)

**Completion check:** The topic contains an introductory message, three Question nodes, input validation, a price calculation, budget branches, and a disclaimer. It contains no HTTP, MCP, Teams, or agent flow calls.

## Step Four: Understand Numeric Input and Validation

Answer the topic's three Question nodes in this order:

| Variable | Identify | Unit and range |
|---|---|---|
| BurgerQuantity | Number | Burger quantity, integer from 0 to 10 |
| CoffeeQuantity | Number | Coffee quantity, integer from 0 to 10 |
| BudgetYuan | Number | Budget in CNY, integer from 0 to 1,000 |

1. Select at least one item.
2. After Number identifies a numeric value, a Condition checks the range and `Mod(quantity, 1) <> 0` to reject fractional quantities. The actual variable names are in the supplied YAML.
3. Invalid input produces an explicit error and ends the current topic. Enter “模拟订餐” (“simulate an order”) again to restart.
4. The budget uses yuan, not fen. Do not pass the local example's `budgetFen` value directly into this variable.

**Completion check:** `1.5` burgers, negative quantities, or zero quantities for both items cannot produce a valid quote.

**Actual question-by-question rerun:** Start a new session, enter `模拟订餐`, wait for the burger question, submit `1`, wait for the coffee question, submit `1`, wait for the budget question, then submit `25`. Do not send all three answers before their respective new questions.

![2026-10-13: simulation introduction and burger question](screenshots/rerun-2026-10-13-04-burger-question.png)

![2026-10-13: burger answer followed by the coffee question](screenshots/rerun-2026-10-13-05-question.png)

![2026-10-13: coffee answer followed by the budget question](screenshots/rerun-2026-10-13-06-question.png)

## Step Five: Calculate the Price with Power Fx

The Set variable node assigns:

```powerfx
Topic.TotalYuan = Topic.BurgerQuantity * 12 + Topic.CoffeeQuantity * 6
```

The editor's actual Value is `=Topic.BurgerQuantity * 12 + Topic.CoffeeQuantity * 6`. Then compare:

```powerfx
Topic.TotalYuan <= Topic.BudgetYuan
```

1. Within budget: explicitly state that the estimate is within budget and is for teaching purposes only.
2. Over budget: explicitly ask the user to reduce the items or adjust the budget; do not produce a purchase confirmation.
3. Both branches state that no real order was created, no payment was taken, and no coupon was redeemed. All three transaction flags are false.
4. Without evidence of real coupon eligibility, do not discount prices based on coupon titles.

**Completion check:** The calculation comes from topic nodes, not the model's free-form arithmetic.

![2026-10-13: actual 1-burger/1-coffee/25-yuan result, 18 yuan within budget](screenshots/rerun-2026-10-13-07-within-budget.png)

See the [actual independent conversation](output/rerun-2026-10-13-within-budget.json). This is a real execution of the Studio simulation topic, not a real McDonald's order.

## Step Six: Directly Test “What Coupons Are Available Today?”

1. Open **Test**. If an earlier conversation is still waiting for an answer inside the simulation topic, expand the test pane and select **New test session**. Do not use the canvas zoom Reset control.
2. Enter **今天有什么优惠券** exactly, send it, and wait for a new response after that message.
3. Do not enter “模拟订餐” or provide item quantities or a budget. The `SimulateMeal` description has been narrowed so real coupon questions do not trigger that topic.
4. If MCP is bound, inspect the activity trace for actual read-only tool calls, return statuses, and query times. Group results into coupons already held and coupons available to claim.
5. If MCP is not bound, the agent must explicitly say it cannot query real coupons. It must not return teaching coupons, internet promotions, or an invented “no coupons today” result.

![Actual Studio Test: directly asking what coupons are available today](screenshots/17-real-today-coupons-test.png)

**Observed result:** The agent replied “当前MCP尚未连通，无法查询今天的真实优惠券” (“MCP is not connected, so today's real coupons cannot be queried”) and did not enter simulated ordering. See the [actual test record](output/today-coupons-test.real.json). This verifies routing and explicit failure reporting, **not successful MCP connectivity**. Continue with Steps Eight and Nine to resolve the connection.

![2026-10-13: direct coupon question again reports unavailable real MCP](screenshots/rerun-2026-10-13-02-coupons-test.png)

The [new live conversation](output/rerun-2026-10-13-coupons.json) did not ask for meal quantities or return actual coupons. Offering a separate simulation is not successful MCP retrieval.

## Step Seven: Validate Exception Branches

Start each independent conversation with **New test session**, or finish the current topic before triggering it again. Wait for the current conversation's new question before sending an answer; do not match an old question and send consecutive answers prematurely.

| Inputs in order | Expected result |
|---|---|
| 1, 1, 25 | CNY 18 total, within budget |
| 1, 1, 10 | CNY 18 total, over budget |
| 1.5, 1, 25 | Invalid quantity; stop the estimate |
| 0, 0, 25 | Require at least one item; stop the estimate |
| -1, 1, 25 | Invalid negative quantity; stop the estimate |
| “领取教学券” (“claim a teaching coupon”) or “确认支付” (“confirm payment”) | Explain the simulation boundary; do not write to an account |

**2026-10-13:** All five numeric cases were run in separate actual Studio conversations. The within-budget result is above; the other four results are below. Fractional, empty-cart, and negative cases explicitly stop the estimate. “Claim a teaching coupon” explains that teaching coupons cannot be claimed/redeemed and offers the simulation questions; “confirm payment” explicitly refuses real payment. No external transaction tool is bound.

![2026-10-13: 18 yuan exceeds the 10-yuan budget](screenshots/rerun-2026-10-13-07-over-budget.png)

![2026-10-13: fractional burger quantity rejected](screenshots/rerun-2026-10-13-07-fractional.png)

![2026-10-13: empty cart rejected](screenshots/rerun-2026-10-13-07-empty-cart.png)

![2026-10-13: negative quantity rejected](screenshots/rerun-2026-10-13-07-negative.png)

![2026-10-13: teaching coupon boundary, not a real claim](screenshots/rerun-2026-10-13-08-claim-refused.png)

![2026-10-13: real-payment request refused](screenshots/rerun-2026-10-13-08-payment-refused.png)

Complete live records: [over budget](output/rerun-2026-10-13-over-budget.json), [fractional](output/rerun-2026-10-13-fractional.json), [empty cart](output/rerun-2026-10-13-empty-cart.json), [negative](output/rerun-2026-10-13-negative.json), [claim boundary](output/rerun-2026-10-13-claim-refused.json), [payment refusal](output/rerun-2026-10-13-payment-refused.json). These are cloud conversations, separate from the local code checks.

![Earlier actual Studio simulation: one burger and one coffee, CNY 25 budget, CNY 18 total](screenshots/12-real-studio-budget-pass.png)

**Completion check:** “Send failed” is not a successful business validation result. Reset the session and rerun after a send failure.

## Step Eight: Check Whether Real MCP Is Bound to This Agent

This step diagnoses the real service and **does not affect the internal simulation path**.

1. Open **Tools** and check whether MCP has been added to the current agent. **Create your first tool** means there are no bound tools; an external connector definition alone cannot be called.
2. In the same environment, find `McD-Coupons-Lab03` under **Power Apps → Custom connectors**. The list may be inside an iframe; Playwright must locate the target connector within the appropriate frame.
3. Confirm the endpoint is `https://mcp.mcd.cn` using Streamable HTTP. `https://open.mcd.cn/mcp/doc` is documentation, not the API endpoint.
4. Authentication uses API key → Header → `Authorization`. Use the complete header value generated by your own account's platform configuration. Do not infer whether `Bearer` is required from a publicly masked value.

![Actual Power Apps: saved McDonald's MCP connector definition](screenshots/15-real-connector-found.png)

![Actual Agent Tools: no tools added yet](screenshots/16-real-agent-no-tools.png)

![2026-10-13: Tools still shows Create your first tool, no MCP bound](screenshots/rerun-2026-10-13-03-no-mcp-tools.png)

![Official integration documentation: endpoint and authentication header](screenshots/01-official-mcd-endpoint.png)

**Completion check:** Four layers of evidence are required: personal connection created successfully → selected and bound to the agent → successful tools/list → actual read-only call results. Currently, only the connector definition exists; no real tool list or coupon results have been obtained.

## Step Nine: Resolve the DLP Block on Connection Creation

**Rerun boundary:** The DLP error below is historical evidence. This rerun checked current tool absence and the failed real-query path; it did not recreate a personal connection, re-enter credentials, or newly verify the DLP policy. An approved existing connection and binding are required before a real read-only call can be executed.

Previously, **Create connection** was selected on the existing connector. After the user entered credentials personally, the product explicitly returned:

`Connection creation/edit ... has been blocked by Data Loss Prevention (DLP) policy ...`

![Actual connection error: DLP blocks connection creation](screenshots/09-real-dlp-block.png)

1. This is a confirmed connection-creation block, not a confirmed invalid token. Removing Teams does not authorize the McDonald's connector.
2. Through an internal channel, submit the environment, connector name, target host `mcp.mcd.cn`, error screenshot, and purpose—personal read-only coupon queries and in-Studio simulation—to the administrator. No Teams data combination needs approval because this version does not use Teams.
3. The administrator must inspect all applicable **Data policies**. Environment-level policies classify connectors by name; tenant-level policies classify them by host URL patterns. Approve only the necessary experiment scope, not the removal of an entire policy.
4. Until approval is granted, do not change domains, proxies, environments, or connector names to evade the restriction. Do not repeatedly ask the user to enter keys.
5. After approval takes effect, recreate the personal connection from the original connector, confirm its actual record appears, and select **Add and configure** in Studio.
6. Disable **Allow all** and enable only `query-my-coupons`, `available-coupons`, and `now-time-info`. Keep tools for ordering, claiming coupons, cancellations, points, lotteries, and address writes disabled.
7. Call MCP connected only after a read-only query produces real results in the activity trace. A failed query does not mean “no coupons,” and simulated coupons cannot replace tool results.
8. Regardless of future real-query success, keep price simulation inside the internal topic. Do not use `create-order` for simulation: it creates a real order.

The current [tool configuration](config/tool-policy.json) has `enabled=[]`, indicating external MCP is not enabled. It does not represent an applied cloud tool allowlist. The [diagnosis record](output/connection-diagnosis.json) records the blocked state without credentials.

## Step Ten: Save the Deliverables and End the Experiment

1. Save the agent instructions and topic. Testing in the Test pane does not require publishing to Teams.
2. Review the [fictional coupons](data/coupons.simulated.json), [menu](data/menu.simulated.json), [local cart](data/cart.simulated.json), and [local simulation result](output/order.simulated.json).
3. The local simulation and Studio topic are independent implementations. The local version uses fen; Studio uses yuan. The same one-burger-plus-one-coffee meal should produce 1,800 fen and CNY 18 respectively.
4. Run:

   ```bash
   node lab-03/scripts/simulate.mjs
   node --test lab-03/tests/simulate.test.mjs
   ```

5. [schedule.json](config/schedule.json) is marked `cancelled`; Teams and scheduled notifications are disabled. Old morning-report messages and schedule screenshots are historical attachments, not steps in this version.
6. Do not share personal credentials. Before revoking an unused token, check whether your other integrations still use it.

## Actual Execution Status

| Item | Status |
|---|---|
| Studio simulation global instructions | Saved |
| SimulateMeal topic | Saved; zero Topic checker errors |
| Direct question about today's coupons | Tested; explicitly reports MCP is disconnected, without entering simulated ordering |
| One burger plus one coffee, CNY 25 budget | Actual Test returned CNY 18 and a no-transaction disclaimer |
| Independent over-budget and invalid-quantity conversations | 2026-10-13 actual separate conversations passed over-budget, fractional, empty-cart, and negative cases |
| MCP connector definition | Actually exists |
| MCP binding and real coupon queries | Not connected; earlier connection creation was blocked by DLP |
| Teams and daily 08:00 notifications | Cancelled; not enabled |
| Real coupon claims, orders, and payments | Not executed |

Screenshot sources are in [manifest.json](screenshots/manifest.json). Historical screenshots demonstrate the configuration or error at the time, not current connectivity.

[Dated rerun provenance](screenshots/rerun-2026-10-13.json) records the new real-product screenshots. MCP tool listing and real coupon retrieval remain unexecuted because there is no bound connection; simulation success must not replace that missing evidence.

## Official References

- [McDonald's MCP documentation](https://open.mcd.cn/mcp/doc)
- [Editing Copilot Studio topics](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-create-edit-topics)
- [Connecting an existing MCP server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [MCP tool selection and Allow all](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)
- [Data policies for custom connectors](https://learn.microsoft.com/en-us/power-platform/admin/dlp-custom-connector-parity)
