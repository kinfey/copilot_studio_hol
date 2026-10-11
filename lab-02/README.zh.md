[English](README.md) | [简体中文](README.zh.md)

# Lab 02：Teams 交互卡片与任务审核 Agent

**场景：**用户在 Teams 向 Copilot Studio 智能体提交任务申请；智能体分析需求，向专用频道发送带“批准”“打回”“指派任务”按钮的 Adaptive Card。审核通过后在 Planner 创建任务，并由独立定时流程发送 Teams 提醒。


## 第一步：准备环境与专用测试位置

1. 使用 **Microsoft Edge** 登录 Copilot Studio、Power Automate、Teams 和 Planner。选择同一个有权使用的 Power Platform 环境。
2. 确认具备 Copilot Studio、AI Builder Prompt、Power Automate 相关许可及连接权限。Teams 管理员需允许 Workflows 应用；Planner 使用 **Basic plan**，不要选择 Premium plan。
3. 在 Teams 选择 **New items → New team**，名称填写 `Workshop-Lab02-Private`，可见性保留 **Private**，首个频道填写 `Lab02-Review`。
4. 创建后在添加成员页面选择 **Skip**。课堂初次验证只使用自己，不向业务频道发送测试卡片。
5. 将自己的环境、测试团队、标准频道、关联 SharePoint 站点和审核人记录在私有配置中，参考 [配置清单](config/settings.example.json)。不要把真实账号、租户标识或站点地址写进公开教材。

![真实 Teams 私有团队创建表单](screenshots/03-real-private-team-create.png)

**完成检查：**可以进入专用频道；团队只有自己；后续连接器下拉框能选择该团队。若 Teams 已创建但 Planner/连接器搜索不到，请刷新并等待目录传播，不能用其他业务团队代替。

## 第二步：创建智能体并理解提示词作用域（2.2）

1. 打开 Copilot Studio，选择 **Create an agent with predefined rules and flows**。
2. 名称填写 `Workshop-TaskReviewAgent-Lab02`，创建并等待状态 **Ready**。
3. 在 **Overview → Instructions → Edit** 中粘贴 [全局指令](agent/instructions.txt)，选择 **Save**。
4. 保持 Web Search 关闭。本实验不需要从互联网补全任务事实或负责人信息。

![真实智能体全局 Instructions](screenshots/05-real-global-instructions.png)

| 层级 | 配置位置 | 作用范围与适用场景 |
|---|---|---|
| System Prompt / 全局指令 | 智能体根配置的 **Instructions** | 定义角色、业务边界与全局行为，例如“仅处理内部任务，不索取密码”。这是作者可配置指令，不是可覆盖平台安全策略的最高权限。 |
| Topic / 主题 | **Topics** 中的 Trigger、路由说明与节点 | 在该主题被选择或意图匹配时执行，例如“申请任务审核”“解释卡片按钮”。主题是流程，不只是另一段提示词。 |
| Node Prompt / 节点提示词 | 具体 Prompt 工具或对话节点 | 只约束当前调用，例如“从 RequestText 提取标题与摘要，只返回六个 JSON 字段”。不能赋予连接器权限或覆盖全局边界。 |

**实验原则：**提示词说明意图，Schema 校验输出，连接器身份与服务端白名单实施授权。不要把“模型说已批准”当成审核结果。`Global.*` 变量只在用户会话跨主题共享，不是全组织持久队列。

## 第三步：创建并测试任务分析 Prompt

1. 在智能体 **Tools → Add a tool → Prompt** 新建 `AnalyzeTaskRequest`。
2. 粘贴 [节点提示词](agent/analyze-prompt.txt)。通过 **Add content → Text** 新建输入 `RequestText`，在输入位置插入此令牌，不要把示例内容硬编码成所有请求。
3. 输入示例使用 [虚构申请](data/request.json) 的 `requestText`。
4. 选择 **Output format → JSON → Customize**，使用 [分析样例](data/analysis-example.json) 设置结构，选择 **Apply**。
5. 点击 **Test**。返回字段必须为 `title`、`summary`、`category`、`needsClarification`、`clarificationQuestion`、`riskNotes`。
6. `riskNotes` 为 `[{ "text": "风险说明" }]`，无风险可为 `[]`，不能用字符串数组或 `{item: ...}` 混用。
7. 选择 **Save → Add and configure**，启用工具。

