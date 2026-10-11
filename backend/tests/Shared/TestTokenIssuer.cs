using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace FieldMate.Tests.Shared;

/// <summary>
/// A local RS256 token issuer shaped like a Cognito user pool: access tokens carry <c>client_id</c> (no <c>aud</c>)
/// and <c>token_use=access</c>, plus the profile claims added by the pre-token-generation trigger.
/// </summary>
public sealed class TestTokenIssuer : IDisposable
{
    public const string Issuer = "https://issuer.test.fieldmate.local/pool-test";
    public const string ClientId = "test-web-client";

    private readonly RSA _rsa = RSA.Create(2048);
    private readonly JsonWebTokenHandler _handler = new() { SetDefaultTimesOnTokenCreation = false };

    public TestTokenIssuer(string keyId = "test-key-1")
    {
        KeyId = keyId;
        SigningCredentials = new SigningCredentials(new RsaSecurityKey(_rsa) { KeyId = keyId }, SecurityAlgorithms.RsaSha256);
        var publicJwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(new RsaSecurityKey(_rsa.ExportParameters(false)) { KeyId = keyId });
        JwksJson = JsonSerializer.Serialize(new
        {
            keys = new[] { new { kty = publicJwk.Kty, kid = keyId, use = "sig", alg = "RS256", n = publicJwk.N, e = publicJwk.E } },
        });
    }

    public string KeyId { get; }

    public string JwksJson { get; }

    public SigningCredentials SigningCredentials { get; }

    /// <summary>Creates a Cognito-style access token for a native identity unless customised.</summary>
    public string CreateAccessToken(
        string subject,
        string? email = null,
        string? name = null,
        bool emailVerified = true,
        Action<Dictionary<string, object>>? customiseClaims = null,
        string issuer = Issuer,
        DateTime? expiresUtc = null,
        SigningCredentials? signingCredentials = null)
    {
        var now = DateTime.UtcNow;
        var claims = new Dictionary<string, object>
        {
            ["sub"] = subject,
            ["client_id"] = ClientId,
            ["token_use"] = "access",
            ["scope"] = "openid email profile",
            ["username"] = subject,
        };
        if (email is not null)
        {
            claims["email"] = email;
            claims["email_verified"] = emailVerified ? "true" : "false";
        }

        if (name is not null)
        {
            claims["name"] = name;
        }

        customiseClaims?.Invoke(claims);

        var expires = expiresUtc ?? now.AddMinutes(30);
        var issuedAt = expires <= now ? expires.AddMinutes(-60) : now.AddSeconds(-5);
        return _handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Claims = claims,
            IssuedAt = issuedAt,
            NotBefore = issuedAt,
            Expires = expires,
            SigningCredentials = signingCredentials ?? SigningCredentials,
        });
    }

    /// <summary>A brokered Google sign-in, as the pre-token-generation trigger presents it.</summary>
    public string CreateFederatedAccessToken(string subject, string upstreamProvider, string upstreamSubject, string? email = null) =>
        CreateAccessToken(subject, email, customiseClaims: c =>
        {
            c["idp"] = upstreamProvider;
            c["idp_subject"] = upstreamSubject;
        });

    public void Dispose() => _rsa.Dispose();
}
