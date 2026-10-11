-- V00 addendum: a persistent FieldMate user never exists without an organisation relationship.
-- Users are created only by atomic onboarding: create organisation, or accept an invitation.

-- ---------------------------------------------------------------------------------------------------------------
-- Invariant: every iam.user_profile has at least one iam.organisation_member row. Checked at COMMIT (deferred),
-- so the onboarding transaction can insert the user before its first membership, but cannot commit without one.
-- ---------------------------------------------------------------------------------------------------------------
CREATE FUNCTION iam.assert_user_has_organisation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog
AS $$
DECLARE
    target_user uuid;
BEGIN
    -- Separate branches: PL/pgSQL would reject OLD.user_id on the user_profile INSERT path even inside a CASE.
    IF TG_TABLE_NAME = 'user_profile' THEN
        target_user := NEW.id;
    ELSE
        target_user := OLD.user_id;
    END IF;

    IF EXISTS (SELECT 1 FROM iam.user_profile u WHERE u.id = target_user)
       AND NOT EXISTS (SELECT 1 FROM iam.organisation_member m WHERE m.user_id = target_user) THEN
        RAISE EXCEPTION 'FieldMate user % has no organisation relationship', target_user
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER trg_user_profile_requires_organisation
    AFTER INSERT ON iam.user_profile
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION iam.assert_user_has_organisation();

CREATE CONSTRAINT TRIGGER trg_organisation_member_keeps_user_related
    AFTER DELETE OR UPDATE OF user_id ON iam.organisation_member
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION iam.assert_user_has_organisation();

-- ---------------------------------------------------------------------------------------------------------------
-- Organisation invitations (X-Ray: iam.invitation). Only a SHA-256 hash of the secret token is stored.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE iam.invitation (
    id                        uuid        PRIMARY KEY,
    organisation_id           uuid        NOT NULL REFERENCES core.organisation (id),
    role_id                   uuid        NOT NULL REFERENCES iam.role (id),
    token_hash                bytea       NOT NULL CHECK (octet_length(token_hash) = 32),
    invited_email             text        NULL CHECK (invited_email IS NULL OR char_length(invited_email) <= 320),
    create_worker             boolean     NOT NULL DEFAULT false,
    status                    text        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED')),
    expires_at                timestamptz NOT NULL,
    invited_by_membership_id  uuid        NULL,
    accepted_by_user_id       uuid        NULL REFERENCES iam.user_profile (id),
    accepted_at               timestamptz NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_invitation_token_hash UNIQUE (token_hash),
    CONSTRAINT ck_invitation_acceptance CHECK (
        (status = 'ACCEPTED') = (accepted_by_user_id IS NOT NULL AND accepted_at IS NOT NULL)),
    -- The inviter (when recorded) must be a member of the same organisation.
    CONSTRAINT fk_invitation_inviter FOREIGN KEY (organisation_id, invited_by_membership_id)
        REFERENCES iam.organisation_member (organisation_id, id)
);

CREATE INDEX ix_invitation_organisation_status ON iam.invitation (organisation_id, status);
CREATE INDEX ix_invitation_accepted_by_user ON iam.invitation (accepted_by_user_id) WHERE accepted_by_user_id IS NOT NULL;

-- An invitation may grant a system role or a role owned by its own organisation, never another tenant's role.
CREATE TRIGGER trg_invitation_role_scope
    BEFORE INSERT OR UPDATE OF role_id, organisation_id ON iam.invitation
    FOR EACH ROW EXECUTE FUNCTION iam.enforce_member_role_scope();

-- ---------------------------------------------------------------------------------------------------------------
-- Idempotency for create operations, keyed by authentication identity (the user may not exist yet).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE platform.idempotency_record (
    issuer           text        NOT NULL,
    subject          text        NOT NULL,
    operation        text        NOT NULL CHECK (operation ~ '^[A-Za-z]{1,64}$'),
    idempotency_key  uuid        NOT NULL,
    resource_id      uuid        NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (issuer, subject, operation, idempotency_key)
);

CREATE INDEX ix_idempotency_record_created_at ON platform.idempotency_record (created_at);

-- Runtime grants. iam.invitation is covered by 0003's default privileges; platform needs explicit grants.
GRANT USAGE ON SCHEMA platform TO fieldmate_app;
GRANT SELECT, INSERT ON platform.idempotency_record TO fieldmate_app;
