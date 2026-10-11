using FieldMate.Core.Data;
using Npgsql;

namespace FieldMate.Core.Identity;

public sealed record FieldMateUser(Guid UserId, string Status, string? DisplayName, string? PrimaryEmail)
{
    public bool IsActive => Status == UserStatuses.Active;
}

public static class UserStatuses
{
    public const string Active = "ACTIVE";
    public const string Disabled = "DISABLED";
}

/// <summary>A persisted user resolved from an authentication identity, with whether any membership is currently valid.</summary>
public sealed record ResolvedUser(FieldMateUser User, bool HasActiveMembership);

public sealed record LinkedIdentity(string Provider, string IdentityType, DateTimeOffset LinkedAt, DateTimeOffset LastSeenAt);

/// <summary>
/// Read-side identity resolution: authentication_identity → user_profile → membership. It never creates anything;
/// users are created only by the atomic onboarding flows (create organisation, accept invitation).
/// </summary>
public sealed class IdentityRepository(NpgsqlDataSource dataSource)
{
    public async Task<ResolvedUser?> FindUserAsync(ProviderSubject subject, CancellationToken cancellationToken)
    {
        // last_seen_at is refreshed at most every 15 minutes, so steady-state requests do not write.
        await using var command = dataSource.CreateCommand("""
            WITH identity AS (
                SELECT ai.id, ai.user_id
                FROM iam.authentication_identity ai
                WHERE ai.issuer = $1 AND ai.subject = $2
            ), touched AS (
                UPDATE iam.authentication_identity t
                SET last_seen_at = now()
                FROM identity
                WHERE t.id = identity.id AND t.last_seen_at < now() - interval '15 minutes'
            )
            SELECT u.id, u.status, u.display_name, u.primary_email,
                   EXISTS (
                       SELECT 1
                       FROM iam.organisation_member m
                       JOIN core.organisation o ON o.id = m.organisation_id AND o.status = 'ACTIVE'
                       WHERE m.user_id = u.id AND m.status = 'ACTIVE')
            FROM identity
            JOIN iam.user_profile u ON u.id = identity.user_id
            """).With(subject.Issuer).With(subject.Subject);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new ResolvedUser(
            new FieldMateUser(reader.GetGuid(0), reader.GetString(1), reader.GetStringOrNull(2), reader.GetStringOrNull(3)),
            reader.GetBoolean(4));
    }

    public async Task<IReadOnlyList<LinkedIdentity>> ListLinkedIdentitiesAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT provider, identity_type, created_at, last_seen_at
            FROM iam.authentication_identity
            WHERE user_id = $1
            ORDER BY created_at
            """).With(userId);

        var identities = new List<LinkedIdentity>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            identities.Add(new LinkedIdentity(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetFieldValue<DateTimeOffset>(2),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }

        return identities;
    }
}
