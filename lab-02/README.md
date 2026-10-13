[English](README.md) | [简体中文](README.zh.md)

# Lab 02: Teams Interactive Cards and Task Review Agent

**Scenario:** A user submits a task request to a Copilot Studio agent in Teams. The agent analyzes the requirements and posts an Adaptive Card with “批准” (Approve), “打回” (Return for revision), and “指派任务” (Assign task) buttons to a dedicated channel. After approval, a task is created in Planner, and a separate scheduled flow sends Teams reminders.


## Step One: Prepare the Environment and Dedicated Test Locations

> **Rerun — 2026-10-13:** Existing Workshop resources were reused through Playwright and Microsoft Edge. No new team, queue, plan, worker, or reminder flow was created. Three separate real runs tested the minimal card's approve, return, and assign responses; they do not complete the production workflow.

1. Sign in to Copilot Studio, Power Automate, Teams, and Planner using **Microsoft Edge**. Select the same authorized Power Platform environment.
2. Confirm the required Copilot Studio, AI Builder Prompt, and Power Automate licenses and connection permissions. The Teams administrator must allow the Workflows app; use a Planner **Basic plan**, not a Premium plan.
3. In Teams, select **New items → New team**, enter `Workshop-Lab02-Private`, retain **Private** visibility, and name the first channel `Lab02-Review`.
4. After creation, select **Skip** on the member-addition page. Use only yourself for initial classroom validation; do not send test cards to business channels.
5. Record your environment, test team, standard channel, associated SharePoint site, and reviewer in private configuration, referring to the [configuration checklist](config/settings.example.json). Do not put real accounts, tenant identifiers, or site URLs in public training materials.

![Real Teams private-team creation form](screenshots/03-real-private-team-create.png)

**Completion check:** You can open the dedicated channel; you are the team's only member; subsequent connector dropdowns can select this team. If Teams has created it but Planner/connectors cannot find it, refresh and wait for directory propagation; do not substitute another business team.

## Step Two: Create the Agent and Understand Prompt Scope (2.2)

1. Open Copilot Studio and select **Create an agent with predefined rules and flows**.
2. Enter `Workshop-TaskReviewAgent-Lab02`, create it, and wait for **Ready**.
3. Paste the [global instructions](agent/instructions.txt) into **Overview → Instructions → Edit** and select **Save**.
4. Keep Web Search off. This lab does not need internet information to fill in task facts or assignees.

![Real agent global Instructions](screenshots/05-real-global-instructions.png)

![2026-10-13: existing task-review instructions inspected again](screenshots/rerun-2026-10-13-01-instructions.png)

| Level | Configuration location | Scope and applicable scenarios |
|---|---|---|
| System Prompt / Global instructions | **Instructions** in the agent's root configuration | Define role, business boundaries, and global behavior, such as “handle internal tasks only; do not request passwords.” These are author-configurable instructions, not supreme authority that overrides platform safety policies. |
| Topic | Trigger, routing descriptions, and nodes in **Topics** | Execute when the topic is selected or its intent matches, for example “request task review” or “explain card buttons.” A topic is a workflow, not merely another prompt. |
| Node Prompt | A specific Prompt tool or conversation node | Constrain only the current call, for example “extract a title and summary from RequestText and return only six JSON fields.” They cannot grant connector permissions or override global boundaries. |

**Lab principle:** Prompts describe intent, schemas validate outputs, and connector identities and server-side allowlists enforce authorization. Do not treat “the model says approved” as a review decision. `Global.*` variables are shared across topics only within a user's session, not an organization-wide persistent queue.

## Step Three: Create and Test the Task Analysis Prompt

