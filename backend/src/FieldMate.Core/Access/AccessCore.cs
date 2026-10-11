using FieldMate.Core.Context;

namespace FieldMate.Core.Access;

/// <summary>V00 permission codes (<c>resource.action</c>), seeded by migration 0002.</summary>
public static class Permissions
{
    public const string OrganisationRead = "organisation.read";
    public const string OrganisationManage = "organisation.manage";
    public const string TeamRead = "team.read";
    public const string TeamManage = "team.manage";
}

/// <summary>A tenant-owned resource an action targets. Every tenant-owned resource carries its organisation.</summary>
public sealed record ResourceRef(string Type, string Id, Guid OrganisationId);

public sealed record AccessRequest(string Permission, ResourceRef? Resource = null);

public sealed record AccessDecision(bool Allowed, string? Reason)
{
    public static readonly AccessDecision Allow = new(true, null);

    public static AccessDecision Deny(string reason) => new(false, reason);
}

/// <summary>
/// Resource-level policy hook for later verticals, e.g. "a worker may only update tasks assigned to them".
/// Policies can only narrow access granted by role permissions, never widen it.
/// </summary>
public interface IResourcePolicy
{
    bool AppliesTo(AccessRequest request);

    ValueTask<AccessDecision> EvaluateAsync(FieldMateRequestContext context, AccessRequest request, CancellationToken cancellationToken);
}

public interface IAccessCore
{
    ValueTask<AccessDecision> EvaluateAsync(FieldMateRequestContext? context, AccessRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// Answers "may this FieldMate user perform this action in this organisation on this resource?" (CR AP-13).
/// The same evaluation applies to API calls today and to AI/agent tool calls later (CR AP-14).
/// </summary>
public sealed class AccessCore(IEnumerable<IResourcePolicy> resourcePolicies) : IAccessCore
{
    private readonly IResourcePolicy[] _resourcePolicies = [.. resourcePolicies];

    public async ValueTask<AccessDecision> EvaluateAsync(
        FieldMateRequestContext? context, AccessRequest request, CancellationToken cancellationToken)
    {
        // 1-2. Authenticated with an active membership: a trusted context only exists once both are proven.
        if (context is null)
        {
            return AccessDecision.Deny("no_trusted_context");
        }

        if (context.MembershipId == Guid.Empty)
        {
            return AccessDecision.Deny("no_active_membership");
        }

        // 3. Role permission.
        if (!context.Permissions.Contains(request.Permission))
        {
            return AccessDecision.Deny("permission_missing");
        }

        // 4. Tenant boundary: always enforced, independent of any resource policy.
        if (request.Resource is { } resource && resource.OrganisationId != context.OrganisationId)
        {
            return AccessDecision.Deny("cross_organisation_resource");
        }

        // 5. Resource policies. Commercial entitlement checks will plug in here later; not part of V00.
        foreach (var policy in _resourcePolicies)
        {
            if (!policy.AppliesTo(request))
            {
                continue;
            }

            var decision = await policy.EvaluateAsync(context, request, cancellationToken);
            if (!decision.Allowed)
            {
                return decision;
            }
        }

        return AccessDecision.Allow;
    }
}
