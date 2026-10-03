# FieldMate

## 1. Project Overview

FieldMate is an AI-powered work and task copilot intended initially for field workers and tradespeople, but architected as a generic domain-independent work-management platform.

The product should not be hard-coded specifically for plumbers, builders, electricians, cleaners, landscapers, engineers, or any other single profession.

Instead, FieldMate should understand the user's type of work during onboarding and early interactions, dynamically adapt its terminology and behaviour, and progressively personalise itself based on the user's ongoing work history.

The long-term vision is for FieldMate to assist a user throughout the complete work lifecycle:

```text
Customer / Work Request
        ↓
Understand Requirement
        ↓
Estimate / Quote
        ↓
Plan Job
        ↓
Break Work into Tasks
        ↓
Schedule / Assign
        ↓
Execute Work
        ↓
Capture Progress / Issues / Costs
        ↓
Complete Tasks
        ↓
Complete Job
        ↓
Invoice / Billing
        ↓
Payment / Closure
        ↓
Analyse Results
        ↓
Learn from Experience
        ↓
Improve Future Planning / Pricing / Execution
```

FieldMate should eventually behave less like a generic chatbot and more like an experienced work copilot that understands the user's business, work patterns, terminology, typical durations, costs, risks, problems, and preferred ways of working.

---

## Architecture Reference

The companion architecture diagram for this repository is:

**`FieldMate Platform Architecture Diagram.png`**

Treat this README and the architecture diagram together as the current high-level source of truth.

```text
README
  +
FieldMate Platform Architecture Diagram.png
  =
Current architectural context
```

Keep the diagram aligned with the principles, component boundaries, communication paths, technology candidates, and platform responsibilities described here.

---

# 2. Core Product Vision

FieldMate should help users:

- understand and organise incoming work;
- convert jobs or projects into manageable tasks;
- plan execution;
- interact naturally using text and voice;
- record work progress with minimal manual effort;
- record time, materials, costs, evidence, problems and changes;
- manage job completion;
- support quotation, invoicing and billing;
- recall relevant previous work;
- improve estimates and planning based on prior experience;
- identify recurring risks and inefficiencies;
- suggest operational improvements;
- eventually provide business-growth and optimisation guidance.

The product should remain simple and friendly enough for a worker to use while actively working.

The user should not have to behave like a project manager in order to use FieldMate.

---

# 3. Core Architectural Principles

These principles should guide all architecture and implementation decisions.

## 3.1 Provider-independent subscriptions

FieldMate must support multiple subscription mechanisms.

Initial priority:

```text
Google Play
+
Web Subscription
```

Apple native subscription can be introduced later.

The internal FieldMate user account must not depend on any specific payment provider.

Conceptually:

```text
FieldMate User
      │
      ▼
Entitlement
      │
 ┌────┼─────────────┐
 ▼    ▼             ▼
Google Play     Web Payment     Apple Later
```

The FieldMate `user_id` is owned by FieldMate.

Google Play purchase tokens, Stripe customer IDs, Apple transaction IDs, etc. are external payment identifiers mapped to FieldMate identities and entitlements.

A user who subscribes through Google Play should therefore be able to log into the FieldMate website with the same FieldMate account and receive the same entitlement.

---

## 3.2 Low cost and high performance

FieldMate must be designed around AI cost efficiency from the beginning.

Do not send every operation to a large reasoning model.

Use the cheapest appropriate mechanism.

Conceptually:

```text
DEVICE / LOCAL
- local UI
- local cache
- offline state
- device speech capabilities where appropriate
- simple processing

APPLICATION SERVICES
- task state
- workflow
- customer data
- billing
- calculations
- scheduling
- validation
- deterministic rules

AI SERVICES
- interpretation
- planning
- reasoning
- decomposition
- summarisation
- recommendations
- complex problem solving
```

The LLM must not become the application's database, task engine, subscription system, workflow engine or calculator.

The AI should reason and invoke well-defined application capabilities.

---

## 3.3 Generic domain model

FieldMate must remain domain-independent.

Avoid hard-coded platform concepts such as:

```text
PlumbingJob
ElectricalJob
BuildingTask
RoofingTask
```

Prefer generic concepts:

```text
Workspace
User
Customer
Job
Project
Task
Subtask
Step
Resource
Material
Person
Time
Cost
Evidence
Issue
Dependency
Appointment
Quote
Invoice
Payment
Outcome
Experience
```

