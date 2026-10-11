# Copilot Studio 实战工作坊

[English](README.md) | [简体中文](README.zh.md)

本工作坊围绕 Microsoft Copilot Studio、Power Automate、Microsoft 365 连接器、MCP 和检索增强生成（RAG），逐步构建业务智能体。四个实验方向包含五份手册：Lab 04 拆分为两个企业场景。

每个实验提供 Markdown 手册、关键步骤截图，以及提示词、配置样例、代码或教学数据。浏览器证据由 **Playwright + Microsoft Edge** 获取。手册区分真实产品截图、官方文档截图和模拟夹具；这些内容不能被误认为未完成集成已经成功的证据。

截图保留相关产品步骤与执行证据。发布前未完成全面的截图隐私检查。

## 实验导航

| 实验 | 场景与学习目标 | 英文 | 中文 |
|---|---|---|---|
| 01 | **销售周报自动化：**配置每周五17:00定时流程，读取 Excel 表格，使用 Prompt 提取销售指标，准备 Word 报告与 Outlook 邮件，并创建销售周报 Agent。 | [Lab 01](lab-01/README.md) | [实验 01](lab-01/README.zh.md) |
| 02 | **交互式任务审批：**在 Teams 使用包含批准、打回、指派按钮的 Adaptive Card，设计 Planner/To-Do 任务与提醒，并理解全局指令、Topics 与节点提示词。 | [Lab 02](lab-02/README.md) | [实验 02](lab-02/README.zh.md) |
| 03 | **麦当劳 MCP：**直接询问 Agent 今天有什么优惠券，检查连接与工具绑定，处理 DLP 限制，并将模拟订餐保留为明确请求时才触发的可选主题。本版不使用 Teams 或每日通知。 | [Lab 03](lab-03/README.md) | [实验 03](lab-03/README.zh.md) |
| 04-01 | **IT Helpdesk Agent：**分析错误日志，检索相关知识，设计 ServiceNow 工单与 Teams 状态更新，并应用五维检索质量优化。 | [Lab 04-01](lab-04-01/README.md) | [实验 04-01](lab-04-01/README.zh.md) |
| 04-02 | **合同合规审核 Agent：**提取合同条款，对照 SharePoint 法务知识，识别风险，并使用相同五维优化手段设计 Excel 审计报告。 | [Lab 04-02](lab-04-02/README.md) | [实验 04-02](lab-04-02/README.zh.md) |

## 学习路线

1. 从 **Lab 01** 开始，理解定时自动化、Prompt 与 Microsoft 365 文档和邮件动作。
2. 继续 **Lab 02**，学习人在回路的交互，并区分任务截止日期与提醒。
3. 通过 **Lab 03** 学习外部 MCP 集成、只读工具权限、明确失败提示和安全模拟。
4. 完成 **Lab 04-01 与 Lab 04-02**，将检索优化应用于运维支持和法务审核。

Lab 04 的五维 RAG 优化分别是：文档清洗与结构化、按标题语义分块、元数据打标与可信预过滤、混合检索及重排序和校准阈值、将复杂请求重写为三个精准检索子问题。

## 前置条件与准备

需要可访问适当 Copilot Studio 和 Power Platform 实验环境的 Microsoft 账号。不同实验还可能需要 Microsoft 365 服务、连接器连接、高级许可、Azure AI Search 部署或经批准的外部服务。请按各手册检查前置条件和权限；能使用一个服务不代表整条流程都有权限。

复现浏览器操作时使用 Microsoft Edge，并在提供脚本的实验中使用 Playwright。本地示例按对应实验的命令和依赖清单运行，不存在统一的根目录安装命令。本地数据与样例输出均为教学夹具，除非明确标记为真实执行结果。

进入各实验阅读英文 `README.md` 或中文 `README.zh.md`，按照**第一步、第二步……**依次操作。两种语言共用截图和附件。为保证复现，中文 UI 截图、Agent 提示词、测试语句和样例数据在必要时保留原语言；翻译手册不会修改已部署 Agent 或运行时附件。

## 已验证结果与待完成内容

| 实验 | 已取得的真实证据 | 待完成或阻塞内容 |
|---|---|---|
| 01 | 销售周报 Agent 已发布，部分定时 Excel 链路已配置。 | Word 与 Outlook 完整流程尚未端到端验收。 |
| 02 | Agent 指令、Prompt 和主题已保存；卡片投递私有测试团队，批准返回结构化字段，最小测试流成功。 | Planner 任务创建、正式 worker、提醒，以及 Agent 发布到 Teams 尚未完成。 |
| 03 | 连接器定义存在；直接优惠问题正确报告未连接；可选内部模拟返回教学套餐18元。 | MCP 尚未绑定到 Agent，此前个人连接创建被 DLP 阻止，未取得真实优惠券。Teams 与每日通知已取消。 |
| 04-01 | 已创建 Agent 和 Ready 知识，重写 Prompt 输出三个问题，本地预处理与检索请求示例已保存。 | Azure 检索、ServiceNow 工单与 Teams 状态流程尚未端到端验收。 |
| 04-02 | 已创建 Agent 和 Ready 知识，三个问题的 Prompt 输出已保存；离线人工标注 Excel 审计夹具附有来源引用。 | SharePoint 元数据实际配置和在线自动审计生成尚未端到端验收。 |

各实验手册中的详细执行记录优先于此总览。本地检查、已保存配置或官方文档截图均不能证明已部署流程端到端成功。

## 安全与操作边界

使用虚构业务数据及隔离测试资源。未经必要授权，不向业务团队投递实验消息或发送真实邮件。凭据、个人优惠券核销码、支付信息和敏感账户数据不得进入文档、截图、代码或日志。

全局指令是行为指导，不是访问控制。适用场景中应落实工具白名单、可信权限与服务端过滤。不要通过更换环境、连接器名称、域名或代理绕过 DLP，应请求管理员批准。麦当劳真实下单与领券工具不是模拟 API。

## 目录结构

```text
README.md             英文工作坊总览
README.zh.md          中文工作坊总览
lab-01/               销售周报与办公自动化
lab-02/               Adaptive Cards 与任务审批
lab-03/               MCP 连通检查与可选模拟
lab-04-01/            IT Helpdesk 与检索优化
lab-04-02/            合同合规与审计报告
```

每个实验包含 `README.md`、`README.zh.md` 和独立配套附件。直接打开 Markdown 即可，不需要工作坊网站。

## GitHub Pages

可浏览[英文网站](https://kinfey.github.io/copilot_studio_hol/)或[中文网站](https://kinfey.github.io/copilot_studio_hol/index.zh.html)。网站将实验介绍与五份实验手册生成双语 HTML，提供实验导航、页内目录、截图与附件下载。

文档布局参考 [Let's Learn Microsoft KARS](https://kinfey.github.io/LetsLearnMicrosoftKars/)，采用固定顶栏、左侧实验导航、中间正文与右侧目录，并提供文档搜索、颜色主题切换、移动端菜单和上下实验导航。

Markdown 手册是内容源。推送到 `main` 时，[.github/workflows/pages.yml](.github/workflows/pages.yml)会自动构建并部署网站，不要直接编辑生成的 HTML。

使用 Node.js 22 或更高版本在本地生成相同网站：

```bash
npm ci
npm run build
npm test
```

生成文件位于 `_site/`（不提交到仓库）。构建使用 [scripts/build-site.mjs](scripts/build-site.mjs)和 [scripts/site.css](scripts/site.css)，不需要浏览器端请求 Markdown 或外部前端依赖。
