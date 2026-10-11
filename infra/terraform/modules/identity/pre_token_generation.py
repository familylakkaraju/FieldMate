"""Cognito pre-token-generation trigger (V2_0 event) for fieldmate-users-{env}.

Copies standard profile claims into the ACCESS token so the API can identify a person at onboarding without any
call back to the identity provider (the API Lambda has no internet egress). It adds only provider-neutral claim
names, never FieldMate application data (organisation, role, permission, worker): those live in PostgreSQL.

  email, email_verified, name  - standard OIDC profile claims
  idp, idp_subject             - for federated sign-ins: the upstream provider and its subject, so a user can be
                                 re-linked deterministically if the broker is ever replaced

Deliberately logs nothing: the event contains personal data.
"""

import json


def handler(event, context):
    attributes = event.get("request", {}).get("userAttributes", {})
    claims = {name: attributes[name] for name in ("email", "email_verified", "name") if attributes.get(name)}

    identities = attributes.get("identities")
    if identities:
        try:
            linked = json.loads(identities)
        except ValueError:
            linked = []
        if linked:
            if linked[0].get("providerName"):
                claims["idp"] = linked[0]["providerName"]
            if linked[0].get("userId"):
                claims["idp_subject"] = str(linked[0]["userId"])

    event.setdefault("response", {})["claimsAndScopeOverrideDetails"] = {
        "accessTokenGeneration": {"claimsToAddOrOverride": claims},
    }
    return event
