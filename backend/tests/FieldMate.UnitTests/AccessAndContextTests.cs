using FieldMate.Core.Access;
using FieldMate.Core.Context;
using FieldMate.Core.Errors;
using FieldMate.Core.Organisations;

namespace FieldMate.UnitTests;

public sealed class AccessAndContextTests
{
    private static readonly Guid Organisation = Guid.CreateVersion7();

    private static FieldMateRequestContext Context(params string[] permissions) => new(
        new UserContext(Guid.CreateVersion7(), "COGNITO", "corr-1"),
        Organisation,
        Guid.CreateVersion7(),
        workerId: null,
        "MANAGER",
        permissions.ToHashSet(StringComparer.Ordinal));

    private static ValueTask<AccessDecision> Evaluate(FieldMateRequestContext? context, AccessRequest request, params IResourcePolicy[] policies) =>
        new AccessCore(policies).EvaluateAsync(context, request, CancellationToken.None);

    [Fact]
    public async Task Allows_a_permission_held_by_the_role() =>
        Assert.True((await Evaluate(Context(Permissions.TeamRead), new AccessRequest(Permissions.TeamRead))).Allowed);

    [Fact]
    public async Task Denies_without_a_trusted_context() =>
        Assert.Equal("no_trusted_context", (await Evaluate(null, new AccessRequest(Permissions.TeamRead))).Reason);

    [Fact]
    public async Task Denies_a_permission_the_role_lacks() =>
        Assert.Equal("permission_missing", (await Evaluate(Context(Permissions.OrganisationRead), new AccessRequest(Permissions.TeamRead))).Reason);

    [Fact]
    public async Task Denies_a_resource_owned_by_another_organisation_regardless_of_policies()
    {
        var foreign = new ResourceRef("job", "J-1", Guid.CreateVersion7());

        var decision = await Evaluate(Context(Permissions.TeamRead), new AccessRequest(Permissions.TeamRead, foreign), new AllowAll());

        Assert.Equal("cross_organisation_resource", decision.Reason);
    }

    [Fact]
    public async Task Resource_policies_can_narrow_but_not_widen_access()
    {
        var resource = new ResourceRef("task", "T-1", Organisation);

        var narrowed = await Evaluate(Context(Permissions.TeamRead), new AccessRequest(Permissions.TeamRead, resource), new DenyAll());
        var notWidened = await Evaluate(Context(), new AccessRequest(Permissions.TeamRead, resource), new AllowAll());

        Assert.Equal("policy_denied", narrowed.Reason);
        Assert.Equal("permission_missing", notWidened.Reason);
    }

    [Theory]
    [InlineData(null, ErrorCodes.OrgContextRequired)]
    [InlineData(" ", ErrorCodes.OrgContextRequired)]
    [InlineData("abc", ErrorCodes.OrgContextInvalid)]
    [InlineData("00000000-0000-0000-0000-000000000000", ErrorCodes.OrgContextInvalid)]
    [InlineData("{0192f000-0000-7000-8000-00000000a001}", ErrorCodes.OrgContextInvalid)]
    public void Requested_organisation_must_be_a_plain_uuid(string? header, string errorCode) =>
        Assert.Equal(errorCode, Assert.Throws<FieldMateException>(() => OrganisationContextService.ParseRequestedOrganisation(header)).ErrorCode);

    private sealed class AllowAll : IResourcePolicy
    {
        public bool AppliesTo(AccessRequest request) => true;

        public ValueTask<AccessDecision> EvaluateAsync(FieldMateRequestContext context, AccessRequest request, CancellationToken cancellationToken) =>
            new(AccessDecision.Allow);
    }

    private sealed class DenyAll : IResourcePolicy
    {
        public bool AppliesTo(AccessRequest request) => true;

        public ValueTask<AccessDecision> EvaluateAsync(FieldMateRequestContext context, AccessRequest request, CancellationToken cancellationToken) =>
            new(AccessDecision.Deny("policy_denied"));
    }
}
