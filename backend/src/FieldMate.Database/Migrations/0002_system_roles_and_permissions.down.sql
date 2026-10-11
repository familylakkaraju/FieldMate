DELETE FROM iam.role_permission
WHERE role_id IN (
    SELECT id FROM iam.role
    WHERE organisation_id IS NULL AND code IN ('OWNER', 'ADMIN', 'MANAGER', 'WORKER'));

DELETE FROM iam.role
WHERE organisation_id IS NULL AND code IN ('OWNER', 'ADMIN', 'MANAGER', 'WORKER');

DELETE FROM iam.permission
WHERE code IN ('organisation.read', 'organisation.manage', 'team.read', 'team.manage');