Domain-specific language should come from personalisation.

Example:

A bathroom fitter may use:

```text
Job
Strip-out
First fix
Second fix
Tiling
Sanitary ware
Handover
```

A landscaper may naturally use different language.

The underlying platform should remain the same.

---

## 3.4 Reusable platform first

FieldMate is the first product built on reusable platform capabilities.

Common capabilities should be designed so future applications and solutions can reuse them without coupling them to the FieldMate business domain.

Reusable platform capabilities include:

```text
Identity & Access
Access Core / Policy Decision
Commercial / Subscription / Entitlement
AI / Agent Platform
Voice / Speech Gateway
Observability / Telemetry / FinOps
Files / Evidence
Configuration / Secrets / Feature Flags
Notifications / Background Processing
```

FieldMate-specific business capabilities remain isolated within the FieldMate functional domain.

```text
                 Reusable Platform
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    FieldMate      Future App A   Future App B
      Domain          Domain          Domain
```

Do not build an abstract platform ahead of product needs. Build reusable capabilities when a real FieldMate flow requires them, while keeping their contracts product-independent.

---

## 3.5 Zero-cost-first execution

FieldMate should always attempt to satisfy a capability using a zero-cost or already-available mechanism before invoking a metered cloud service or premium AI model.

Preferred execution order:

```text
1. Device / local capability
        ↓
2. Deterministic application code
        ↓
3. Cached / previously computed result
        ↓
4. Existing platform capability with no incremental cost
        ↓
5. Small / low-cost model or service
        ↓
6. Premium cloud model / service only when required
```

Examples:

```text
Speech-to-Text:
Device STT first → cloud STT fallback

Text-to-Speech:
Device TTS first → cloud TTS fallback

Reasoning:
Deterministic code first → small model → stronger reasoning model

Semantic retrieval:
PostgreSQL + pgvector first → separate vector platform only if justified

Caching:
Do not introduce Redis unless the requirement justifies it
```

Zero-cost-first does not mean sacrificing required quality, security, or usability. Select the **lowest-cost execution path that satisfies the requirement**.

---

## 3.6 Cost is part of routing

Cost must be an input into every dynamic capability-routing decision.

A model or capability router should consider:

```text
Required quality
Required latency
Device capability
Network availability
Privacy / data constraints
Current provider availability
Incremental cost
User / plan usage budget
```

The router should select the cheapest acceptable execution path.

This applies to:

```text
LLMs
Speech-to-Text
Text-to-Speech
Vision
Embeddings
Retrieval
Background processing
External APIs
```

---

## 3.7 Access Core is the centralized runtime policy authority

Authentication, commercial entitlement, and resource authorization are related but distinct.

FieldMate should use a centralized **Access Core / Policy Decision Layer** to answer:

> Can this authenticated user perform this action on this resource using this feature under the user's current entitlement?

```text
Identity / AuthN
      +
Authorization / Roles
      +
Workspace / Resource Policy
      +
Commercial Entitlements
      +
Usage / Feature Limits
      ↓
Access Core
      ↓
ALLOW / DENY
```

Access Core must protect:

```text
Normal API requests
AI / Agent tool calls
Administrative operations
Commercial feature access
Resource-level operations
```

The same rules must apply whether an action originates from UI, API, or AI agent.

---

## 3.8 Commercial model is provider-independent

The reusable commercial model should separate product configuration from payment providers.

```text
Product
  ↓
Plan
  ↓
Offer
  ↓
Feature
  ↓
Entitlement
```

A user's effective entitlement may originate from:

```text
Google Play
Web Billing
Apple later
Promotion
Manual / enterprise entitlement
```

Application code should ask the commercial/access platform whether a feature is available rather than embedding provider-specific subscription logic.

---

## 3.9 AI reasons; controlled application services execute

AI models must not directly mutate application persistence.

```text
User request
    ↓
Agent / AI reasoning
    ↓
Tool / Command
    ↓
Access Core
    ↓
Application Service
    ↓
Domain validation
    ↓
Persistence
```

This applies equally to MCP-exposed tools and internally invoked tools.

Tool contracts are the stable architectural boundary. MCP is an integration protocol, not the business-logic layer.

---

## 3.10 Fast path before agent path

Not every user action should invoke an agent or LLM.

Deterministic operations should use the shortest path:

