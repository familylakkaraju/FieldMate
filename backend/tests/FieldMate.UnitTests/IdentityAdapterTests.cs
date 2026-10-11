using Amazon.Lambda.APIGatewayEvents;
using FieldMate.Aws;
using FieldMate.Core.Identity;
using FieldMate.Core.Identity.Oidc;
using FieldMate.Core.Identity.Tokens;
using FieldMate.Tests.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Time.Testing;

namespace FieldMate.UnitTests;

public sealed class IdentityAdapterTests : IDisposable
{
    private readonly TestTokenIssuer _tokens = new();

    private static IdentityOptions Options() => new()
    {
        Issuer = TestTokenIssuer.Issuer,
        Audiences = [TestTokenIssuer.ClientId],
        RequiredClaims = new() { ["token_use"] = "access" },
        ProviderName = "COGNITO",
    };

    public void Dispose() => _tokens.Dispose();

    [Fact]
    public async Task Oidc_adapter_accepts_a_valid_access_token_and_maps_a_provider_neutral_principal()
    {
        var adapter = new OidcJwtIdentityProviderAdapter(Options(), new StaticSigningKeyProvider(_tokens.JwksJson));

        var outcome = await adapter.ValidateTokenAsync(
            _tokens.CreateAccessToken("sub-1", "Ann@Example.test", "Ann"), TestContext.Current.CancellationToken);

        Assert.True(outcome.IsValid);
        Assert.Equal(new ProviderSubject(TestTokenIssuer.Issuer, "sub-1"), outcome.Principal!.Subject);
        Assert.Equal("COGNITO", outcome.Principal.Provider);
        Assert.Equal(IdentityType.Native, outcome.Principal.IdentityType);
        Assert.Equal("Ann@Example.test", outcome.Principal.Email);
        Assert.True(outcome.Principal.EmailVerified);
        Assert.Null(outcome.Principal.UpstreamSubject);
    }

    [Fact]
    public async Task Oidc_adapter_rejects_symmetric_and_unsigned_algorithms()
    {
        var adapter = new OidcJwtIdentityProviderAdapter(Options(), new StaticSigningKeyProvider(_tokens.JwksJson));
        var hmacKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(new byte[32]);
        var hmacToken = _tokens.CreateAccessToken("sub-2", signingCredentials: new(hmacKey, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256));
        var unsigned = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler().CreateToken(
            """{"iss":"https://issuer.test.fieldmate.local/pool-test","sub":"x","client_id":"test-web-client","token_use":"access","exp":4102444800}""");

        Assert.False((await adapter.ValidateTokenAsync(hmacToken, TestContext.Current.CancellationToken)).IsValid);
        Assert.False((await adapter.ValidateTokenAsync(unsigned, TestContext.Current.CancellationToken)).IsValid);
    }

    [Fact]
    public async Task Gateway_adapter_maps_verified_claims_and_re_checks_them()
    {
        var time = new FakeTimeProvider(DateTimeOffset.FromUnixTimeSeconds(1_800_000_000));
        var claims = new Dictionary<string, string>
        {
            ["iss"] = TestTokenIssuer.Issuer,
            ["sub"] = "cognito-sub",
            ["client_id"] = TestTokenIssuer.ClientId,
            ["token_use"] = "access",
            ["exp"] = "1800000600",
            ["email"] = "gail@example.test",
            ["email_verified"] = "true",
            ["idp"] = "Google",
            ["idp_subject"] = "1098",
        };

        var valid = await GatewayAdapter(claims, time).ValidateTokenAsync("ignored", TestContext.Current.CancellationToken);
        Assert.True(valid.IsValid);
        Assert.Equal("GOOGLE", valid.Principal!.Provider);
        Assert.Equal(IdentityType.Federated, valid.Principal.IdentityType);
        Assert.Equal("1098", valid.Principal.UpstreamSubject);

        time.Advance(TimeSpan.FromHours(1));
        Assert.Equal("token_expired", (await GatewayAdapter(claims, time).ValidateTokenAsync("ignored", TestContext.Current.CancellationToken)).FailureReason);
    }

    [Fact]
    public async Task Gateway_adapter_rejects_requests_that_did_not_pass_the_authorizer()
    {
        var accessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        var adapter = new ApiGatewayVerifiedClaimsAdapter(accessor, Options(), TimeProvider.System);

        var outcome = await adapter.ValidateTokenAsync("forged", TestContext.Current.CancellationToken);

        Assert.Equal("gateway_claims_missing", outcome.FailureReason);
    }

    [Theory]
    [InlineData("issuer", "https://other", "issuer_mismatch")]
    [InlineData("client_id", "other-client", "audience_mismatch")]
    [InlineData("token_use", "id", "claim_mismatch:token_use")]
    public void Claim_rules_reject_mismatches(string claim, string value, string reason)
    {
        var claims = new Dictionary<string, string>
        {
            ["iss"] = TestTokenIssuer.Issuer,
            ["sub"] = "s",
            ["client_id"] = TestTokenIssuer.ClientId,
            ["token_use"] = "access",
        };
        claims[claim == "issuer" ? "iss" : claim] = value;

        Assert.Equal(reason, TokenClaimRules.Validate(new TokenClaims(claims, []), Options(), now: null));
    }

    [Fact]
    public void Aud_takes_precedence_over_client_id_like_api_gateway()
    {
        var claims = new Dictionary<string, string>
        {
            ["iss"] = TestTokenIssuer.Issuer,
            ["sub"] = "s",
            ["client_id"] = TestTokenIssuer.ClientId,
            ["token_use"] = "access",
        };

        Assert.Equal("audience_mismatch", TokenClaimRules.Validate(new TokenClaims(claims, ["another-api"]), Options(), null));
        Assert.Null(TokenClaimRules.Validate(new TokenClaims(claims, [TestTokenIssuer.ClientId]), Options(), null));
    }

    [Theory]
    [InlineData("Google", "GOOGLE")]
    [InlineData("Microsoft Entra", "MICROSOFT_ENTRA")]
    [InlineData("  okta-workforce ", "OKTA_WORKFORCE")]
    [InlineData("!!!", "UNKNOWN")]
    public void Provider_codes_are_normalised(string input, string expected) =>
        Assert.Equal(expected, ProviderClaimMapper.NormaliseProviderCode(input));

    [Fact]
    public void Gateway_array_claims_are_parsed() =>
        Assert.Equal(["a", "b"], TokenClaims.ParseGatewayArray("[a b]"));

    private static ApiGatewayVerifiedClaimsAdapter GatewayAdapter(Dictionary<string, string> claims, TimeProvider time)
    {
        var http = new DefaultHttpContext();
        http.Items[ApiGatewayVerifiedClaimsAdapter.LambdaRequestObjectKey] = new APIGatewayHttpApiV2ProxyRequest
        {
            RequestContext = new APIGatewayHttpApiV2ProxyRequest.ProxyRequestContext
            {
                Authorizer = new APIGatewayHttpApiV2ProxyRequest.AuthorizerDescription
                {
                    Jwt = new APIGatewayHttpApiV2ProxyRequest.AuthorizerDescription.JwtDescription { Claims = claims },
                },
            },
        };
        return new ApiGatewayVerifiedClaimsAdapter(new HttpContextAccessor { HttpContext = http }, Options(), time);
    }
}
