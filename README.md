# Copilot Studio Hands-on Workshop

[English](README.md) | [简体中文](README.zh.md)

A step-by-step workshop for building business agents with Microsoft Copilot Studio, Power Automate, Microsoft 365 connectors, MCP, and retrieval-augmented generation (RAG). The four lab tracks contain five manuals: Lab 04 is split into two enterprise scenarios.

Screenshots retain product steps and execution evidence. New 2026-10-13 rerun screenshots use cropped product regions and account/identifier masking; response exports exclude credentials, headers, and responder identity. Historical attachments retain their original scope and should be reviewed before external sharing.

## Lab Guide

| Lab | Scenario and learning objectives | English | Chinese |
|---|---|---|---|
| 01 | **Weekly sales reporting:** schedule a Friday 17:00 flow, read an Excel table, extract sales metrics with a prompt, prepare a Word report and Outlook email, and build a sales-reporting agent. | [Lab 01](lab-01/README.md) | [实验 01](lab-01/README.zh.md) |
| 02 | **Interactive task review:** use Adaptive Cards with approve, return, and assign actions in Teams; design Planner/To-Do task creation and reminders; understand global instructions, Topics, and node prompts. | [Lab 02](lab-02/README.md) | [实验 02](lab-02/README.zh.md) |
| 03 | **McDonald's MCP:** directly ask the agent about today's coupons, inspect connection and tool binding, handle DLP restrictions, and keep simulated ordering as an explicit optional topic. This version does not use Teams or daily notifications. | [Lab 03](lab-03/README.md) | [实验 03](lab-03/README.zh.md) |
| 04-01 | **IT Helpdesk agent:** analyze error logs, retrieve relevant knowledge, design ServiceNow ticket creation and Teams status updates, and apply five retrieval-quality optimizations. | [Lab 04-01](lab-04-01/README.md) | [实验 04-01](lab-04-01/README.zh.md) |
| 04-02 | **Contract compliance agent:** extract contract clauses, compare them with legal knowledge in SharePoint, identify risks, and design an Excel audit report using the same five retrieval optimizations. | [Lab 04-02](lab-04-02/README.md) | [实验 04-02](lab-04-02/README.zh.md) |

## Learning Path

1. Start with **Lab 01** to understand scheduled automation, prompts, and Microsoft 365 document and email actions.
2. Continue with **Lab 02** for human-in-the-loop interactions and the distinction between task deadlines and reminders.
3. Use **Lab 03** to learn external MCP integration, read-only tool permissions, explicit failure reporting, and safe simulation.
4. Complete **Lab 04-01 and Lab 04-02** to apply retrieval techniques to operational support and legal review.

The five RAG optimization dimensions in Lab 04 are document cleaning and structure, semantic heading-based chunking, metadata tagging with trusted pre-filtering, hybrid search with re-ranking and calibrated thresholds, and rewriting a complex request into three focused retrieval questions.

## Prerequisites and Setup

Use a Microsoft account with access to an appropriate Copilot Studio and Power Platform experiment environment. Individual labs may additionally require Microsoft 365 services, connector connections, premium licensing, an Azure AI Search deployment, or an approved external service. Follow each manual's prerequisite and permission checks; access to one service does not guarantee access to the whole workflow.

For browser reproduction, use Microsoft Edge and the supplied Playwright scripts where available. For local examples, follow the commands and dependency manifests in the relevant lab; there is no single root installation command. Local data and sample outputs are teaching fixtures unless explicitly identified as actual execution results.

Read the English `README.md` or Chinese `README.zh.md` in each lab and follow **Step One, Step Two, ...** in order. Both versions share the same screenshots and attachments. Chinese UI screenshots, agent prompts, test phrases, and sample data remain in their original language where required for reproducibility; translating the manual does not change the deployed agents or runtime assets.

## Verified Outcomes and Remaining Work

**Latest rerun: 2026-10-13, Playwright + Microsoft Edge.** All five existing lab agents were exercised; available Prompt, conversation, attachment and cloud-flow steps were actually called. Only existing Workshop/Lab resources were authorized. Missing integrations and failed prerequisites were recorded, not replaced by new resources or simulated successes. Each bilingual manual now places dated screenshots and execution-record links beside the relevant steps; older screenshots remain historical.