```text
Client
  ↓
API
  ↓
Access Core
  ↓
Application Service
  ↓
Database
```

Examples:

```text
Complete Task button
Start Task button
Update a known status
Fetch current entitlement
Load a known Job
```

Conversational or ambiguous requests may use the agent path:

```text
Client
  ↓
Conversation API
  ↓
Agent
  ↓
Model Router / LLM Gateway
  ↓
Tool
  ↓
Access Core
  ↓
Application Service
```

This reduces latency, cost, and operational complexity.

---

## 3.11 Voice is a distributed capability

Voice is not a single backend service.

It consists of:

```text
Client Voice Runtime
+
Optional Cloud Voice Gateway
+
Speech AI / ML Provider
```

Client-side capabilities may include:

```text
Microphone capture
Voice Activity Detection
Device STT
Device TTS
Audio playback
Streaming client
Offline behaviour
```

Cloud-side capabilities may include:

```text
Cloud STT adapter
Cloud TTS adapter
Streaming session management
Provider routing / fallback
Language / locale
Usage and cost metering
```

The actual voice-to-text conversion is performed by an STT/ASR model, and text-to-voice conversion is performed by a TTS / speech-synthesis model.

Prefer device STT/TTS where quality is sufficient; use cloud speech as fallback or enhancement.

---

## 3.12 Real-time interaction and latency by design

User-facing conversational and voice paths must minimize sequential network hops.

Prefer:

```text
Streaming
Parallel work
Device processing
In-process tool calls
Cached access decisions
Async telemetry
Direct object-storage uploads
```

Avoid unnecessary flows such as:

```text
Agent → network MCP hop → API Gateway → Domain API
```

when the same tool can safely execute in-process.

MCP-compatible tools may be exposed externally later while retaining a low-latency internal invocation path.

Telemetry, cost aggregation, analytics, notifications, and similar non-critical work should normally execute asynchronously and must not block the user's response path.

---

## 3.13 Provider independence at meaningful boundaries

Vendor-specific APIs should be isolated behind adapters where provider substitution creates real architectural value.

Examples:

```text
IAiProvider
ILLMGateway
ISpeechToTextProvider
ITextToSpeechProvider
ISubscriptionProvider
IObjectStorage
INotificationProvider
```

Do not create abstraction solely for abstraction's sake.

Use provider boundaries where they support:

```text
Cost optimization
Fallback
Portability
Resilience
Testing
Regional choice
Future product reuse
```

---

## 3.14 Files and evidence use object storage plus business metadata

Actual file bytes belong in object storage.

Business metadata and associations belong in the application data model.

```text
Object Storage
- image / video / PDF / receipt / evidence bytes

PostgreSQL Metadata
- FileId
- WorkspaceId
- Storage key
- MIME type
- checksum
- uploader
- timestamps

File Association
- FileId
- EntityType
- EntityId
- optional StageId
- category
```

Files may be associated with:

```text
Customer
Job
Task
Task Stage
Issue
Quote
Invoice
Other future domain entities
```

Prefer secure direct client-to-object-storage uploads using short-lived signed upload authorization to avoid unnecessary backend bandwidth and latency.

---

## 3.15 Observability, audit, and AI FinOps from the beginning

Every important execution path should be observable.

Use end-to-end correlation / trace IDs across:

```text
Client
API
Access Core
Agent
LLM Gateway
Tools
Domain services
Data stores
```

Capture:

```text
Logs
Metrics
Distributed traces
Audit events
Business telemetry
Feature usage
Model usage
Input/output tokens
STT/TTS usage
Tool calls
Latency
Estimated AI cost
```

AI usage should be attributable, where applicable, to:

```text
Product
User
Workspace
Feature
Conversation
Job
Task
Agent
Provider
Model
```

Cost calculations and telemetry aggregation should normally be asynchronous so they do not delay the user's interaction.

---

## 3.16 Logical components do not automatically mean microservices

Architecture diagrams describe logical ownership and responsibility boundaries.

They do not imply that every box must be independently deployed.

Initial implementation may use a modular monolith or a small number of deployable units.

Split capabilities into separate services only when justified by:

```text
Independent scaling
Security isolation
Reliability
Deployment independence
Clear ownership
Performance characteristics
Regulatory or data boundaries
```

Prefer in-process communication where it materially reduces latency and the deployment boundary provides no compensating value.

