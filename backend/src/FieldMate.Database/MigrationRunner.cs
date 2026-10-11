using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Npgsql;

namespace FieldMate.Database;

public sealed record Migration(int Version, string Name, string UpSql, string DownSql)
{
    /// <summary>SHA-256 of the up script with normalised line endings (Windows and Linux checkouts must agree).</summary>
    public string Checksum { get; } = Convert.ToHexStringLower(
        SHA256.HashData(Encoding.UTF8.GetBytes(UpSql.ReplaceLineEndings("\n"))));
}

public sealed record AppliedMigration(int Version, string Name, string Checksum, DateTimeOffset AppliedAt);

public static partial class MigrationCatalog
{
    /// <summary>Loads the embedded <c>NNNN_name.up.sql</c> / <c>NNNN_name.down.sql</c> pairs, contiguous from 0001.</summary>
    public static IReadOnlyList<Migration> LoadEmbedded()
    {
        var assembly = typeof(MigrationCatalog).Assembly;
        var scripts = new Dictionary<(int Version, string Name), Dictionary<string, string>>();
        foreach (var resource in assembly.GetManifestResourceNames())
        {
            var match = ResourceName().Match(resource);
            if (!match.Success)
            {
                continue;
            }

            var key = (int.Parse(match.Groups[1].Value), match.Groups[2].Value);
            if (!scripts.TryGetValue(key, out var pair))
            {
                scripts[key] = pair = [];
            }

            pair[match.Groups[3].Value] = Read(assembly, resource);
        }

        var migrations = scripts
            .OrderBy(s => s.Key.Version)
            .Select(s => new Migration(
                s.Key.Version,
                s.Key.Name,
                s.Value.GetValueOrDefault("up") ?? throw new InvalidOperationException($"Migration {s.Key.Version:D4} has no up script."),
                s.Value.GetValueOrDefault("down") ?? throw new InvalidOperationException($"Migration {s.Key.Version:D4} has no down script.")))
            .ToList();

        for (var i = 0; i < migrations.Count; i++)
        {
            if (migrations[i].Version != i + 1)
            {
                throw new InvalidOperationException($"Migration versions must be contiguous from 0001; found {migrations[i].Version:D4}.");
            }
        }

        return migrations;
    }

    private static string Read(Assembly assembly, string resource)
    {
        using var stream = assembly.GetManifestResourceStream(resource)!;
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    [GeneratedRegex(@"^Migrations\.(\d{4})_([a-z0-9_]+)\.(up|down)\.sql$")]
    private static partial Regex ResourceName();
}

/// <summary>
/// Applies plain-SQL migrations, each in its own transaction, under a database advisory lock so concurrent runs
/// (two pipelines, a retried deployment) serialise. Applied scripts are checksummed; editing one is an error.
/// </summary>
public sealed class MigrationRunner(NpgsqlDataSource dataSource, IReadOnlyList<Migration> migrations, TextWriter log)
{
    private const long AdvisoryLockKey = 0x46_69_65_6C_64_4D_61_74; // "FieldMat"

