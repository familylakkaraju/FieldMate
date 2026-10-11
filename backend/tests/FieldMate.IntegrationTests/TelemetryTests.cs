using System.Net;
using FieldMate.Api.Hosting;
using FieldMate.IntegrationTests.Infrastructure;

namespace FieldMate.IntegrationTests;

/// <summary>CR §19 Telemetry: one minimal, organisation-traceable record per request, with no sensitive data.</summary>
public sealed class TelemetryTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [DatabaseFact]
    public async Task A_tenant_request_emits_exactly_one_record_with_organisation_user_and_correlation()
    {
        var (token, owner) = await NewOwnerAsync();
        var correlationId = $"corr-{Guid.NewGuid():N}";

        var response = await SendAsync(HttpMethod.Get, "/me/context", token, owner.OrganisationId, correlationId: correlationId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(correlationId, response.Headers.GetValues(RequestPipelineMiddleware.CorrelationHeader).Single());
        var record = Assert.Single(Fixture.Telemetry.ForCorrelation(correlationId));
        Assert.Equal("INFO", record.Level);
        Assert.Equal("GetOrganisationContext", record.Operation);
        Assert.Equal("ORGANISATION", record.Scope);
        Assert.Equal(owner.OrganisationId, record.OrganisationId);
        Assert.Equal(owner.UserId, record.UserId);
        Assert.Equal("/me/context", record.Route);
        Assert.Equal("test", record.Environment);
        Assert.Null(record.ErrorCode);
    }

    [DatabaseFact]
    public async Task A_denied_organisation_is_recorded_as_requested_not_trusted()
    {
        var (token, _) = await NewOwnerAsync();
        var foreignOrganisation = Guid.NewGuid();
        var correlationId = $"deny-{Guid.NewGuid():N}";

        await SendAsync(HttpMethod.Get, "/me/context", token, foreignOrganisation, correlationId: correlationId);

        var record = Assert.Single(Fixture.Telemetry.ForCorrelation(correlationId));
        Assert.Equal("WARN", record.Level);
        Assert.Equal("ORG_MEMBERSHIP_DENIED", record.ErrorCode);
        Assert.Equal("PLATFORM", record.Scope);
        Assert.Null(record.OrganisationId);
        Assert.Equal(foreignOrganisation, record.RequestedOrganisationId);
    }

    [DatabaseFact]
    public async Task Problem_responses_carry_the_correlation_id_and_unsafe_ids_are_replaced()
    {
        var unsafeId = "bad id with spaces";

        var response = await SendAsync(HttpMethod.Get, "/me", correlationId: unsafeId);

        var echoed = response.Headers.GetValues(RequestPipelineMiddleware.CorrelationHeader).Single();
        Assert.NotEqual(unsafeId, echoed);
        Assert.Equal(echoed, (await ReadAsync<ProblemBody>(response))!.CorrelationId);
        Assert.Single(Fixture.Telemetry.ForCorrelation(echoed));
    }

    [DatabaseFact]
    public async Task Tokens_and_authorization_headers_never_reach_telemetry()
    {
        var (token, owner) = await NewOwnerAsync();
        var expired = Tokens.CreateAccessToken(NewSubject(), expiresUtc: DateTime.UtcNow.AddHours(-1));

        await GetAsync("/me", token);
        await GetAsync("/me/context", token, owner.OrganisationId);
        await GetAsync("/me", expired);

        var rendered = Fixture.Telemetry.RenderedLines;
        Assert.DoesNotContain(token, rendered, StringComparison.Ordinal);
        Assert.DoesNotContain(expired, rendered, StringComparison.Ordinal);
        Assert.DoesNotContain("Bearer", rendered, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("eyJ", rendered, StringComparison.Ordinal);
    }

    [DatabaseFact]
    public async Task Successful_health_checks_are_not_logged()
    {
        var correlationId = $"health-{Guid.NewGuid():N}";

        await SendAsync(HttpMethod.Get, "/health", correlationId: correlationId);

        Assert.Empty(Fixture.Telemetry.ForCorrelation(correlationId));
    }

    [DatabaseFact]
    public async Task Onboarding_is_attributed_to_the_new_organisation()
    {
        var correlationId = $"onboard-{Guid.NewGuid():N}";
        var token = Tokens.CreateAccessToken(NewSubject());

        var response = await SendAsync(HttpMethod.Post, "/onboarding/create-business", token, body: new { name = "Traced Org" },
            idempotencyKey: Guid.NewGuid(), correlationId: correlationId);
        var result = (await ReadAsync<Api.Endpoints.OnboardingResponse>(response))!;

        var record = Assert.Single(Fixture.Telemetry.ForCorrelation(correlationId));
        Assert.Equal("ExecuteCreateBusiness", record.Operation);
        Assert.Equal(result.OrganisationId, record.OrganisationId);
        Assert.Equal(result.UserId, record.UserId);
    }
}
