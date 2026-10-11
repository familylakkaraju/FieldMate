using System.Collections.Concurrent;
using System.Net.Http.Json;
using FieldMate.Api.Access;
using FieldMate.Api.Endpoints;
using FieldMate.Api.Hosting;
using FieldMate.Core.Access;
using FieldMate.Core.Telemetry;
using FieldMate.Database;
using FieldMate.Tests.Shared;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FieldMate.IntegrationTests.Infrastructure;

/// <summary>Captures telemetry both as events and as the exact JSON lines that would reach CloudWatch.</summary>
public sealed class CapturingTelemetrySink : ITelemetrySink
{
    private readonly StringWriter _lines = new();
    private readonly JsonLineTelemetrySink _json;

    public CapturingTelemetrySink() => _json = new JsonLineTelemetrySink(_lines);

    public ConcurrentQueue<TelemetryEvent> Events { get; } = new();

    public string RenderedLines
    {
        get
        {
            lock (_lines)
            {
                return _lines.ToString();
            }
        }
    }

    public void Write(TelemetryEvent telemetryEvent)
    {
        Events.Enqueue(telemetryEvent);
        lock (_lines)
        {
            _json.Write(telemetryEvent);
        }
    }

    public IReadOnlyList<TelemetryEvent> ForCorrelation(string correlationId) =>
        [.. Events.Where(e => e.CorrelationId == correlationId)];
}

internal static class TestHostSettings
{
    public static Dictionary<string, string?> For(string appConnectionString, TestTokenIssuer tokens) => new()
    {
        ["FieldMate:Environment"] = "test",
        ["Identity:Mode"] = "Oidc",
        ["Identity:ProviderName"] = "COGNITO",
        ["Identity:Issuer"] = TestTokenIssuer.Issuer,
        ["Identity:Audiences:0"] = TestTokenIssuer.ClientId,
        ["Identity:RequiredClaims:token_use"] = "access",
        ["Identity:Oidc:SigningKeysJson"] = tokens.JwksJson,
        ["Identity:EntryPoints:ClientId"] = TestTokenIssuer.ClientId,
        ["Identity:EntryPoints:AuthorizationEndpoint"] = "https://auth.test.fieldmate.local/oauth2/authorize",
        ["Database:ConnectionString"] = appConnectionString,
    };
}

/// <summary>The real API (Program) in-process, with telemetry captured.</summary>
public sealed class FieldMateApiFactory(string appConnectionString, TestTokenIssuer tokens) : WebApplicationFactory<Program>
{
    public CapturingTelemetrySink Telemetry { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        foreach (var (key, value) in TestHostSettings.For(appConnectionString, tokens))
        {
            builder.UseSetting(key, value);
        }

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<ITelemetrySink>();
            services.AddSingleton<ITelemetrySink>(Telemetry);
        });
    }
}

/// <summary>
/// Test-only host: the production composition (services, request pipeline, foundation endpoints) plus probe routes
/// guarded by permissions that no V00 public endpoint uses. It proves Access Core's role-permission and per-
/// organisation behaviour without adding scaffolding routes to the public API (FM-P01).
/// </summary>
public sealed class AccessProbeHost : IAsyncDisposable
{
    public const string TeamReadProbe = "/__probe/team-read";

    private readonly WebApplication _app;

    private AccessProbeHost(WebApplication app)
    {
        _app = app;
        Client = app.GetTestClient();
    }

    public HttpClient Client { get; }

    public static async Task<AccessProbeHost> StartAsync(string appConnectionString, TestTokenIssuer tokens)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(TestHostSettings.For(appConnectionString, tokens));
        builder.Services.AddFieldMateFoundation(builder.Configuration);
        builder.Services.RemoveAll<ITelemetrySink>();
        builder.Services.AddSingleton<ITelemetrySink>(new CapturingTelemetrySink());

        var app = builder.Build();
        app.UseMiddleware<RequestPipelineMiddleware>();
        app.MapFoundationEndpoints();
        app.MapGet(TeamReadProbe, (HttpContext http) => Results.Ok(new ProbeResponse(http.GetRequestContext().OrganisationId)))
            .WithName("ProbeTeamRead")
            .RequirePermission(Permissions.TeamRead);

        await app.StartAsync();
        return new AccessProbeHost(app);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _app.DisposeAsync();
    }
}

public sealed record ProbeResponse(Guid OrganisationId);

/// <summary>One migrated database and one in-process API per test class.</summary>
public sealed class ApiFixture : IAsyncLifetime
{
    public TestTokenIssuer Tokens { get; } = new();

    public TestDatabase Database { get; private set; } = null!;

    public FieldMateApiFactory Factory { get; private set; } = null!;

    public HttpClient Client { get; private set; } = null!;

    /// <summary>Same database and token issuer as <see cref="Client"/>, plus test-only permission probes.</summary>
    public AccessProbeHost Probe { get; private set; } = null!;

    public CapturingTelemetrySink Telemetry => Factory.Telemetry;

