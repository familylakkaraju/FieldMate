using FieldMate.Core.Context;
using FieldMate.Core.Errors;

namespace FieldMate.Core.Organisations;

/// <summary>
/// Turns a client-requested organisation into trusted request context. A raw client organisation ID is never
/// trusted: it is only a request, validated against an active membership on every call (CR AP-07, §7.2).
/// </summary>
public sealed class OrganisationContextService(OrganisationRepository repository)
{
    /// <summary>Parses the requested organisation without trusting it.</summary>
    public static Guid ParseRequestedOrganisation(string? requested)
    {
        if (string.IsNullOrWhiteSpace(requested))
        {
            throw FieldMateException.OrganisationContextRequired();
        }

        return Guid.TryParseExact(requested.Trim(), "D", out var organisationId) && organisationId != Guid.Empty
            ? organisationId
            : throw FieldMateException.OrganisationContextInvalid();
    }

    public async Task<FieldMateRequestContext> EstablishAsync(
        UserContext user, Guid requestedOrganisationId, CancellationToken cancellationToken)
    {
        var membership = await repository.FindActiveMembershipAsync(user.UserId, requestedOrganisationId, cancellationToken)
            ?? throw FieldMateException.OrganisationMembershipDenied();

        return new FieldMateRequestContext(
            user,
            requestedOrganisationId,
            membership.MembershipId,
            membership.WorkerId,
            membership.RoleCode,
            membership.Permissions);
    }
}
