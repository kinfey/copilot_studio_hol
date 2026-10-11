[English](README.md) | [简体中文](README.zh.md)

# Lab 04-01: IT Helpdesk Operations Agent

**Scenario workflow:** A user uploads an error log → extract error codes and product versions → rewrite three retrieval subquestions → hybrid search and reranking in an authorized knowledge base → cite troubleshooting evidence → user confirmation → call the ServiceNow API to create an incident → notify users of processing status in Teams.


## Step One: Prepare the Lab and Acceptance Baseline

1. Sign in to Copilot Studio and Power Automate using Edge and select an authorized lab environment; do not modify business agents.
2. The main integration requires a lab SharePoint document library, Azure AI Search, an available embedding deployment, an enabled Semantic ranker, a ServiceNow developer instance, and a dedicated standard Teams channel.
3. Without these resources, you can still complete local preprocessing, agent knowledge uploads, and Prompt tests; you cannot mark real search, incident creation, or notifications as successful. This lab does not automatically create billable Azure resources.
4. Download the [sample log](data/error.log), [original knowledge file](data/runbook.raw.md), and [metadata](data/metadata.json). Do not upload production logs or credentials; sanitize actual logs, scan for secrets, and minimize their contents first.
5. Set the fixed test question to “AtlasGateway 2.1 轮换证书后出现 AGW-401，如何排查，何时升级？” (How should AGW-401 after certificate rotation in AtlasGateway 2.1 be investigated, and when should it be escalated?). Use the Chinese question to test the Chinese agent.

**Accuracy baseline:** Test the same question set at document counts of 10, 100, and 500, adding distractors: older years, identical error codes for other products, drafts, and unauthorized materials. More documents do not necessarily reduce accuracy; version confusion, missing authorization, and retrieval noise are the causes to investigate.

Human-labeled questions and the plan for comparing each optimization dimension are saved in [evaluation.json](data/evaluation.json). No unmeasured scores have been filled in.

| Metric | How to record it | Suggested lab acceptance target, not a measured result |
|---|---|---|
| Recall@5 | Proportion of human-labeled relevant chunks retrieved among the first five chunks | ≥0.8 |
| Citation accuracy | Citations that actually support the answer / all citations | ≥0.9 |
| Unauthorized results | Number of unauthorized snippets returned | 0 |
| Correct refusal | Explicitly state unknown when a question has no evidence | Refuse all negative cases |
| Latency | End-to-end P50/P95 for the same question | Record and compare; do not invent numbers |

## Step Two: Preprocess and Structure Files (Optimization Dimension 1)

1. Read the original file and confirm that the repeated `Workshop INTERNAL — training header` and `Page x of y` on every page are unnecessary headers and footers. Do not clean by “deleting every repeated line,” which could remove provisions or error context.
2. Run:

   ```bash
   node lab-04-01/scripts/prepare.mjs
   ```

3. Open the [cleaned output](output/runbook.clean.md) and confirm that headings, error codes, versions, and safety boundaries remain intact.
4. Convert the original tab-separated tables into Markdown tables, retaining headers and all data rows. The script must report inconsistent column counts rather than silently drop columns.
5. PDF/Word extension: extract body text and table structure first; use organization-approved OCR for scanned PDFs. Preserve page numbers and section locations. Manually verify merged cells, charts, and tables spanning pages.

**Completion check:** Headers and footers are removed; certificate-chain and binding-version tables are readable; the instruction not to disable TLS validation remains. The local script processes only the supplied Markdown/tab-separated tables; it is not a general PDF/Word parser.

## Step Three: Chunk by Heading and Meaning (Optimization Dimension 2)

1. Open `chunkByHeading` in the [semantic chunking code](scripts/rag.mjs). Split at Markdown heading boundaries and retain the parent heading in each chunk.
2. Inspect [chunks.json](output/chunks.json): AGW-401 and AGW-429 are separate chunks, each with documentId, a section heading, and complete metadata.
3. The 6000-character limit is a **stop-and-review check** for overly long sections, not an automatic truncation strategy. If exceeded, add subheadings first, split at complete paragraphs, and keep tables intact. If overlap is needed, overlap one complete paragraph and record its source.
4. Each chunk ID consists of the document ID and a content hash. Content or version changes require rebuilding vectors and removing old chunks to avoid returning new and old policies together.

**Completion check:** The AGW-401 chunk does not contain the AGW-429 section; each chunk still identifies the product and version. Uploading these files directly to Copilot Studio does not deploy this custom chunker; native knowledge sources have their own chunking mechanisms.

## Step Four: SharePoint Metadata and Hard Prefiltering (Optimization Dimension 3)

