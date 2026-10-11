namespace FieldMate.Core.Identity;

/// <summary>
/// The portable authentication identity key: issuer + subject (CR AP-09). Never an email address,
/// and never assumed to be a Cognito <c>sub</c> beyond being the subject issued by the configured issuer.
/// </summary>
public readonly record struct ProviderSubject(string Issuer, string Subject);

public enum IdentityType
{
    /// <summary>Credentials owned by the authentication broker itself (password and/or passkey).</summary>
    Native,

    /// <summary>Authenticated upstream (Google, Microsoft/Entra, ...) and brokered.</summary>
    Federated,
}

public static class IdentityTypeExtensions
{
    /// <summary>The persisted code (<c>iam.authentication_identity.identity_type</c>).</summary>
    public static string ToCode(this IdentityType identityType) =>
        identityType == IdentityType.Federated ? "FEDERATED" : "NATIVE";
}

/// <summary>
/// A provider-neutral, validated authentication result. This is the only identity shape that leaves the
/// identity-provider boundary; nothing downstream sees provider-specific token types.
/// </summary>
/// <param name="Provider">Normalised provider code, e.g. COGNITO, GOOGLE, MICROSOFT.</param>
/// <param name="UpstreamSubject">For federated identities, the upstream IdP's own subject. Kept so users can be
/// re-linked deterministically if the broker is replaced (CR §15) without matching on email.</param>
public sealed record AuthenticatedPrincipal(
    ProviderSubject Subject,
    string Provider,
    IdentityType IdentityType,
    string? Email,
    bool EmailVerified,
    string? DisplayName,
    string? UpstreamSubject);