    public async Task<IReadOnlyList<AppliedMigration>> UpAsync(int? targetVersion, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await LockAsync(connection, cancellationToken);
        try
        {
            var applied = await ReadAppliedAsync(connection, cancellationToken);
            VerifyChecksums(applied);

            var target = targetVersion ?? migrations.Max(m => m.Version);
            foreach (var migration in migrations.Where(m => m.Version <= target && !applied.ContainsKey(m.Version)))
            {
                var stopwatch = Stopwatch.StartNew();
                await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
                await ExecuteAsync(connection, transaction, migration.UpSql, cancellationToken);
                await using (var record = new NpgsqlCommand(
                    "INSERT INTO platform.schema_migration (version, name, checksum, execution_ms) VALUES ($1, $2, $3, $4)",
                    connection,
                    transaction))
                {
                    record.Parameters.Add(new NpgsqlParameter<int> { TypedValue = migration.Version });
                    record.Parameters.Add(new NpgsqlParameter<string> { TypedValue = migration.Name });
                    record.Parameters.Add(new NpgsqlParameter<string> { TypedValue = migration.Checksum });
                    record.Parameters.Add(new NpgsqlParameter<int> { TypedValue = (int)stopwatch.ElapsedMilliseconds });
                    await record.ExecuteNonQueryAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                await log.WriteLineAsync($"Applied {migration.Version:D4}_{migration.Name} ({stopwatch.ElapsedMilliseconds} ms)");
            }

            return [.. (await ReadAppliedAsync(connection, cancellationToken)).Values];
        }
        finally
        {
            await UnlockAsync(connection);
        }
    }

    /// <summary>Rolls back every applied migration above <paramref name="targetVersion"/>, newest first.</summary>
    public async Task<IReadOnlyList<AppliedMigration>> DownAsync(int targetVersion, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await LockAsync(connection, cancellationToken);
        try
        {
            var applied = await ReadAppliedAsync(connection, cancellationToken);
            VerifyChecksums(applied);

            foreach (var migration in migrations.Where(m => m.Version > targetVersion && applied.ContainsKey(m.Version))
                         .OrderByDescending(m => m.Version))
            {
                await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
                await ExecuteAsync(connection, transaction, migration.DownSql, cancellationToken);
                await using (var forget = new NpgsqlCommand("DELETE FROM platform.schema_migration WHERE version = $1", connection, transaction))
                {
                    forget.Parameters.Add(new NpgsqlParameter<int> { TypedValue = migration.Version });
                    await forget.ExecuteNonQueryAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                await log.WriteLineAsync($"Rolled back {migration.Version:D4}_{migration.Name}");
            }

            return [.. (await ReadAppliedAsync(connection, cancellationToken)).Values];
        }
        finally
        {
            await UnlockAsync(connection);
        }
    }

    public async Task<IReadOnlyList<AppliedMigration>> StatusAsync(CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await LockAsync(connection, cancellationToken);
        try
        {
            return [.. (await ReadAppliedAsync(connection, cancellationToken)).Values];
        }
        finally
        {
            await UnlockAsync(connection);
        }
    }

    private void VerifyChecksums(IReadOnlyDictionary<int, AppliedMigration> applied)
    {
        foreach (var migration in migrations)
        {
            if (applied.TryGetValue(migration.Version, out var record) && record.Checksum != migration.Checksum)
            {
                throw new InvalidOperationException(
                    $"Applied migration {migration.Version:D4}_{migration.Name} has been modified. Add a new migration instead.");
            }
        }
    }

    private static async Task LockAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using (var command = new NpgsqlCommand("SELECT pg_advisory_lock($1)", connection))
        {
            command.Parameters.Add(new NpgsqlParameter<long> { TypedValue = AdvisoryLockKey });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        // Created under the lock so concurrent first runs cannot race on CREATE TABLE.
        await ExecuteAsync(connection, null, """
            CREATE SCHEMA IF NOT EXISTS platform;
            CREATE TABLE IF NOT EXISTS platform.schema_migration (
                version       integer     PRIMARY KEY,
                name          text        NOT NULL,
                checksum      text        NOT NULL,
                applied_at    timestamptz NOT NULL DEFAULT now(),
                execution_ms  integer     NOT NULL
            );
            """, cancellationToken);
    }

    private static async Task UnlockAsync(NpgsqlConnection connection)
    {
        await using var command = new NpgsqlCommand("SELECT pg_advisory_unlock($1)", connection);
        command.Parameters.Add(new NpgsqlParameter<long> { TypedValue = AdvisoryLockKey });
        await command.ExecuteNonQueryAsync(CancellationToken.None);
    }

    private static async Task<IReadOnlyDictionary<int, AppliedMigration>> ReadAppliedAsync(
        NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            "SELECT version, name, checksum, applied_at FROM platform.schema_migration ORDER BY version", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var applied = new SortedDictionary<int, AppliedMigration>();
        while (await reader.ReadAsync(cancellationToken))
        {
            applied[reader.GetInt32(0)] = new AppliedMigration(
                reader.GetInt32(0), reader.GetString(1), reader.GetString(2), reader.GetFieldValue<DateTimeOffset>(3));
        }

        return applied;
    }

    private static async Task ExecuteAsync(
        NpgsqlConnection connection, NpgsqlTransaction? transaction, string sql, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction) { CommandTimeout = 300 };
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
