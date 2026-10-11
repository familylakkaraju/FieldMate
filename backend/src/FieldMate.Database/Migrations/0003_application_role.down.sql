ALTER DEFAULT PRIVILEGES IN SCHEMA core, iam, workforce REVOKE SELECT, INSERT, UPDATE ON TABLES FROM fieldmate_app;
REVOKE ALL ON ALL TABLES IN SCHEMA core, iam, workforce FROM fieldmate_app;
REVOKE USAGE ON SCHEMA core, iam, workforce FROM fieldmate_app;

DO $$
BEGIN
    EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM fieldmate_app', current_database());
END
$$;

-- The role itself is cluster-wide (it may hold grants in other databases on the instance) and is retained.
