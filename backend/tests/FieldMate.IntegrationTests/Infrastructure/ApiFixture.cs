using System.Collections.Concurrent;
using System.Net.Http.Json;
using FieldMate.Api.Access;
using FieldMate.Api.Endpoints;
using FieldMate.Api.Hosting;
using FieldMate.Core.Telemetry;
using FieldMate.Database;
using FieldMate.Tests.Shared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
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

public sealed class FieldMateApiFactory(string appConnectionString, TestTokenIssuer tokens) : WebApplicationFactory<Program>
{
    public CapturingTelemetrySink Telemetry { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("FieldMate:Environment", "test");
        builder.UseSetting("Identity:Mode", "Oidc");
        builder.UseSetting("Identity:ProviderName", "COGNITO");
        builder.UseSetting("Identity:Issuer", TestTokenIssuer.Issuer);
        builder.UseSetting("Identity:Audiences:0", TestTokenIssuer.ClientId);
        builder.UseSetting("Identity:Oidc:SigningKeysJson", tokens.JwksJson);
        builder.UseSetting("Identity:EntryPoints:ClientId", TestTokenIssuer.ClientId);
        builder.UseSetting("Identity:EntryPoints:AuthorizationEndpoint", "https://auth.test.fieldmate.local/oauth2/authorize");
        builder.UseSetting("Database:ConnectionString", appConnectionString);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<ITelemetrySink>();
            services.AddSingleton<ITelemetrySink>(Telemetry);
        });
    }
}

/// <summary>One migrated database and one in-process API per test class.</summary>
public sealed class ApiFixture : IAsyncLifetime
{
    public TestTokenIssuer Tokens { get; } = new();

    public TestDatabase Database { get; private set; } = null!;

    public FieldMateApiFactory Factory { get; private set; } = null!;

    public HttpClient Client { get; private set; } = null!;

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
    }

    public async ValueTask DisposeAsync()
    {
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
