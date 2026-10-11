using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using Npgsql;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace FieldMate.Database;

/// <summary>
/// fieldmate-db-ops-{env}: runs migrations and dev-only seeding from inside the VPC, where the private RDS instance is
/// reachable. Invoked by the deployment pipeline (never by API Gateway). Handler:
/// <c>FieldMate.Database::FieldMate.Database.DbOpsFunction::HandleAsync</c>.
/// </summary>
public sealed class DbOpsFunction
{
    public async Task<DbOpsResponse> HandleAsync(DbOpsRequest request, ILambdaContext context)
    {
        var environment = Required("FIELDMATE_ENVIRONMENT");
        if (string.IsNullOrEmpty(request.Password))
        {
            throw new ArgumentException("password is required.");
        }

        var connection = new NpgsqlConnectionStringBuilder
        {
            Host = Required("FIELDMATE_DB_HOST"),
            Port = int.Parse(Environment.GetEnvironmentVariable("FIELDMATE_DB_PORT") ?? "5432"),
            Database = Required("FIELDMATE_DB_NAME"),
            Username = Required("FIELDMATE_DB_USERNAME"),
            Password = request.Password,
            SslMode = SslMode.VerifyFull,
            RootCertificate = Required("FIELDMATE_DB_ROOT_CERTIFICATE"),
            Pooling = false,
            Timeout = 15,
            ApplicationName = "fieldmate-db-ops",
        };
        request.Password = null;

        using var cancellation = new CancellationTokenSource(context.RemainingTime - TimeSpan.FromSeconds(10));
        await using var dataSource = NpgsqlDataSource.Create(connection.ConnectionString);
        var log = new StringWriter();
        var outcome = await DbOperations.ExecuteAsync(request, dataSource, environment, log, cancellation.Token);

        // Log lines never contain secrets; the invitation token travels only in the response.
        var lines = log.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var line in lines)
        {
            context.Logger.LogInformation(line);
        }

        return new DbOpsResponse(request.Operation, environment, outcome.AppliedVersions, lines, outcome.InvitationToken);
    }

    private static string Required(string name) =>
        Environment.GetEnvironmentVariable(name) ?? throw new InvalidOperationException($"{name} is not set.");
}
