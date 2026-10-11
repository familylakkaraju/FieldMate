namespace FieldMate.Core.Identity;

/// <summary>
/// The narrow boundary around the authentication provider (CR AP-12). Cognito today; Entra, Ping, Auth0 or any
/// OIDC broker later. Replacing the provider means a new adapter and new <c>iam.authentication_identity</c> rows,
/// never a change to the canonical FieldMate user or any business relationship.
/// </summary>
/// <remarks>
/// Mapping to the CR's indicative interface: <c>validateToken</c>, <c>resolveSubject</c> and <c>getClaims</c> are
/// one call returning <see cref="AuthenticatedPrincipal"/>; <c>beginPasswordReset</c> and <c>logout</c> are
/// provider-hosted entry points because FieldMate never handles credentials itself.
/// </remarks>
public interface IIdentityProviderAdapter
{
    /// <summary>
    /// Validates the presented credential (signature, issuer, audience/client, expiry, token use) and maps it to a
    /// provider-neutral principal. Returns a failure rather than throwing for an invalid credential.
    /// </summary>
    ValueTask<TokenValidationOutcome> ValidateTokenAsync(string bearerToken, CancellationToken cancellationToken);

    /// <summary>Provider-hosted sign-in, registration, password reset and logout entry points.</summary>
    IdentityEntryPoints GetEntryPoints();
}

public sealed record TokenValidationOutcome(AuthenticatedPrincipal? Principal, string? FailureReason)
{
    public bool IsValid => Principal is not null;

    public static TokenValidationOutcome Success(AuthenticatedPrincipal principal) => new(principal, null);

    public static TokenValidationOutcome Failure(string reason) => new(null, reason);
}

/// <summary>What a public client needs to start an OAuth 2.0 authorization-code + PKCE flow, plus hosted pages.</summary>
public sealed record IdentityEntryPoints(
    string? Issuer,
    string? AuthorizationEndpoint,
    string? TokenEndpoint,
    string? ClientId,
    IReadOnlyList<string> Scopes,
    string? RegistrationUrl,
    string? PasswordResetUrl,
    string? LogoutUrl)
{
    public static IdentityEntryPoints From(IdentityOptions options) => new(
        options.Issuer,
        options.EntryPoints.AuthorizationEndpoint,
        options.EntryPoints.TokenEndpoint,
        options.EntryPoints.ClientId,
        options.EntryPoints.Scopes,
        options.EntryPoints.RegistrationUrl,
        options.EntryPoints.PasswordResetUrl,
        options.EntryPoints.LogoutUrl);
}
