using FieldMate.Database;
using FieldMate.IntegrationTests.Infrastructure;
using Npgsql;

namespace FieldMate.IntegrationTests;

/// <summary>CR §19 Data: migrations, constraints, tenant indexes and least-privilege runtime access.</summary>
public sealed class DataTests
{
    private static CancellationToken Cancel => TestContext.Current.CancellationToken;

    [DatabaseFact]
    public async Task Migrations_go_up_down_and_up_again_cleanly()
    {
        await using var db = await TestDatabase.CreateAsync(migrate: false);
        var runner = db.CreateRunner();
        var all = MigrationCatalog.LoadEmbedded().Select(m => m.Version).ToArray();

        Assert.Equal(all, (await TestDatabase.SerialisedAsync(() => runner.UpAsync(null, Cancel))).Select(m => m.Version));
        Assert.Empty(await TestDatabase.SerialisedAsync(() => runner.DownAsync(0, Cancel)));
        Assert.True(await db.ScalarAsync<bool>("SELECT to_regclass('iam.user_profile') IS NULL"));
        Assert.Equal(all, (await TestDatabase.SerialisedAsync(() => runner.UpAsync(null, Cancel))).Select(m => m.Version));
    }

    [DatabaseFact]
    public async Task Rerunning_migrations_applies_nothing()
    {
        await using var db = await TestDatabase.CreateAsync();
        var log = new StringWriter();

        await TestDatabase.SerialisedAsync(() => db.CreateRunner(log).UpAsync(null, Cancel));

        Assert.Equal("", log.ToString());
    }

    [DatabaseFact]
    public async Task A_modified_applied_migration_is_detected()
    {
        await using var db = await TestDatabase.CreateAsync();
        await db.ExecuteAsync("UPDATE platform.schema_migration SET checksum = 'tampered' WHERE version = 1");

        await Assert.ThrowsAsync<InvalidOperationException>(() => TestDatabase.SerialisedAsync(() => db.CreateRunner().UpAsync(null, Cancel)));
    }

    [DatabaseFact]
    public async Task Constraints_protect_identity_uniqueness_foreign_keys_and_tenant_consistency()
    {
        await using var db = await TestDatabase.CreateAsync();
        var a = await SeedMemberAsync(db, "OWNER");
        var b = await SeedMemberAsync(db, "OWNER");

        // One (issuer, subject) maps to exactly one FieldMate user.
        await AssertViolationAsync(db, PostgresErrorCodes.UniqueViolation, """
            INSERT INTO iam.authentication_identity (id, user_id, issuer, subject, provider, identity_type)
            VALUES (gen_random_uuid(), $1, 'https://issuer.example', $2, 'COGNITO', 'NATIVE')
            """, b.UserId, a.Subject);

        // Identities must belong to an existing user.
        await AssertViolationAsync(db, PostgresErrorCodes.ForeignKeyViolation, """
            INSERT INTO iam.authentication_identity (id, user_id, issuer, subject, provider, identity_type)
            VALUES (gen_random_uuid(), gen_random_uuid(), 'https://issuer.example', gen_random_uuid()::text, 'COGNITO', 'NATIVE')
            """);

        // One membership row per (organisation, user).
        await AssertViolationAsync(db, PostgresErrorCodes.UniqueViolation, """
            INSERT INTO iam.organisation_member (id, organisation_id, user_id, role_id)
            SELECT gen_random_uuid(), $1, $2, id FROM iam.role WHERE code = 'WORKER'
            """, a.OrganisationId, a.UserId);

        // A worker cannot point at another organisation's membership (composite FK).
        await AssertViolationAsync(db, PostgresErrorCodes.ForeignKeyViolation,
            "INSERT INTO workforce.worker (id, organisation_id, membership_id) VALUES (gen_random_uuid(), $1, $2)",
            a.OrganisationId, b.MembershipId);

        // A membership cannot use a role owned by another organisation.
        var foreignRole = Guid.CreateVersion7();
        await db.ExecuteAsync("INSERT INTO iam.role (id, organisation_id, code, name) VALUES ($1, $2, 'CUSTOM', 'Custom')", foreignRole, b.OrganisationId);
        await AssertViolationAsync(db, PostgresErrorCodes.CheckViolation,
            "UPDATE iam.organisation_member SET role_id = $1 WHERE id = $2", foreignRole, a.MembershipId);

        // System role codes are unique even though organisation_id is NULL.
        await AssertViolationAsync(db, PostgresErrorCodes.UniqueViolation,
            "INSERT INTO iam.role (id, organisation_id, code, name) VALUES (gen_random_uuid(), NULL, 'OWNER', 'Duplicate')");
    }

