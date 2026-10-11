using FieldMate.Core.Data;
using FieldMate.Core.Errors;
using FieldMate.Core.Identity;
using Npgsql;

namespace FieldMate.Core.Onboarding;

public sealed record OnboardingResult(
    Guid OrganisationId,
    Guid MembershipId,
    Guid UserId,
    string RoleCode,
    Guid? WorkerId,
    bool Created,
    bool UserCreated);

/// <summary>
/// The only ways an authenticated identity becomes a persisted FieldMate user (V00 addendum: no orphan users).
/// Each flow creates the user, its authentication identity and its first organisation membership in one transaction;
/// a deferred database constraint additionally rejects any user_profile committed without a membership.
/// </summary>
public sealed class OnboardingRepository(NpgsqlDataSource dataSource)
{
    public const string CreateOrganisationOperation = "CreateOrganisation";

    /// <summary>
    /// Creates organisation + (user + authentication identity, if new) + OWNER membership. Replaying the same
    /// idempotency key for the same identity returns the original result instead of creating another organisation.
    /// </summary>
    public async Task<OnboardingResult> CreateOrganisationAsync(
        AuthenticatedPrincipal principal, string organisationName, Guid idempotencyKey, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await LockIdentityAsync(connection, transaction, principal.Subject, cancellationToken);

        await using (var replay = new NpgsqlCommand("""
            SELECT resource_id FROM platform.idempotency_record
            WHERE issuer = $1 AND subject = $2 AND operation = $3 AND idempotency_key = $4
            """, connection, transaction))
        {
            replay.With(principal.Subject.Issuer).With(principal.Subject.Subject).With(CreateOrganisationOperation).With(idempotencyKey);
            if (await replay.ExecuteScalarAsync(cancellationToken) is Guid existingOrganisationId)
            {
                var existing = await FindMembershipAsync(connection, transaction, principal.Subject, existingOrganisationId, cancellationToken)
                    ?? throw new InvalidOperationException("Idempotency record refers to an organisation without the creator's membership.");
                await transaction.CommitAsync(cancellationToken);
                return existing with { Created = false, UserCreated = false };
            }
        }

        var (userId, userCreated) = await FindOrCreateUserAsync(connection, transaction, principal, cancellationToken);
        var organisationId = Ids.New();
        var membershipId = Ids.New();

        await using (var create = new NpgsqlBatch(connection, transaction)
        {
            BatchCommands =
            {
                new NpgsqlBatchCommand("INSERT INTO core.organisation (id, name) VALUES ($1, $2)")
                    .With(organisationId).With(organisationName),
                new NpgsqlBatchCommand("""
                    INSERT INTO iam.organisation_member (id, organisation_id, user_id, role_id, status, joined_at)
                    SELECT $1, $2, $3, r.id, 'ACTIVE', now()
                    FROM iam.role r
                    WHERE r.organisation_id IS NULL AND r.code = 'OWNER' AND r.status = 'ACTIVE'
                    """).With(membershipId).With(organisationId).With(userId),
                new NpgsqlBatchCommand("""
                    INSERT INTO platform.idempotency_record (issuer, subject, operation, idempotency_key, resource_id)
                    VALUES ($1, $2, $3, $4, $5)
                    """).With(principal.Subject.Issuer).With(principal.Subject.Subject)
                        .With(CreateOrganisationOperation).With(idempotencyKey).With(organisationId),
            },
        })
        {
            await create.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return new OnboardingResult(organisationId, membershipId, userId, "OWNER", null, Created: true, userCreated);
    }

    /// <summary>
    /// Accepts an invitation: (user + authentication identity, if new) + membership (+ worker if requested) + marks the
    /// invitation accepted. Re-accepting an invitation this identity already accepted returns the same membership.
    /// </summary>
    public async Task<OnboardingResult> AcceptInvitationAsync(
        AuthenticatedPrincipal principal, string invitationToken, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await LockIdentityAsync(connection, transaction, principal.Subject, cancellationToken);

        Guid invitationId, organisationId, roleId, acceptedByUserId;
        string status, roleCode;
        string? invitedEmail;
        bool createWorker, expired;
        await using (var find = new NpgsqlCommand("""
            SELECT i.id, i.organisation_id, i.role_id, r.code, i.status, i.invited_email, i.create_worker,
                   i.expires_at <= now(), i.accepted_by_user_id
            FROM iam.invitation i
            JOIN core.organisation o ON o.id = i.organisation_id AND o.status = 'ACTIVE'
            JOIN iam.role r ON r.id = i.role_id AND r.status = 'ACTIVE'
            WHERE i.token_hash = $1
            FOR UPDATE OF i
            """, connection, transaction))
        {
            find.With(InvitationTokens.Hash(invitationToken));
            await using var reader = await find.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw FieldMateException.InvitationInvalid("not_found");
            }

            (invitationId, organisationId, roleId, roleCode, status) =
                (reader.GetGuid(0), reader.GetGuid(1), reader.GetGuid(2), reader.GetString(3), reader.GetString(4));
            invitedEmail = reader.GetStringOrNull(5);
            createWorker = reader.GetBoolean(6);
            expired = reader.GetBoolean(7);
            acceptedByUserId = reader.GetGuidOrNull(8) ?? Guid.Empty;
        }

        if (status == "ACCEPTED")
        {
            // Idempotent replay by the same person; anyone else gets the generic invalid response.
            var replay = await FindMembershipAsync(connection, transaction, principal.Subject, organisationId, cancellationToken);
            if (replay is null || replay.UserId != acceptedByUserId)
            {
                throw FieldMateException.InvitationInvalid("already_used");
            }

            await transaction.CommitAsync(cancellationToken);
            return replay with { Created = false, UserCreated = false };
        }

        if (status != "PENDING")
        {
            throw FieldMateException.InvitationInvalid("not_pending");
        }

        if (expired)
        {
            throw FieldMateException.InvitationInvalid("expired");
        }

        // An addressed invitation must be accepted by an identity whose IdP-verified email matches. This authorises
        // the acceptance; it never links or merges existing accounts by email.
        if (invitedEmail is not null
            && !(principal.EmailVerified && string.Equals(principal.Email, invitedEmail, StringComparison.OrdinalIgnoreCase)))
        {
            throw FieldMateException.InvitationInvalid("recipient_mismatch");
        }

        var (userId, userCreated) = await FindOrCreateUserAsync(connection, transaction, principal, cancellationToken);

        Guid membershipId;
        var membershipCreated = false;
        await using (var join = new NpgsqlCommand("""
            INSERT INTO iam.organisation_member (id, organisation_id, user_id, role_id, status, joined_at)
            VALUES ($1, $2, $3, $4, 'ACTIVE', now())
            ON CONFLICT (organisation_id, user_id) DO NOTHING
            RETURNING id
            """, connection, transaction))
        {
            join.With(Ids.New()).With(organisationId).With(userId).With(roleId);
            if (await join.ExecuteScalarAsync(cancellationToken) is Guid inserted)
            {
                membershipId = inserted;
                membershipCreated = true;
            }
            else
            {
                // Already related to this organisation. Active members simply consume the invitation; suspended or
                // removed members are reinstated by an administrator, never by an invitation link.
                var existing = await FindMembershipAsync(connection, transaction, principal.Subject, organisationId, cancellationToken);
                if (existing is null)
                {
                    throw FieldMateException.OrganisationMembershipDenied();
                }

                membershipId = existing.MembershipId;
                roleCode = existing.RoleCode;
            }
        }

        Guid? workerId = null;
        if (createWorker && membershipCreated)
        {
            await using var worker = new NpgsqlCommand("""
                INSERT INTO workforce.worker (id, organisation_id, membership_id) VALUES ($1, $2, $3)
                RETURNING id
                """, connection, transaction);
            workerId = (Guid?)await worker.With(Ids.New()).With(organisationId).With(membershipId).ExecuteScalarAsync(cancellationToken);
        }

        await using (var accept = new NpgsqlCommand("""
            UPDATE iam.invitation SET status = 'ACCEPTED', accepted_by_user_id = $2, accepted_at = now() WHERE id = $1
            """, connection, transaction))
        {
            await accept.With(invitationId).With(userId).ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return new OnboardingResult(organisationId, membershipId, userId, roleCode, workerId, membershipCreated, userCreated);
    }

    /// <summary>Serialises onboarding for one authentication identity, so concurrent first requests cannot race to
    /// create two users for the same issuer + subject.</summary>
    private static async Task LockIdentityAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, ProviderSubject subject, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            "SELECT pg_advisory_xact_lock(hashtextextended($1 || E'\\n' || $2, 0))", connection, transaction);
        await command.With(subject.Issuer).With(subject.Subject).ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<(Guid UserId, bool Created)> FindOrCreateUserAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, AuthenticatedPrincipal principal, CancellationToken cancellationToken)
    {
        await using (var find = new NpgsqlCommand("""
            SELECT u.id, u.status
            FROM iam.authentication_identity ai
            JOIN iam.user_profile u ON u.id = ai.user_id
            WHERE ai.issuer = $1 AND ai.subject = $2
            """, connection, transaction))
        {
            find.With(principal.Subject.Issuer).With(principal.Subject.Subject);
            await using var reader = await find.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                return reader.GetString(1) == UserStatuses.Active
                    ? (reader.GetGuid(0), false)
                    : throw FieldMateException.UserDisabled();
            }
        }

        // A new identity is a new user. Matching email addresses never merge users (CR §13, §14).
        var userId = Ids.New();
        await using var create = new NpgsqlBatch(connection, transaction)
        {
            BatchCommands =
            {
                new NpgsqlBatchCommand("INSERT INTO iam.user_profile (id, display_name, primary_email, status) VALUES ($1, $2, $3, 'ACTIVE')")
                    .With(userId)
                    .With(principal.DisplayName)
                    // Only an IdP-verified address becomes the contact email; it is never an identity key.
                    .With(principal.EmailVerified ? principal.Email : null),
                new NpgsqlBatchCommand("""
                    INSERT INTO iam.authentication_identity
                        (id, user_id, issuer, subject, provider, identity_type, upstream_subject, email_at_link_time)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """)
                    .With(Ids.New())
                    .With(userId)
                    .With(principal.Subject.Issuer)
                    .With(principal.Subject.Subject)
                    .With(principal.Provider)
                    .With(principal.IdentityType.ToCode())
                    .With(principal.UpstreamSubject)
                    .With(principal.Email),
            },
        };
        await create.ExecuteNonQueryAsync(cancellationToken);
        return (userId, true);
    }

    private static async Task<OnboardingResult?> FindMembershipAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, ProviderSubject subject, Guid organisationId,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("""
            SELECT m.id, m.user_id, r.code, w.id
            FROM iam.authentication_identity ai
            JOIN iam.organisation_member m ON m.user_id = ai.user_id AND m.organisation_id = $3 AND m.status = 'ACTIVE'
            JOIN iam.role r ON r.id = m.role_id
            LEFT JOIN workforce.worker w ON w.organisation_id = m.organisation_id AND w.membership_id = m.id
            WHERE ai.issuer = $1 AND ai.subject = $2
            """, connection, transaction);
        command.With(subject.Issuer).With(subject.Subject).With(organisationId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new OnboardingResult(organisationId, reader.GetGuid(0), reader.GetGuid(1), reader.GetString(2), reader.GetGuidOrNull(3), false, false)
            : null;
    }
}
