using FieldMate.Core.Identity.Tokens;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FieldMate.Core.Identity.Oidc;

/// <summary>
/// Standards-based adapter: validates RS256 JWTs from any OIDC issuer (Cognito, Entra, Auth0, Ping, ...) against
/// its JWKS. Used for local development, tests and any non-API-Gateway hosting.
/// </summary>
public sealed class OidcJwtIdentityProviderAdapter(IdentityOptions options, ISigningKeyProvider signingKeys) : IIdentityProviderAdapter
{
    private const int MaxTokenLength = 16 * 1024;

    private readonly JsonWebTokenHandler _handler = new() { MapInboundClaims = false };

    public async ValueTask<TokenValidationOutcome> ValidateTokenAsync(string bearerToken, CancellationToken cancellationToken)
    {
        if (bearerToken.Length > MaxTokenLength)
        {
            return TokenValidationOutcome.Failure("token_too_large");
        }

        var result = await ValidateSignatureAndLifetimeAsync(bearerToken, refreshKeys: false, cancellationToken);
        if (result.Exception is SecurityTokenSignatureKeyNotFoundException)
        {
            // Unknown kid: the issuer may have rotated keys since they were cached.
            result = await ValidateSignatureAndLifetimeAsync(bearerToken, refreshKeys: true, cancellationToken);
        }

        if (!result.IsValid)
        {
            return TokenValidationOutcome.Failure(Describe(result.Exception));
        }

        var claims = TokenClaims.FromJsonWebToken((JsonWebToken)result.SecurityToken);
        var failure = TokenClaimRules.Validate(claims, options, now: null);
        return failure is null
            ? TokenValidationOutcome.Success(ProviderClaimMapper.Map(claims, options))
            : TokenValidationOutcome.Failure(failure);
    }

    public IdentityEntryPoints GetEntryPoints() => IdentityEntryPoints.From(options);

    private async Task<TokenValidationResult> ValidateSignatureAndLifetimeAsync(
        string token, bool refreshKeys, CancellationToken cancellationToken)
    {
        var keys = await signingKeys.GetKeysAsync(refreshKeys, cancellationToken);
        return await _handler.ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = options.Issuer,
            ValidateIssuer = true,
            // Audience is checked by TokenClaimRules (aud, or client_id when aud is absent), matching API Gateway.
            ValidateAudience = false,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ClockSkew = TimeSpan.FromSeconds(options.ClockSkewSeconds),
            IssuerSigningKeys = keys,
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
        });
    }

    private static string Describe(Exception? exception) => exception switch
    {
        SecurityTokenExpiredException => "token_expired",
        SecurityTokenNotYetValidException => "token_not_yet_valid",
        SecurityTokenNoExpirationException => "expiry_missing",
        SecurityTokenInvalidIssuerException => "issuer_mismatch",
        SecurityTokenSignatureKeyNotFoundException => "signing_key_not_found",
        SecurityTokenInvalidSignatureException => "signature_invalid",
        SecurityTokenInvalidAlgorithmException => "algorithm_not_allowed",
        SecurityTokenMalformedException or ArgumentException => "token_malformed",
        _ => "token_invalid",
    };
}