![真实节点 Prompt，riskNotes 使用 text 对象数组](screenshots/06-real-node-prompt.png)

**完成检查：**测试输出与 [analysis.schema.json](agent/analysis.schema.json) 一致。`needsClarification=true` 时先追问，不能提交卡片。模型不得决定实际用户 ID、Teams 频道或 Planner 计划。

## 第四步：创建帮助主题和任务申请主题

### 4.1 帮助主题

1. **Topics → Add a topic → From blank**，名称填写 `CardHelp`。
2. 在 Trigger 的主题说明填写：“解释批准、打回和指派按钮，以及截止与提醒的区别，不实际审批。”
3. 点击触发器下方 **+ → Send a message**，填写：

   > 批准使用默认负责人创建任务；打回必须说明原因，不创建任务；指派任务表示批准并选择白名单负责人。截止时间不等于提醒。Planner 的提醒由独立流程发送，To-Do 提醒属于当前连接账号。

4. 点击 **Save**。通过 **More → Open code editor** 对照 [帮助主题示例](agent/card-help-topic.yaml)。不要把 YAML 示例误称为已经导入的主题。
5. 在 Test 输入“卡片上的按钮是什么意思”，检查进入帮助主题而不发送卡片。

![真实 CardHelp 主题代码编辑器](screenshots/04-real-cardhelp-code.png)

本次真实设计器代码另存为 [card-help-topic.real.yaml](agent/card-help-topic.real.yaml)，与教学示例分开保存。

### 4.2 申请主题

1. 新建主题 `SubmitTaskRequest`，说明：“接收内部任务申请，分析、澄清、确认后提交审核，不直接创建任务。”
2. **Ask a question** 收集 `Topic.RequestText`。选择 Text 类型；不要接受任意用户 ID 或团队地址。
3. **Add a tool → AnalyzeTaskRequest**，把 `RequestText` 绑定到该变量。
4. 对输出使用 [分析 Schema](agent/analysis.schema.json) 校验。根据 `needsClarification` 添加条件；为 true 时发送 `clarificationQuestion`，收集补充内容后重新分析。
5. 添加 **Ask with adaptive card** 或确认问题，显示分析标题、摘要及时间，请用户明确确认是否送审。此处的确认不是频道审核批准。
6. 仅确认分支调用第六步的 `SubmitTaskRequestFlow`；取消分支结束主题。
7. 保存并在 Test 检查取消、澄清、确认三条路径。工具未绑定前不要发布“已送审”的成功消息。

## 第五步：保存卡片模板与持久队列

### 5.1 卡片内容

打开 [卡片模板](cards/task-review.template.json)，使用 Adaptive Cards **1.4**。它包含标题、摘要、请求编号、截止和提醒时间、白名单负责人下拉框、审核原因及三个 `Action.Submit`：

| 按钮 | `data.decision` | 服务端行为 |
|---|---|---|
| 批准 | `approve` | 使用固定默认负责人创建任务，不让下拉框改变默认负责人 |
| 打回 | `reject` | 必须有原因；不创建任务 |
| 指派任务 | `assign` | 审核通过并使用白名单负责人创建任务 |

`data.requestId` 只做关联，不是身份凭证。审核者身份必须取自 Teams 连接器响应的 responder，而非卡片隐藏字段。

使用 [动态卡片表达式](flows/card-expression.txt) 把固定模板与已校验数据合成对象。不要拼接用户文本成 JSON，也不要让 AI 生成按钮、连接器地址或授权名单。

### 5.2 SharePoint 队列

1. 从专用团队的文件区域进入关联 SharePoint 站点，不猜测站点 URL。
2. 新建空列表 `Lab02Requests`。设置 Title 为请求编号，开启 **Enforce unique values**。
3. 先使用下面的英文名称创建列，避免显示名称与内部名称不一致：

