using System.Net;
using FieldMate.Api.Endpoints;
using FieldMate.IntegrationTests.Infrastructure;
using FieldMate.Tests.Shared;
using Microsoft.IdentityModel.Tokens;

namespace FieldMate.IntegrationTests;

/// <summary>CR §19 Identity: token validation and provider-neutral identity resolution.</summary>
public sealed class IdentityTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [DatabaseFact]
    public async Task Missing_token_is_rejected_with_a_bearer_challenge()
    {
        var response = await SendAsync(HttpMethod.Get, "/me");

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "AUTH_REQUIRED");
        Assert.Equal("Bearer", response.Headers.WwwAuthenticate.Single().Scheme);
    }

    [DatabaseTheory]
    [InlineData("expired", "token_expired")]
    [InlineData("wrong-issuer", "issuer_mismatch")]
    [InlineData("wrong-client", "audience_mismatch")]
    [InlineData("foreign-signature", "signing_key_not_found")]
    [InlineData("id-token", "claim_mismatch:token_use")]
    [InlineData("garbage", "token_malformed")]
    public async Task Invalid_tokens_are_rejected(string kind, string expectedReason)
    {
        using var otherIssuer = new TestTokenIssuer("unknown-key");
        var subject = NewSubject();
        var token = kind switch
        {
            "expired" => Tokens.CreateAccessToken(subject, expiresUtc: DateTime.UtcNow.AddMinutes(-10)),
            "wrong-issuer" => Tokens.CreateAccessToken(subject, issuer: "https://issuer.evil.example/pool"),
            "wrong-client" => Tokens.CreateAccessToken(subject, customiseClaims: c => c["client_id"] = "some-other-client"),
            "foreign-signature" => Tokens.CreateAccessToken(subject, signingCredentials: otherIssuer.SigningCredentials),
            "id-token" => Tokens.CreateAccessToken(subject, customiseClaims: c => c["token_use"] = "id"),
            _ => "not.a.jwt",
        };
        var correlationId = $"invalid-{kind}";

        var response = await SendAsync(HttpMethod.Get, "/me", token, correlationId: correlationId);

        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "AUTH_INVALID_TOKEN");
        Assert.Contains("invalid_token", response.Headers.WwwAuthenticate.Single().Parameter);
        Assert.Equal(expectedReason, Assert.Single(Fixture.Telemetry.ForCorrelation(correlationId)).Reason);
    }

    [DatabaseFact]
    public async Task Me_returns_the_canonical_user_and_its_provider_neutral_identity()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "nora@example.test", "Nora Native");
        await CreateBusinessRawAsync(token, "Nora Org");

        var me = (await ReadAsync<CurrentUserResponse>(await GetAsync("/me", token)))!;

        Assert.Equal("Nora Native", me.DisplayName);
        Assert.Equal("nora@example.test", me.PrimaryEmail);
        Assert.Equal(new AuthenticationSummary("COGNITO", "NATIVE"), me.CurrentAuthentication);
        var identity = Assert.Single(me.LinkedIdentities);
        Assert.Equal("COGNITO", identity.Provider);
    }

    [DatabaseFact]
    public async Task Federated_identity_records_upstream_provider_and_subject()
    {
        var subject = NewSubject();
        var token = Tokens.CreateFederatedAccessToken(subject, "Google", "google-sub-123", "gina@example.test");
        await CreateBusinessRawAsync(token, "Gina Org");

        var me = (await ReadAsync<CurrentUserResponse>(await GetAsync("/me", token)))!;

        Assert.Equal(new AuthenticationSummary("GOOGLE", "FEDERATED"), me.CurrentAuthentication);
        Assert.Equal("google-sub-123", await Db.ScalarAsync<string>(
            "SELECT upstream_subject FROM iam.authentication_identity WHERE subject = $1 AND provider = 'GOOGLE' AND identity_type = 'FEDERATED'",
            subject));
    }

    [DatabaseFact]
    public async Task An_unverified_email_is_recorded_at_link_time_but_never_becomes_the_primary_email()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "unverified@example.test", emailVerified: false);
        await CreateBusinessRawAsync(token, "Unverified Org");

        var me = (await ReadAsync<CurrentUserResponse>(await GetAsync("/me", token)))!;

        Assert.Null(me.PrimaryEmail);
        Assert.Equal("unverified@example.test", await Db.ScalarAsync<string>(
            "SELECT email_at_link_time FROM iam.authentication_identity WHERE subject = $1", subject));
    }

    [DatabaseFact]
    public async Task A_disabled_user_is_denied()
    {
        var (token, owner) = await NewOwnerAsync();
        await Db.ExecuteAsync("UPDATE iam.user_profile SET status = 'DISABLED' WHERE id = $1", owner.UserId);

        await AssertProblemAsync(await GetAsync("/me", token), HttpStatusCode.Forbidden, "USER_DISABLED");
        await AssertProblemAsync(await CreateBusinessRawAsync(token, "Escape Hatch"), HttpStatusCode.Forbidden, "USER_DISABLED");
    }

    [DatabaseFact]
    public async Task Welcome_landing_is_public_and_exposes_provider_hosted_entry_points()
    {
        var response = await SendAsync(HttpMethod.Get, "/identity/welcome-landing");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var landing = (await ReadAsync<WelcomeLandingResponse>(response))!;
        Assert.Equal(TestTokenIssuer.Issuer, landing.Authentication.Issuer);
        Assert.Equal(TestTokenIssuer.ClientId, landing.Authentication.ClientId);
    }

    [DatabaseFact]
    public async Task Health_is_public_and_does_not_need_the_database()
    {
        var response = await SendAsync(HttpMethod.Get, "/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", (await ReadAsync<HealthResponse>(response))!.Status);
    }

    [DatabaseFact]
    public async Task Tokens_without_a_subject_are_rejected()
    {
        var handler = new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler();
        var token = handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = TestTokenIssuer.Issuer,
            Claims = new Dictionary<string, object> { ["client_id"] = TestTokenIssuer.ClientId, ["token_use"] = "access" },
            Expires = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = Tokens.SigningCredentials,
        });

        await AssertProblemAsync(await GetAsync("/me", token), HttpStatusCode.Unauthorized, "AUTH_INVALID_TOKEN");
    }
}
