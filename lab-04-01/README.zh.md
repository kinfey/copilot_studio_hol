[English](README.md) | [简体中文](README.zh.md)

# Lab 04-01：IT Helpdesk 智能运维 Agent

**案例链路：**用户上传错误日志 → 提取错误码与产品版本 → 重写三个检索子问题 → 在授权知识库中混合检索与重排 → 引用排查证据 → 用户确认 → 调用 ServiceNow API 创建工单 → Teams 通知处理状态。


## 第一步：准备实验与验收基线

1. 用 Edge 登录 Copilot Studio 和 Power Automate，选择有权限的实验环境；不要改动业务 Agent。
2. 主线接入需要：实验 SharePoint 文档库、Azure AI Search、可用的 embedding 部署、启用的 Semantic ranker、ServiceNow 开发实例、专用 Teams 标准频道。
3. 没有这些资源仍可完成本地预处理、Agent 知识上传、Prompt 测试；不能勾选真实搜索、工单或通知成功。不在本实验自动创建收费 Azure 资源。
4. 下载 [模拟日志](data/error.log)、[原始知识文件](data/runbook.raw.md)、[元数据](data/metadata.json)。不上传生产日志或凭据；实际日志先进行脱敏、秘密扫描及最小化处理。
5. 设置固定测试问题：“AtlasGateway 2.1 轮换证书后出现 AGW-401，如何排查，何时升级？”

**准确率基线：**在 10、100、500 份文档规模分别测试同一批问题，增加干扰资料：旧年份、其他产品同名错误码、草稿、无权限资料。文档数增加不一定导致准确率下降，版本混淆、权限缺失及检索噪声才是需要验证的原因。

人工标注问题和逐维对比计划保存在 [evaluation.json](data/evaluation.json)，未填写未经实测的成绩。

| 指标 | 记录方式 | 本实验建议验收目标，非已测结果 |
|---|---|---|
| Recall@5 | 前5块命中人工标注相关 chunk 的比例 | ≥0.8 |
| 引用准确率 | 引用确实支持答案的条数 / 所有引用 | ≥0.9 |
| 越权返回 | 未授权片段出现次数 | 0 |
| 正确拒答 | 无证据题明确未知 | 所有负例均拒答 |
| 延迟 | 同一问题端到端 P50/P95 | 记录并比较，不捏造数字 |

## 第二步：文件预处理与结构化（优化维度1）

1. 阅读原文件，确认每页重复的 `Workshop INTERNAL — training header` 和 `Page x of y` 是无用页眉页脚。不能用“删所有重复行”清洗，避免误删条款或错误上下文。
2. 运行：

   ```bash
   node lab-04-01/scripts/prepare.mjs
   ```

3. 打开 [清洗结果](output/runbook.clean.md)，确认标题、错误码、版本与安全边界保留。
4. 原始制表符表格转成 Markdown 表格；表头与所有数据行保持完整。列数不一致时脚本报错，不能静默丢列。
5. PDF/Word 扩展：先提取正文及表格结构；扫描 PDF 使用组织批准 OCR。保留文档页码和章节定位；合并单元格、图表与跨页表需人工核对。

**完成检查：**页眉页脚去除；证书链与绑定版本表格可读；“不关闭 TLS 校验”没有丢失。本地脚本只处理配套 Markdown/制表符表格，不冒充通用 PDF/Word 解析器。

## 第三步：按标题与语义分块（优化维度2）

1. 打开 [语义分块代码](scripts/rag.mjs) 的 `chunkByHeading`。以 Markdown 标题边界切分，给每块保留父标题。
2. 检查 [chunks.json](output/chunks.json)：AGW-401 与 AGW-429 是独立块，每块带 documentId、章节标题及完整元数据。
3. 上限 6000 字符只是过长章节的**停止检查**，不是自动截断策略。超过时先增加子标题，按完整段落切分，表格整体保留；需要重叠时重叠一个完整段落并记录来源。
4. 每个 chunk ID 由文档 ID 与内容哈希组成。内容或版本变化需重建向量、移除旧块，避免新旧策略同时返回。

**完成检查：**AGW-401 块中没有 AGW-429 章节；单块仍知道产品与版本。直接把这些文件上传 Copilot Studio 不会部署该自定义 chunker；原生知识源有自己的分块机制。

## 第四步：SharePoint 元数据与硬预过滤（优化维度3）