---

# 4. Dynamic Domain Discovery

During first use, FieldMate should learn what kind of work the user performs.

The experience should be conversational rather than requiring a large configuration form.

Example:

```text
FieldMate:
What kind of work do you normally do?

User:
I run a bathroom fitting business.
We normally do plumbing, tiling and complete bathroom installations.
There are three of us.
```

FieldMate should derive a personalised domain profile.

Example:

```text
Domain:
Bathroom installation

Typical concepts:
Survey
Strip-out
First fix
Waterproofing
Tiling
Second fix
Installation
Testing
Handover

Team:
3 people

Preferred terminology:
Customer → Homeowner
Project → Job
```

The user should be able to refine this naturally over time.

---

# 5. Task Philosophy

Task modelling is one of the most important product concepts.

A Task should represent:

> A manageable unit of work with a recognisable outcome that can be planned, assigned, started, tracked and completed.

For example:

```text
Build a 100-storey building
```

must not be treated as one Task.

It is a Project or Job that requires decomposition.

FieldMate should not blindly create a detailed plan without worker involvement.

Preferred interaction:

```text
User describes work
        ↓
AI interprets desired outcome
        ↓
AI asks only necessary questions
        ↓
AI proposes work breakdown
        ↓
User modifies / confirms
        ↓
Executable tasks are created
```

AI should assist the worker rather than replace the worker's domain judgement.

---

# 6. Conversational and Voice-first Experience

Voice should be considered a first-class interaction model.

A field worker may be:

- using tools;
- wearing gloves;
- moving around a site;
- driving between locations;
- unable or unwilling to interact with complex screens.

Example:

```text
User:
Finished fitting the sink.
It took another two hours because the pipework was damaged.
I also spent another £45 on materials.
```

FieldMate should interpret this into structured application actions:

```text
Task progress updated
Time +2 hours
Material cost +£45
Issue recorded: damaged pipework
Job cost recalculated
Reason for variance retained
```

The response can then be text and/or speech.

Where appropriate, prefer low-cost device capabilities for:

```text
Speech-to-Text
Text-to-Speech
```

with cloud services available where greater capability is required.

---

# 7. Experience and Learning

FieldMate should become more useful as the user completes more jobs.

However, "learning" does not initially mean retraining or fine-tuning an LLM after every task.

Initial learning should come primarily from:

```text
Structured historical data
+
Semantic retrieval
+
Statistics
+
User preferences
+
Contextual memory
+
LLM reasoning
```

Example:

After multiple similar jobs, FieldMate may understand:

```text
Typical duration: 7.2 days
Typical tiling duration: 2.1 days
Common delay: material delivery
Common problem: wall damage discovered during strip-out
Typical labour hours: 43
Average estimated cost: X
Average actual cost: Y
```

For a new job it may then say:

```text
This job appears similar to three previous bathroom installations.

Those jobs normally required 7–8 days.

The current plan allows 6 days.

The main historical risk has been additional preparation after strip-out.
```

The system should gradually move from reactive assistance toward proactive planning.

---

# 8. Expected AI Maturity

FieldMate can evolve through several maturity levels.

## Level 1 — Assistant

The user directly tells FieldMate what to do.

Example:

```text
Create a task to fit the sink tomorrow.
```

## Level 2 — Organiser

FieldMate helps structure work.

Example:

```text
You have three jobs tomorrow.
Would you like the plumbing work scheduled first?
```

## Level 3 — Planner

FieldMate proposes plans.

Example:

```text
Based on the job description, here is a proposed work sequence.
```

## Level 4 — Experienced Copilot

FieldMate uses previous experience.

Example:

```text
Your last three similar jobs required an additional half-day for tiling.
```

## Level 5 — Business Advisor

FieldMate helps the user reason about operational performance.

Examples:

```text
Which types of jobs are most profitable?

Where am I losing time?

Should I change my pricing?

Which work should I prioritise next month?

Would another worker improve throughput?
```

---

# 9. Planned Delivery Journey

The project will intentionally begin with architecture before detailed FR/NFR design.

The current agreed journey is:

