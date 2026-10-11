# ADR-002 — Amazon Cognito as the initial identity broker

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00

## Context

FieldMate needs sign-in for owners, office staff and workers through native email and password, passkeys,
Google, and Microsoft Entra, with MFA where appropriate. It must never store passwords (FM-P20). The broker must
be replaceable later (FM-P19, FM-P25).

## Decision

* One Cognito user pool per environment, `fieldmate-users-{env}`, on the **Essentials** tier: not one pool per organisation or per method.
* Passwords and passkeys (WebAuthn) as first factors.
* Optional TOTP MFA for native sign-in. MFA is not *required*, because that would disable passwordless passkey sign-in.
* Federated sign-in (Google, Microsoft/Entra OIDC) brokered through the same pool. Upstream MFA is authoritative for federated users.
* Cognito managed login (v2) for sign-in, registration and password reset. The API never reimplements these flows.
* A public web client using authorization code + PKCE. A non-production smoke-test client exists for pipeline tests only.
* **No custom attributes and no groups.** Organisation, role, permission and worker data live in PostgreSQL (FM-P17).
* A small pre-token-generation trigger copies standard claims (`email`, `email_verified`, `name`, and for federated sign-ins `idp`, `idp_subject`) into access tokens. The API can then identify a person at onboarding without calling the IdP.

## Alternatives considered

| Option | Why not (now) |
|---|---|
| Auth0, Okta, Entra External ID as primary | Per-MAU pricing above Cognito's free tier; extra vendor. Remains a migration target (ADR-004) |
| Self-hosted OIDC server (e.g. Keycloak) | Always-on compute and operational burden (FM-P02, FM-P04) |
| Cognito Lite tier | No passkeys and no access-token customisation |

## Consequences

* Sign-in UX is Cognito managed login, with branding limited to what managed login supports.
* Recreating a pool changes the token issuer. Non-production parking therefore keeps the pool (ADR-006).
* Cognito's default email sender has a low daily quota. Production needs SES (a future, costed decision).

## Cost implications

Essentials free tier: 10,000 MAU per month for direct/social sign-in and 50 MAU for SAML/OIDC federation, not
time-limited. Beyond that, $0.015 per MAU. The pre-token trigger is a pay-per-invocation Lambda with no idle cost.

## Portability implications

Cognito specifics are confined to Terraform and `FieldMate.Aws`. The application sees only a provider-neutral
principal (ADR-004), so replacing Cognito means a new adapter and new identity mappings, not new business data.

## Related principles

FM-P19 Provider-neutral application identity · FM-P20 FieldMate does not own passwords · FM-P17 Identity ≠ user ≠
membership ≠ worker · FM-P25 Provider portability · FM-P03 Free alternative first

## Related verticals

V00. Team & Access (invitations UI) and later customer-portal identity build on it.
