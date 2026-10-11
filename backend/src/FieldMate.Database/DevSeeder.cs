using FieldMate.Core.Onboarding;
using Npgsql;

namespace FieldMate.Database;

/// <summary>
/// Development/test-only data: two neutral demo organisations, and invitations into them. Users are never inserted
/// here: a person becomes a FieldMate user only by creating an organisation or accepting an invitation via the API.
/// </summary>
public sealed class DevSeeder(NpgsqlDataSource dataSource)
{
    public static readonly Guid AlphaOrganisationId = Guid.Parse("0192f000-0000-7000-8000-00000000a001");
    public static readonly Guid BetaOrganisationId = Guid.Parse("0192f000-0000-7000-8000-00000000b001");

    public async Task SeedOrganisationsAsync(CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            INSERT INTO core.organisation (id, name) VALUES
                ($1, 'Demo Organisation Alpha'),
                ($2, 'Demo Organisation Beta')
            ON CONFLICT (id) DO NOTHING
            """);
        command.Parameters.Add(new NpgsqlParameter<Guid> { TypedValue = AlphaOrganisationId });
        command.Parameters.Add(new NpgsqlParameter<Guid> { TypedValue = BetaOrganisationId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Issues an invitation with a system role and returns the one-time secret token. Only its hash is stored.
    /// When <paramref name="invitedEmail"/> is set, only an identity with that IdP-verified email can accept.
    /// </summary>
    public async Task<(Guid InvitationId, string Token)> CreateInvitationAsync(
        Guid organisationId,
        string roleCode,
        string? invitedEmail,
        bool createWorker,
        TimeSpan validFor,
        CancellationToken cancellationToken)
    {
        var (token, hash) = InvitationTokens.Create();
        await using var command = dataSource.CreateCommand("""
            INSERT INTO iam.invitation (id, organisation_id, role_id, token_hash, invited_email, create_worker, expires_at)
            SELECT $1, $2, r.id, $3, $4, $5, now() + $6
            FROM iam.role r
            WHERE r.code = $7 AND r.organisation_id IS NULL AND r.status = 'ACTIVE'
            RETURNING id
            """);
        command.Parameters.Add(new NpgsqlParameter<Guid> { TypedValue = Guid.CreateVersion7() });
        command.Parameters.Add(new NpgsqlParameter<Guid> { TypedValue = organisationId });
        command.Parameters.Add(new NpgsqlParameter<byte[]> { TypedValue = hash });
        command.Parameters.Add(new NpgsqlParameter<string?> { TypedValue = invitedEmail });
        command.Parameters.Add(new NpgsqlParameter<bool> { TypedValue = createWorker });
        command.Parameters.Add(new NpgsqlParameter<TimeSpan> { TypedValue = validFor });
        command.Parameters.Add(new NpgsqlParameter<string> { TypedValue = roleCode.ToUpperInvariant() });

        var invitationId = await command.ExecuteScalarAsync(cancellationToken) as Guid?
            ?? throw new InvalidOperationException($"Unknown or inactive system role '{roleCode}'.");
        return (invitationId, token);
    }
}