```text
STEP 0
Overall Architecture Blueprint
        ↓
STEP 1
Provider / Market Capability Analysis
        ↓
STEP 2
NFR Analysis
        ↓
STEP 3
Functional Requirements
        ↓
STEP 4
Capability + Flow Design
        ↓
STEP 5
Foundation Interfaces / Contracts
        ↓
STEP 6
Low-Level Design
        ↓
STEP 7
Parallel Implementation Workstreams
        ↓
STEP 8
Continuous Integration / Consolidation
        ↓
STEP 9
Vertical MVP
        ↓
STEP 10
Learn / Refine / Scale
```

---

# 10. Step 0 — Overall Architecture Blueprint

This is the immediate architectural phase.

The purpose of Step 0 is not to define every low-level detail.

It should establish:

- product architecture;
- major logical components;
- responsibility boundaries;
- technology candidates;
- device vs cloud responsibilities;
- AI architecture;
- data architecture;
- identity architecture;
- subscription architecture;
- integration architecture;
- deployment direction;
- external provider boundaries;
- major architectural decisions;
- decisions that require future FR/NFR validation.

The output should provide enough structure to begin technology/provider analysis.

---

# 11. Initial Logical Architecture

Current conceptual architecture:

```text
                     USER CHANNELS
              Android / Web / iOS Later
                         │
                         ▼
                EXPERIENCE LAYER
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
 Conversation      Voice / Text      Personalisation
        │                                  │
        └────────────────┬─────────────────┘
                         │
                         ▼
                   PLATFORM APIs
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
   Identity          Subscription      Core Domain
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                           Customer     Job       Task
                              │          │          │
                              └──────────┼──────────┘
                                         │
                                         ▼
                                  Workflow / State

                         AI COPILOT
                              │
               ┌──────────────┼───────────────┐
               │              │               │
          Reasoning       Planning        Tool Calling
               │              │               │
               └──────────────┼───────────────┘
                              │
                              ▼
                       AI PROVIDER LAYER

                  LLM / STT / TTS / Vision
                              │
                              ▼
                       EXPERIENCE MEMORY
                              │
                     Historical Retrieval
                     Similar Work
                     Statistics
                     User Preferences

                         DATA PLATFORM

              Relational Data / Cache / Files
                    Vector Retrieval

                    PLATFORM FOUNDATION

        Security / Observability / Audit / FinOps
       Configuration / Secrets / Events / CI/CD
```

---

# 12. AI Architecture Principle

FieldMate must own its AI orchestration layer.

The application should not become tightly coupled to one AI vendor.

Conceptually:

```text
FieldMate Application
        │
        ▼
AI Orchestration Layer
        │
 ┌──────┼──────────┬───────────┐
 ▼      ▼          ▼           ▼
LLM    STT        TTS        Embeddings
 │      │          │            │
 ▼      ▼          ▼            ▼
Provider(s) chosen based on capability,
cost, latency and requirements
```

AI providers should be replaceable where practical.

The orchestration layer should be responsible for:

- model routing;
- prompt/context construction;
- tool calling;
- cost controls;
- retries/fallback;
- provider abstraction;
- AI telemetry;
- safety/permission enforcement;
- context retrieval;
- result validation.

---

# 13. AI Tool Philosophy

The LLM must not directly update databases.

The AI should invoke controlled application capabilities.

Example:

```text
CreateJob(...)
CreateTask(...)
UpdateTask(...)
StartTask(...)
CompleteTask(...)
RecordTime(...)
RecordMaterial(...)
RecordCost(...)
RecordIssue(...)
GenerateInvoice(...)
SearchPreviousJobs(...)
```

The application layer validates and executes these actions.

This provides:

- security;
- auditability;
- predictable state management;
- testability;
- provider independence.

---

# 14. Identity and Subscription Architecture

FieldMate should own the canonical user identity.

Example:

```text
User
 ├── user_id
 ├── login identities
 ├── workspace memberships
 └── entitlements
```

External subscription records are mapped to that user.

Example:

```text
Entitlement
     │
 ┌───┼─────────────┐
 │   │             │
Google Play      Web Provider       Apple Later
```

Initial subscription channels:

```text
Google Play
Web
```

Apple native billing is not required initially.

---

# 15. Data Architecture Direction

Initial logical data categories:

## Operational data

Examples:

```text
Users
Workspaces
Customers
Jobs
Tasks
Assignments
Time
Materials
Costs
Issues
Quotes
Invoices
Payments
```

## Experience data

Examples:

```text
Completed jobs
Historical durations
Actual vs estimated costs
Common problems
Task sequences
User corrections
User preferences
Lessons
```

