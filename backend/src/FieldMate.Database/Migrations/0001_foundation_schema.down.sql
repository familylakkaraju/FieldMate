-- Reverses 0001. Destroys all V00 identity/organisation data: for development and test rollback only.
-- Production rollback is forward-fix plus snapshot restore (see docs/v00/V00-Foundation-Report.md).

DROP TABLE workforce.worker;
DROP TABLE iam.organisation_member;
DROP FUNCTION iam.enforce_member_role_scope();
DROP TABLE iam.role_permission;
DROP TABLE iam.permission;
DROP TABLE iam.role;
DROP TABLE iam.authentication_identity;
DROP TABLE iam.user_profile;
DROP TABLE core.organisation;
DROP FUNCTION platform.touch_updated_at();

DROP SCHEMA workforce;
DROP SCHEMA iam;
DROP SCHEMA core;
