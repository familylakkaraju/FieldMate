namespace FieldMate.Core.Errors;

/// <summary>
/// An expected, client-facing failure. The message is safe to return to callers; <see cref="DiagnosticReason"/>
/// is recorded in telemetry only and never returned (it may describe why a token or request was rejected).
/// </summary>
public sealed class FieldMateException : Exception
{
    private FieldMateException(string errorCode, int statusCode, string message, string? diagnosticReason)
        : base(message)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
        DiagnosticReason = diagnosticReason;
    }

    public string ErrorCode { get; }

    public int StatusCode { get; }

    public string? DiagnosticReason { get; }

    public static FieldMateException AuthRequired() =>
        new(ErrorCodes.AuthRequired, 401, "Authentication is required.", null);

    public static FieldMateException InvalidToken(string? reason) =>
        new(ErrorCodes.AuthInvalidToken, 401, "The access token is not valid.", reason);

    // An authenticated identity becomes a FieldMate user only by creating an organisation or accepting an invitation.
    public static FieldMateException IdentityNotProvisioned() =>
        new(ErrorCodes.IdentityNotProvisioned, 403, "No FieldMate account is linked to this sign-in. Create a business or accept an invitation.", null);

    public static FieldMateException NoActiveMembership() =>
        new(ErrorCodes.NoActiveMembership, 403, "This FieldMate account has no active organisation membership.", null);

    public static FieldMateException UserDisabled() =>
        new(ErrorCodes.UserDisabled, 403, "This FieldMate account is disabled.", null);

    // One response for unknown, expired, revoked, already-used and wrong-recipient invitations (no enumeration).
    public static FieldMateException InvitationInvalid(string reason) =>
        new(ErrorCodes.InvitationInvalid, 403, "This invitation is not valid.", reason);

    public static FieldMateException Validation(string message) =>
        new(ErrorCodes.ValidationFailed, 400, message, null);

    public static FieldMateException OrganisationContextRequired() =>
        new(ErrorCodes.OrgContextRequired, 400, "An organisation must be selected for this operation.", null);

    public static FieldMateException OrganisationContextInvalid() =>
        new(ErrorCodes.OrgContextInvalid, 400, "The organisation identifier is not valid.", null);

    // Deliberately identical for "organisation does not exist" and "not a member" to prevent organisation enumeration.
    public static FieldMateException OrganisationMembershipDenied() =>
        new(ErrorCodes.OrgMembershipDenied, 403, "You do not have access to this organisation.", null);

    public static FieldMateException AccessDenied(string? reason) =>
        new(ErrorCodes.AccessDenied, 403, "You do not have permission to perform this action.", reason);
}