    public async ValueTask InitializeAsync()
    {
        if (DatabaseRequirement.SkipReason is not null)
        {
            return;
        }

        Database = await TestDatabase.CreateAsync();
        Factory = new FieldMateApiFactory(Database.AppConnectionString, Tokens);
        Client = Factory.CreateClient();
        Probe = await AccessProbeHost.StartAsync(Database.AppConnectionString, Tokens);
    }

    public async ValueTask DisposeAsync()
    {
        if (Probe is not null)
        {
            await Probe.DisposeAsync();
        }

        if (Factory is not null)
        {
            await Factory.DisposeAsync();
        }

        if (Database is not null)
        {
            await Database.DisposeAsync();
        }

        Tokens.Dispose();
    }
}

/// <summary>Request helpers shared by the API integration tests.</summary>
public abstract class ApiTestBase(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    protected ApiFixture Fixture { get; } = fixture;

    protected TestDatabase Db => Fixture.Database;

    protected TestTokenIssuer Tokens => Fixture.Tokens;

    protected static string NewSubject() => Guid.NewGuid().ToString();

    protected Task<HttpResponseMessage> SendAsync(
        HttpMethod method,
        string path,
        string? token = null,
        Guid? organisationId = null,
        object? body = null,
        Guid? idempotencyKey = null,
        string? correlationId = null)
    {
        var request = new HttpRequestMessage(method, path);
        if (token is not null)
        {
            request.Headers.Authorization = new("Bearer", token);
        }

        if (organisationId is not null)
        {
            request.Headers.Add(AccessEndpointExtensions.OrganisationHeader, organisationId.Value.ToString());
        }

        if (idempotencyKey is not null)
        {
            request.Headers.Add(FoundationEndpoints.IdempotencyKeyHeader, idempotencyKey.Value.ToString());
        }

        if (correlationId is not null)
        {
            request.Headers.Add(RequestPipelineMiddleware.CorrelationHeader, correlationId);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return Fixture.Client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    protected Task<HttpResponseMessage> GetAsync(string path, string token, Guid? organisationId = null) =>
        SendAsync(HttpMethod.Get, path, token, organisationId);

    protected async Task<HttpResponseMessage> CreateBusinessRawAsync(string token, string name, Guid? idempotencyKey = null) =>
        await SendAsync(HttpMethod.Post, "/onboarding/create-business", token, body: new { name }, idempotencyKey: idempotencyKey ?? Guid.NewGuid());

    /// <summary>Signs a new identity up by creating a business; returns its token and onboarding result.</summary>
    protected async Task<(string Token, OnboardingResponse Result)> NewOwnerAsync(string organisationName = "Test Organisation", string? email = null)
    {
        var token = Tokens.CreateAccessToken(NewSubject(), email ?? $"{Guid.NewGuid():N}@example.test", "Test Owner");
        var response = await CreateBusinessRawAsync(token, organisationName);
        Assert.Equal(System.Net.HttpStatusCode.Created, response.StatusCode);
        return (token, (await ReadAsync<OnboardingResponse>(response))!);
    }

    protected async Task<string> InviteAsync(Guid organisationId, string role, string? email = null, bool createWorker = false, TimeSpan? validFor = null)
    {
        var (_, token) = await new DevSeeder(Db.Owner).CreateInvitationAsync(
            organisationId, role, email, createWorker, validFor ?? TimeSpan.FromDays(7), TestContext.Current.CancellationToken);
        return token;
    }

    protected Task<HttpResponseMessage> AcceptAsync(string token, string invitationToken) =>
        SendAsync(HttpMethod.Post, "/identity/accept-invitation", token, body: new { invitationToken });

    /// <summary>Signs a new identity in and joins an existing organisation by invitation.</summary>
    protected async Task<(string Token, OnboardingResponse Result)> NewMemberAsync(Guid organisationId, string role, bool createWorker = false)
    {
        var token = Tokens.CreateAccessToken(NewSubject(), $"{Guid.NewGuid():N}@example.test", $"Test {role}");
        var response = await AcceptAsync(token, await InviteAsync(organisationId, role, createWorker: createWorker));
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        return (token, (await ReadAsync<OnboardingResponse>(response))!);
    }

    protected static Task<T?> ReadAsync<T>(HttpResponseMessage response) =>
        response.Content.ReadFromJsonAsync<T>(TestContext.Current.CancellationToken);

    protected static async Task AssertProblemAsync(HttpResponseMessage response, System.Net.HttpStatusCode status, string errorCode)
    {
        Assert.Equal(status, response.StatusCode);
        var problem = await ReadAsync<ProblemBody>(response);
        Assert.NotNull(problem);
        Assert.Equal(errorCode, problem.ErrorCode);
        Assert.False(string.IsNullOrEmpty(problem.CorrelationId));
    }

    protected Task<long> CountIdentitiesAsync(string subject) =>
        Db.ScalarAsync<long>("SELECT count(*) FROM iam.authentication_identity WHERE subject = $1", subject);
}