1. 在专用 SharePoint 文档库 **Add column** 添加 `Department`、`ProductLine`（Choice）、`PolicyYear`（Number，无小数）、`ApprovalStatus`（Choice）。
2. 上传清洗后的 runbook，选择文件 → **Details**，填写 IT、AtlasGateway、2026、Approved。
3. 权限通过 SharePoint/Entra 设置；`Department=IT` 只是业务标签，不是授权。索引 ACL 必须从可信权限同步程序取得，不能来自作者随意输入的列或 Prompt。
4. 同步每个 chunk 的部门、产品线、年份、审批状态及 allowedGroupIds；在 Azure AI Search 字段声明 `filterable=true`，参考 [索引模板](search/index.template.json)。
5. 检索工具在服务端根据已认证用户决定授权组，再与允许的业务范围相交。Prompt 重写结果只提供查询文字，不控制过滤范围。
6. 检查 [混合查询示例](output/hybrid-requests.json) 的 `filter` 与 `vectorFilterMode=preFilter`。

![Microsoft Learn：向量检索预过滤机制](screenshots/06-official-pre-filter.png)

**关键区别：**给 SharePoint 文档加列，不代表 Copilot Studio 原生 SharePoint 知识源自动支持任意列的硬过滤。要验收硬规则，主线使用自定义检索工具执行 OData filter 和 ACL；“请只查2026”不是权限控制。

## 第五步：Hybrid Search、Re-ranking 与阈值（优化维度4）

1. 在 Azure AI Search 创建索引前替换模板中的自己 embedding 资源与部署占位符。1536维对应本模板模型设置；索引与查询必须使用同一模型/维度。
2. 为 Search 的托管身份授予组织规定的最小 embedding 调用权限，配置服务端搜索身份。凭据放连接器或密钥服务，不放教材、Prompt 或浏览器截图。
3. 为每个 chunk 生成真实 embedding 并写入 contentVector。输出 chunks.json **不包含向量**，不能直接宣称完成向量索引。
4. 启用 Semantic ranker，semantic configuration 名称为 `lab04-semantic`，title/content 分别映射标题与正文。
5. 在 **Search explorer → JSON view** 发送一份配套查询：`search` 执行全文 BM25，`vectorQueries` 执行向量检索，RRF 合并候选，`queryType=semantic` 对结果重排。
6. `kind=text` 要求索引已配置 query-time vectorizer。未配置时先生成 query embedding，再使用 `kind=vector` 与真实数值数组，不填假向量。
7. k=50 是重排候选数量，top=5 是每个子问题返回数量。三个子问题按 chunkId 去重，按语义分数排序，最多返回15块。
8. 在自定义检索服务中调用 `gateResults`，教学起点 `@search.rerankerScore >= 2.5`。这是0–4语义重排分数的实验门控，不是普适生产阈值。
9. 用标注问题集校准阈值；没有语义分数明确报错，不拿 BM25/RRF 的 `@search.score` 替代。全被过滤时返回零证据，Agent 应拒答。

![Microsoft Learn：关键词与向量混合检索及 RRF](screenshots/05-official-hybrid-search.png)

**Copilot Studio 配置说明：**本实验没有发现可任意填写“BM25/向量统一阈值”的内置控件。阈值在检索工具服务端设置，Studio 调用该工具；不要把内容审核敏感度当检索阈值。原生 Azure AI Search 连接使用正式 data connection，不手写未经支持的连接配置。

## 第六步：创建真实 Helpdesk Agent 与上传知识基线

1. Copilot Studio → **Other ways to build → Create an agent with predefined rules and flows**，名称 `Workshop-ITHelpdeskAgent-Lab04`。
2. 等待 Ready，**Overview → Instructions → Edit** 粘贴 [全局指令](agent/instructions.txt)，Save；关闭 Web Search。

![真实 Copilot Studio：Helpdesk 全局指令](screenshots/01-real-agent-instructions.png)

3. **Knowledge → Add knowledge → Upload file** 选择 `output/runbook.clean.md`，再 **Add to agent**。

![真实 Copilot Studio：清洗文件上传](screenshots/02-real-knowledge-upload.png)

4. 等待知识状态 Ready。在 Test 问 AGW-401 原因，查看引用和未知信息处理。
5. 这是原生知识问答基线，与自定义混合检索主线分开验收。主线接入时限制回答节点只使用受控检索证据，不允许原生上传文件绕过自定义硬过滤。

![真实 runbook.clean.md 的 Ready 状态，仅截取状态单元格](screenshots/08-real-knowledge-ready.png)

## 第七步：Prompt 重写三个精准子问题（优化维度5）

1. **Tools → Add a tool → Prompt**，名称 `RewriteHelpdeskQueriesLab04`。
2. 粘贴 [节点 Prompt](agent/multi-query.txt)；**Add content → Text** 创建 UserQuestion 与 SanitizedLog 两个输入并插入令牌。
3. UserQuestion 使用第一步测试题；SanitizedLog 使用配套虚构日志。
4. **Output format → JSON**，Test。检查 `queries` 恰好三个 `{text}` 对象、不同、均保留 AGW-401 与 AtlasGateway 2.1。

![真实 Prompt 测试：三个检索子问题](screenshots/04-real-multi-query-test.png)

