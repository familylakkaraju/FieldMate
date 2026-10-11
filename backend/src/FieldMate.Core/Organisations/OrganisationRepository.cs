using FieldMate.Core.Data;
using Npgsql;

namespace FieldMate.Core.Organisations;

public sealed record OrganisationChoice(Guid OrganisationId, string Name, Guid MembershipId, string RoleCode, string RoleName);

public sealed record ActiveMembership(Guid MembershipId, string RoleCode, Guid? WorkerId, IReadOnlySet<string> Permissions);

public sealed record TeamMember(
    Guid MembershipId,
    Guid UserId,
    string? DisplayName,
    string RoleCode,
    string Status,
    DateTimeOffset? JoinedAt,
    Guid? WorkerId);

public sealed class OrganisationRepository(NpgsqlDataSource dataSource)
{
    /// <summary>Upper bound for list endpoints until paging is introduced (bounded payloads, CR AP-03).</summary>
    public const int MaxListSize = 500;

    public async Task<IReadOnlyList<OrganisationChoice>> ListActiveMembershipsAsync(Guid userId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT o.id, o.name, m.id, r.code, r.name
            FROM iam.organisation_member m
            JOIN core.organisation o ON o.id = m.organisation_id AND o.status = 'ACTIVE'
            JOIN iam.role r ON r.id = m.role_id AND r.status = 'ACTIVE'
            WHERE m.user_id = $1 AND m.status = 'ACTIVE'
            ORDER BY o.name, o.id
            LIMIT $2
            """).With(userId).With(MaxListSize);

        var choices = new List<OrganisationChoice>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            choices.Add(new OrganisationChoice(
                reader.GetGuid(0), reader.GetString(1), reader.GetGuid(2), reader.GetString(3), reader.GetString(4)));
        }

        return choices;
    }

    /// <summary>The single query behind every tenant-scoped request: active membership of an active organisation,
    /// the role's permissions and the optional worker mapping.</summary>
    public async Task<ActiveMembership?> FindActiveMembershipAsync(Guid userId, Guid organisationId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT m.id,
                   r.code,
                   w.id,
                   COALESCE(array_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '{}')
            FROM iam.organisation_member m
            JOIN core.organisation o ON o.id = m.organisation_id AND o.status = 'ACTIVE'
            JOIN iam.role r ON r.id = m.role_id AND r.status = 'ACTIVE'
            LEFT JOIN workforce.worker w
                   ON w.organisation_id = m.organisation_id AND w.membership_id = m.id AND w.status = 'ACTIVE'
            LEFT JOIN iam.role_permission rp ON rp.role_id = r.id
            LEFT JOIN iam.permission p ON p.id = rp.permission_id
            WHERE m.organisation_id = $1 AND m.user_id = $2 AND m.status = 'ACTIVE'
            GROUP BY m.id, r.code, w.id
            """).With(organisationId).With(userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new ActiveMembership(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetGuidOrNull(2),
            reader.GetFieldValue<string[]>(3).ToHashSet(StringComparer.Ordinal));
    }

    public async Task<IReadOnlyList<TeamMember>> ListMembersAsync(Guid organisationId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT m.id, m.user_id, u.display_name, r.code, m.status, m.joined_at, w.id
            FROM iam.organisation_member m
            JOIN iam.user_profile u ON u.id = m.user_id
            JOIN iam.role r ON r.id = m.role_id
            LEFT JOIN workforce.worker w ON w.organisation_id = m.organisation_id AND w.membership_id = m.id
            WHERE m.organisation_id = $1 AND m.status <> 'REMOVED'
            ORDER BY u.display_name NULLS LAST, m.id
            LIMIT $2
            """).With(organisationId).With(MaxListSize);

        var members = new List<TeamMember>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            members.Add(new TeamMember(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetStringOrNull(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetTimestampOrNull(5),
                reader.GetGuidOrNull(6)));
        }

        return members;
    }
}