| 列 | 类型 | 用途 |
|---|---|---|
| Title | 单行文本，唯一 | 服务端生成的 RequestId |
| RequestText | 多行纯文本 | 原始申请 |
| AnalysisJson | 多行纯文本 | 校验后的六字段分析 |
| DueAtUtc、RemindAtUtc | 日期时间 | 截止与提醒，连接器统一传 UTC |
| Status | Choice | Queued、AwaitingDecision、CreatingTask、Created、Rejected、Failed、Unknown |
| TaskId | 单行文本 | 真实 Planner 返回 ID |
| ReviewerObjectId、AssigneeObjectId | 单行文本 | 服务端固定配置，不取自模型 |
| ReminderStatus | Choice | Pending、Sending、Sent、Failed、Unknown |
| ReviewComment、ErrorDetail | 多行纯文本 | 审核原因与错误信息 |

**完成检查：**同一 Title 不能重复插入；所有时间符合“提交 < 提醒 < 截止”。静态样例日期仅用于离线验证，真实运行使用未来时间。

## 第六步：创建短时入队 Agent flow

1. 在 Copilot Studio 创建 Agent flow `SubmitTaskRequestFlow`。
2. 触发器选择 **When an agent calls the flow**。输入为 `RequestText`、`AnalysisJson`、`DueAtUtc`、`RemindAtUtc`；审核人、负责人、站点位置都在流中固定。
3. 添加 **Parse JSON**，内容为 AnalysisJson，Schema 使用 [analysis.schema.json](agent/analysis.schema.json)。额外校验长度、类别、澄清标志、时间顺序；失败明确返回拒绝原因。
4. 用表达式 `guid()` 生成 RequestId。不要使用模型或用户提供的编号作为唯一可信主键。
5. 使用 **SharePoint → Create item** 写入 `Lab02Requests`，Status=`Queued`，ReminderStatus=`Pending`。
6. 添加 **Respond to the agent**，返回 `accepted`、`requestId`、`message`。只有入队成功才返回 accepted=true，含义为“等待审核”，不是“已创建任务”。
7. 保持同步响应，保存、测试后绑定到申请主题。

**重要：**Agent flow 需在 100 秒同步窗口内响应，不能在这条路径等待人工审批。独立工作流承担长时间卡片等待。

## 第七步：创建 Teams 卡片审核工作流

### 7.1 先做最小卡片测试

1. 在 Power Automate **Create → Instant cloud flow** 新建 `Lab02-CardReview-Test`，触发器为 **Manually trigger a flow**。
2. 添加 Microsoft Teams **Post adaptive card and wait for a response**。首次使用选择 **Sign in**，完成自己账号的连接授权。
3. 设置 **Post as = Flow bot**、**Post in = Channel**，仅选择专用测试团队和 `Lab02-Review`。
4. Message 使用 [离线示例卡片](output/task-review.example.json)。它只验证显示和响应，不代表真实任务创建。
5. 设置 Update message：“已收到本次响应；后续授权校验决定是否执行。”
6. 保存，Test → Manually → Run flow，在 Teams 检查三个按钮，提交一次，回运行历史查看输出字段。

![真实 Teams 频道三按钮审核卡片](screenshots/07-real-teams-review-card.png)

截图来自专用实验频道，不是本地页面。此最小测试仅有触发器和 wait 卡片动作；卡片中“创建任务”是正式链路的业务说明，当前测试点击按钮不会创建 Planner 任务。

![真实卡片已收到响应后的更新消息](screenshots/08-real-card-response-received.png)

![真实 Power Automate 卡片测试流运行成功](screenshots/09-real-card-flow-success.png)

本次真实运行返回 `decision=approve`、`assigneeKey=self`、`requestId=LAB02-REQ-001`，已保存 [脱敏执行记录](output/card-response.real.json)。流程由设计器自动命名为 `Button -> Post adaptive card and wait for a response`。此成功只证明卡片投递与首次响应链路；未证明任务创建、授权分支或提醒已执行。

不要把普通 **Post card** 和另一条 **When someone responds** 监听器组合替代 wait 动作。每张 wait 卡片只消费首次提交；无权用户抢先提交或打回缺原因时必须记录失败并重新发新卡，不默认批准。

