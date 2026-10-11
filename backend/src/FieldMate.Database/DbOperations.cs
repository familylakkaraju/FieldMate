using System.Text.Json.Serialization;
using Npgsql;

namespace FieldMate.Database;

public sealed class DbOpsRequest
{
    /// <summary><c>migrate</c>, <c>rollback</c>, <c>status</c>, <c>seed-dev</c> or <c>create-invitation</c>.</summary>
    [JsonPropertyName("operation")]
    public string Operation { get; set; } = "";

    [JsonPropertyName("targetVersion")]
    public int? TargetVersion { get; set; }

    [JsonPropertyName("organisationId")]
    public Guid? OrganisationId { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("invitedEmail")]
    public string? InvitedEmail { get; set; }

    [JsonPropertyName("createWorker")]
    public bool CreateWorker { get; set; }

    /// <summary>Lambda only: the database owner password, read by the pipeline from the RDS-managed secret.
    /// Never logged and never returned.</summary>
    [JsonPropertyName("password")]
    public string? Password { get; set; }
}

/// <param name="InvitationToken">Returned once by <c>create-invitation</c> for out-of-band delivery. Never logged.</param>
public sealed record DbOpsResponse(
    string Operation,
    string Environment,
    IReadOnlyList<int> AppliedVersions,
    IReadOnlyList<string> Log,
    string? InvitationToken = null);

public sealed record DbOpsOutcome(IReadOnlyList<int> AppliedVersions, string? InvitationToken = null);

/// <summary>Database operations shared by the local CLI and the fieldmate-db-ops Lambda.</summary>
public static class DbOperations
{
    private static readonly TimeSpan InvitationValidity = TimeSpan.FromDays(7);

    public static bool IsProduction(string environment) =>
        environment.Equals("prod", StringComparison.OrdinalIgnoreCase)
        || environment.Equals("production", StringComparison.OrdinalIgnoreCase);

    public static async Task<DbOpsOutcome> ExecuteAsync(
        DbOpsRequest request, NpgsqlDataSource dataSource, string environment, TextWriter log, CancellationToken cancellationToken)
    {
        var runner = new MigrationRunner(dataSource, MigrationCatalog.LoadEmbedded(), log);
        switch (request.Operation)
        {
            case "migrate":
                return new(Versions(await runner.UpAsync(request.TargetVersion, cancellationToken)));

            case "rollback":
                // Production rollback is forward-fix or snapshot restore, never a destructive down script.
                RefuseInProduction(environment, request.Operation);
                var target = request.TargetVersion ?? throw new ArgumentException("rollback requires targetVersion.");
                return new(Versions(await runner.DownAsync(target, cancellationToken)));

            case "status":
                return new(Versions(await runner.StatusAsync(cancellationToken)));

            case "seed-dev":
                RefuseInProduction(environment, request.Operation);
                await new DevSeeder(dataSource).SeedOrganisationsAsync(cancellationToken);
                await log.WriteLineAsync(
                    $"Seeded organisations {DevSeeder.AlphaOrganisationId} (Alpha) and {DevSeeder.BetaOrganisationId} (Beta).");
                return new(Versions(await runner.StatusAsync(cancellationToken)));

            case "create-invitation":
                // Development stand-in for Team & Access "Invite Member" (a later vertical).
                RefuseInProduction(environment, request.Operation);
                var (invitationId, token) = await new DevSeeder(dataSource).CreateInvitationAsync(
                    request.OrganisationId ?? throw new ArgumentException("create-invitation requires organisationId."),
                    request.Role ?? throw new ArgumentException("create-invitation requires role."),
                    request.InvitedEmail,
                    request.CreateWorker,
                    InvitationValidity,
                    cancellationToken);
                await log.WriteLineAsync($"Invitation {invitationId} created; valid for {InvitationValidity.TotalDays:0} days.");
                return new(Versions(await runner.StatusAsync(cancellationToken)), token);

            default:
                throw new ArgumentException($"Unknown operation '{request.Operation}'.");
        }
    }

    private static void RefuseInProduction(string environment, string operation)
    {
        if (IsProduction(environment))
        {
            throw new InvalidOperationException($"'{operation}' is not permitted in production.");
        }
    }

    private static int[] Versions(IReadOnlyList<AppliedMigration> applied) => [.. applied.Select(a => a.Version)];
}
