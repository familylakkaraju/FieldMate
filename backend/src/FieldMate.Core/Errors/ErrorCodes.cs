namespace FieldMate.Core.Errors;

/// <summary>Stable, client-visible error codes. A code never carries data.</summary>
public static class ErrorCodes
{
    public const string AuthRequired = "AUTH_REQUIRED";
    public const string AuthInvalidToken = "AUTH_INVALID_TOKEN";
    public const string IdentityNotProvisioned = "IDENTITY_NOT_PROVISIONED";
    public const string NoActiveMembership = "NO_ACTIVE_MEMBERSHIP";
    public const string UserDisabled = "USER_DISABLED";
    public const string InvitationInvalid = "INVITATION_INVALID";
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string OrgContextRequired = "ORG_CONTEXT_REQUIRED";
    public const string OrgContextInvalid = "ORG_CONTEXT_INVALID";
    public const string OrgMembershipDenied = "ORG_MEMBERSHIP_DENIED";
    public const string AccessDenied = "ACCESS_DENIED";
    public const string RouteNotFound = "ROUTE_NOT_FOUND";
    public const string InternalError = "INTERNAL_ERROR";
}