## Files / Evidence

Examples:

```text
Images
Documents
Receipts
Job evidence
Attachments
Voice recordings if required
```

## AI retrieval data

Semantic representations may be used to retrieve relevant:

```text
Previous jobs
Tasks
Problems
Solutions
Documentation
Domain terminology
User preferences
```

---

# 16. Candidate Technology Stack

These are initial candidates, not permanently fixed decisions.

## Backend

```text
.NET
ASP.NET Core
```

Reasons:

- strong performance;
- mature ecosystem;
- strong API support;
- good observability integration;
- suitable for modular services;
- strong alignment with existing development skills.

## Web

```text
React
TypeScript
```

## Mobile

Current candidate:

```text
.NET MAUI
```

Native Android or other approaches may be evaluated if required by performance, platform integration or long-term maintainability.

## Primary Database

```text
PostgreSQL
```

## Semantic / Vector Search

Initial preference:

```text
pgvector
```

Avoid introducing a separate vector database until requirements justify one.

## Cache

Candidate:

```text
Redis
```

Use only where requirements justify caching/distributed state.

## Object Storage

S3-compatible object storage or equivalent managed cloud object storage.

## APIs

Initial preference:

```text
REST
```

Use asynchronous events where decoupling or background processing adds value.

## Telemetry

```text
OpenTelemetry
```

## Containers

```text
Docker
```

## Infrastructure

Infrastructure as Code.

Exact technology/provider to be selected after Step 1 analysis.

## CI/CD

Candidate:

```text
GitHub Actions
```

or equivalent depending on hosting and repository decisions.

---

# 17. Step 1 — Provider Capability Analysis

After the high-level architecture is established, compare external providers against required capabilities.

The objective is:

> Build vs Buy vs Integrate.

Areas to analyse include:

## AI

Potential provider categories:

```text
LLM
Reasoning
Tool calling
Embeddings
Vision
Speech-to-Text
Text-to-Speech
```

Compare providers based on:

```text
Capability
Quality
Latency
Cost
Availability
Data privacy
Rate limits
Tool support
Streaming
Structured output
Vendor lock-in
```

## Identity

Evaluate managed identity platforms versus platform/cloud identity.

## Payments

Initial capabilities:

```text
Google Play subscriptions
Web subscription
Entitlement synchronisation
Refund / cancellation handling
Webhook processing
```

## Cloud Hosting

Compare candidate platforms based on:

```text
Cost
Managed services
Scaling
Observability
Security
Developer experience
Deployment simplicity
Regional availability
```

## Observability

Evaluate:

```text
OpenTelemetry-compatible backends
Application monitoring
Distributed tracing
Logs
Metrics
Dashboards
AI cost telemetry
```

---

# 18. Step 2 — Non-Functional Requirements

After Step 0 and provider analysis, formally define NFRs.

Expected areas include:

```text
Security
Authentication
Authorisation
Privacy
Tenant isolation
Encryption
Secrets
Audit
Performance
Latency
Scalability
Availability
Reliability
Resilience
Offline operation
Sync
Cost efficiency
Maintainability
Portability
Observability
AI cost monitoring
Backup / Recovery
Data retention
Compliance
AI safety
```

Cost must be treated as a first-class architecture concern.

---

# 19. Observability and FinOps

FieldMate should capture both normal application telemetry and AI-specific telemetry.

Examples:

```text
Request latency
Failures
API usage
Model used
Model latency
Input tokens
Output tokens
AI request cost
STT usage
TTS usage
Embedding cost
Cache hit rate
Tool-call count
Tool-call failures
Cost per user
Cost per job
Cost per task
Cost per subscription tier
```

Eventually FieldMate should be able to answer:

```text
Subscription revenue per user
minus
Infrastructure + AI servicing cost
=
Operational margin
```

---

# 20. Step 3 — Functional Requirements

Expected capability areas include:

```text
Domain Discovery
Personalisation
Customer Management
Job / Project
Task Management
Task Decomposition
Planning
Scheduling
Assignment
Execution
Progress Tracking
Voice Interaction
Time Tracking
Material Tracking
Cost Tracking
Evidence
Issues
Scope Change
Quotes
Invoices
Payments
Job Closure
Experience Memory
Historical Search
Planning Suggestions
Optimisation
Business Recommendations
```

Do not assume these are final.

Detailed FR analysis will validate them.

