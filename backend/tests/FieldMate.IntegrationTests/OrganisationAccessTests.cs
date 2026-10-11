using System.Net;
using FieldMate.Api.Endpoints;
using FieldMate.IntegrationTests.Infrastructure;

namespace FieldMate.IntegrationTests;

/// <summary>CR §19 Organisation and Access: trusted organisation context, Access Core and tenant isolation.</summary>
public sealed class OrganisationAccessTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [DatabaseFact]
    public async Task One_organisation_is_auto_selectable()
    {
        var (token, owner) = await NewOwnerAsync("Solo Org");

        var choice = (await ReadAsync<ChooseOrganisationResponse>(await GetAsync("/identity/choose-organisation", token)))!;

        var option = Assert.Single(choice.Organisations);
        Assert.Equal(owner.OrganisationId, option.OrganisationId);
        Assert.Equal("OWNER", option.RoleCode);
        Assert.Equal(owner.OrganisationId, choice.AutoSelectOrganisationId);
    }

    [DatabaseFact]
    public async Task Multiple_organisations_are_listed_with_their_roles_and_require_a_choice()
    {
        var (token, alpha) = await NewOwnerAsync("Alpha Multi");
        var (_, beta) = await NewOwnerAsync("Beta Multi");
        await AcceptAsync(token, await InviteAsync(beta.OrganisationId, "WORKER"));

        var choice = (await ReadAsync<ChooseOrganisationResponse>(await GetAsync("/identity/choose-organisation", token)))!;

        Assert.Null(choice.AutoSelectOrganisationId);
        Assert.Equal(
            new[] { (alpha.OrganisationId, "OWNER"), (beta.OrganisationId, "WORKER") }.OrderBy(x => x.Item1),
            choice.Organisations.Select(o => (o.OrganisationId, o.RoleCode)).OrderBy(x => x.Item1));
    }

    [DatabaseFact]
    public async Task Organisation_context_returns_the_trusted_context()
    {
        var (_, owner) = await NewOwnerAsync();
        var (workerToken, worker) = await NewMemberAsync(owner.OrganisationId, "WORKER", createWorker: true);

        var context = (await ReadAsync<OrganisationContextResponse>(await GetAsync("/me/context", workerToken, owner.OrganisationId)))!;

        Assert.Equal(worker.UserId, context.UserId);
        Assert.Equal(owner.OrganisationId, context.OrganisationId);
        Assert.Equal(worker.MembershipId, context.MembershipId);
        Assert.Equal(worker.WorkerId, context.WorkerId);
        Assert.Equal("WORKER", context.Role);
        Assert.Equal(["organisation.read"], context.Permissions);
        Assert.Equal("COGNITO", context.AuthenticationProvider);
    }

    [DatabaseFact]
    public async Task Worker_mapping_is_optional()
    {
        var (token, owner) = await NewOwnerAsync();

        var context = (await ReadAsync<OrganisationContextResponse>(await GetAsync("/me/context", token, owner.OrganisationId)))!;

        Assert.Null(context.WorkerId);
    }

    [DatabaseTheory]
    [InlineData(null, HttpStatusCode.BadRequest, "ORG_CONTEXT_REQUIRED")]
    [InlineData("not-a-guid", HttpStatusCode.BadRequest, "ORG_CONTEXT_INVALID")]
    [InlineData("00000000-0000-0000-0000-000000000000", HttpStatusCode.BadRequest, "ORG_CONTEXT_INVALID")]
    [InlineData("0192f000-0000-7000-8000-0000000000ff", HttpStatusCode.Forbidden, "ORG_MEMBERSHIP_DENIED")]
    public async Task Client_supplied_organisation_is_validated(string? header, HttpStatusCode status, string errorCode)
    {
        var (token, _) = await NewOwnerAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/me/context");
        request.Headers.Authorization = new("Bearer", token);
        if (header is not null)
        {
            request.Headers.Add("X-Organisation-Id", header);
        }

        await AssertProblemAsync(await Fixture.Client.SendAsync(request, TestContext.Current.CancellationToken), status, errorCode);
    }

    [DatabaseFact]
    public async Task Another_organisation_is_indistinguishable_from_a_non_existent_one()
    {
        var (token, _) = await NewOwnerAsync("Mine");
        var (_, other) = await NewOwnerAsync("Theirs");

        var existing = await GetAsync("/me/context", token, other.OrganisationId);
        var missing = await GetAsync("/me/context", token, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.Forbidden, existing.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, missing.StatusCode);
        var existingProblem = (await ReadAsync<Api.Hosting.ProblemBody>(existing))!;
        var missingProblem = (await ReadAsync<Api.Hosting.ProblemBody>(missing))!;
        Assert.Equal("ORG_MEMBERSHIP_DENIED", existingProblem.ErrorCode);
        Assert.Equal(existingProblem with { CorrelationId = "" }, missingProblem with { CorrelationId = "" });
    }

    [DatabaseFact]
    public async Task An_inactive_membership_in_one_organisation_does_not_affect_another()
    {
        var (token, alpha) = await NewOwnerAsync("Alpha Active");
        var (_, beta) = await NewOwnerAsync("Beta Suspended");
        var joined = (await ReadAsync<OnboardingResponse>(await AcceptAsync(token, await InviteAsync(beta.OrganisationId, "MANAGER"))))!;
        await Db.ExecuteAsync("UPDATE iam.organisation_member SET status = 'SUSPENDED' WHERE id = $1", joined.MembershipId);

        await AssertProblemAsync(await GetAsync("/me/context", token, beta.OrganisationId), HttpStatusCode.Forbidden, "ORG_MEMBERSHIP_DENIED");
        Assert.Equal(HttpStatusCode.OK, (await GetAsync("/me/context", token, alpha.OrganisationId)).StatusCode);
    }

    // Role permissions are proven through the test-only probe host (team.read: OWNER, ADMIN, MANAGER; not WORKER),
    // so the public API carries no scaffolding route for it.
    [DatabaseTheory]
    [InlineData("OWNER", true)]
    [InlineData("ADMIN", true)]
    [InlineData("MANAGER", true)]
    [InlineData("WORKER", false)]
    public async Task Access_core_enforces_role_permissions(string role, bool allowed)
    {
        var (_, owner) = await NewOwnerAsync();
        var (token, _) = await NewMemberAsync(owner.OrganisationId, role);

        var response = await ProbeAsync(token, owner.OrganisationId);

        if (allowed)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(owner.OrganisationId, (await ReadAsync<ProbeResponse>(response))!.OrganisationId);
        }
        else
        {
            await AssertProblemAsync(response, HttpStatusCode.Forbidden, "ACCESS_DENIED");
        }
    }

    [DatabaseFact]
    public async Task Permissions_are_evaluated_per_organisation()
    {
        var (token, alpha) = await NewOwnerAsync("Owned");
        var (_, beta) = await NewOwnerAsync("Worked");
        await AcceptAsync(token, await InviteAsync(beta.OrganisationId, "WORKER"));

        Assert.Equal(HttpStatusCode.OK, (await ProbeAsync(token, alpha.OrganisationId)).StatusCode);
        await AssertProblemAsync(await ProbeAsync(token, beta.OrganisationId), HttpStatusCode.Forbidden, "ACCESS_DENIED");
    }

    [DatabaseFact]
    public async Task A_permission_held_elsewhere_never_grants_access_to_another_organisation()
    {
        var (ownerToken, _) = await NewOwnerAsync("Mine");
        var (_, other) = await NewOwnerAsync("Not Mine");

        // OWNER holds team.read in its own organisation, but has no membership in the other one.
        await AssertProblemAsync(await ProbeAsync(ownerToken, other.OrganisationId), HttpStatusCode.Forbidden, "ORG_MEMBERSHIP_DENIED");
    }

    private Task<HttpResponseMessage> ProbeAsync(string token, Guid organisationId)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, AccessProbeHost.TeamReadProbe);
        request.Headers.Authorization = new("Bearer", token);
        request.Headers.Add("X-Organisation-Id", organisationId.ToString());
        return Fixture.Probe.Client.SendAsync(request, TestContext.Current.CancellationToken);
    }
}
