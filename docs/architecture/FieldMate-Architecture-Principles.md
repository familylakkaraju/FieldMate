# FieldMate Architecture Principles

**Status:** Approved, version 1.1 (2026-10-11)\
**Applies to:** all of FieldMate, every vertical (V00–V38 and beyond) and every delivery slice\
**Authority:** this document is the single source of truth for project-wide architecture principles. If a vertical
CR, a README or any other document disagrees with it, this document wins until an approved ADR says otherwise.

> **FieldMate should feel simple even when the underlying business is complex.**
> Use the simplest safe architecture that meets the requirement. Prefer zero-cost and no-idle-cost capability.
> Keep the platform generic. Keep providers replaceable where practical. Keep telemetry minimal. Keep tenant
> boundaries explicit. Keep navigation, screens and controls easy to understand. Do not expose technical
> complexity to the user unless absolutely necessary.

---

## Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [How to use this document](#3-how-to-use-this-document)
4. [Governance hierarchy](#4-governance-hierarchy)
5. [Principle lifecycle](#5-principle-lifecycle)
6. [Deviation and exception process](#6-deviation-and-exception-process)
7. [Architecture review checklist](#7-architecture-review-checklist)
8. [Principle index](#8-principle-index)
9. [Principles](#9-principles): [A Simplicity](#a-simplicity) · [B Cost](#b-cost) · [C Performance and communication](#c-performance-and-communication) · [D Product and domain](#d-product-and-domain) · [E Data](#e-data) · [F Identity and access](#f-identity-and-access) · [G AI and voice](#g-ai-and-voice) · [H Portability and clients](#h-portability-and-clients) · [I Delivery and structure](#i-delivery-and-structure) · [J Observability](#j-observability) · [K Security](#k-security)
10. [Architecture decision records](#10-architecture-decision-records)
11. [Provenance](#11-provenance)

---

## 1. Purpose

FieldMate is a generic work-management platform delivered as many vertical slices over a long period. Without
shared rules, each slice would make its own trade-offs and the platform would drift: more services, more cost,
more screens and more provider lock-in than anyone intended.

This document fixes the trade-offs once. Every CR, design and review uses the same principles, so that
decisions are consistent, cheap to make and easy to explain.

## 2. Scope

These principles apply to everything FieldMate builds and operates:

| Area | Examples |
|---|---|
| Experiences | Web, mobile, public website, office portal, worker app, customer portal, administration |
| Backend | APIs, application services, Access Core, background processing, integrations |
| AI and voice | Copilot, agents, model routing, speech-to-text, text-to-speech |
| Data | PostgreSQL schemas, files and evidence, configuration, search, retrieval |
| Platform | Identity, commercial and entitlements, configuration, observability, FinOps |
| Infrastructure | Cloud resources, IaC, CI/CD, environments |

They do **not** replace vertical requirements: CRs still define what a slice must do.

## 3. How to use this document

* **Writing a CR:**
  - Cite the principle IDs that matter to the slice (e.g. `FM-P15`, `FM-P18`). Do not copy their text.
  - State the slice's cost review (`FM-P02`).
  - Justify any new technology (`FM-P34`).
* **Designing or implementing:** run the [review checklist](#7-architecture-review-checklist) before adding a service, screen, datastore, queue or paid resource.
* **Reviewing:** reject work that violates a principle without an approved ADR (see [§6](#6-deviation-and-exception-process)).
* **Changing a principle:** see [§5](#5-principle-lifecycle). Principles are long-lived and change deliberately, not as a side effect of a vertical.

Principle IDs are stable. Code comments, CRs and ADRs may cite them (e.g. `// FM-P18: no orphan users`).

## 4. Governance hierarchy

```text
PROJECT ARCHITECTURE PRINCIPLES      docs/architecture/FieldMate-Architecture-Principles.md
        │   long-lived rules for every vertical
        ▼
ARCHITECTURE DECISION RECORDS        docs/architecture/adr/ADR-NNN-*.md
        │   specific approved decisions that apply (or, exceptionally, deviate from) the principles
        ▼
VERTICAL CRs                         docs/vNN/CR-*.md
        │   scope and requirements for one slice; cite principles and ADRs, never restate them
        ▼
IMPLEMENTATION                       backend/, infra/, demo/, …
        │   must satisfy the CR, its ADRs and the principles
        ▼
VERTICAL IMPLEMENTATION REPORTS      docs/vNN/*-Report.md
            what was actually built and validated, deviations and the ADRs behind them
```

| Layer | Owns | Changes when | Must not |
|---|---|---|---|
| Principles | Project-wide rules | Rarely, through an ADR | Contain vertical-specific design |
| ADRs | One decision each: context, choice, alternatives, cost, consequences | A decision is made or superseded | Restate principles |
| Vertical CRs | What a slice delivers and how it is accepted | The slice is planned or amended | Own or redefine project-wide principles |
| Implementation | Working software and infrastructure | Continuously | Deviate silently |
| Reports | Evidence: what exists, what was tested, what is still unproven | The slice is delivered | Claim anything not actually validated |

Reference artefacts shared by all layers: the Master Screen Architecture X-Ray
(`docs/FieldMate_Master_Screen_Architecture_XRay_FINAL.xlsx`), which maps screens to APIs, handlers and storage,
and the architecture diagram in the repository root.

## 5. Principle lifecycle

```text
Proposed ──► Approved ──► (Amended) ──► Superseded / Retired
```

* **Proposed:** raised in an ADR describing the problem, the proposed rule and its cost.
* **Approved:** added here with a new stable ID once the ADR is accepted. The document version and date are updated.
* **Amended:** wording or scope changes through an ADR. The ID is kept and the change is noted in the version history.
* **Superseded or Retired:** the entry stays, marked with the ADR that replaced it. IDs are never reused.

Version history:

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-11 | Consolidated from the README principles, the Stage-1 prototype plan, the X-Ray legend, CR-FM-V00 (AP-01…AP-20), the V00 no-orphan-users addendum, and the zero-cost and parking directives |
| 1.1 | 2026-10-11 | FM-P14 amended (ADR-009): first-class business and configuration data stored as typed relational, directly queryable records; no aggregate JSON documents; JSONB only for justified opaque/leaf fragments |

## 6. Deviation and exception process

A CR may need to depart from a principle. That is allowed, but **never silently**:

1. **Identify** the principle by ID and quote the rule being departed from.
2. **Explain** why the requirement cannot be met within the principle, and which alternatives were tried.
3. **Record** the decision in an ADR: context, decision, alternatives, consequences, cost and portability impact.
4. **Obtain approval** from the architecture owner before implementation starts.
5. **Capture** consequences and cost in the CR, and the deviation in the vertical report.
6. **Only then** implement.

Deviations discovered after the fact are treated as defects. They are either corrected, or approved
retrospectively through steps 1–5 and recorded in the report.

## 7. Architecture review checklist

Use this list in CR planning, design review and code review. A "no" or "don't know" needs an answer before
proceeding.

**Simplicity (FM-P01)**
- [ ] Is this the simplest safe design? Could an existing screen, endpoint, service or table do it?
- [ ] For UI: is it necessary, can it be inferred, automated or hidden until needed, and would a first-time user understand it?

**Cost (FM-P02–P06)**
- [ ] Have runtime, idle, storage, logging, AI/token and operational cost been estimated?
- [ ] Was a free or lower-cost alternative considered (e.g. Parameter Store before Secrets Manager)?
- [ ] Does anything charge while idle? If so, how is it parked or stopped automatically outside production?

**Platform shape (FM-P07–P13, P29–P34)**
- [ ] No new service, datastore, cache, queue, protocol or runtime without measured need and an FM-P34 justification?
- [ ] Synchronous and in-process unless asynchronous processing genuinely adds value?
- [ ] Generic: no trade-specific models, pages or conditionals; behaviour from configuration?

**Data, identity and access (FM-P14–P22)**
- [ ] First-class data stored as typed relational records (no whole-organisation/configuration JSON documents, no catch-all JSONB; any JSONB fragment justified)?
- [ ] Tenant-owned data carries `organisation_id`; organisation context validated server-side?
- [ ] Identity, user, membership and worker kept separate; no user persisted without an organisation relationship?
- [ ] Every protected operation goes through Access Core?

**AI, portability and contracts (FM-P23–P28)**
- [ ] AI mutations go through application services and Access Core?
- [ ] Provider specifics isolated behind a narrow boundary where replacement is realistic?
- [ ] Contracts changed additively, or breaking changes documented and migrated?

**Observability and security (FM-P35–P40)**
- [ ] One structured record per operation with `organisationId` and `correlationId`; no payloads, tokens or secrets; explicit retention?
- [ ] Least privilege, no secrets in source, parameterised SQL?

## 8. Principle index

| ID | Principle | Group |
|---|---|---|
| [FM-P01](#fm-p01--keep-it-simple) | Keep it simple | Simplicity |
| [FM-P02](#fm-p02--zero-cost-first) | Zero-cost-first | Cost |
| [FM-P03](#fm-p03--free-alternative-first) | Free alternative first | Cost |
| [FM-P04](#fm-p04--no-unnecessary-idle-non-production-cost) | No unnecessary idle non-production cost | Cost |
| [FM-P05](#fm-p05--environment-aware-architecture) | Environment-aware architecture | Cost |
| [FM-P06](#fm-p06--cost-is-part-of-capability-routing) | Cost is part of capability routing | Cost |
| [FM-P07](#fm-p07--high-performance-through-simplicity) | High performance through simplicity | Performance |
| [FM-P08](#fm-p08--fast-path-before-agent-path) | Fast path before agent path | Performance |
| [FM-P09](#fm-p09--latency-by-design-for-real-time-interaction) | Latency by design for real-time interaction | Performance |
| [FM-P10](#fm-p10--asynchronous-only-where-it-adds-value) | Asynchronous only where it adds value | Performance |
| [FM-P11](#fm-p11--standards-first-communication) | Standards-first communication | Performance |
| [FM-P12](#fm-p12--generic-platform) | Generic platform | Product |
| [FM-P13](#fm-p13--convention-over-configuration) | Convention over configuration | Product |
| [FM-P14](#fm-p14--postgresql-first-relational-for-first-class-data) | PostgreSQL-first, relational for first-class data | Data |
| [FM-P15](#fm-p15--organisation-is-the-tenant-boundary) | Organisation is the tenant boundary | Data |
| [FM-P16](#fm-p16--files-are-object-storage-plus-business-metadata) | Files are object storage plus business metadata | Data |
| [FM-P17](#fm-p17--identity-user-membership-and-worker-are-separate) | Identity, user, membership and worker are separate | Identity |
| [FM-P18](#fm-p18--no-orphan-fieldmate-users) | No orphan FieldMate users | Identity |
| [FM-P19](#fm-p19--provider-neutral-application-identity) | Provider-neutral application identity | Identity |
| [FM-P20](#fm-p20--fieldmate-does-not-own-passwords) | FieldMate does not own passwords | Identity |
| [FM-P21](#fm-p21--access-core-is-central) | Access Core is central | Access |
| [FM-P22](#fm-p22--provider-independent-commercial-model) | Provider-independent commercial model | Access |
| [FM-P23](#fm-p23--controlled-application-services-execute-mutations) | Controlled application services execute mutations | AI |
| [FM-P24](#fm-p24--voice-is-a-distributed-capability) | Voice is a distributed capability | AI |
| [FM-P25](#fm-p25--provider-portability) | Provider portability | Portability |
| [FM-P26](#fm-p26--clients-do-not-couple-to-cloud-providers) | Clients do not couple to cloud providers | Portability |
| [FM-P27](#fm-p27--backend-abstraction-at-the-client) | Backend abstraction at the client | Portability |
| [FM-P28](#fm-p28--contract-stability) | Contract stability | Portability |
| [FM-P29](#fm-p29--modular-monolith-before-microservices) | Modular monolith before microservices | Delivery |
| [FM-P30](#fm-p30--capability-first-delivery) | Capability-first delivery | Delivery |
| [FM-P31](#fm-p31--progressive-backend-activation) | Progressive backend activation | Delivery |
| [FM-P32](#fm-p32--prototype-to-production-continuity) | Prototype-to-production continuity | Delivery |
| [FM-P33](#fm-p33--infrastructure-as-code) | Infrastructure as Code | Delivery |
| [FM-P34](#fm-p34--new-technology-requires-justification) | New technology requires justification | Delivery |
| [FM-P35](#fm-p35--minimal-observability) | Minimal observability | Observability |
| [FM-P36](#fm-p36--organisation-level-traceability) | Organisation-level traceability | Observability |
| [FM-P37](#fm-p37--explicit-retention-and-cleanup) | Explicit retention and cleanup | Observability |
| [FM-P38](#fm-p38--no-duplicate-telemetry) | No duplicate telemetry | Observability |
| [FM-P39](#fm-p39--business-history-is-not-operational-logging) | Business history is not operational logging | Observability |
| [FM-P40](#fm-p40--security-is-explicit-and-proportionate) | Security is explicit and proportionate | Security |

---

## 9. Principles

### A. Simplicity

#### FM-P01 — Keep it simple

**Rule.** FieldMate must be simple to understand, navigate, learn, operate and maintain. *Complexity belongs
inside the platform, not in front of the user.* This applies to both the user experience and the engineering.

**Why it matters.** FieldMate's users are busy people doing physical work, often on a phone, sometimes wearing
gloves. Every extra screen, control or concept costs them time and trust. For the team, every extra layer,
service or abstraction costs build time, running cost and the ability to change course.

**Required behaviour — user experience**
- Minimise cognitive load. Give each screen one clear primary purpose, and keep the most common action obvious.
- Use progressive disclosure: advanced options stay available but are hidden until needed.
- Keep navigation shallow and predictable. Avoid deep menus and unnecessary screen hopping.
- Group related actions. Keep common actions in consistent places across web and mobile.
- Don't create a new screen when the action naturally belongs in an existing context.
- Use simple, familiar business language, not technical language. Keep interaction models consistent even when organisation terminology changes.
- Prefer sensible defaults. Never force configuration before the user can start.
- Minimise steps and clicks. Avoid unnecessary confirmations and duplicate data entry.
- Use familiar control patterns, consistent across web and mobile.
- AI should make the experience simpler, never expose internal complexity.
- A first-time user should understand important flows without training. Prefer contextual help to manuals.

**Required behaviour — engineering**
- Use the simplest implementation that safely satisfies the requirement.
- Add a layer, abstraction, service or distributed component only with explicit justification.

**Avoid.**
- Cluttered dashboards, or unrelated controls on one screen.
- Wizards for things that could be inferred.
- Configuration screens nobody needs on day one.
- Speculative services, premature distribution, abstractions for elegance alone.

**Review questions** (before adding a screen, menu, control, wizard, configuration option or component):
1. Is it really necessary?
2. Can an existing screen or component handle it?
3. Can it be inferred or automated?
4. Can it be hidden until needed?
5. Can it be done with fewer steps?
6. Does it increase learning complexity?
7. Would a first-time user understand it?

### B. Cost

#### FM-P02 — Zero-cost-first

**Rule.** Prefer zero-cost or effectively-zero-cost capability first. Cost is an architecture quality attribute,
not an afterthought.

**Order of preference.**
1. Local, device or client capability where it is safe.
2. A deterministic implementation.
3. An existing shared capability.
4. Free-tier or no-idle-cost serverless capability.
5. A new paid managed service, only with clear justification.

**Why it matters.** FieldMate must be affordable for small businesses and sustainable to operate. Cost compounds
across tenants, environments and years.

**Required behaviour.** Every CR reviews:
- expected runtime cost;
- idle cost;
- storage cost;
- logging cost;
- AI/token cost;
- operational cost;
- free and lower-cost alternatives.

**Avoid.** Choosing a paid service because it is more convenient or "enterprise standard".

#### FM-P03 — Free alternative first

**Rule.** Before adding a paid cloud service, explicitly determine whether a safe, suitable free alternative
exists. If it does, use it.

**Why it matters.** Many paid services duplicate capabilities available at no cost. Small charges multiplied
across environments become a permanent tax.

**Required behaviour.**
- Use **AWS Systems Manager Parameter Store** (standard tier, `SecureString` with the AWS-managed key) for secrets and configuration wherever it meets the requirement. Use Secrets Manager only when a requirement needs something Parameter Store cannot provide, such as compliance-mandated managed rotation.
- Paid services remain valid where the capability justifies the cost. The justification is recorded in the CR or an ADR.

Established substitutions:

| Paid or idle-cost choice | Zero-cost alternative used |
|---|---|
| Secrets Manager | SSM Parameter Store `SecureString` (standard tier) |
| Stored application database password | RDS IAM authentication tokens |
| NAT Gateway / VPC interface endpoints | Designs that need no egress (gateway-verified JWT, IAM DB auth) |
| Lambda authorizer | API Gateway built-in JWT authorizer |
| DynamoDB Terraform lock table | S3-native Terraform state locking |
| CloudWatch dashboards | Saved Logs Insights queries |
| KMS customer-managed keys | AWS-managed keys |
| SMS MFA | TOTP and passkeys |
| Always-on dev database | Stopped or parked database, restored on demand |

**Review question.** What is the free alternative, and why is it not enough?

#### FM-P04 — No unnecessary idle non-production cost

**Rule.** Paid development and test infrastructure must not run when nobody is using it. **Default: no paid idle
resource.**

**Why it matters.** Non-production environments sit idle most of the time. An always-on database, proxy or NAT
Gateway in dev can cost more than the production workload it supports.

**Required behaviour.**
- Stop, park (snapshot then delete), destroy, and recreate on demand, whichever is practical for the resource.
- Automate it. A resource with an hourly or idle charge gets automated stop and park from the day it is introduced, and a scheduled safety net catches anything left running.
- Keep pay-per-use services with no idle charge (Lambda, API Gateway, Cognito within its free tier, Parameter Store) deployed. Recreating them adds churn, e.g. a recreated identity provider changes its token issuer.
- Production availability is decided separately and justified explicitly. Parking rules never apply to production by default.

**Avoid.**
- RDS Proxy in dev merely for parity.
- NAT Gateways where a design can avoid egress.
- Test infrastructure left behind after the test.

#### FM-P05 — Environment-aware architecture

**Rule.** Environments share one *logical* architecture but need not share identical *physical* infrastructure,
when identical infrastructure would add cost without value.

**Why it matters.** Production parity is valuable for behaviour, not for paying for production-grade
availability in every environment.

**Required behaviour.**
- Make cost-bearing infrastructure a per-environment setting. Examples: proxy in production only, smaller dev database, shorter dev log retention, lower or no trace sampling, parked dev database.
- Application code must not depend on environment-specific infrastructure. For example, the same connection logic works with or without RDS Proxy.

#### FM-P06 — Cost is part of capability routing

**Rule.** Wherever FieldMate dynamically chooses how to execute a capability (LLM, STT, TTS, vision, embeddings,
retrieval, external APIs), it chooses the **cheapest path that meets the required quality, latency, privacy and
reliability**.

**Why it matters.** AI and media capabilities dominate variable cost. Routing every request to the most capable
option makes margins collapse.

**Required behaviour.** Route in this order:
1. Device or local capability.
2. Deterministic code.
3. A cached or previously computed result.
4. An existing no-cost capability.
5. A small, low-cost model or service.
6. A premium model or service, only when required.

Routers consider required quality, latency, device capability, network, privacy, provider availability,
incremental cost and the plan's usage budget.

**Avoid.** Sending every operation to a large reasoning model. Using an LLM as calculator, database or workflow engine.

### C. Performance and communication

#### FM-P07 — High performance through simplicity

**Rule.** Performance comes primarily from simple synchronous paths, minimal network hops, efficient SQL,
appropriate indexes, bounded payloads, direct access patterns, efficient connection handling and
measurement-driven optimisation.

**Why it matters.** Every added component adds latency, failure modes and cost. Most performance problems are
solved by a better query or index, not a new service.

**Avoid.** Redis or other caches, OpenSearch, Kafka/MSK, extra queues, Step Functions or microservices
**without measured evidence** that they are needed.

#### FM-P08 — Fast path before agent path

**Rule.** Deterministic operations take the shortest path: client → API → Access Core → application service →
database. Only conversational or ambiguous requests use the agent path.

**Why it matters.** "Complete task" or "load job" must be instant and cost nothing in model usage.

**Avoid.** Invoking an agent or LLM for actions a button, form or deterministic rule can perform.

#### FM-P09 — Latency by design for real-time interaction

**Rule.** Conversational and voice paths minimise sequential network hops. They stream results, run independent
work in parallel and prefer device processing.

**Required behaviour.**
- Call co-located tools in-process instead of through extra network hops. MCP-compatible tools may be exposed externally while keeping a fast internal path.
- Use direct object-storage uploads.
- Telemetry, cost aggregation, analytics and notifications never block the user's response.

**Avoid.** Agent → network MCP hop → API Gateway → domain API, when the same tool can run in-process safely.

#### FM-P10 — Asynchronous only where it adds value

**Rule.** Use asynchronous processing where it provides real value:
- retries;
- external callbacks;
- long-running work;
- notifications;
- resilience;
- eventual workflows.

**Avoid.** Queues or events around simple synchronous CRUD just because distributed architecture looks more
sophisticated.

#### FM-P11 — Standards-first communication

**Rule.** Default protocols:

| Need | Default |
|---|---|
| Normal APIs | HTTPS / HTTP/2 REST with JSON |
| One-direction AI streaming | Server-Sent Events (SSE) |
| True duplex real-time (voice, control) | WebSockets (WSS) |
| File bytes | Signed HTTPS upload/download direct to object storage |
| Co-located components | In-process calls |
| Separately deployed services | gRPC only once services are actually split |
| Asynchronous work | Events or queues, only where FM-P10 applies |

**Avoid.** Proprietary or exotic protocols where a standard one works.

### D. Product and domain

#### FM-P12 — Generic platform

**Rule.** FieldMate is a generic field-service and work-management platform. One platform supports many domains
through configuration, never through trade-specific code.

**Why it matters.** The business case depends on onboarding any trade without forking the product.

**Required behaviour.**
- Use canonical concepts: Organisation, Customer, Work Request, Job/Project, Task, Stage, Worker, Appointment, Evidence, Quote, Invoice, Payment.
- Get trade variation from service definitions, archetypes (reusable *work patterns* such as reactive, scheduled, recurring, quote-to-project, inspection, installation, maintenance, route/round), terminology, workflow definitions and organisation overrides.
- No tenant-specific source forks.

**Avoid.**
- Models such as `PlumbingJob`, `ElectricalTask`, `RoofingWorkflow`.
- Organisation-specific pages.
- Conditionals such as `if (organisation === "…")`.

#### FM-P13 — Convention over configuration

**Rule.** Provide strong, sensible defaults so that most behaviour comes from platform and archetype defaults,
less from organisation configuration, and rarely from extensions.

**Required behaviour.**
- Layer configuration: **platform defaults → archetype → organisation → service → user preference**.
- Store differences (overrides), not duplicated full configurations.
- Resolve **one effective configuration** that every surface uses: website, office, worker, customer portal and AI context.
- Configure progressively: ask only what is needed now. AI may *propose* configuration; the approved structured configuration is the runtime authority.

**Avoid.** Forcing users to configure everything before they can start.

### E. Data

#### FM-P14 — PostgreSQL-first, relational for first-class data

**Rule.** PostgreSQL is the default structured system of record: standard **Amazon RDS for PostgreSQL** (not
Aurora). No DynamoDB initially. **First-class FieldMate business and configuration data must be stored as typed
relational, directly queryable records.** It is never stored as one aggregate JSON document per organisation,
per configuration or per entity (ADR-009).

**Why it matters.** Records can be filtered, joined, reported on, indexed, constrained and migrated. An aggregate
JSON document hides the data from SQL and from the database's integrity checks, and moves validation into
application code.

**Required behaviour.**
- Model relationally: PK/FK constraints, tenant-consistent keys, transactions, B-tree indexes.
- First-class data covers the organisation profile, every configuration concept (services, terminology, branding, forms with their fields and options, workflows, pricing, booking rules, dashboard and website content) and all business entities. Each is stored as its own typed rows and tables.
- Layered configuration (FM-P13: platform → archetype → organisation → service → user) is resolved in production from typed configuration and override records, never from whole-document JSON merge persistence.
- **JSONB is an exception, not a general configuration mechanism.** Use it only for a bounded opaque or leaf fragment that:
  - is not an entity's aggregate canonical representation;
  - needs no FieldMate relational integrity;
  - is not normally filtered, joined or referenced;
  - is justified in the CR;
  - can be promoted to relational schema by migration later.

  Examples: raw third-party webhook payloads; provider-specific opaque metadata. Form field options are **not** an example: they are first-class data (`form_field`, `form_field_option`).
- Use PostgreSQL full-text search before OpenSearch.
- Use pgvector in the same database when retrieval is justified, before any separate vector store.
- Change schemas through versioned migrations.
- JSON remains the API transport format and the prototype's in-browser persistence. Production persistence is independent of transport shape (FM-P32).

**Avoid.**
- Whole-organisation or whole-configuration JSON/JSONB documents.
- Business entities whose canonical persistence is one JSONB blob.
- Catch-all `settings`, `data` or `configuration` JSONB columns.
- Adding any other datastore without a measured requirement and an ADR (FM-P34).

**Review question.** Can "which organisations use X" or "list every Y in this organisation" be answered with a direct SQL query?

#### FM-P15 — Organisation is the tenant boundary

**Rule.** `organisation_id` is the primary tenant boundary. Tenant-scoped records carry it unless genuinely
platform-global.

**Required behaviour.**
- Never trust a client-supplied organisation. Validate the authenticated user's active membership server-side before establishing tenant context.
- Lead tenant query indexes with `organisation_id`.
- Use tenant-consistent foreign keys where relationships must stay within one organisation.
- Enforce isolation consistently: in queries, in Access Core and in the database where practical.

**Avoid.** Reading the tenant from a request field and using it without validation.

#### FM-P16 — Files are object storage plus business metadata

**Rule.** File bytes live in object storage. Metadata and associations (organisation, owner, type, checksum,
entity links, visibility) live in PostgreSQL.

**Required behaviour.**
- Upload and download directly between client and object storage, using short-lived signed URLs.
- Use generic associations: file, entity type, entity ID, optional stage, category.

**Avoid.** Streaming file bytes through the API. Storing files in the database.

### F. Identity and access

#### FM-P17 — Identity, user, membership and worker are separate

**Rule.** Four distinct concepts:

| Concept | Meaning |
|---|---|
| Authentication identity | How someone signs in: an issuer + subject at an identity provider |
| User | The canonical FieldMate person or account |
| Membership | A user's relationship with one organisation, with a role |
| Worker | An optional operational profile within an organisation |

One user may hold several identities and belong to several organisations with different roles.

**Avoid.** Collapsing these concepts, or storing organisation, role or worker data in the identity provider.

#### FM-P18 — No orphan FieldMate users

**Rule.** A persistent FieldMate application user never exists without at least one organisation relationship.
**Successful authentication alone never persists a user.**

**Required behaviour.**
- An unknown authenticated identity is held only in the identity provider until the person creates an organisation or accepts a valid invitation.
- Create user, authentication identity, organisation (where applicable) and membership **atomically**. Failures roll back completely.
- Make these flows idempotent and safe under concurrency.
- Deny tenant access to a user with no valid membership.
- Enforce the invariant in the database where practical.

**Avoid.** Auto-provisioning users on first login. Keeping junk users in PostgreSQL.

#### FM-P19 — Provider-neutral application identity

**Rule.** No provider-specific ID (e.g. `cognito_sub`) is the permanent FieldMate identity. The canonical user is
FieldMate's own; providers are mapped by **issuer + subject**.

**Required behaviour.**
- Keep a canonical user table plus a provider-mapping table, unique on (issuer, subject).
- Keep provider-specific token handling behind a narrow adapter.
- Link accounts only deliberately, with proof of control of both identities or an approved administrative process. **Never merge users because emails match.**

**Why it matters.** The identity provider can then be replaced without rewriting business relationships.

#### FM-P20 — FieldMate does not own passwords

**Rule.** FieldMate never stores passwords, password hashes or salts. Native credentials belong to the chosen
identity provider; federated credentials stay with the external provider.

**Required behaviour.** A future provider migration uses re-federation, password reset or just-in-time credential
migration. The canonical user ID never changes.

#### FM-P21 — Access Core is central

**Rule.** Authentication answers *who authenticated*. **Access Core** answers *may this actor perform this action
in this organisation on this resource* (and later, under this entitlement).

**Required behaviour.**
- Every protected operation passes through Access Core, whether it comes from UI, API, background job or AI agent.
- Access Core evaluates trusted context: membership, role, permission, resource policy and, later, entitlement and usage limits.
- Access Core is independent of the authentication provider.

**Avoid.** Authorisation scattered through handlers. Decisions based on raw token claims.

#### FM-P22 — Provider-independent commercial model

**Rule.**
- Products, plans, offers, features and entitlements are FieldMate's own model.
- Payment and subscription providers (Google Play, web billing, Apple later, promotions, enterprise agreements) are mapped sources of entitlement.
- Application code asks whether a feature is available. It never asks which provider paid.

**Avoid.** Provider purchase tokens as user identity. Provider-specific subscription logic in features.

### G. AI and voice

#### FM-P23 — Controlled application services execute mutations

**Rule.** LLMs and agents may reason, recommend, prepare and orchestrate. **They never mutate persistence
directly.** Mutations go through tools, then Access Core, then application services, then validation, then
transaction boundaries.

**Required behaviour.**
- Treat tool contracts as the stable boundary. MCP is an integration protocol, not the business logic.
- Use the same Access Core rules whether an action comes from UI, API or AI.

**Avoid.** Direct LLM-to-database paths. AI as the system of record, calculator or workflow engine.

#### FM-P24 — Voice is a distributed capability

**Rule.** Voice combines three parts:
- a client voice runtime (capture, voice activity detection, device STT/TTS, playback, offline behaviour);
- an optional cloud voice gateway;
- speech providers.

Prefer device STT/TTS where quality suffices; cloud speech is the fallback or enhancement.

**Avoid.** Treating voice as a single backend service. Sending all audio to the cloud by default.

### H. Portability and clients

#### FM-P25 — Provider portability

**Rule.** AWS is the initial hosting platform, **not** the FieldMate domain architecture. Isolate provider-specific
code where replacement is realistic. Prefer standards: HTTPS, HTTP/2, REST, JSON, OAuth 2.0, OIDC, JWT, WebAuthn,
SQL and PostgreSQL.

**Required behaviour.**
- Put narrow adapters at genuine provider boundaries: identity, LLM, STT, TTS, object storage, event transport, subscription/payment, telemetry.
- Keep provider SDKs out of domain and application code.

**Avoid.** Abstractions created for theoretical purity where no realistic replacement exists.

#### FM-P26 — Clients do not couple to cloud providers

**Rule.** Web and mobile clients use FieldMate APIs and abstractions. AWS or other provider SDKs stay out of UI
code unless explicitly justified (e.g. a standard OIDC client library for sign-in).

#### FM-P27 — Backend abstraction at the client

**Rule.** UI code depends on stable FieldMate client interfaces (`CustomerClient`, `JobClient`, `TaskClient`,
`ScheduleClient`, `ConfigurationClient`, `CopilotClient`, …). Demo, local and production HTTP implementations sit
behind the same interface.

**Avoid.** Screens calling `fetch`, `localStorage` or provider SDKs directly.

#### FM-P28 — Contract stability

**Rule.** Avoid unnecessary breaking changes to APIs, events, schemas and configuration contracts. Prefer additive
evolution.

**Required behaviour.** When a contract must break:
1. Document why.
2. Update the X-Ray and architecture references.
3. Migrate consumers deliberately.
4. Version where needed.

### I. Delivery and structure

#### FM-P29 — Modular monolith before microservices

**Rule.** Logical boundaries are not deployment boundaries. Start with modular, shared deployments: one
synchronous API runtime with modules per capability.

**Required behaviour.** Split a deployment only when scale, security, runtime, isolation, ownership or
operational need justifies it, recorded in an ADR.

**Avoid.** One service or function per endpoint. Microservices per capability by default.

#### FM-P30 — Capability-first delivery

**Rule.** Build reusable platform capabilities (identity, Access Core, configuration, files, telemetry,
commercial, AI gateway) with product-independent contracts. Then expose them through business vertical slices.

**Required behaviour.** Build a capability when a real flow needs it, not ahead of need.

**Avoid.** Throwaway backend logic written only for one screen.

#### FM-P31 — Progressive backend activation

**Rule.** Replace prototype behaviour one slice at a time, moving demo adapters to production adapters per
capability. Unfinished areas keep working.

**Avoid.** A big-bang backend switch-over.

#### FM-P32 — Prototype-to-production continuity

**Rule.** Prototype work is an evolutionary production UI, not a disposable mock-up. Keep stable:
- canonical domain concepts;
- client contracts;
- the configuration model;
- user journeys.

Production backends are built to satisfy those contracts.

#### FM-P33 — Infrastructure as Code

**Rule.** All infrastructure is reproducible from approved IaC (currently Terraform, see ADR-007).

**Required behaviour.**
- No undocumented console-only setup.
- One IaC framework, unless an ADR approves another.

#### FM-P34 — New technology requires justification

**Rule.** A CR that introduces a new AWS service, datastore, queue, cache, runtime, protocol, provider or major
library must state:
1. why it is required;
2. why existing capability is insufficient;
3. expected cost;
4. idle cost;
5. portability impact;
6. alternatives considered.

Significant introductions are recorded as ADRs.

### J. Observability

#### FM-P35 — Minimal observability

**Rule.** Collect only what is needed for failure diagnosis, important performance visibility, security, audit,
cost and traceability. **Do not "log everything".**

**Required behaviour.**
- One useful structured record per operation, plus targeted error detail. Use metrics where metrics suffice.
- Capture AI usage (model, tokens, latency, estimated cost) as structured usage records attributable to the organisation, not as logs of prompts and responses.

**Avoid.**
- Full request or response logging.
- Tokens, passwords, secrets or sensitive payloads in logs.
- Method entry/exit noise.
- Logs of successful health checks.

#### FM-P36 — Organisation-level traceability

**Rule.** Tenant-scoped activity is attributable through **structured fields** to:
- `organisationId`;
- `correlationId`;
- actor or user where relevant;
- resource where relevant;
- operation;
- error code;
- and later, cost and AI usage.

Pre-tenant operations use `organisationId = null` with scope `PLATFORM`.

**Avoid.** Tenant identifiers only inside free-text messages.

#### FM-P37 — Explicit retention and cleanup

**Rule.** Operational telemetry has explicit, short retention. Defaults:
- normal logs 7–14 days;
- errors around 30 days where useful;
- debug 1–3 days.

Business and audit history are separate and intentionally durable.

**Avoid.** Log groups with indefinite retention. Cleanup functions where managed retention exists.

#### FM-P38 — No duplicate telemetry

**Rule.** Do not record the same successful action independently in every layer (gateway, handler, service,
repository, database). Prefer one structured event, targeted errors, and metrics where metrics suffice.

#### FM-P39 — Business history is not operational logging

**Rule.** Business history, audit history and operational telemetry are separate concerns. Durable history is
stored intentionally as application data.

**Avoid.** Reconstructing business history from CloudWatch or any operational log store.

### K. Security

#### FM-P40 — Security is explicit and proportionate

**Rule.** Security is designed in, explicit and proportionate to the risk.

**Required behaviour.**
- Least-privilege IAM and database roles.
- Secrets in an approved store (FM-P03), never in source.
- Standards-based authentication.
- Policy-based authorisation through Access Core.
- Parameterised SQL only.
- Tenant isolation (FM-P15).
- Intentional audit of security-relevant actions.
- Anti-enumeration responses where useful.
- Known temporary weaknesses recorded openly in the vertical report.

**Avoid.** Expensive infrastructure added merely to appear secure, without a corresponding risk.

---

## 10. Architecture decision records

ADRs live in [`docs/architecture/adr/`](adr/README.md). Current decisions:

| ADR | Decision | Principles applied |
|---|---|---|
| [ADR-001](adr/ADR-001-postgresql-primary-structured-store.md) | Amazon RDS for PostgreSQL as primary structured store | FM-P14, P02, P07 |
| [ADR-002](adr/ADR-002-cognito-initial-identity-broker.md) | Amazon Cognito (one user pool) as initial identity broker | FM-P19, P20, P25 |
| [ADR-003](adr/ADR-003-shared-synchronous-api-lambda.md) | One shared synchronous API Lambda in private subnets without egress | FM-P29, P02, P07 |
| [ADR-004](adr/ADR-004-provider-neutral-fieldmate-identity.md) | Provider-neutral identity: issuer + subject, no orphan users | FM-P17–P20, P25 |
| [ADR-005](adr/ADR-005-minimal-observability.md) | One structured record per request, explicit retention | FM-P35–P39 |
| [ADR-006](adr/ADR-006-zero-idle-cost-non-production.md) | Zero-idle-cost non-production: stop and park | FM-P04, P05 |
| [ADR-007](adr/ADR-007-terraform-iac.md) | Terraform as the project IaC tool | FM-P33, P25 |
| [ADR-008](adr/ADR-008-parameter-store-for-secrets.md) | SSM Parameter Store for secrets and configuration | FM-P03, P02 |
| [ADR-009](adr/ADR-009-relational-records-not-json-documents.md) | First-class data as typed relational records, not JSON documents | FM-P14, P13, P15 |

## 11. Provenance

| Source | Principles derived |
|---|---|
| Repository README (product vision, original principles) | P06, P08, P09, P12, P16, P21–P25, P29, P30, P35 |
| Stage-1 prototype implementation plan (P1–P12) | P12, P13, P27, P31, P32 |
| Master Screen Architecture X-Ray legend | P11, P13, P14, P16, P29 |
| CR-FM-V00 Foundation (AP-01…AP-20) | P02, P04, P07, P12, P14, P15, P19–P21, P23, P25, P29, P33, P35–P39 |
| V00 addendum: no orphan FieldMate users | P17, P18 |
| Project directives (October 2026): keep it simple, zero cost, free alternatives, parking | P01–P05, P10, P11, P26, P28, P34, P40 |
