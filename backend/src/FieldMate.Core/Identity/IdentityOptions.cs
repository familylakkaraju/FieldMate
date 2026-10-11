namespace FieldMate.Core.Identity;

public sealed class IdentityOptions
{
    public const string SectionName = "Identity";

    /// <summary><c>Oidc</c>: validate JWTs in-process against JWKS (local, tests, non-AWS hosting).
    /// <c>ApiGateway</c>: the API Gateway JWT authorizer has verified the signature; re-check claims only.</summary>
    public string Mode { get; set; } = IdentityModes.Oidc;

    public string Issuer { get; set; } = "";

    /// <summary>Accepted <c>aud</c> values, or <c>client_id</c> when <c>aud</c> is absent (Cognito access tokens).
    /// Same rule API Gateway applies.</summary>
    public List<string> Audiences { get; set; } = [];

    /// <summary>Exact-match claims, e.g. <c>token_use = access</c> so ID tokens cannot be used as API credentials.</summary>
    public Dictionary<string, string> RequiredClaims { get; set; } = new(StringComparer.Ordinal);

    /// <summary>Provider code recorded for identities native to the broker, e.g. COGNITO.</summary>
    public string ProviderName { get; set; } = "OIDC";

    /// <summary>Claim naming the upstream IdP for brokered (federated) sign-ins.</summary>
    public string UpstreamProviderClaim { get; set; } = "idp";

    /// <summary>Claim carrying the upstream IdP's subject for federated sign-ins.</summary>
    public string UpstreamSubjectClaim { get; set; } = "idp_subject";

    public int ClockSkewSeconds { get; set; } = 60;

    public OidcKeyOptions Oidc { get; set; } = new();

    public EntryPointOptions EntryPoints { get; set; } = new();
}

public static class IdentityModes
{
    public const string Oidc = "Oidc";
    public const string ApiGateway = "ApiGateway";
}

public sealed class OidcKeyOptions
{
    /// <summary>JWKS endpoint, e.g. <c>{issuer}/.well-known/jwks.json</c>.</summary>
    public string? JwksUri { get; set; }

    /// <summary>Inline JWKS document (tests, air-gapped environments). Takes precedence over <see cref="JwksUri"/>.</summary>
    public string? SigningKeysJson { get; set; }
}

public sealed class EntryPointOptions
{
    public string? AuthorizationEndpoint { get; set; }

    public string? TokenEndpoint { get; set; }

    public string? ClientId { get; set; }

    public List<string> Scopes { get; set; } = [];

    public string? RegistrationUrl { get; set; }

    public string? PasswordResetUrl { get; set; }

    public string? LogoutUrl { get; set; }
}
