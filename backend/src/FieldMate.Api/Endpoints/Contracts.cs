using FieldMate.Core.Identity;
using FieldMate.Core.Onboarding;

namespace FieldMate.Api.Endpoints;

// V00 HTTP contracts. Proposed v1 shapes until the API contract/LLD freeze (as the X-Ray notes for all routes).

public sealed record HealthResponse(string Status);

public sealed record WelcomeLandingResponse(IdentityEntryPoints Authentication);

public sealed record CreateBusinessRequest(string? Name);

public sealed record AcceptInvitationRequest(string? InvitationToken);

/// <param name="Created">Whether this call created the organisation/membership (false for an idempotent replay).</param>
/// <param name="UserCreated">Whether this call created the FieldMate user (first organisation relationship).</param>
public sealed record OnboardingResponse(
    Guid OrganisationId,
    Guid MembershipId,
    Guid UserId,
    string Role,
    Guid? WorkerId,
    bool Created,
    bool UserCreated)
{
    public static OnboardingResponse From(OnboardingResult result) => new(
        result.OrganisationId, result.MembershipId, result.UserId, result.RoleCode, result.WorkerId, result.Created, result.UserCreated);
}

public sealed record AuthenticationSummary(string Provider, string IdentityType);

public sealed record LinkedIdentityResponse(string Provider, string IdentityType, DateTimeOffset LinkedAt, DateTimeOffset LastSeenAt);

public sealed record CurrentUserResponse(
    Guid UserId,
    string? DisplayName,
    string? PrimaryEmail,
    string Status,
    AuthenticationSummary CurrentAuthentication,
    IReadOnlyList<LinkedIdentityResponse> LinkedIdentities);

public sealed record OrganisationOption(Guid OrganisationId, string Name, Guid MembershipId, string RoleCode, string RoleName);

public sealed record ChooseOrganisationResponse(IReadOnlyList<OrganisationOption> Organisations, Guid? AutoSelectOrganisationId);

public sealed record OrganisationContextResponse(
    Guid UserId,
    Guid OrganisationId,
    Guid MembershipId,
    Guid? WorkerId,
    string Role,
    IReadOnlyList<string> Permissions,
    string CorrelationId,
    string AuthenticationProvider);

public sealed record TeamMemberResponse(
    Guid MembershipId,
    Guid UserId,
    string? DisplayName,
    string Role,
    string Status,
    DateTimeOffset? JoinedAt,
    Guid? WorkerId);

public sealed record TeamMembersResponse(Guid OrganisationId, IReadOnlyList<TeamMemberResponse> Members);
