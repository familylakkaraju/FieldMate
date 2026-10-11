using System.Net;
using FieldMate.Api.Endpoints;
using FieldMate.Core.Identity;
using FieldMate.Core.Onboarding;
using FieldMate.IntegrationTests.Infrastructure;
using Npgsql;

namespace FieldMate.IntegrationTests;

/// <summary>V00 addendum: no orphan FieldMate users. Users exist only with an organisation relationship.</summary>
public sealed class OnboardingTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    private Task<long> CountUsersAsync() => Db.ScalarAsync<long>("SELECT count(*) FROM iam.user_profile");

    [DatabaseFact]
    public async Task Unknown_authenticated_identity_is_never_persisted_by_ordinary_requests()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "new.person@example.test", "New Person");
        var usersBefore = await CountUsersAsync();

        foreach (var path in new[] { "/me", "/identity/choose-organisation", "/me/context" })
        {
            var response = await SendAsync(HttpMethod.Get, path, token, organisationId: Guid.NewGuid());
            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "IDENTITY_NOT_PROVISIONED");
        }

        Assert.Equal(0, await CountIdentitiesAsync(subject));
        Assert.Equal(usersBefore, await CountUsersAsync());
    }

    [DatabaseFact]
    public async Task Create_business_creates_organisation_user_identity_and_owner_membership_together()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "owner@example.test", "Olive Owner");

        var response = await CreateBusinessRawAsync(token, "  Alpha Services  ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = (await ReadAsync<OnboardingResponse>(response))!;
        Assert.True(result.Created);
        Assert.True(result.UserCreated);
        Assert.Equal("OWNER", result.Role);
        Assert.Equal("Alpha Services", await Db.ScalarAsync<string>("SELECT name FROM core.organisation WHERE id = $1", result.OrganisationId));
        Assert.Equal(result.UserId, await Db.ScalarAsync<Guid>("SELECT user_id FROM iam.authentication_identity WHERE subject = $1", subject));
        Assert.Equal("ACTIVE", await Db.ScalarAsync<string>(
            "SELECT m.status FROM iam.organisation_member m JOIN iam.role r ON r.id = m.role_id WHERE m.id = $1 AND r.code = 'OWNER'",
            result.MembershipId));

        var context = await ReadAsync<OrganisationContextResponse>(await GetAsync("/me/context", token, result.OrganisationId));
        Assert.Equal("OWNER", context!.Role);
    }

    [DatabaseFact]
    public async Task Replaying_create_business_with_the_same_key_returns_the_original_without_duplicates()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "replay@example.test");
        var key = Guid.NewGuid();

        var first = (await ReadAsync<OnboardingResponse>(await CreateBusinessRawAsync(token, "Replay Org", key)))!;
        var secondResponse = await CreateBusinessRawAsync(token, "Replay Org", key);

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var second = (await ReadAsync<OnboardingResponse>(secondResponse))!;
        Assert.False(second.Created);
        Assert.False(second.UserCreated);
        Assert.Equal(first.OrganisationId, second.OrganisationId);
        Assert.Equal(first.MembershipId, second.MembershipId);
        Assert.Equal(1, await Db.ScalarAsync<long>("SELECT count(*) FROM iam.organisation_member WHERE user_id = $1", first.UserId));
        Assert.Equal(1, await CountIdentitiesAsync(subject));
    }

    [DatabaseFact]
    public async Task Concurrent_create_business_with_the_same_key_creates_exactly_one_organisation()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "race@example.test");
        var key = Guid.NewGuid();

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => CreateBusinessRawAsync(token, "Race Org", key)));
        var results = await Task.WhenAll(responses.Select(r => ReadAsync<OnboardingResponse>(r)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        Assert.Single(results.Select(r => r!.OrganisationId).Distinct());
        Assert.Equal(1, await CountIdentitiesAsync(subject));
        Assert.Equal(1, await Db.ScalarAsync<long>("SELECT count(*) FROM iam.organisation_member WHERE user_id = $1", results[0]!.UserId));
    }

    [DatabaseFact]
    public async Task Concurrent_first_requests_from_a_new_identity_create_one_user()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "parallel@example.test");

        var responses = await Task.WhenAll(Enumerable.Range(0, 4).Select(i => CreateBusinessRawAsync(token, $"Parallel {i}")));
        var results = await Task.WhenAll(responses.Select(r => ReadAsync<OnboardingResponse>(r)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Created, r.StatusCode));
        Assert.Single(results.Select(r => r!.UserId).Distinct());
        Assert.Single(results, r => r!.UserCreated);
        Assert.Equal(1, await CountIdentitiesAsync(subject));
    }

    [DatabaseFact]
    public async Task Existing_user_creating_another_business_gains_a_membership_not_a_new_user()
    {
        var (token, first) = await NewOwnerAsync("First Org");

        var second = (await ReadAsync<OnboardingResponse>(await CreateBusinessRawAsync(token, "Second Org")))!;

        Assert.False(second.UserCreated);
        Assert.Equal(first.UserId, second.UserId);
        Assert.NotEqual(first.OrganisationId, second.OrganisationId);
        Assert.Equal(2, await Db.ScalarAsync<long>("SELECT count(*) FROM iam.organisation_member WHERE user_id = $1", first.UserId));
    }

    [DatabaseFact]
    public async Task Create_business_requires_an_idempotency_key_and_a_name_and_persists_nothing_otherwise()
    {
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject);

        var noKey = await SendAsync(HttpMethod.Post, "/onboarding/create-business", token, body: new { name = "No Key" });
        var noName = await SendAsync(HttpMethod.Post, "/onboarding/create-business", token, body: new { name = " " }, idempotencyKey: Guid.NewGuid());

        await AssertProblemAsync(noKey, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        await AssertProblemAsync(noName, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        Assert.Equal(0, await CountIdentitiesAsync(subject));
    }

    [DatabaseFact]
    public async Task A_failure_after_the_user_insert_rolls_back_and_leaves_no_orphan_user()
    {
        var subject = NewSubject();
        var usersBefore = await CountUsersAsync();
        await using var appDataSource = NpgsqlDataSource.Create(Db.AppConnectionString);
        var onboarding = new OnboardingRepository(appDataSource);
        var principal = new AuthenticatedPrincipal(
            new ProviderSubject(Tests.Shared.TestTokenIssuer.Issuer, subject), "COGNITO", IdentityType.Native,
            "rollback@example.test", true, "Rollback", null);

        // The organisation insert (after the user + identity inserts) violates the name length check.
        await Assert.ThrowsAsync<PostgresException>(() =>
            onboarding.CreateOrganisationAsync(principal, new string('x', 201), Guid.NewGuid(), TestContext.Current.CancellationToken));

        Assert.Equal(0, await CountIdentitiesAsync(subject));
        Assert.Equal(usersBefore, await CountUsersAsync());
    }

    [DatabaseFact]
    public async Task The_database_rejects_committing_a_user_without_an_organisation_relationship()
    {
        var usersBefore = await CountUsersAsync();
        await using var connection = await Db.Owner.OpenConnectionAsync(TestContext.Current.CancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (var insert = new NpgsqlCommand("INSERT INTO iam.user_profile (id) VALUES ($1)", connection, transaction))
        {
            insert.Parameters.Add(new NpgsqlParameter<Guid> { TypedValue = Guid.CreateVersion7() });
            await insert.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var failure = await Assert.ThrowsAsync<PostgresException>(() => transaction.CommitAsync(TestContext.Current.CancellationToken));
        Assert.Equal(PostgresErrorCodes.CheckViolation, failure.SqlState);
        Assert.Equal(usersBefore, await CountUsersAsync());
    }

    [DatabaseFact]
    public async Task Deleting_a_users_last_membership_is_rejected()
    {
        var (_, owner) = await NewOwnerAsync();

        var failure = await Assert.ThrowsAsync<PostgresException>(() =>
            Db.ExecuteAsync("DELETE FROM iam.organisation_member WHERE id = $1", owner.MembershipId));

        Assert.Equal(PostgresErrorCodes.CheckViolation, failure.SqlState);
    }

    [DatabaseFact]
    public async Task Accept_invitation_creates_user_identity_membership_and_worker_together()
    {
        var (_, owner) = await NewOwnerAsync();
        var invitation = await InviteAsync(owner.OrganisationId, "WORKER", createWorker: true);
        var subject = NewSubject();
        var token = Tokens.CreateAccessToken(subject, "worker@example.test", "Wendy Worker");

        var response = await AcceptAsync(token, invitation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await ReadAsync<OnboardingResponse>(response))!;
        Assert.True(result.Created);
        Assert.True(result.UserCreated);
        Assert.Equal("WORKER", result.Role);
        Assert.NotNull(result.WorkerId);
        Assert.Equal(owner.OrganisationId, result.OrganisationId);
        Assert.Equal(1, await CountIdentitiesAsync(subject));
        Assert.Equal(result.UserId, await Db.ScalarAsync<Guid>(
            "SELECT accepted_by_user_id FROM iam.invitation WHERE organisation_id = $1 AND status = 'ACCEPTED'", owner.OrganisationId));
    }

    [DatabaseFact]
    public async Task Re_accepting_the_same_invitation_is_idempotent()
    {
        var (_, owner) = await NewOwnerAsync();
        var invitation = await InviteAsync(owner.OrganisationId, "MANAGER");
        var token = Tokens.CreateAccessToken(NewSubject());

        var first = (await ReadAsync<OnboardingResponse>(await AcceptAsync(token, invitation)))!;
        var secondResponse = await AcceptAsync(token, invitation);

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var second = (await ReadAsync<OnboardingResponse>(secondResponse))!;
        Assert.False(second.Created);
        Assert.False(second.UserCreated);
        Assert.Equal(first.MembershipId, second.MembershipId);
        Assert.Equal(1, await Db.ScalarAsync<long>("SELECT count(*) FROM iam.organisation_member WHERE user_id = $1", first.UserId));
    }

    [DatabaseFact]
    public async Task An_invitation_used_by_one_identity_cannot_be_used_by_another()
    {
        var (_, owner) = await NewOwnerAsync();
        var invitation = await InviteAsync(owner.OrganisationId, "WORKER");
        await NewAcceptance(invitation);
        var intruder = NewSubject();

        var response = await AcceptAsync(Tokens.CreateAccessToken(intruder), invitation);

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "INVITATION_INVALID");
        Assert.Equal(0, await CountIdentitiesAsync(intruder));

        async Task NewAcceptance(string token) =>
            Assert.Equal(HttpStatusCode.OK, (await AcceptAsync(Tokens.CreateAccessToken(NewSubject()), token)).StatusCode);
    }

    [DatabaseTheory]
    [InlineData("expired")]
    [InlineData("revoked")]
    [InlineData("unknown")]
    [InlineData("malformed")]
    public async Task Invalid_invitations_are_rejected_and_persist_nothing(string kind)
    {
        var (_, owner) = await NewOwnerAsync();
        var invitation = kind switch
        {
            "expired" => await InviteAsync(owner.OrganisationId, "WORKER", validFor: TimeSpan.FromMinutes(-1)),
            "unknown" => InvitationTokens.Create().Token,
            "malformed" => "not-a-token",
            _ => await InviteAsync(owner.OrganisationId, "WORKER"),
        };
        if (kind == "revoked")
        {
            await Db.ExecuteAsync("UPDATE iam.invitation SET status = 'REVOKED' WHERE organisation_id = $1", owner.OrganisationId);
        }

        var subject = NewSubject();
        var response = await AcceptAsync(Tokens.CreateAccessToken(subject), invitation);

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "INVITATION_INVALID");
        Assert.Equal(0, await CountIdentitiesAsync(subject));
    }

    [DatabaseFact]
    public async Task An_addressed_invitation_requires_the_matching_verified_email()
    {
        var (_, owner) = await NewOwnerAsync();
        var invitation = await InviteAsync(owner.OrganisationId, "WORKER", email: "named.person@example.test");

        var wrongEmail = await AcceptAsync(Tokens.CreateAccessToken(NewSubject(), "someone.else@example.test"), invitation);
        var unverified = await AcceptAsync(Tokens.CreateAccessToken(NewSubject(), "named.person@example.test", emailVerified: false), invitation);
        var matching = await AcceptAsync(Tokens.CreateAccessToken(NewSubject(), "Named.Person@example.test"), invitation);

        await AssertProblemAsync(wrongEmail, HttpStatusCode.Forbidden, "INVITATION_INVALID");
        await AssertProblemAsync(unverified, HttpStatusCode.Forbidden, "INVITATION_INVALID");
        Assert.Equal(HttpStatusCode.OK, matching.StatusCode);
    }

    [DatabaseFact]
    public async Task Existing_user_accepting_an_invitation_joins_without_a_new_user()
    {
        var (_, alpha) = await NewOwnerAsync("Alpha");
        var (betaToken, beta) = await NewOwnerAsync("Beta");

        var result = (await ReadAsync<OnboardingResponse>(await AcceptAsync(betaToken, await InviteAsync(alpha.OrganisationId, "MANAGER"))))!;

        Assert.True(result.Created);
        Assert.False(result.UserCreated);
        Assert.Equal(beta.UserId, result.UserId);
        Assert.Equal(2, await Db.ScalarAsync<long>("SELECT count(*) FROM iam.organisation_member WHERE user_id = $1", beta.UserId));
    }

    [DatabaseFact]
    public async Task An_active_member_accepting_another_invitation_does_not_duplicate_the_membership()
    {
        var (_, owner) = await NewOwnerAsync();
        var (memberToken, member) = await NewMemberAsync(owner.OrganisationId, "WORKER");

        var result = (await ReadAsync<OnboardingResponse>(await AcceptAsync(memberToken, await InviteAsync(owner.OrganisationId, "MANAGER"))))!;

        Assert.False(result.Created);
        Assert.Equal(member.MembershipId, result.MembershipId);
        Assert.Equal("WORKER", result.Role);
        Assert.Equal(1, await Db.ScalarAsync<long>("SELECT count(*) FROM iam.organisation_member WHERE user_id = $1", member.UserId));
    }

    [DatabaseFact]
    public async Task A_suspended_member_cannot_rejoin_through_an_invitation()
    {
        var (_, owner) = await NewOwnerAsync();
        var (memberToken, member) = await NewMemberAsync(owner.OrganisationId, "WORKER");
        await Db.ExecuteAsync("UPDATE iam.organisation_member SET status = 'SUSPENDED' WHERE id = $1", member.MembershipId);

        var response = await AcceptAsync(memberToken, await InviteAsync(owner.OrganisationId, "WORKER"));

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "ORG_MEMBERSHIP_DENIED");
    }

    [DatabaseFact]
    public async Task Existing_user_with_zero_valid_memberships_is_denied_everything_tenant_scoped()
    {
        var (token, owner) = await NewOwnerAsync();
        await Db.ExecuteAsync("UPDATE iam.organisation_member SET status = 'SUSPENDED' WHERE id = $1", owner.MembershipId);

        await AssertProblemAsync(await GetAsync("/me", token), HttpStatusCode.Forbidden, "NO_ACTIVE_MEMBERSHIP");
        await AssertProblemAsync(await GetAsync("/identity/choose-organisation", token), HttpStatusCode.Forbidden, "NO_ACTIVE_MEMBERSHIP");
        await AssertProblemAsync(await GetAsync("/me/context", token, owner.OrganisationId), HttpStatusCode.Forbidden, "NO_ACTIVE_MEMBERSHIP");

        // Creating a new organisation is still possible and restores a valid relationship, without a second user.
        var restored = (await ReadAsync<OnboardingResponse>(await CreateBusinessRawAsync(token, "Fresh Start")))!;
        Assert.Equal(owner.UserId, restored.UserId);
        Assert.Equal(HttpStatusCode.OK, (await GetAsync("/me", token)).StatusCode);
    }

    [DatabaseFact]
    public async Task A_suspended_organisation_counts_as_no_valid_membership()
    {
        var (token, owner) = await NewOwnerAsync();
        await Db.ExecuteAsync("UPDATE core.organisation SET status = 'SUSPENDED' WHERE id = $1", owner.OrganisationId);

        await AssertProblemAsync(await GetAsync("/me/context", token, owner.OrganisationId), HttpStatusCode.Forbidden, "NO_ACTIVE_MEMBERSHIP");
    }

    [DatabaseFact]
    public async Task Identities_with_the_same_email_never_merge_into_one_user()
    {
        var (_, first) = await NewOwnerAsync(email: "shared@example.test");
        var (_, second) = await NewOwnerAsync(email: "shared@example.test");

        Assert.NotEqual(first.UserId, second.UserId);
    }
}