1. Under the agent's **Tools → Add a tool → Prompt**, create `AnalyzeTaskRequest`.
2. Paste the [node prompt](agent/analyze-prompt.txt). Use **Add content → Text** to create `RequestText` and insert its token at the input location; do not hardcode sample content into every request.
3. Use `requestText` from the [fictional request](data/request.json) as the input example.
4. Select **Output format → JSON → Customize**, set the structure using the [analysis example](data/analysis-example.json), and select **Apply**.
5. Click **Test**. Returned fields must be `title`, `summary`, `category`, `needsClarification`, `clarificationQuestion`, and `riskNotes`.
6. `riskNotes` uses `[{ "text": "风险说明" }]` (“risk description”); use `[]` when there are no risks. Do not mix string arrays or `{item: ...}` objects into this format.
7. Select **Save → Add and configure** and enable the tool.

![Real node Prompt: riskNotes uses an array of text objects](screenshots/06-real-node-prompt.png)

![2026-10-13: actual AnalyzeTaskRequest cloud Prompt rerun](screenshots/rerun-2026-10-13-03-analysis-prompt.png)

The [new actual six-field analysis](output/rerun-2026-10-13-analysis.json) passed `validateAnalysis`; `riskNotes` remains an array of `{text}` objects. This call did not submit a request or create a task.

**Completion check:** Test output matches [analysis.schema.json](agent/analysis.schema.json). When `needsClarification=true`, ask a follow-up first; do not submit a card. The model must not choose actual user IDs, Teams channels, or Planner plans.

## Step Four: Create Help and Task Request Topics

### 4.1 Help Topic

1. **Topics → Add a topic → From blank**; name it `CardHelp`.
2. Set the Trigger's topic description to the following Chinese runtime text: “解释批准、打回和指派按钮，以及截止与提醒的区别，不实际审批。” (Explain the approve, return, and assign buttons and the difference between deadlines and reminders; do not actually approve requests.)
3. Under the trigger, click **+ → Send a message** and enter:

   > 批准使用默认负责人创建任务；打回必须说明原因，不创建任务；指派任务表示批准并选择白名单负责人。截止时间不等于提醒。Planner 的提醒由独立流程发送，To-Do 提醒属于当前连接账号。

   This Chinese response explains that approval creates a task with the default assignee; returning a request requires a reason and creates no task; assignment approves and selects an allowlisted assignee. Deadlines are not reminders. An independent flow sends Planner reminders, while To-Do reminders belong to the current connection account.

4. Click **Save**. Use **More → Open code editor** to compare against the [help topic example](agent/card-help-topic.yaml). Do not call the YAML example an already imported topic.
5. In Test, enter “卡片上的按钮是什么意思” (What do the buttons on the card mean?) and check that the help topic runs without sending a card. Keep the Chinese test phrase for the Chinese agent.

![Real CardHelp topic code editor](screenshots/04-real-cardhelp-code.png)

The code from this real designer session is saved separately as [card-help-topic.real.yaml](agent/card-help-topic.real.yaml), distinct from the teaching example.

![2026-10-13: CardHelp actually explains buttons and deadline/reminder differences](screenshots/rerun-2026-10-13-02-help-topic.png)

See the [new help conversation](output/rerun-2026-10-13-help.json); no card was sent by this help-topic test.

### 4.2 Request Topic

1. Create topic `SubmitTaskRequest` with description “接收内部任务申请，分析、澄清、确认后提交审核，不直接创建任务。” (Receive internal task requests, analyze, clarify, and confirm them before submitting for review; do not create tasks directly.)
2. Use **Ask a question** to collect `Topic.RequestText`. Select Text; do not accept arbitrary user IDs or team addresses.
3. **Add a tool → AnalyzeTaskRequest** and bind `RequestText` to this variable.
4. Validate the output with the [analysis schema](agent/analysis.schema.json). Add a condition on `needsClarification`; if true, send `clarificationQuestion`, collect additional information, and analyze again.
5. Add **Ask with adaptive card** or a confirmation question showing the analyzed title, summary, and times. Ask users to explicitly confirm submission for review. This confirmation is not channel approval.
6. Only the confirmation branch calls Step Six's `SubmitTaskRequestFlow`; the cancellation branch ends the topic.
7. Save and check cancellation, clarification, and confirmation paths in Test. Do not publish a “submitted for review” success message before binding the tool.

