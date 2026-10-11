# ADR-009 — First-class data as typed relational records, not JSON documents

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00 (project-owner decision; refines ADR-001)

## Context

The project owner requires that FieldMate data be directly queryable as records, and never persisted as an
organisation-level JSON model.

The pressure toward JSON is real. The Stage-1 prototype keeps each organisation's configuration (company,
branding, terminology, services, forms, workflows, pricing, booking, website) as one JSON object in browser
storage. A configuration vertical could be tempted to persist that object as a single JSONB column per
organisation, because it is quick to build.

FM-P14 previously allowed "JSONB only for genuinely flexible structures". Organisation configuration varies by
organisation, so it could be argued to qualify. ADR-001 said only "selective JSONB".

## Decision

* **First-class FieldMate business and configuration data must be stored as typed relational, directly queryable
  records**: typed columns, one row per item, primary and foreign keys, `organisation_id` where tenant-owned,
  constraints and indexes. First-class data includes:
  - the organisation profile;
  - configuration concepts: services, terminology, branding, forms with their fields and options, workflows, pricing, booking rules, dashboard and website content;
  - all business entities.
* **Prohibited:**
  - whole-organisation JSON/JSONB documents;
  - whole-configuration JSON/JSONB documents;
  - business entities whose canonical persistence is one JSONB blob;
  - catch-all `settings`, `data` or `configuration` JSONB columns.
* **JSONB is an exception, not a general configuration mechanism.** It is allowed only for a bounded opaque or
  leaf fragment where all of the following hold:
  - it is not the aggregate canonical representation of an entity;
  - its internal fields do not require FieldMate relational integrity;
  - it is not normally filtered, joined or referenced;
  - its use is justified in the relevant CR;
  - it can later be promoted to relational schema by migration.

  Acceptable examples: a raw third-party webhook payload kept for audit or replay; provider-specific opaque
  metadata. **Not** an example: form field options. They are first-class configurable data, modelled
  relationally (e.g. `form_field`, `form_field_option`).
* **Layered configuration remains** platform → archetype → organisation → service → user (FM-P13). Production
  resolves it from typed configuration and override records, not from whole-document JSON merge persistence.
* **Transport is independent of persistence.**
  - JSON remains the API transport format.
  - JSON remains the prototype's in-browser persistence.
  - Production persistence is independent of transport shape: production backends satisfy the same client contracts (FM-P27, FM-P32) from relational tables.

## Alternatives considered

| Option | Why not |
|---|---|
| One JSONB document per organisation (mirroring the prototype) | Fast to build, but the data is invisible to SQL reporting, joins, foreign keys and constraints; validation and migrations move into code; documents grow unbounded |
| Entity-attribute-value tables for all configuration | Queryable, but loses types and constraints and makes simple questions complex. Typed tables per concept are clearer |
| Document database | Contradicts ADR-001 / FM-P14 |
| Keep FM-P14's previous wording and rely on review | "Genuinely flexible" is open to interpretation and leaves the aggregate-JSON shortcut available |

## Consequences

* Each configuration concept gets its own tables when its vertical arrives, e.g. services, terminology overrides, branding, `form_definition` / `form_field` / `form_field_option`, workflow stages. That means more migrations up front, but every question ("which organisations offer service X", "which forms use field Y") is a direct query.
* V00 already complies: no V00 table has a JSON or JSONB column. No application or schema change is needed now.
* The prototype's `OrganisationConfig` object becomes an API response assembled from tables, not a stored document.

## Cost implications

No additional AWS service cost is introduced. The decision keeps queryable FieldMate data in the existing
PostgreSQL store and avoids introducing another persistence technology.

## Portability implications

Positive: plain relational SQL moves between PostgreSQL hosts and is readable by standard reporting tools.

## Related principles

FM-P14 PostgreSQL-first, relational for first-class data · FM-P13 Convention over configuration · FM-P15
Organisation is the tenant boundary · FM-P32 Prototype-to-production continuity · FM-P01 Keep it simple

## Related verticals

All future verticals. In particular: Business Onboarding and Business Configuration (organisation profile,
services, terminology, branding, forms, workflows, pricing, booking, website content).
