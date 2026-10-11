namespace FieldMate.Core.Context;

/// <summary>An authenticated, resolved FieldMate user with no organisation selected (profile.self operations).</summary>
public sealed record UserContext(Guid UserId, string AuthenticationProvider, string CorrelationId);

/// <summary>
/// The trusted request context (CR §7.2). It can only be created by <see cref="Organisations.OrganisationContextService"/>
/// after the user's active membership of the requested organisation has been validated, so holding one proves it.
/// </summary>
public sealed class FieldMateRequestContext
{
    internal FieldMateRequestContext(
        UserContext user,
        Guid organisationId,
        Guid membershipId,
        Guid? workerId,
        string roleCode,
        IReadOnlySet<string> permissions)
    {
        User = user;
        OrganisationId = organisationId;
        MembershipId = membershipId;
        WorkerId = workerId;
        RoleCode = roleCode;
        Permissions = permissions;
    }

    public UserContext User { get; }

    public Guid UserId => User.UserId;

    public Guid OrganisationId { get; }

    public Guid MembershipId { get; }

    /// <summary>Present only when the member is also an active worker in this organisation.</summary>
    public Guid? WorkerId { get; }

    public string RoleCode { get; }

    public IReadOnlySet<string> Permissions { get; }

    public string CorrelationId => User.CorrelationId;

    public string AuthenticationProvider => User.AuthenticationProvider;
}