## Step Five: Save the Card Template and Persistent Queue

### 5.1 Card Contents

Open the [card template](cards/task-review.template.json) using Adaptive Cards **1.4**. It includes title, summary, request number, deadline and reminder time, an allowlisted-assignee dropdown, review reason, and three `Action.Submit` buttons:

| Button | `data.decision` | Server-side behavior |
|---|---|---|
| 批准 (Approve) | `approve` | Create a task with the fixed default assignee; the dropdown must not change that assignee |
| 打回 (Return for revision) | `reject` | Require a reason; do not create a task |
| 指派任务 (Assign task) | `assign` | Approve and create a task with an allowlisted assignee |

`data.requestId` is for correlation only, not an identity credential. The reviewer's identity must come from the Teams connector response's responder, not hidden card fields.

Use the [dynamic card expression](flows/card-expression.txt) to combine the fixed template and validated data into an object. Do not concatenate user text into JSON or let AI generate buttons, connector addresses, or authorization lists.

### 5.2 SharePoint Queue

1. Open the associated SharePoint site from the dedicated team's file area; do not guess the site URL.
2. Create a blank list `Lab02Requests`. Set Title to the request number and enable **Enforce unique values**.
3. Create columns using the following English names first to avoid mismatched display and internal names:

| Column | Type | Purpose |
|---|---|---|
| Title | Single line of text, unique | Server-generated RequestId |
| RequestText | Multiple lines of plain text | Original request |
| AnalysisJson | Multiple lines of plain text | Validated six-field analysis |
| DueAtUtc, RemindAtUtc | Date and time | Deadline and reminder; connectors consistently receive UTC |
| Status | Choice | Queued, AwaitingDecision, CreatingTask, Created, Rejected, Failed, Unknown |
| TaskId | Single line of text | ID returned by the real Planner call |
| ReviewerObjectId, AssigneeObjectId | Single line of text | Fixed server-side configuration, not model output |
| ReminderStatus | Choice | Pending, Sending, Sent, Failed, Unknown |
| ReviewComment, ErrorDetail | Multiple lines of plain text | Review reason and error details |

**Completion check:** Duplicate Title values cannot be inserted; all times satisfy “submission < reminder < deadline.” Static sample dates are for offline validation only; use future times in real runs.

## Step Six: Create a Short-Running Queuing Agent Flow

1. Create Agent flow `SubmitTaskRequestFlow` in Copilot Studio.
2. Select trigger **When an agent calls the flow**. Inputs are `RequestText`, `AnalysisJson`, `DueAtUtc`, and `RemindAtUtc`; fix reviewers, assignees, and site locations in the flow.
3. Add **Parse JSON** with AnalysisJson as content and [analysis.schema.json](agent/analysis.schema.json) as Schema. Also validate lengths, category, clarification flag, and time order; explicitly return rejection reasons on failure.
4. Generate RequestId with `guid()`. Do not use a model- or user-provided number as the sole trusted primary key.
5. Use **SharePoint → Create item** to write to `Lab02Requests` with Status=`Queued` and ReminderStatus=`Pending`.
6. Add **Respond to the agent**, returning `accepted`, `requestId`, and `message`. Return accepted=true only after successful queuing; it means “awaiting review,” not “task created.”
7. Retain synchronous responses, save and test, then bind the flow to the request topic.

**Important:** Agent flows must respond within the 100-second synchronous window; do not wait for human approval on this path. A separate workflow handles the long card wait.

## Step Seven: Create the Teams Card Review Workflow

### 7.1 Run a Minimal Card Test First