---

# 21. Foundation Interfaces and Agreements

Before significant parallel implementation begins, define shared contracts.

Examples:

## Canonical IDs

```text
UserId
WorkspaceId
CustomerId
JobId
TaskId
SubscriptionId
InvoiceId
```

## Core states

Example:

```text
TaskStatus

Proposed
Ready
Scheduled
InProgress
Blocked
Completed
Cancelled
```

Exact states will be decided during detailed design.

## Shared concerns

Define conventions for:

```text
Authentication context
Authorisation
Workspace / tenant context
Error responses
Correlation IDs
Tracing
Audit metadata
Idempotency
API versioning
Events
Telemetry
Date / time handling
Currency
Feature flags
```

These agreements allow independent workstreams to develop safely.

---

# 22. Parallel Development Strategy

After architecture, FR/NFR and interface agreements are sufficiently stable, implementation should proceed using independent workstreams.

Likely workstreams:

```text
Platform / Foundation
Identity / Subscription
Core Domain
Job / Task Engine
AI Copilot
Voice
Client UX
Observability / FinOps
Billing
Experience Memory
```

Parallelisation should happen at capability boundaries.

Avoid long-running isolated branches.

Preferred Git approach:

```text
main
  │
  ├── short-lived feature branch
  ├── short-lived feature branch
  ├── short-lived feature branch
  │
  ▼
continuous merge back to main
```

Use:

```text
Feature flags
Mocks
Contract tests
Integration tests
CI pipelines
```

Keep `main` buildable.

---

# 23. Integration Strategy

Do not develop every subsystem independently and perform one large integration at the end.

Build thin end-to-end vertical flows early.

Initial vertical journey:

```text
Login
  ↓
Create / identify customer
  ↓
Describe job
  ↓
AI proposes tasks
  ↓
User confirms tasks
  ↓
Start task
  ↓
Text / voice update
  ↓
Record time / cost / issue
  ↓
Complete task
  ↓
Complete job
  ↓
Simple invoice / summary
  ↓
Experience captured
```

The first implementation may be primitive.

The purpose is to prove that components work together.

Capabilities can then mature independently.

---

# 24. Initial MVP Philosophy

The MVP should demonstrate one complete useful lifecycle.

Avoid initially trying to build:

```text
Full accounting
Payroll
Large ERP capabilities
Advanced CRM
Complex inventory
Full autonomous agents
Advanced analytics
Multi-industry feature depth
```

Prefer one excellent workflow from job creation to closure.

---

# 25. Architectural Decision Philosophy

Important decisions should be documented through ADRs.

Examples:

```text
ADR — Backend framework
ADR — Primary database
ADR — Mobile framework
ADR — Identity provider
ADR — AI provider abstraction
ADR — Subscription entitlement model
ADR — Vector retrieval strategy
ADR — Eventing approach
ADR — Deployment model
ADR — Offline strategy
```

Each ADR should capture:

```text
Context
Decision
Alternatives
Rationale
Consequences
Review conditions
```

Avoid premature irreversible decisions.

---

# 26. Instructions for Claude and AI Coding Assistants

When working within this repository, use the following principles.

## Understand before coding

Do not immediately implement a requested feature without considering:

- which architectural capability owns it;
- whether it is generic or domain-specific;
- whether an existing interface should be used;
- whether it creates provider coupling;
- whether it affects FR/NFR assumptions;
- whether telemetry is required;
- whether it creates a security implication;
- whether it increases recurring AI or infrastructure cost.

## Preserve domain independence

Do not introduce trade-specific platform abstractions unless explicitly approved.

Bad:

```text
class PlumbingJob
class BathroomTask
```

Prefer:

```text
Job
Task
DomainProfile
Terminology
TaskTemplate
```

## Keep AI controlled

The LLM should reason.

Application services should own deterministic business actions.

Prefer:

```text
AI
 ↓
Tool / Command
 ↓
Application Service
 ↓
Domain
 ↓
Persistence
```

Avoid:

```text
AI
 ↓
Database
```

## Preserve provider independence

Do not spread vendor-specific APIs throughout the core domain.

Prefer adapter/provider boundaries.

Examples:

```text
IAiProvider
ISpeechToTextProvider
ITextToSpeechProvider
ISubscriptionProvider
IObjectStorage
INotificationProvider
```

These interfaces should only be introduced where useful; avoid unnecessary abstraction.

