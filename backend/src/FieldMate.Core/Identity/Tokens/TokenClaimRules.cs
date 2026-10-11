namespace FieldMate.Core.Identity.Tokens;

/// <summary>
/// Claim checks shared by every adapter, so in-process validation and API Gateway validation accept exactly the
/// same tokens: issuer, subject, audience (or <c>client_id</c> when <c>aud</c> is absent), required claims such as
/// <c>token_use=access</c>, and optionally lifetime.
/// </summary>
public static class TokenClaimRules
{
    /// <returns>A diagnostic failure reason, or <c>null</c> when the claims are acceptable.</returns>
    /// <param name="now">When supplied, <c>exp</c>/<c>nbf</c> are checked; pass <c>null</c> when the caller already did.</param>
    public static string? Validate(TokenClaims claims, IdentityOptions options, DateTimeOffset? now)
    {
        if (!string.Equals(claims.Get("iss"), options.Issuer, StringComparison.Ordinal))
        {
            return "issuer_mismatch";
        }

        if (claims.Get("sub") is null)
        {
            return "subject_missing";
        }

        // Same precedence as API Gateway: evaluate aud when present, otherwise client_id.
        IReadOnlyList<string> presented = claims.Audiences.Count > 0
            ? claims.Audiences
            : claims.Get("client_id") is { } clientId ? [clientId] : [];
        if (!presented.Any(a => options.Audiences.Contains(a, StringComparer.Ordinal)))
        {
            return "audience_mismatch";
        }

        foreach (var (name, expected) in options.RequiredClaims)
        {
            if (!string.Equals(claims.Get(name), expected, StringComparison.Ordinal))
            {
                return $"claim_mismatch:{name}";
            }
        }

        if (now is { } instant)
        {
            var skew = TimeSpan.FromSeconds(options.ClockSkewSeconds);
            if (!long.TryParse(claims.Get("exp"), out var exp))
            {
                return "expiry_missing";
            }

            if (DateTimeOffset.FromUnixTimeSeconds(exp) <= instant - skew)
            {
                return "token_expired";
            }

            if (long.TryParse(claims.Get("nbf"), out var nbf) && DateTimeOffset.FromUnixTimeSeconds(nbf) > instant + skew)
            {
                return "token_not_yet_valid";
            }
        }

        return null;
    }
}