1. In Power Automate **Create → Instant cloud flow**, create `Lab02-CardReview-Test` with trigger **Manually trigger a flow**.
2. Add Microsoft Teams **Post adaptive card and wait for a response**. On first use, select **Sign in** and authorize the connection with your own account.
3. Set **Post as = Flow bot** and **Post in = Channel**; select only the dedicated test team and `Lab02-Review`.
4. For Message, use the [offline example card](output/task-review.example.json). It validates display and response only, not real task creation.
5. Set Update message to “已收到本次响应；后续授权校验决定是否执行。” (This response has been received; subsequent authorization checks determine whether to execute.)
6. Save, then Test → Manually → Run flow. Check the three buttons in Teams, submit once, and inspect output fields in run history.

![Real three-button review card in a Teams channel](screenshots/07-real-teams-review-card.png)

The screenshot is from the dedicated lab channel, not a local page. This minimal test has only a trigger and a wait card action; “create task” on the card describes the full workflow's business behavior. Clicking a button in this test does not create a Planner task.

![Real update message after receiving a card response](screenshots/08-real-card-response-received.png)

![Real successful Power Automate card-test flow run](screenshots/09-real-card-flow-success.png)

This real run returned `decision=approve`, `assigneeKey=self`, and `requestId=LAB02-REQ-001`; the [sanitized execution record](output/card-response.real.json) is saved. The designer automatically named the flow `Button -> Post adaptive card and wait for a response`. Success proves only card delivery and the first-response workflow, not task creation, authorization branches, or reminders.

**2026-10-13 rerun, using that existing minimal flow:** Inspect its card configuration, select **Run → Run flow**, open only `Workshop-Lab02-Private / Lab02-Review`, submit one button once, and inspect that new run's wait-action outputs. Repeat with a **new run and a new card** for each other button; do not resubmit an already consumed card.

![2026-10-13: existing Flow bot/channel card configuration](screenshots/rerun-2026-10-13-04-card-target.png)

![2026-10-13: new real card delivered to the dedicated lab channel](screenshots/rerun-2026-10-13-05-card-delivered.png)

![2026-10-13: approval run actually Succeeded](screenshots/rerun-2026-10-13-06-card-run.png)

![2026-10-13: separate card with a teaching return reason entered](screenshots/rerun-2026-10-13-07-card-reject.png)

![2026-10-13: return-response run actually Succeeded](screenshots/rerun-2026-10-13-08-reject-run.png)

![2026-10-13: separate card with backup selected before assigning](screenshots/rerun-2026-10-13-09-card-assign.png)

![2026-10-13: assignment-response run actually Succeeded](screenshots/rerun-2026-10-13-10-assign-run.png)

| Independent real run | Observed connector `data` | Sanitized output |
|---|---|---|
| Approve | `decision=approve`, `assigneeKey=self` | [Approval](output/rerun-2026-10-13-approve-response.json) |
| Return with a reason | `decision=reject`, `assigneeKey=self`, teaching `reviewComment` | [Return](output/rerun-2026-10-13-reject-response.json) |
| Assign backup | `decision=assign`, `assigneeKey=backup` | [Assignment](output/rerun-2026-10-13-assign-response.json) |

**Limitations:** All three new runs still used the deployed static `LAB02-REQ-001` card, deadline 2026-10-13 17:00 UTC+8 and reminder 16:00, already past at execution. An attempted UI edit did not persist into the actual card; no “updated configuration” result is presented. These dates and IDs are display fixtures only, unsuitable for production queuing or reminder acceptance. The card's “creates a task” text describes the intended complete workflow; this two-action flow only captures a response. It does not validate reviewer authorization, require a rejection reason server-side, map a real backup assignee, create tasks, or send reminders. Response records exclude headers and responder identity.

Do not replace the wait action with an ordinary **Post card** plus a separate **When someone responds** listener. Each wait card consumes only the first submission; if an unauthorized user submits first or a rejection has no reason, record failure and issue a new card rather than approving by default.

### 7.2 Production Queue Workflow

