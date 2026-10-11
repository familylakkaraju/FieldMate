using FieldMate.Aws;
using FieldMate.Core.Access;
using FieldMate.Core.Data;
using FieldMate.Core.Identity;
using FieldMate.Core.Identity.Oidc;
using FieldMate.Core.Onboarding;
using FieldMate.Core.Organisations;
using FieldMate.Core.Telemetry;

namespace FieldMate.Api.Hosting;

public sealed class FieldMateHostOptions
{
    public const string SectionName = "FieldMate";

    /// <summary>Environment name stamped on every telemetry record, e.g. local, dev, prod.</summary>
    public string Environment { get; set; } = "local";
}

/// <summary>Composition root. The only place that chooses AWS-specific adapters over provider-neutral ones.</summary>
public static class FoundationServices
{
    public static IServiceCollection AddFieldMateFoundation(this IServiceCollection services, IConfiguration configuration)
    {
        var host = configuration.GetSection(FieldMateHostOptions.SectionName).Get<FieldMateHostOptions>() ?? new();
        var identity = configuration.GetSection(IdentityOptions.SectionName).Get<IdentityOptions>() ?? new();
        var database = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new();
        ValidateIdentity(identity);

        services.AddSingleton(host);
        services.AddSingleton(identity);
        services.AddSingleton(database);
        services.AddSingleton(TimeProvider.System);
        services.AddHttpContextAccessor();

        // Identity provider boundary (CR AP-12).
        if (identity.Mode == IdentityModes.ApiGateway)
        {
            services.AddSingleton<IIdentityProviderAdapter, ApiGatewayVerifiedClaimsAdapter>();
        }
        else
        {
            services.AddSingleton<ISigningKeyProvider>(sp => identity.Oidc.SigningKeysJson is { Length: > 0 } jwks
                ? new StaticSigningKeyProvider(jwks)
                : new JwksSigningKeyProvider(
                    new HttpClient { Timeout = TimeSpan.FromSeconds(5) },
                    new Uri(identity.Oidc.JwksUri!),
                    sp.GetRequiredService<TimeProvider>()));
            services.AddSingleton<IIdentityProviderAdapter, OidcJwtIdentityProviderAdapter>();
        }

        // PostgreSQL. Dynamic credentials are RDS IAM tokens; the endpoint may be the instance or RDS Proxy.
        if (database.ConnectionString is null && database.Authentication == DatabaseAuthentication.Dynamic)
        {
            services.AddSingleton<IDbCredentialProvider>(_ => RdsIamCredentialProvider.FromEnvironment());
        }

        services.AddSingleton(sp => FieldMateDataSource.Create(database, sp.GetService<IDbCredentialProvider>()));
        services.AddSingleton<IdentityRepository>();
        services.AddSingleton<OnboardingRepository>();
        services.AddSingleton<OrganisationRepository>();
        services.AddSingleton<OrganisationContextService>();

        // Access Core. Later verticals register IResourcePolicy implementations here.
        services.AddSingleton<IAccessCore, AccessCore>();

        // Minimal telemetry: one structured line per request.
        services.AddSingleton<ITelemetrySink>(_ => new JsonLineTelemetrySink(Console.Out));
        services.AddScoped<RequestTelemetry>();

        return services;
    }

    private static void ValidateIdentity(IdentityOptions identity)
    {
        var problems = new List<string>();
        if (string.IsNullOrWhiteSpace(identity.Issuer))
        {
            problems.Add("Identity:Issuer");
        }

        if (identity.Audiences.Count == 0)
        {
            problems.Add("Identity:Audiences");
        }

        if (identity.Mode is not (IdentityModes.Oidc or IdentityModes.ApiGateway))
        {
            problems.Add($"Identity:Mode (must be {IdentityModes.Oidc} or {IdentityModes.ApiGateway})");
        }

        if (identity.Mode == IdentityModes.Oidc
            && string.IsNullOrWhiteSpace(identity.Oidc.SigningKeysJson)
            && !Uri.TryCreate(identity.Oidc.JwksUri, UriKind.Absolute, out _))
        {
            problems.Add("Identity:Oidc:JwksUri or Identity:Oidc:SigningKeysJson");
        }

        if (problems.Count > 0)
        {
            throw new InvalidOperationException($"Missing or invalid configuration: {string.Join(", ", problems)}.");
        }
    }
}