5. Save → Add and configure。真实测试输出已保存为 [queries.real.json](output/queries.real.json)；与 [离线参考](data/queries.example.json) 分开。
6. 在任务主题的 Prompt 节点将输入绑定到已脱敏日志与用户问题。`validateQueries` 不通过时明确返回错误，不默认复用上一次问题。
7. 对三个子问题分别执行相同可信过滤查询，去重后回答。比较单问题与 multi-query 的 Recall@5、引用与延迟；多查询可能扩大噪声，不保证一定提升。

## 第八步：用户上传日志、受控检索与工单确认

1. 在 Agent **Settings → Generative AI** 的文件输入选项按租户允许的功能开启，Test 中上传 `data/error.log`。不能把用户上传和作者 Knowledge 上传混为一谈。
2. 上传类型不支持时，主线通过授权暂存区上传文件，工具传受控文件 ID 并取文本；不要要求任意外部 URL，也不公开暂存文件。
3. 新建 Topic `AnalyzeUploadedLog`：获取日志 → 文件安全检查/脱敏 → 提取 product、version、errorCode → 三问题 Prompt → 受控 SearchKnowledge 工具 → 引用式摘要。
4. 搜索工具将返回结果映射为 Content、Title、ContentLocation，或者作为显式生成式回答节点的 custom data。需要全局自定义知识触发器时参考 `OnKnowledgeRequested` 官方代码视图；同一 Agent 的所有自定义知识主题总计最多15片段。
5. 呈现待提交 short_description、脱敏 description 和 requestId，添加用户确认分支；取消不写工单。
6. 仅调用实例白名单固定的 `CreateIncident`；产品/错误码允许模型分析，工单优先级与分配组由规则或人工确认。

## 第九步：ServiceNow API 与 Teams 状态

1. 在 ServiceNow **开发实例**配置批准的 OAuth 集成和 incident 表最小权限；在 Power Platform 创建自定义连接器。
2. 配置固定主机 `<YOUR_DEV_INSTANCE>.service-now.com`，操作 POST `/api/now/table/incident`，参考 [请求体](flows/incident-request.example.json)。
3. 官方内置 ServiceNow Create Record 的完整 description 存在限制；本案例使用经批准的 Table API 自定义连接器，不默默丢描述。

![Microsoft Learn：ServiceNow 连接器与已知限制](screenshots/07-official-servicenow.png)

4. 先检查持久记录的 RequestId/correlation_id；成功提交保存返回的 `sys_id` 和 `number`。correlation_id 不是天然幂等键，需队列锁/唯一请求及服务端检查。
5. 写入超时则标 Unknown 并查询核实；不自动重复 POST。4xx 明确拒绝，5xx 明确失败；不编造工单号。
6. **Teams → Post message in a chat or channel** 只选择专用测试频道，显示工单号、简述、状态与受控链接，不发送原始日志。
7. 独立状态同步流读取该工单，比较状态变化后通知；持久保存已通知状态，避免重复。关闭课堂轮询流。
8. Agent 同步工具应及时返回 accepted/requestId；长时间诊断和状态同步用独立工作流，不等待 ServiceNow 人工处理结束。

## 第十步：验收、保存与执行状态

运行 `node --test lab-04-01/tests/rag.test.mjs`，检查清洗、分块、三问题、预过滤与门控。真实链路另验收：上传日志 → 有来源答案 → 确认 → 真实工单返回 → Teams 状态。测试无权限、旧版本、低分、Prompt 注入和 API 超时，均不能生成成功形状结果。

| 已执行范围 | 当前状态 |
|---|---|
| Edge 创建 Helpdesk Agent、保存指令与关闭 Web Search | 已真实操作 |
| 上传清洗 runbook | 已真实 Add to agent，最终状态 Ready；不是自定义索引部署证明 |
| 三问题 Prompt | 已真实测试、保存并绑定，输出保存 |
| 本地清洗、语义分块、检索请求 | 文件已保存，无真实搜索调用 |
| SharePoint 元数据、Azure 索引/硬过滤、ServiceNow、Teams 通知 | 尚未接入与端到端验证；需要指定授权实验资源 |

截图来源见 [manifest.json](screenshots/manifest.json)。配套代码不会自动部署资源或发送外部请求。

官方文档截图复现脚本为 [capture-docs.mjs](scripts/capture-docs.mjs)：在已启动的 Edge CDP `127.0.0.1:9223` 上运行 `npm run screenshots:docs`。仅重拍官方页面，不伪造产品配置或执行结果；执行前安装本目录依赖。

## 官方参考

- [混合检索](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [向量预过滤](https://learn.microsoft.com/en-us/azure/search/vector-search-filters)
- [Copilot Studio Azure AI Search](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-azure-ai-search)
- [自定义知识源](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/custom-knowledge-sources)
- [ServiceNow 连接器](https://learn.microsoft.com/en-us/connectors/service-now/)