1. Create automated flow `Lab02-ReviewWorker` with SharePoint trigger **When an item is created**, selecting the lab site and list.
2. Read the current record and rename the action `GetRequest`. Process only Status=`Queued`; terminate other statuses.
3. Add **Parse JSON**, named `ParseAnalysis`, with AnalysisJson as content and the supplied file as Schema.
4. Add Compose `CardTemplate` containing the template object. Then add Compose `ReviewCard`, switch to **Expression**, and paste the [card expression](flows/card-expression.txt).
5. Update Status=`AwaitingDecision`, then use the Teams wait action above with `ReviewCard` output as Message; set timeout to `PT1H`.
6. Confirm the actual `data` and `responder` paths in Outputs from a real test run. Validate data with the [response schema](flows/card-response.schema.json); obtain identity only from the connector responder object ID.
7. Check the current Status, requestId, and fixed reviewer ID in a condition. On failure, write Failed and its reason, then terminate; validating only values carried by the card is insufficient.
8. Use **Switch** for approve/reject/assign. reject must have a nonempty reason and writes Rejected; unknown buttons write Failed.
9. approve selects self as a fixed value; assign allows only self/backup, mapped to Entra Object IDs in private configuration. Both may map to yourself in the first classroom test; this does not validate assignment to others.
10. In each relevant branch, write Status=`CreatingTask` before executing the next step's task creation. Disable unsafe automatic retries on the task creation action; mark write-back failures Unknown and verify manually rather than blindly rerunning creation.
11. Add error and timeout Scopes using **Configure run after** for Failed and Timed out. Retain the request ID, error, and processing stage, and explicitly update the queue.

## Step Eight: Create Planner Tasks and Configure Reminders Separately

### 8.1 Planner Basic Plan

1. In Planner **Create a plan → Basic plan**, create `Workshop-Lab02-Tasks`.
2. Under **Share with your group**, select only the group associated with the new lab team. If it cannot be found, stop; do not pass off a personal plan as a team plan.
3. Create bucket `待处理` (Pending) and keep the actual Group, Plan, and Bucket IDs in private configuration.
4. In the workflow's approval/assignment branches, add **Planner → Create a task**, selecting the lab Group, Plan, and Bucket. Set Title to the validated analysis title.
5. Expand advanced parameters, bind Due Date Time to DueAtUtc, and use the actual allowlist-resolved user IDs for Assigned User Ids.
6. After successful creation, save the returned Task ID and set Status=`Created`. Report task creation only once the ID is persisted.

Planner **deadlines are not reminder times**. The connector has no general reminderAt field; do not invent that parameter in “Create a task.”

### 8.2 Scheduled Teams Reminders

1. Create scheduled flow `Lab02-TaskReminder` with **Recurrence** every 1 minute for classroom validation; prevent overlapping concurrent runs with Concurrency=1.
2. Read records with Status=`Created` and ReminderStatus=`Pending`, then check `RemindAtUtc <= utcNow()` for each.
3. Use **Planner → Get a task** for TaskId. Do not remind for completed tasks; record the reason. For incomplete tasks whose reminder time has arrived, first set ReminderStatus=`Sending`.
4. **Teams → Post message in a chat or channel**: post only to the dedicated lab channel, showing request number, title, and deadline without sensitive business information.
5. Set `Sent` after a successful message, and `Failed` if sending fails. If sending succeeds but write-back fails, write `Unknown` or retain Sending for verification; do not treat it as Pending and resend automatically.
6. For a real test, set the deadline at submission to `addMinutes(utcNow(),15)` and reminder to `addMinutes(utcNow(),5)`. Wait for the channel reminder, then verify times and records.
7. Turn off the classroom scheduled flow after acceptance to avoid continuous polling; define frequency and operational policy separately for production.

### 8.3 Optional To-Do Alternative

For personal To-Do, select **Add a to-do (V3)** and set **Reminder Date-Time** and **Is Reminder On=true**. The task belongs to the connection account; choosing a Planner assignee on a card does not write to that person's To-Do. Follow the connector's date format and inspect returned timeZone and client time; do not assume a string without a timezone is UTC. The main lab uses Planner + Teams reminders.

