# Copilot Studio Hands-on Workshop

[English](README.md) | [简体中文](README.zh.md)

A step-by-step workshop for building business agents with Microsoft Copilot Studio, Power Automate, Microsoft 365 connectors, MCP, and retrieval-augmented generation (RAG). The four lab tracks contain five manuals: Lab 04 is split into two enterprise scenarios.

Each lab provides a Markdown manual, screenshots of key steps, and supporting prompts, configuration examples, code, or teaching data. Browser evidence was captured with **Playwright and Microsoft Edge**. Real product screenshots, official documentation screenshots, and simulated fixtures are distinguished within the manuals; none should be mistaken for proof that an unfinished integration works.

Screenshots retain the product steps and execution evidence. A comprehensive screenshot privacy review was not completed before publication.

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

| Lab | Actual evidence obtained | Remaining or blocked work |
|---|---|---|
| 01 | Sales-reporting agent published; part of the scheduled Excel path configured. | The full Word and Outlook workflow has not been accepted end to end. |
| 02 | Agent instructions, prompt, and topic saved; a card posted to a private test team, approval returned structured fields, and the minimal test flow succeeded. | Planner task creation, production worker, reminders, and publishing the agent to Teams are not complete. |
| 03 | Connector definition exists; a direct coupon question correctly reports the missing connection; the optional internal simulation returned CNY 18 for the teaching meal. | MCP is not bound to the agent. Earlier personal connection creation was blocked by DLP; no real coupons were retrieved. Teams and daily notifications are cancelled. |
| 04-01 | Agent and ready knowledge created; a query-rewrite prompt produced three questions; local preparation and retrieval-request examples saved. | Azure retrieval, ServiceNow ticket creation, and the Teams status workflow have not been verified end to end. |
| 04-02 | Agent and ready knowledge created; three-question prompt output saved; an offline, manually annotated Excel audit fixture includes source citations. | Actual SharePoint metadata configuration and online automated audit generation have not been verified end to end. |

The detailed execution records in each manual take precedence over this overview. A local check, a saved configuration, or an official documentation screenshot does not prove a deployed end-to-end workflow.

## Safety and Operating Boundaries

Use fictional business data and isolated test resources. Do not post experiments to business teams or send real emails without the required authorization. Keep credentials, personal coupon codes, payment information, and sensitive account data out of documentation, screenshots, code, and logs.

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

The Markdown manuals are the source of truth. A push to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml) to build and deploy the site; do not edit generated HTML directly.

To generate the same site locally with Node.js 22 or later:

```bash
npm ci
npm run build
npm test
```

The generated files are in `_site/` (not committed). The build uses [scripts/build-site.mjs](scripts/build-site.mjs) and [scripts/site.css](scripts/site.css); no browser-side Markdown fetching or external frontend dependencies are required.
