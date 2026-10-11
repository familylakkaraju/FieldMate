# ADR-004 — Provider-neutral FieldMate identity

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00 (including the no-orphan-users addendum)

## Context

The identity broker (Cognito, ADR-002) must be replaceable without rewriting organisations, memberships or any
business data. A person may sign in several ways and belong to several organisations. Successful authentication
alone must not create application users (FM-P18).

## Decision

* **Canonical user:** `iam.user_profile`, keyed by a FieldMate UUID. Email is a contact attribute, never an identity key.
* **Provider mappings:** `iam.authentication_identity`, unique on **(issuer, subject)**. It also records the provider code, the identity type (`NATIVE` or `FEDERATED`), the email at link time and, for federated identities, the upstream subject. A passkey is an authenticator on a native identity, not a separate identity.
* **Narrow boundary:** `IIdentityProviderAdapter` validates a credential and returns a provider-neutral principal. Two implementations exist:
  - a standards-based OIDC/JWKS validator, used locally, in tests and on non-AWS hosting;
  - an API Gateway verified-claims adapter, used on AWS.
* **No orphan users.** A user is persisted only by:
  - **creating an organisation** (`POST /onboarding/create-business`): organisation, user, identity and OWNER membership in one transaction, with an idempotency key;
  - **accepting an invitation** (`POST /identity/accept-invitation`): user and identity if new, plus membership and invitation acceptance, in one transaction.
* Unknown identities receive `IDENTITY_NOT_PROVISIONED`, and nothing is written.
* A deferred database constraint rejects committing a user without a membership.
* A user with no valid membership is denied (`NO_ACTIVE_MEMBERSHIP`).
* Users are never merged on matching email. Account linking is a deliberate, proof-based future capability.

## Alternatives considered

| Option | Why not |
|---|---|
| Use the Cognito `sub` as the FieldMate user ID | Locks every business relationship to Cognito |
| Store organisation, role or worker data as Cognito attributes or groups | Makes Cognito an application database (FM-P17) |
| Auto-provision users on first login | Creates orphan "junk" users (FM-P18) |
| Merge identities by verified email | Account-takeover risk; not proof of the same person |

## Consequences

* Two onboarding endpoints carry the user-creation responsibility. Every other endpoint is read-only with respect to users.
* Migrating brokers: federated users are re-linked through their upstream subject. Native-password users use password reset or JIT migration (FM-P20).
* Invitations require a token-issuing path. V00 has a development-only operation; the Team & Access vertical adds the product flow.

## Cost implications

None beyond PostgreSQL storage.

## Portability implications

This ADR is the portability mechanism for identity. Only adapters and mappings change with the provider.

## Related principles

FM-P17 Identity ≠ user ≠ membership ≠ worker · FM-P18 No orphan FieldMate users · FM-P19 Provider-neutral
application identity · FM-P20 FieldMate does not own passwords · FM-P21 Access Core is central · FM-P25 Provider portability

## Related verticals

V00 (identity, onboarding). Team & Access (invitation issuing, account linking). Customer portal (customer identity).
