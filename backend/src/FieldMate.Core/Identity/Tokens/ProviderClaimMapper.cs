namespace FieldMate.Core.Identity.Tokens;

/// <summary>Maps validated token claims to the provider-neutral <see cref="AuthenticatedPrincipal"/>.</summary>
public static class ProviderClaimMapper
{
    public static AuthenticatedPrincipal Map(TokenClaims claims, IdentityOptions options)
    {
        var upstreamProvider = claims.Get(options.UpstreamProviderClaim);
        var federated = upstreamProvider is not null;

        return new AuthenticatedPrincipal(
            new ProviderSubject(claims.Get("iss")!, claims.Get("sub")!),
            NormaliseProviderCode(federated ? upstreamProvider! : options.ProviderName),
            federated ? IdentityType.Federated : IdentityType.Native,
            NormaliseEmail(claims.Get("email")),
            string.Equals(claims.Get("email_verified"), "true", StringComparison.OrdinalIgnoreCase),
            Truncate(claims.Get("name"), 200),
            federated ? Truncate(claims.Get(options.UpstreamSubjectClaim), 255) : null);
    }

    /// <summary>"Google" → GOOGLE, "Microsoft Entra" → MICROSOFT_ENTRA. Matches the DB check <c>^[A-Z0-9_]{1,64}$</c>.</summary>
    public static string NormaliseProviderCode(string value)
    {
        var chars = value.Trim().ToUpperInvariant().Select(c => c is (>= 'A' and <= 'Z') or (>= '0' and <= '9') ? c : '_');
        var code = new string(chars.Take(64).ToArray()).Trim('_');
        return code.Length == 0 ? "UNKNOWN" : code;
    }

    private static string? NormaliseEmail(string? email)
    {
        var trimmed = email?.Trim();
        return trimmed is { Length: > 2 and <= 320 } && trimmed.Contains('@', StringComparison.Ordinal) ? trimmed : null;
    }

    private static string? Truncate(string? value, int max)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed.Length <= max ? trimmed : trimmed[..max];
    }
}
