-- Minimal platform-defined roles and permissions for V00. Generic: no trade- or industry-specific roles (CR AP-04).
-- Organisation-specific roles (organisation_id NOT NULL) arrive with the Team & Access vertical.

INSERT INTO iam.permission (id, code, resource, action) VALUES
    (gen_random_uuid(), 'organisation.read',   'organisation', 'read'),
    (gen_random_uuid(), 'organisation.manage', 'organisation', 'manage'),
    (gen_random_uuid(), 'team.read',           'team',         'read'),
    (gen_random_uuid(), 'team.manage',         'team',         'manage');

INSERT INTO iam.role (id, organisation_id, code, name) VALUES
    (gen_random_uuid(), NULL, 'OWNER',   'Owner'),
    (gen_random_uuid(), NULL, 'ADMIN',   'Administrator'),
    (gen_random_uuid(), NULL, 'MANAGER', 'Manager'),
    (gen_random_uuid(), NULL, 'WORKER',  'Worker');

INSERT INTO iam.role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
        ('OWNER',   'organisation.read'),
        ('OWNER',   'organisation.manage'),
        ('OWNER',   'team.read'),
        ('OWNER',   'team.manage'),
        ('ADMIN',   'organisation.read'),
        ('ADMIN',   'organisation.manage'),
        ('ADMIN',   'team.read'),
        ('ADMIN',   'team.manage'),
        ('MANAGER', 'organisation.read'),
        ('MANAGER', 'team.read'),
        ('WORKER',  'organisation.read')
     ) AS grants (role_code, permission_code)
JOIN iam.role r ON r.code = grants.role_code AND r.organisation_id IS NULL
JOIN iam.permission p ON p.code = grants.permission_code;