### 7.2 正式队列工作流

1. 新建自动流程 `Lab02-ReviewWorker`，触发器为 SharePoint **When an item is created**，选实验站点和列表。
2. 读取当前记录，动作重命名为 `GetRequest`。只处理 Status=`Queued`；其他状态终止。
3. 添加 **Parse JSON** 并命名 `ParseAnalysis`；内容为 AnalysisJson，Schema 使用配套文件。
4. 添加 Compose，命名 `CardTemplate`，输入模板对象。再添加 Compose `ReviewCard`，切换 **Expression** 粘贴 [卡片表达式](flows/card-expression.txt)。
5. 更新 Status=`AwaitingDecision`，随后使用上述 Teams wait 动作，Message 使用 `ReviewCard` 输出；设置超时 `PT1H`。
6. 在真实测试运行的 Outputs 确认 `data` 和 `responder` 的实际路径。使用 [响应 Schema](flows/card-response.schema.json) 校验 data，身份只取连接器 responder object ID。
7. 条件检查当前 Status、requestId 和固定审核人 ID。失败写入 Failed 与原因，终止；不能只验证卡片中携带的值。
8. 使用 **Switch** 分流 approve/reject/assign。reject 检查非空原因，写 Rejected；未知按钮写 Failed。
9. approve 固定选择 self；assign 仅允许 self/backup，映射到私有配置中的 Entra Object ID。第一次课堂实验二者都可映射自己，不表示向别人派单已经验证。
10. 通过分支先写 Status=`CreatingTask`，再执行下一步任务创建。对任务创建动作关闭不安全的自动重试；写回失败标 Unknown，人工核实，不盲目重跑创建。
11. 添加错误与超时 Scope，通过 **Configure run after** 处理 Failed、Timed out。保留请求 ID、错误和处理阶段，显式更新队列。

## 第八步：创建 Planner 任务并单独配置提醒

### 8.1 Planner 基本计划

1. 在 Planner **Create a plan → Basic plan** 新建 `Workshop-Lab02-Tasks`。
2. **Share with your group** 只选新建实验团队的关联组。搜索不到时停止，不创建个人计划冒充团队计划。
3. 创建 bucket `待处理`，把实际 Group、Plan、Bucket ID 留在私有配置。
4. 在工作流批准/指派分支添加 **Planner → Create a task**，选择实验 Group、Plan、Bucket；Title 用校验后的分析 title。
5. 展开高级参数，Due Date Time 绑定 DueAtUtc，Assigned User Ids 使用白名单解析出的实际用户 ID。
6. 创建成功后保存返回 Task ID，Status=`Created`。只有任务 ID 已落库才报告任务已创建。

Planner **截止时间不等于提醒时间**。连接器没有通用 reminderAt 字段，不要在“Create a task”里虚构该参数。

### 8.2 Teams 定时提醒

1. 新建计划流 `Lab02-TaskReminder`，**Recurrence** 每 1 分钟运行，用于课堂验证；关闭并发重叠，Concurrency=1。
2. 读取 Status=`Created` 且 ReminderStatus=`Pending` 的记录，逐条判断 `RemindAtUtc <= utcNow()`。
3. **Planner → Get a task** 查询 TaskId；已完成任务不发送提醒，记录原因。未完成且到提醒时间的记录先写 ReminderStatus=`Sending`。
4. **Teams → Post message in a chat or channel**，只投专用实验频道，显示请求编号、标题和截止时间，不含敏感业务信息。
5. 消息成功后写 `Sent`；发送失败写 `Failed`。发送成功但写回失败写 `Unknown` 或保留 Sending 待核实，不能当作 Pending 自动重发。
6. 真实测试在提交时设置截止 `addMinutes(utcNow(),15)`、提醒 `addMinutes(utcNow(),5)`；等待频道收到提醒后核对时间和记录。
7. 验收结束关闭课堂定时流，避免持续轮询；需要生产运行时再制定频率和运维策略。

### 8.3 To-Do 可选替代