## Step Nine: Publish to Teams and Validate End to End

1. In Copilot Studio, check topics, tools, and connections for errors and select **Publish**.
2. Under **Channels → Teams and Microsoft 365 Copilot**, enable Teams within tenant-permitted scope; add it only for yourself initially.
3. Submit a fictional request to the agent in Teams, verify analysis and confirmation, then submit for review.
4. Use a new RequestId and card for every case below; one card cannot validate all three buttons repeatedly.

| Case | Expected observation |
|---|---|
| Approve | One task created in the dedicated plan; default assignee is yourself; queue contains TaskId |
| Return with a reason | Rejected; no task created |
| Return without a reason | Explicit failure; no task created; new card required |
| Assign self/backup | Only allowlist mappings take effect; task assignee is correct |
| Non-reviewer/forged ID/unknown button | Rejected; no task created |
| Repeat an already consumed response | Status checks prevent duplicate creation |
| Reminder due and task incomplete | Dedicated channel receives one reminder; status Sent |
| Task completed before reminder | No incomplete-task reminder sent |
| Connector error or write-back failure | Failed/Unknown explicitly traceable; no success reported |

Mark the full workflow complete only after actually observing the Teams card response, Planner task, and reminder message. Before rerunning a failed stage, check real tasks to avoid duplicate assignments.

## Step Ten: Inspect Saved Artifacts and Reproduce Local Checks

Supplied artifacts include [request data](data/request.json), [analysis example](data/analysis-example.json), [response examples](data/response-examples.json), [card template](cards/task-review.template.json), [output card](output/task-review.example.json), [simulated task record](output/task-record.example.json), [global instructions](agent/instructions.txt), [node Prompt](agent/analyze-prompt.txt), [topic YAML](agent/card-help-topic.yaml), and [validation logic](scripts/contracts.mjs).

```bash
cd lab-02
npm run generate
npm test
```

The generation script saves offline examples only; it does not call the tenant, send cards, or create tasks. Do not reinstall dependencies if they are already installed.

## Actual Operation Record

| Operation | Current evidence and status |
|---|---|
| Use Microsoft Edge | Playwright connected through CDP and verified Edg/ in the User Agent |
| Create Lab 2 agent and save global instructions | Real creation and saving completed |
| AnalyzeTaskRequest | Created, tested, and bound; cloud riskNotes prompt synchronized to use a text-object array and saved |
| CardHelp | Message node created and saved in the real designer; code editor opened for verification |
| Private Teams team and standard channel | Created in the real service with only the creator; screenshot shows creation configuration |
| Teams wait card action | 2026-10-13: three new cards and independent runs returned approve/self, reject/reason and assign/backup; all minimal-flow runs Succeeded; actual response fields saved |
| Planner plan | Historically the lab group did not appear in search; no plan was created or newly provisioned during this reuse-only rerun |
| SharePoint queue and all three complete flows | Deployment not yet complete |
| Production authorization/return/assignment branches, Teams agent publication, real tasks and reminders | Not executed end to end; three captured card responses do not prove formal approval, task creation, or reminders |

See [dated screenshot provenance](screenshots/rerun-2026-10-13.json). Steps Five–Six and the production parts of Steps Seven–Nine remain blocked by undeployed queue/worker/plan/reminder components, not by the minimal card-response test.

## Official References

- [Power Automate Adaptive Cards](https://learn.microsoft.com/en-us/power-automate/create-adaptive-cards)
- [Teams connector](https://learn.microsoft.com/en-us/connectors/teams/)
- [Planner connector](https://learn.microsoft.com/en-us/connectors/planner/)
- [To-Do connector](https://learn.microsoft.com/en-us/connectors/todo/)
- [Agent flow creation and responses](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-flow-create)
- [Agent Instructions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-instructions)
- [Adaptive Cards in topics](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-ask-with-adaptive-card)
- [Publish to Teams](https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-add-bot-to-microsoft-teams)
