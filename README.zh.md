# Copilot Studio 实战工作坊

[English](README.md) | [简体中文](README.zh.md)

本工作坊围绕 Microsoft Copilot Studio、Power Automate、Microsoft 365 连接器、MCP 和检索增强生成（RAG），逐步构建业务智能体。四个实验方向包含五份手册：Lab 04 拆分为两个企业场景。
截图保留相关产品步骤与执行证据。2026-10-13新增复跑截图采用产品区域裁剪及账号、标识遮挡；响应导出不包含凭据、headers或响应者身份。历史附件保留原有证据范围，对外分享前仍需复核。

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

**最新复跑：2026-10-13，Playwright + Microsoft Edge。**已实际操作五个现有实验 Agent，调用可用的 Prompt、对话、附件及云端流程步骤。授权仅限复用已有 Workshop / Lab 资源；缺失集成和失败前置条件如实记录，没有通过新建资源或模拟结果冒充成功。各实验双语手册已在相应步骤附近加入本轮截图及执行记录链接；旧图仍为历史证据。

| 实验 | 已取得的真实证据 | 待完成或阻塞内容 |
|---|---|---|
| 01 | 实际Excel读取成功；修正云端Prompt，重测正常、上期为零、帮助及拒绝场景；定时流程最终Off。 | Run script返回HTTP 404 / Operation not found；缺输入机器协议失败；未执行流程调用Agent、云端Word、Outlook草稿或PPT。 |
| 02 | 三张新卡的独立最小流实际返回approve/self、reject/原因、assign/backup，运行均Succeeded。 | 静态示例编号与时间仅用于显示；队列、授权worker、真实Planner指派、提醒及Teams Agent端到端提交仍未部署或验收。 |
| 03 | 直接优惠问题明确MCP不可用、不进入模拟；五个独立数值模拟与两项交易边界问题已执行。 | 没有绑定MCP工具，未调用tools/list或真实优惠；DLP错误是历史证据，不是本轮策略测试。Teams与通知保持取消。 |
| 04-01 | 确认Ready知识、带引用的原生AGW-401答案；重测云端三问题Prompt并重新本地预处理。 | 实际日志附件仍追问SanitizedLog，文本重试报invalid property；未执行受控Azure搜索、ServiceNow或Teams状态通知。 |
| 04-02 | 确认Ready政策及带引用的30天答案；重测三问题Prompt、实际合同附件与完整文本补充。 | 附件提取未通过；补充答案使用译文且缺chunkId/URL，未满足严格审计验收；未受控Azure检索或生成在线Excel，保留历史离线工作簿。 |

各实验手册中的详细执行记录优先于此总览。本地检查、已保存配置或官方文档截图均不能证明已部署流程端到端成功。

## 安全与操作边界

使用虚构业务数据及隔离测试资源。未经必要授权，不向业务团队投递实验消息或发送真实邮件。凭据、个人优惠券核销码、支付信息和敏感账户数据不得进入文档、截图、代码或日志。

本轮只复用现有资源，禁止业务频道、真实邮件、领券、下单及支付；实际卡片响应仅投递专用实验频道。前置失败即停止依赖写入，不把Prompt测试、原生知识答案或离线夹具记为完整链路成功。

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

每个实验页面的顶部和底部均提供 Markdown 与 PDF 下载。英文页面下载 `README.pdf`，中文页面下载 `README.zh.pdf`。手册内容修改时，应同步更新对应 PDF 快照。

Markdown 手册是内容源。推送到 `main` 时，[.github/workflows/pages.yml](.github/workflows/pages.yml)会自动构建并部署网站，不要直接编辑生成的 HTML。

使用 Node.js 22 或更高版本在本地生成相同网站：

```bash
npm ci
npm run build
npm test
```

生成文件位于 `_site/`（不提交到仓库）。构建使用 [scripts/build-site.mjs](scripts/build-site.mjs)和 [scripts/site.css](scripts/site.css)，不需要浏览器端请求 Markdown 或外部前端依赖。