1. In the dedicated SharePoint document library, use **Add column** to add `Department`, `ProductLine` (Choice), `PolicyYear` (Number, no decimals), and `ApprovalStatus` (Choice).
2. Upload the cleaned runbook, select the file → **Details**, and enter IT, AtlasGateway, 2026, and Approved.
3. Configure permissions through SharePoint/Entra; `Department=IT` is a business tag, not authorization. Index ACLs must come from a trusted permission synchronization process, not arbitrary author-entered columns or a Prompt.
4. Synchronize each chunk's department, product line, year, approval status, and allowedGroupIds; declare the Azure AI Search fields as `filterable=true`. Refer to the [index template](search/index.template.json).
5. The retrieval tool determines authorization groups on the server from the authenticated user, then intersects them with allowed business scopes. Prompt rewrites provide query text only and do not control filtering scope.
6. Inspect `filter` and `vectorFilterMode=preFilter` in the [hybrid query examples](output/hybrid-requests.json).

![Microsoft Learn: vector search prefiltering](screenshots/06-official-pre-filter.png)

**Key distinction:** Adding columns to SharePoint documents does not mean Copilot Studio's native SharePoint knowledge source automatically supports hard filtering on arbitrary columns. To validate hard rules, the main workflow uses a custom retrieval tool to apply OData filters and ACLs; “please search only 2026” is not access control.

## Step Five: Hybrid Search, Reranking, and Thresholds (Optimization Dimension 4)

1. Before creating the Azure AI Search index, replace the template's embedding resource and deployment placeholders with your own. The 1536 dimensions match this template's model settings; indexing and querying must use the same model/dimensions.
2. Grant the Search managed identity the organization-required minimum permissions for embedding calls and configure the server-side search identity. Store credentials in connectors or a secret service, not in training material, Prompts, or browser screenshots.
3. Generate real embeddings for every chunk and write them to contentVector. The output chunks.json **contains no vectors**, so it is not evidence of a completed vector index.
4. Enable Semantic ranker. Name the semantic configuration `lab04-semantic` and map title/content to headings/body text respectively.
5. In **Search explorer → JSON view**, submit one supplied query: `search` runs full-text BM25, `vectorQueries` runs vector retrieval, RRF merges candidates, and `queryType=semantic` reranks results.
6. `kind=text` requires a configured query-time vectorizer in the index. Without it, first generate a query embedding, then use `kind=vector` with a real numeric array, not fake vectors.
7. k=50 is the reranking candidate count; top=5 is the result count per subquestion. Deduplicate the three subquestion results by chunkId, sort by semantic score, and return at most 15 chunks.
8. Call `gateResults` in the custom retrieval service, using `@search.rerankerScore >= 2.5` as the teaching starting point. This is an experimental gate on the 0–4 semantic reranking score, not a universal production threshold.
9. Calibrate the threshold with labeled questions. Explicitly report an error if semantic scores are missing; do not substitute BM25/RRF `@search.score`. If all results are filtered out, return zero evidence and the agent should refuse to answer.

![Microsoft Learn: keyword/vector hybrid retrieval and RRF](screenshots/05-official-hybrid-search.png)

**Copilot Studio configuration note:** This lab did not find a built-in control for an arbitrary “unified BM25/vector threshold.” Set the threshold in the retrieval tool's backend and call the tool from Studio; do not confuse content moderation sensitivity with a retrieval threshold. Native Azure AI Search integration uses an official data connection, not handwritten unsupported connection configuration.

## Step Six: Create the Real Helpdesk Agent and Upload Baseline Knowledge

1. Copilot Studio → **Other ways to build → Create an agent with predefined rules and flows**; name it `Workshop-ITHelpdeskAgent-Lab04`.
2. Wait for Ready, paste the [global instructions](agent/instructions.txt) into **Overview → Instructions → Edit**, and Save; turn off Web Search.

![Real Copilot Studio: Helpdesk global instructions](screenshots/01-real-agent-instructions.png)

3. **Knowledge → Add knowledge → Upload file**: select `output/runbook.clean.md`, then **Add to agent**.

![Real Copilot Studio: cleaned file upload](screenshots/02-real-knowledge-upload.png)

4. Wait for knowledge status Ready. In Test, ask about the cause of AGW-401 and inspect citations and handling of unknown information.
5. This is the native knowledge Q&A baseline, validated separately from the custom hybrid retrieval workflow. When integrating the main workflow, restrict the answer node to controlled retrieval evidence; native uploaded files must not bypass custom hard filters.

![Real runbook.clean.md Ready status, cropped to the status cell](screenshots/08-real-knowledge-ready.png)

## Step Seven: Use a Prompt to Rewrite Three Precise Subquestions (Optimization Dimension 5)

1. **Tools → Add a tool → Prompt**; name it `RewriteHelpdeskQueriesLab04`.
2. Paste the [node Prompt](agent/multi-query.txt); use **Add content → Text** to create UserQuestion and SanitizedLog inputs and insert their tokens.
3. Use the Step One test question for UserQuestion and the supplied fictional log for SanitizedLog.
4. **Output format → JSON**, then Test. Check that `queries` contains exactly three distinct `{text}` objects, all retaining AGW-401 and AtlasGateway 2.1.

