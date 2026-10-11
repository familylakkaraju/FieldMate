using FieldMate.Database;
using Npgsql;

// Local CLI for the same operations the fieldmate-db-ops Lambda performs.
//   dotnet run --project src/FieldMate.Database -- migrate [--to N]
//   dotnet run --project src/FieldMate.Database -- rollback --to N
//   dotnet run --project src/FieldMate.Database -- status
//   dotnet run --project src/FieldMate.Database -- seed-dev
//   dotnet run --project src/FieldMate.Database -- create-invitation --organisation <uuid> --role WORKER [--email a@b.c] [--worker]
// FIELDMATE_DB_CONNECTION: Npgsql connection string for the database owner. FIELDMATE_ENVIRONMENT: defaults to "local".

if (args.Length == 0 || args[0] is "-h" or "--help")
{
    Console.WriteLine("Usage: FieldMate.Database <migrate|rollback|status|seed-dev|create-invitation> [options]");
    return 1;
}

var connectionString = Environment.GetEnvironmentVariable("FIELDMATE_DB_CONNECTION");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("FIELDMATE_DB_CONNECTION is not set.");
    return 1;
}

string? Option(string name)
{
    var index = Array.IndexOf(args, name);
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}

var request = new DbOpsRequest
{
    Operation = args[0],
    TargetVersion = Option("--to") is { } to ? int.Parse(to) : null,
    OrganisationId = Option("--organisation") is { } organisation ? Guid.Parse(organisation) : null,
    Role = Option("--role"),
    InvitedEmail = Option("--email"),
    CreateWorker = args.Contains("--worker"),
};

var environment = Environment.GetEnvironmentVariable("FIELDMATE_ENVIRONMENT") ?? "local";
await using var dataSource = NpgsqlDataSource.Create(connectionString);
var outcome = await DbOperations.ExecuteAsync(request, dataSource, environment, Console.Out, CancellationToken.None);
Console.WriteLine($"Applied migrations: {(outcome.AppliedVersions.Count == 0 ? "none" : string.Join(", ", outcome.AppliedVersions.Select(v => v.ToString("D4"))))}");
if (outcome.InvitationToken is not null)
{
    Console.WriteLine($"Invitation token (shown once): {outcome.InvitationToken}");
}

return 0;