| Lab | Actual evidence obtained | Remaining or blocked work |
|---|---|---|
| 01 | Actual Excel read succeeded; corrected cloud Prompt and normal/zero-period/help/refusal conversations were retested. Final schedule Off. | Run script failed with HTTP 404 / Operation not found; missing-input machine protocol failed; no flow-to-agent, cloud Word, Outlook draft, or PPT execution. |
| 02 | Three separate new minimal-flow runs delivered cards and returned approve/self, reject/reason, and assign/backup; all Succeeded. | Static sample ID/times were reused for display only. Queue, authorization worker, real Planner assignment, reminders, and Teams-agent end-to-end submission remain undeployed/unverified. |
| 03 | Direct coupon question reports unavailable MCP without entering simulation; five independent numeric simulation cases and two transaction-boundary questions executed. | No MCP tools are bound, so no tools/list or real coupon call occurred. DLP error is historical, not a newly tested policy result. Teams and notifications remain cancelled. |
| 04-01 | Ready knowledge and a cited native AGW-401 answer confirmed; cloud three-query Prompt and local preparation rerun. | Actual log attachment still requested SanitizedLog; text retry reported invalid property. Controlled Azure search, ServiceNow and Teams status were not executed. |
| 04-02 | Ready policy and cited 30-day answer confirmed; cloud three-query Prompt, actual contract attachment and complete-text fallback executed. | Attachment extraction failed; fallback used translated quotes and lacked chunkId/URL, so strict audit acceptance failed. No controlled Azure retrieval or online Excel report. Historical offline workbook retained. |

The detailed execution records in each manual take precedence over this overview. A local check, a saved configuration, or an official documentation screenshot does not prove a deployed end-to-end workflow.

## Safety and Operating Boundaries

Use fictional business data and isolated test resources. Do not post experiments to business teams or send real emails without the required authorization. Keep credentials, personal coupon codes, payment information, and sensitive account data out of documentation, screenshots, code, and logs.

This rerun reused existing resources only: no business channels, real emails, coupon claims, orders or payments. The actual card responses were sent only to the dedicated lab channel. Failed prerequisites stop dependent writes; a Prompt test, native knowledge answer or offline fixture is never recorded as a complete workflow.

Treat global instructions as behavioral guidance, not access control. Enforce tool allowlists, trusted permissions, and server-side filters where applicable. Do not bypass DLP restrictions by changing environments, connector names, domains, or proxies; request administrator approval. McDonald's real ordering and coupon-claim tools are not simulation APIs.

## Folder Layout

```text
README.md             English workshop overview
README.zh.md          Chinese workshop overview
lab-01/               Sales reporting and office automation
lab-02/               Adaptive Cards and task review
lab-03/               MCP connectivity and optional simulation
lab-04-01/            IT Helpdesk and retrieval optimization
lab-04-02/            Contract compliance and audit reporting
```

Each lab contains `README.md` and `README.zh.md`, plus its own supporting assets. Open the Markdown files directly; no workshop website is required.

## GitHub Pages

Browse the [English website](https://kinfey.github.io/copilot_studio_hol/) or [Chinese website](https://kinfey.github.io/copilot_studio_hol/index.zh.html). The site provides the workshop introduction and all five labs as bilingual HTML pages, with lab navigation, a page contents list, screenshots, and downloadable attachments.

The documentation layout follows [Let's Learn Microsoft KARS](https://kinfey.github.io/LetsLearnMicrosoftKars/): a fixed header, lab sidebar, central article, and right-hand contents list. It also provides document search, a color-theme toggle, mobile navigation, and previous/next lab links.

Each lab page offers Markdown and PDF downloads at the top and bottom. English pages download `README.pdf`; Chinese pages download `README.zh.pdf`. Update these PDF snapshots alongside the manuals when their content changes.

The Markdown manuals are the source of truth. A push to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml) to build and deploy the site; do not edit generated HTML directly.

To generate the same site locally with Node.js 22 or later:

```bash
npm ci
npm run build
npm test
```

The generated files are in `_site/` (not committed). The build uses [scripts/build-site.mjs](scripts/build-site.mjs) and [scripts/site.css](scripts/site.css); no browser-side Markdown fetching or external frontend dependencies are required.
