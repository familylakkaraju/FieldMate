-- V00 Foundation: canonical FieldMate identity, organisations, membership, roles/permissions and a minimal worker.
-- The authentication broker (Cognito today) only authenticates. Every application relationship lives here (CR AP-08).
-- Keys are UUIDs (application-generated UUIDv7). organisation_id is the tenant boundary (CR AP-07).

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS workforce;

CREATE FUNCTION platform.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Organisation (tenant)
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE core.organisation (
    id          uuid        PRIMARY KEY,
    name        text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
    status      text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organisation_touch BEFORE UPDATE ON core.organisation
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

-- ---------------------------------------------------------------------------------------------------------------
-- Canonical FieldMate user. Platform-global: one person may belong to many organisations.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE iam.user_profile (
    id             uuid        PRIMARY KEY,
    display_name   text        NULL CHECK (display_name IS NULL OR char_length(display_name) <= 200),
    primary_email  text        NULL CHECK (primary_email IS NULL OR char_length(primary_email) <= 320),
    status         text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN iam.user_profile.primary_email IS
    'Contact attribute only. Never an identity key: users are never resolved or merged by email.';

CREATE TRIGGER trg_user_profile_touch BEFORE UPDATE ON iam.user_profile
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

-- ---------------------------------------------------------------------------------------------------------------
-- Authentication-provider mappings. issuer + subject is the portable identity key (CR AP-09).
-- No passwords, hashes or salts are ever stored by FieldMate (CR AP-11).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE iam.authentication_identity (
    id                  uuid        PRIMARY KEY,
    user_id             uuid        NOT NULL REFERENCES iam.user_profile (id),
    issuer              text        NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 512),
    subject             text        NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 255),
    provider            text        NOT NULL CHECK (provider ~ '^[A-Z0-9_]{1,64}$'),
    identity_type       text        NOT NULL CHECK (identity_type IN ('NATIVE', 'FEDERATED')),
    upstream_subject    text        NULL CHECK (upstream_subject IS NULL OR char_length(upstream_subject) <= 255),
    email_at_link_time  text        NULL CHECK (email_at_link_time IS NULL OR char_length(email_at_link_time) <= 320),
    created_at          timestamptz NOT NULL DEFAULT now(),
    last_seen_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_authentication_identity_issuer_subject UNIQUE (issuer, subject)
);

COMMENT ON COLUMN iam.authentication_identity.identity_type IS
    'NATIVE: credentials held by the broker (password and/or passkey - a passkey is an authenticator, not a separate identity). FEDERATED: brokered upstream IdP.';
COMMENT ON COLUMN iam.authentication_identity.upstream_subject IS
    'Federated only: the upstream IdP subject, so users can be re-linked deterministically if the broker is replaced.';

CREATE INDEX ix_authentication_identity_user_id ON iam.authentication_identity (user_id);
CREATE INDEX ix_authentication_identity_upstream ON iam.authentication_identity (provider, upstream_subject)
    WHERE upstream_subject IS NOT NULL;

-- ---------------------------------------------------------------------------------------------------------------
-- Roles and permissions. organisation_id NULL = platform-defined system role available to every organisation.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE iam.role (
    id               uuid        PRIMARY KEY,
    organisation_id  uuid        NULL REFERENCES core.organisation (id),
    code             text        NOT NULL CHECK (code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
    name             text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
    status           text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETIRED')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_organisation_code UNIQUE NULLS NOT DISTINCT (organisation_id, code)
);

CREATE TABLE iam.permission (
    id        uuid PRIMARY KEY,
    code      text NOT NULL,
    resource  text NOT NULL CHECK (resource ~ '^[a-z][a-z0-9_]{0,63}$'),
    action    text NOT NULL CHECK (action ~ '^[a-z][a-z0-9_]{0,63}$'),
    CONSTRAINT uq_permission_code UNIQUE (code),
    CONSTRAINT ck_permission_code CHECK (code = resource || '.' || action)
);

CREATE TABLE iam.role_permission (
    role_id        uuid NOT NULL REFERENCES iam.role (id) ON DELETE CASCADE,
    permission_id  uuid NOT NULL REFERENCES iam.permission (id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX ix_role_permission_permission_id ON iam.role_permission (permission_id);

-- ---------------------------------------------------------------------------------------------------------------
-- Organisation membership: one row per (organisation, user); status changes over time.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE iam.organisation_member (
    id               uuid        PRIMARY KEY,
    organisation_id  uuid        NOT NULL REFERENCES core.organisation (id),
    user_id          uuid        NOT NULL REFERENCES iam.user_profile (id),
    role_id          uuid        NOT NULL REFERENCES iam.role (id),
    status           text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
    joined_at        timestamptz NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_organisation_member_user UNIQUE (organisation_id, user_id),
    -- Target for tenant-consistent composite foreign keys (e.g. workforce.worker).
    CONSTRAINT uq_organisation_member_tenant_id UNIQUE (organisation_id, id)
);

-- "Which organisations does this user belong to?" (choose-organisation). Tenant queries use the
-- uq_organisation_member_user index, which leads with organisation_id.
CREATE INDEX ix_organisation_member_user_id ON iam.organisation_member (user_id);
CREATE INDEX ix_organisation_member_role_id ON iam.organisation_member (role_id);

CREATE TRIGGER trg_organisation_member_touch BEFORE UPDATE ON iam.organisation_member
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

-- A membership may use a system role or a role owned by its own organisation, never another tenant's role.
CREATE FUNCTION iam.enforce_member_role_scope() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog
AS $$
DECLARE
    role_organisation uuid;
BEGIN
    SELECT r.organisation_id INTO role_organisation FROM iam.role r WHERE r.id = NEW.role_id;
    IF role_organisation IS NOT NULL AND role_organisation <> NEW.organisation_id THEN
        RAISE EXCEPTION 'role % belongs to a different organisation', NEW.role_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER trg_organisation_member_role_scope
    BEFORE INSERT OR UPDATE OF role_id, organisation_id ON iam.organisation_member
    FOR EACH ROW EXECUTE FUNCTION iam.enforce_member_role_scope();

-- ---------------------------------------------------------------------------------------------------------------
-- Worker (minimal). The composite FK guarantees a worker and its membership belong to the same organisation.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE workforce.worker (
    id               uuid        PRIMARY KEY,
    organisation_id  uuid        NOT NULL REFERENCES core.organisation (id),
    membership_id    uuid        NOT NULL,
    status           text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_worker_membership FOREIGN KEY (organisation_id, membership_id)
        REFERENCES iam.organisation_member (organisation_id, id),
    CONSTRAINT uq_worker_membership UNIQUE (organisation_id, membership_id)
);

CREATE TRIGGER trg_worker_touch BEFORE UPDATE ON workforce.worker
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();