若使用个人 To-Do，动作选择 **Add a to-do (V3)**，设置 **Reminder Date-Time** 和 **Is Reminder On=true**。该任务属于连接账号，不会因为卡片选择了 Planner 负责人就写入别人的 To-Do。遵循连接器日期格式并检查返回 timeZone 与客户端时间；不能假定无时区字符串就是 UTC。本实验主线为 Planner + Teams 提醒。

## 第九步：发布到 Teams 并做端到端验收

1. 在 Copilot Studio 检查主题、工具与连接无错误，选择 **Publish**。
2. 在 **Channels → Teams and Microsoft 365 Copilot** 按租户允许的范围启用 Teams，先只添加给自己。
3. 在 Teams 向 Agent 提交虚构申请，核对分析与确认，再送审。
4. 对下面各条使用新的 RequestId 和新卡片；单张卡片不能重复验收三个按钮。

| 用例 | 应看到的结果 |
|---|---|
| 批准 | 专用计划创建一条任务，默认负责人自己，队列有 TaskId |
| 打回并填写原因 | Rejected，不创建任务 |
| 打回不填写原因 | 明确失败，不创建任务，需要重新发卡 |
| 指派 self/backup | 仅白名单映射生效，任务负责人正确 |
| 非审核者/伪造 ID/未知按钮 | 拒绝，不创建任务 |
| 重复已消费响应 | 状态检查阻止重复创建 |
| 提醒已到且未完成 | 专用频道收到一次提醒，状态 Sent |
| 提醒前完成任务 | 不发送未完成提醒 |
| 连接器错误或写回失败 | Failed/Unknown 明确可查，不报告成功 |

只有真正观察到 Teams 卡片响应、Planner 任务和提醒消息，才勾选完整链路完成。错误阶段重新运行前先核对真实任务，避免重复派单。

## 第十步：查看保存内容与复现本地检查

配套内容包括 [申请数据](data/request.json)、[分析样例](data/analysis-example.json)、[响应样例](data/response-examples.json)、[卡片模板](cards/task-review.template.json)、[输出卡片](output/task-review.example.json)、[模拟任务记录](output/task-record.example.json)、[全局指令](agent/instructions.txt)、[节点 Prompt](agent/analyze-prompt.txt)、[主题 YAML](agent/card-help-topic.yaml)、[校验逻辑](scripts/contracts.mjs)。

```bash
cd lab-02
npm run generate
npm test
```

生成脚本只保存离线示例，不调用租户、发送卡片或创建任务。依赖已安装时无需重复安装。

## 真实操作记录

| 操作 | 当前证据与状态 |
|---|---|
| 使用 Microsoft Edge | Playwright 通过 CDP 连接，检查 User Agent 含 Edg/ |
| 新建 Lab 2 Agent、保存全局指令 | 已完成真实创建与保存 |
| AnalyzeTaskRequest | 已创建、测试并绑定；云端 riskNotes 提示词已同步修正为 text 对象数组并保存 |
| CardHelp | 已在真实设计器建立并保存消息节点，已打开代码编辑器核对 |
| 私有 Teams 团队和标准频道 | 已真实创建，仅创建者；截图显示创建配置 |
| Teams wait 卡片动作 | 已真实投递专用频道，三按钮可见；点击批准后收到响应，Power Automate 运行 Succeeded，截图与脱敏记录已保存 |
| Planner 计划 | 实验组搜索暂未出现，尚未创建 |
| SharePoint 队列及完整三条流程 | 尚未部署完成 |
| 打回/指派分支、Teams Agent 发布、真实任务与提醒 | 尚未端到端验证；最小卡片测试的批准响应不代表正式审批或任务创建 |

## 官方参考

- [Power Automate Adaptive Cards](https://learn.microsoft.com/en-us/power-automate/create-adaptive-cards)
- [Teams 连接器](https://learn.microsoft.com/en-us/connectors/teams/)
- [Planner 连接器](https://learn.microsoft.com/en-us/connectors/planner/)
- [To-Do 连接器](https://learn.microsoft.com/en-us/connectors/todo/)
- [Agent flow 创建与响应](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-flow-create)
- [智能体 Instructions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-instructions)
- [主题中的 Adaptive Card](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card)
- [发布到 Teams](https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-add-bot-to-microsoft-teams)