    [DatabaseFact]
    public async Task Tenant_and_identity_lookups_are_indexed()
    {
        await using var db = await TestDatabase.CreateAsync();

        var indexes = new Dictionary<string, string>();
        await using (var command = db.Owner.CreateCommand(
            "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname IN ('core', 'iam', 'workforce')"))
        await using (var reader = await command.ExecuteReaderAsync(Cancel))
        {
            while (await reader.ReadAsync(Cancel))
            {
                indexes[reader.GetString(0)] = reader.GetString(1);
            }
        }

        Assert.Contains("(issuer, subject)", indexes["uq_authentication_identity_issuer_subject"]);
        Assert.Contains("(user_id)", indexes["ix_authentication_identity_user_id"]);
        Assert.Contains("(organisation_id, user_id)", indexes["uq_organisation_member_user"]);
        Assert.Contains("(organisation_id, membership_id)", indexes["uq_worker_membership"]);
        Assert.Contains("(organisation_id, status)", indexes["ix_invitation_organisation_status"]);
    }

    [DatabaseFact]
    public async Task The_runtime_role_cannot_change_schema_delete_rows_or_alter_reference_data()
    {
        await using var db = await TestDatabase.CreateAsync();
        await using var app = NpgsqlDataSource.Create(db.AppConnectionString);

        foreach (var sql in new[]
                 {
                     "CREATE TABLE iam.sneaky (id int)",
                     "DELETE FROM iam.user_profile",
                     "INSERT INTO iam.permission (id, code, resource, action) VALUES (gen_random_uuid(), 'x.y', 'x', 'y')",
                     "SELECT count(*) FROM platform.schema_migration",
                 })
        {
            await using var command = app.CreateCommand(sql);
            var failure = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync(Cancel));
            Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, failure.SqlState);
        }

        await using var read = app.CreateCommand("SELECT count(*) FROM iam.role");
        Assert.Equal(4L, await read.ExecuteScalarAsync(Cancel));
    }

    [DatabaseFact]
    public async Task No_table_stores_passwords_or_password_hashes()
    {
        await using var db = await TestDatabase.CreateAsync();

        var suspicious = await db.ScalarAsync<long>("""
            SELECT count(*) FROM information_schema.columns
            WHERE table_schema IN ('core', 'iam', 'workforce', 'platform')
              AND (column_name ILIKE '%password%' OR column_name ILIKE '%salt%' OR column_name ILIKE '%credential%')
            """);

        Assert.Equal(0, suspicious);
    }

    private sealed record SeededMember(Guid OrganisationId, Guid UserId, Guid MembershipId, string Subject);

    /// <summary>Organisation + user + identity + membership in one transaction, as the onboarding flows do.</summary>
    private static async Task<SeededMember> SeedMemberAsync(TestDatabase db, string role)
    {
        var seeded = new SeededMember(Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.NewGuid().ToString());
        await using var connection = await db.Owner.OpenConnectionAsync(Cancel);
        await using var transaction = await connection.BeginTransactionAsync(Cancel);
        await using var batch = new NpgsqlBatch(connection, transaction)
        {
            BatchCommands =
            {
                Statement("INSERT INTO core.organisation (id, name) VALUES ($1, 'Seeded')", seeded.OrganisationId),
                Statement("INSERT INTO iam.user_profile (id) VALUES ($1)", seeded.UserId),
                Statement("""
                    INSERT INTO iam.authentication_identity (id, user_id, issuer, subject, provider, identity_type)
                    VALUES (gen_random_uuid(), $1, 'https://issuer.example', $2, 'COGNITO', 'NATIVE')
                    """, seeded.UserId, seeded.Subject),
                Statement("""
                    INSERT INTO iam.organisation_member (id, organisation_id, user_id, role_id, joined_at)
                    SELECT $1, $2, $3, id, now() FROM iam.role WHERE code = $4 AND organisation_id IS NULL
                    """, seeded.MembershipId, seeded.OrganisationId, seeded.UserId, role),
            },
        };
        await batch.ExecuteNonQueryAsync(Cancel);
        await transaction.CommitAsync(Cancel);
        return seeded;
    }

    private static NpgsqlBatchCommand Statement(string sql, params object[] parameters)
    {
        var command = new NpgsqlBatchCommand(sql);
        foreach (var parameter in parameters)
        {
            command.Parameters.Add(new NpgsqlParameter { Value = parameter });
        }

        return command;
    }

    private static async Task AssertViolationAsync(TestDatabase db, string sqlState, string sql, params object[] parameters)
    {
        var failure = await Assert.ThrowsAsync<PostgresException>(() => db.ExecuteAsync(sql, parameters));
        Assert.Equal(sqlState, failure.SqlState);
    }
}
