-- Least-privilege runtime role for fieldmate-api. Migrations run as the database owner; the API can never run DDL.
-- On Amazon RDS the role authenticates with short-lived IAM tokens (rds_iam): no stored application password.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fieldmate_app') THEN
        CREATE ROLE fieldmate_app LOGIN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam') THEN
        GRANT rds_iam TO fieldmate_app;
    END IF;

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO fieldmate_app', current_database());
END
$$;

GRANT USAGE ON SCHEMA core, iam, workforce TO fieldmate_app;

-- No DELETE: V00 changes status instead of deleting rows.
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA core, iam, workforce TO fieldmate_app;

-- Platform-defined reference data is read-only at runtime.
REVOKE INSERT, UPDATE ON iam.role, iam.permission, iam.role_permission FROM fieldmate_app;

-- Tables added by later migrations (run as the owner) get the same default grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA core, iam, workforce GRANT SELECT, INSERT, UPDATE ON TABLES TO fieldmate_app;