![Real Prompt test: three retrieval subquestions](screenshots/04-real-multi-query-test.png)

5. Save → Add and configure. The real test output is saved as [queries.real.json](output/queries.real.json), separately from the [offline reference](data/queries.example.json).
6. In the task topic's Prompt node, bind the inputs to the sanitized log and user question. If `validateQueries` fails, return an explicit error rather than silently reuse the previous question.
7. Run a query with the same trusted filters for each of the three subquestions, then deduplicate before answering. Compare Recall@5, citations, and latency for single-query and multi-query retrieval; multiple queries can increase noise and do not guarantee improvement.

## Step Eight: User Log Upload, Controlled Retrieval, and Incident Confirmation

1. Enable file input under the agent's **Settings → Generative AI** using tenant-permitted capabilities, then upload `data/error.log` in Test. Do not confuse user uploads with author uploads to Knowledge.
2. If the upload type is unsupported, use an authorized staging area in the main workflow; pass a controlled file ID to a tool that retrieves its text. Do not request arbitrary external URLs or make staged files public.
3. Create Topic `AnalyzeUploadedLog`: retrieve log → file safety checks/sanitization → extract product, version, errorCode → three-question Prompt → controlled SearchKnowledge tool → cited summary.
4. Map search tool results to Content, Title, and ContentLocation, or supply them as custom data to an explicit generative answers node. For a global custom knowledge trigger, refer to the official `OnKnowledgeRequested` code view; all custom knowledge topics in one agent can return at most 15 snippets in total.
5. Present the proposed short_description, sanitized description, and requestId; add a user confirmation branch. Cancellation must not create an incident.
6. Call only the `CreateIncident` operation fixed by the instance allowlist. The model may analyze product/error codes, but incident priority and assignment group are determined by rules or human confirmation.

## Step Nine: ServiceNow API and Teams Status

1. Configure approved OAuth integration and least-privilege access to the incident table in a ServiceNow **developer instance**; create a custom connector in Power Platform.
2. Set a fixed host `<YOUR_DEV_INSTANCE>.service-now.com` and POST `/api/now/table/incident`; refer to the [request body](flows/incident-request.example.json).
3. The official built-in ServiceNow Create Record operation has limitations on the full description; this scenario uses an approved Table API custom connector rather than silently dropping the description.

![Microsoft Learn: ServiceNow connector and known limitations](screenshots/07-official-servicenow.png)

4. Check the persisted RequestId/correlation_id first; on successful submission, save the returned `sys_id` and `number`. correlation_id is not inherently an idempotency key; queue locking/unique requests and server-side checks are required.
5. If a write times out, mark it Unknown and query to verify; do not automatically repeat the POST. Explicitly reject 4xx responses and report 5xx failures; never invent an incident number.
6. **Teams → Post message in a chat or channel**: select only the dedicated test channel and show the incident number, brief description, status, and controlled link, not raw logs.
7. An independent status synchronization flow reads the incident and notifies after detecting status changes; persist the last notified status to avoid duplicates. Turn off classroom polling flows.
8. Synchronous agent tools should return accepted/requestId promptly. Use independent workflows for lengthy diagnosis and status synchronization; do not wait for human processing in ServiceNow to finish.

## Step Ten: Acceptance, Saved Artifacts, and Execution Status

Run `node --test lab-04-01/tests/rag.test.mjs` to check cleaning, chunking, three questions, prefiltering, and gating. Validate the real workflow separately: upload log → sourced answer → confirmation → real incident response → Teams status. Test unauthorized access, old versions, low scores, Prompt injection, and API timeouts; none may produce success-shaped results.

| Executed scope | Current status |
|---|---|
| Create Helpdesk agent in Edge, save instructions, and turn off Web Search | Performed in the real UI |
| Upload cleaned runbook | Real Add to agent completed; final status Ready; not proof of custom index deployment |
| Three-question Prompt | Tested, saved, and bound in the real UI; output saved |
| Local cleaning, semantic chunking, retrieval requests | Files saved; no real search calls |
| SharePoint metadata, Azure index/hard filters, ServiceNow, Teams notifications | Not yet integrated or validated end to end; designated authorized lab resources are required |

See [manifest.json](screenshots/manifest.json) for screenshot sources. The supplied code does not automatically deploy resources or send external requests.

The official-document screenshot reproduction script is [capture-docs.mjs](scripts/capture-docs.mjs): run `npm run screenshots:docs` against an already running Edge CDP endpoint at `127.0.0.1:9223`. It recaptures official pages only, not fabricated product configurations or execution results; install this directory's dependencies before running.

## Official References

- [Hybrid search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [Vector prefiltering](https://learn.microsoft.com/en-us/azure/search/vector-search-filters)
- [Copilot Studio Azure AI Search](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-azure-ai-search)
- [Custom knowledge sources](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/custom-knowledge-sources)
- [ServiceNow connector](https://learn.microsoft.com/en-us/connectors/service-now/)
