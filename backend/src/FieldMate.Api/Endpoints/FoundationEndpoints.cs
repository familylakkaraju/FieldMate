using FieldMate.Api.Access;
using FieldMate.Core.Access;
using FieldMate.Core.Errors;
using FieldMate.Core.Identity;
using FieldMate.Core.Onboarding;
using FieldMate.Core.Organisations;
using FieldMate.Core.Telemetry;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FieldMate.Api.Endpoints;

/// <summary>
/// V00 endpoints only: enough to prove identity, organisation context and Access Core end to end.
/// Routes follow the Master X-Ray where it defines one (<c>/identity/*</c>, <c>/team/*</c>); operation names are the
/// telemetry <c>operation</c> field.
/// </summary>
public static class FoundationEndpoints
{
    public const string HealthOperation = "Health";

    public static IEndpointRouteBuilder MapFoundationEndpoints(this IEndpointRouteBuilder app)
    {
        // Liveness only: no database call, so a public probe cannot load the database or wake a stopped one.
        app.MapGet("/health", () => TypedResults.Ok(new HealthResponse("ok")))
            .WithName(HealthOperation);

        // X-Ray "Welcome / Landing" (public, pre-auth): provider-hosted entry points so clients never hard-code the IdP.
        app.MapGet("/identity/welcome-landing", (IIdentityProviderAdapter identity) =>
                TypedResults.Ok(new WelcomeLandingResponse(identity.GetEntryPoints())))
            .WithName("GetWelcomeLanding");

        // The only two ways an authenticated identity becomes a persisted FieldMate user (no orphan users).
        // X-Ray "Create Business" (V00 creates the organisation core only; configuration belongs to onboarding later).
        app.MapPost("/onboarding/create-business", ExecuteCreateBusinessAsync)
            .WithName("ExecuteCreateBusiness")
            .RequireAuthenticatedIdentity();

        // X-Ray "Accept Invitation".
        app.MapPost("/identity/accept-invitation", ExecuteAcceptInvitationAsync)
            .WithName("ExecuteAcceptInvitation")
            .RequireAuthenticatedIdentity();

        app.MapGet("/me", GetCurrentUserAsync)
            .WithName("GetCurrentUser")
            .RequireFieldMateUser();

        // X-Ray "Choose Organisation" (used instead of the CR's indicative /me/organisations).
        app.MapGet("/identity/choose-organisation", GetChooseOrganisationAsync)
            .WithName("GetChooseOrganisation")
            .RequireFieldMateUser();

        // The trusted context for the selected organisation (role, permissions, worker): clients use it to show only
        // what the user may do. Protected by Access Core like every organisation-scoped endpoint.
        app.MapGet("/me/context", GetOrganisationContext)
            .WithName("GetOrganisationContext")
            .RequirePermission(Permissions.OrganisationRead);

        return app;
    }

    public const string IdempotencyKeyHeader = "Idempotency-Key";

    /// <summary>
    /// Creates an organisation and makes the caller its OWNER, creating the FieldMate user in the same transaction
    /// if this identity is new. Requires an <c>Idempotency-Key</c> (UUID): a retry returns the original organisation.
    /// </summary>
    private static async Task<Results<Created<OnboardingResponse>, Ok<OnboardingResponse>>> ExecuteCreateBusinessAsync(
        HttpContext http,
        CreateBusinessRequest? request,
        OnboardingRepository onboarding,
        RequestTelemetry telemetry,
        CancellationToken cancellationToken)
    {
        var keyValues = http.Request.Headers[IdempotencyKeyHeader];
        if (keyValues.Count != 1 || !Guid.TryParseExact(keyValues[0], "D", out var idempotencyKey) || idempotencyKey == Guid.Empty)
        {
            throw FieldMateException.Validation($"An {IdempotencyKeyHeader} header containing a UUID is required.");
        }

        var name = request?.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 200)
        {
            throw FieldMateException.Validation("name is required and must be at most 200 characters.");
        }

        var result = await onboarding.CreateOrganisationAsync(http.GetAuthenticatedPrincipal(), name, idempotencyKey, cancellationToken);
        Record(telemetry, result);
        var response = OnboardingResponse.From(result);
        return result.Created ? TypedResults.Created((string?)null, response) : TypedResults.Ok(response);
    }

    /// <summary>
    /// Joins the organisation named by a valid invitation, creating the FieldMate user in the same transaction if
    /// this identity is new. Re-accepting an invitation already accepted by this identity returns the same membership.
    /// </summary>
    private static async Task<Ok<OnboardingResponse>> ExecuteAcceptInvitationAsync(
        HttpContext http,
        AcceptInvitationRequest? request,
        OnboardingRepository onboarding,
        RequestTelemetry telemetry,
        CancellationToken cancellationToken)
    {
        if (!InvitationTokens.IsWellFormed(request?.InvitationToken))
        {
            throw FieldMateException.InvitationInvalid("malformed");
        }

        var result = await onboarding.AcceptInvitationAsync(http.GetAuthenticatedPrincipal(), request!.InvitationToken!, cancellationToken);
        Record(telemetry, result);
        return TypedResults.Ok(OnboardingResponse.From(result));
    }

    private static void Record(RequestTelemetry telemetry, OnboardingResult result)
    {
        telemetry.UserId = result.UserId;
        // The organisation was just created or joined by this user in the same transaction, so it is trusted.
        telemetry.OrganisationId = result.OrganisationId;
        telemetry.ResourceId = result.OrganisationId.ToString();
    }

    private static async Task<Ok<CurrentUserResponse>> GetCurrentUserAsync(
        HttpContext http, IdentityRepository identities, CancellationToken cancellationToken)
    {
        var user = http.GetFieldMateUser();
        var principal = http.GetAuthenticatedPrincipal();
        var linked = await identities.ListLinkedIdentitiesAsync(user.UserId, cancellationToken);

        return TypedResults.Ok(new CurrentUserResponse(
            user.UserId,
            user.DisplayName,
            user.PrimaryEmail,
            user.Status,
            new AuthenticationSummary(principal.Provider, principal.IdentityType.ToCode()),
            [.. linked.Select(i => new LinkedIdentityResponse(i.Provider, i.IdentityType, i.LinkedAt, i.LastSeenAt))]));
    }

    private static async Task<Ok<ChooseOrganisationResponse>> GetChooseOrganisationAsync(
        HttpContext http, OrganisationRepository organisations, CancellationToken cancellationToken)
    {
        var choices = await organisations.ListActiveMembershipsAsync(http.GetFieldMateUser().UserId, cancellationToken);

        return TypedResults.Ok(new ChooseOrganisationResponse(
            [.. choices.Select(c => new OrganisationOption(c.OrganisationId, c.Name, c.MembershipId, c.RoleCode, c.RoleName))],
            // CR §7.2: with exactly one organisation the client may skip the chooser.
            choices.Count == 1 ? choices[0].OrganisationId : null));
    }

    private static Ok<OrganisationContextResponse> GetOrganisationContext(HttpContext http)
    {
        var context = http.GetRequestContext();
        return TypedResults.Ok(new OrganisationContextResponse(
            context.UserId,
            context.OrganisationId,
            context.MembershipId,
            context.WorkerId,
            context.RoleCode,
            [.. context.Permissions.Order(StringComparer.Ordinal)],
            context.CorrelationId,
            context.AuthenticationProvider));
    }
}
