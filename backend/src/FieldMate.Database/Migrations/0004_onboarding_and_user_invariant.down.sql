REVOKE ALL ON platform.idempotency_record FROM fieldmate_app;
REVOKE USAGE ON SCHEMA platform FROM fieldmate_app;

DROP TABLE platform.idempotency_record;
DROP TABLE iam.invitation;

DROP TRIGGER trg_organisation_member_keeps_user_related ON iam.organisation_member;
DROP TRIGGER trg_user_profile_requires_organisation ON iam.user_profile;
DROP FUNCTION iam.assert_user_has_organisation();
