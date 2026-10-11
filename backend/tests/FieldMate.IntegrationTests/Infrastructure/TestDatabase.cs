using FieldMate.Database;
using Npgsql;

namespace FieldMate.IntegrationTests.Infrastructure;

/// <summary>A throwaway PostgreSQL database per test class, migrated with the real migration runner.</summary>
public sealed class TestDatabase : IAsyncDisposable
{
    public const string AppRolePassword = "fieldmate_app_test_only";

    // fieldmate_app is a cluster-wide role; serialise migrations so parallel test classes don't race to create it.
    private static readonly SemaphoreSlim MigrationGate = new(1, 1);

    private TestDatabase(string name, string ownerConnectionString, string appConnectionString)
    {
        Name = name;
        OwnerConnectionString = ownerConnectionString;
        AppConnectionString = appConnectionString;
        Owner = NpgsqlDataSource.Create(ownerConnectionString);
    }

    public static string? AdminConnectionString => Environment.GetEnvironmentVariable("FIELDMATE_TEST_DB");

    public static bool IsConfigured => !string.IsNullOrWhiteSpace(AdminConnectionString);

    /// <summary>In CI a missing database must fail the build rather than silently skip the integration suite.</summary>
    public static bool RequiredByEnvironment =>
        string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase);

    public string Name { get; }

    public string OwnerConnectionString { get; }

    public string AppConnectionString { get; }

    /// <summary>Connections as the database owner (the migration identity) for arranging and asserting state.</summary>
    public NpgsqlDataSource Owner { get; }

    public static async Task<TestDatabase> CreateAsync(bool migrate = true)
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("FIELDMATE_TEST_DB is not set.");
        }

        var name = $"fm_test_{Guid.NewGuid():N}"[..20];
        await using (var admin = new NpgsqlConnection(AdminConnectionString))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", admin);
            await create.ExecuteNonQueryAsync();
        }

        var owner = new NpgsqlConnectionStringBuilder(AdminConnectionString) { Database = name }.ConnectionString;
        var app = new NpgsqlConnectionStringBuilder(AdminConnectionString)
        {
            Database = name,
            Username = "fieldmate_app",
            Password = AppRolePassword,
            MaxPoolSize = 10,
        }.ConnectionString;

        var database = new TestDatabase(name, owner, app);
        if (migrate)
        {
            await database.MigrateAsync();
        }

        return database;
    }

    public MigrationRunner CreateRunner(TextWriter? log = null) =>
        new(Owner, MigrationCatalog.LoadEmbedded(), log ?? TextWriter.Null);

    public async Task MigrateAsync()
    {
        await MigrationGate.WaitAsync();
        try
        {
            await CreateRunner().UpAsync(null, CancellationToken.None);
            // Local stand-in for RDS IAM authentication: the API connects as the least-privilege runtime role.
            await ExecuteAsync($"ALTER ROLE fieldmate_app WITH LOGIN PASSWORD '{AppRolePassword}'");
        }
        finally
        {
            MigrationGate.Release();
        }
    }

    public async Task ExecuteAsync(string sql, params object[] parameters)
    {
        await using var command = Owner.CreateCommand(sql);
        foreach (var parameter in parameters)
        {
            command.Parameters.Add(new NpgsqlParameter { Value = parameter });
        }

        await command.ExecuteNonQueryAsync();
    }

    public async Task<T> ScalarAsync<T>(string sql, params object[] parameters)
    {
        await using var command = Owner.CreateCommand(sql);
        foreach (var parameter in parameters)
        {
            command.Parameters.Add(new NpgsqlParameter { Value = parameter });
        }

        return (T)(await command.ExecuteScalarAsync())!;
    }

    public async ValueTask DisposeAsync()
    {
        await Owner.DisposeAsync();
        NpgsqlConnection.ClearAllPools();
        await using var admin = new NpgsqlConnection(AdminConnectionString);
        await admin.OpenAsync();
        await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{Name}\" WITH (FORCE)", admin);
        await drop.ExecuteNonQueryAsync();
    }
}