## Treat cost as an NFR

Before introducing new AI calls, consider:

```text
Can this run locally?
Can deterministic code do it?
Can results be cached?
Can a cheaper model handle it?
Does this need reasoning?
Can multiple operations be batched?
```

## Include observability

New capabilities should expose relevant:

```text
Logs
Metrics
Traces
Cost telemetry
Audit events
```

where appropriate.

## Avoid premature microservices

Do not split the system into many services merely because conceptual components are separate.

Initial implementation may use a modular monolith with clear boundaries if that provides lower complexity and cost.

Service boundaries should be driven by:

```text
Scaling
Security
Independent deployment
Ownership
Isolation
Reliability
```

rather than architecture fashion.

## Favour incremental vertical delivery

Prefer proving small end-to-end journeys instead of implementing one horizontal layer completely before integrating it.

## Challenge architecture where appropriate

The architecture in this README represents the current direction, not unquestionable truth.

If implementation evidence demonstrates that a decision is problematic:

1. identify the conflict;
2. explain the architectural impact;
3. present alternatives;
4. recommend an ADR or design update;
5. do not silently introduce a conflicting architecture.

---

# 27. Current Immediate Objective

The project is currently at:

```text
STEP 0 — OVERALL ARCHITECTURE BLUEPRINT
```

The immediate task is therefore to mature:

```text
Logical architecture
Component boundaries
Technology stack
Cloud/device split
AI architecture
Data architecture
Identity architecture
Subscription architecture
Deployment direction
Provider boundaries
```

Detailed NFRs, FRs and low-level implementation designs come after this initial architecture and provider-capability assessment.

Do not prematurely jump into detailed implementation unless specifically requested.

---

# 28. Core Product Principles Summary

When unsure about a design decision, return to these principles and validate the decision against **`FieldMate Platform Architecture Diagram.png`**.

```text
1. Generic domain, personalised experience.

2. Build reusable platform capabilities where real product flows require them.

3. Multiple subscription providers,
   one canonical FieldMate identity and entitlement model.

4. Access Core centrally enforces authentication context,
   authorization, resource policy, commercial entitlements,
   feature access, and usage limits.

5. Zero-cost first:
   device/local → deterministic → cached → low-cost → premium.

6. Cost is part of routing.
   Select the cheapest capability that meets quality,
   latency, privacy, and reliability requirements.

7. Low latency and high performance by design.

8. Fast deterministic path before Agent / LLM path.

9. AI reasons; controlled application services execute.

10. Tool contracts are the stable boundary.
    MCP is an integration protocol, not the business logic.

11. Voice is distributed:
    client voice runtime + optional cloud voice gateway
    + STT/TTS ML providers.

12. Prefer device STT/TTS where sufficient;
    cloud speech is fallback/enhancement.

13. Stream real-time interactions and avoid unnecessary
    synchronous network hops.

14. Provider independence where it creates meaningful value.

15. Files/evidence use object storage plus domain metadata
    and explicit entity associations.

16. Observability, audit, telemetry, token usage,
    and AI FinOps exist from the beginning.

17. Telemetry and cost aggregation should not block
    the user-facing interaction path.

18. Learn from ongoing work and historical context.

19. Become more useful as experience accumulates.

20. Support the whole lifecycle:
    request → plan → execute → close → bill → learn.

21. Contracts before large-scale parallel implementation.

22. Integrate continuously rather than at the end.

23. Keep the first MVP narrow but end-to-end.

24. Logical component boundaries do not automatically
    imply microservices.

25. Architecture should enable future products and domains
    without redesigning common platform capabilities.
```

Architecture reference:

```text
FieldMate Platform Architecture Diagram.png
```

The diagram and this README must evolve together. If a material architecture decision changes one, update the other in the same change set where practical.

---

# 29. Long-Term Product Direction

FieldMate should ultimately become a trusted operational copilot.

It should be able to progress from:

```text
"What should I do today?"
```

to:

```text
"How should I organise this job?"
```

to:

```text
"What normally goes wrong with jobs like this?"
```

to:

```text
"How long is this likely to take based on my previous work?"
```

to:

```text
"Which types of work are most profitable for me?"
```

to:

```text
"How should I organise my business next month to improve profitability and utilisation?"
```

That progression—from task assistant to experienced operational copilot—is the central long-term vision of FieldMate.