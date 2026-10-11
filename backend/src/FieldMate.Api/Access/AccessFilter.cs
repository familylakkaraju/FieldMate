using FieldMate.Core.Access;
using FieldMate.Core.Context;
using FieldMate.Core.Errors;
using FieldMate.Core.Identity;
using FieldMate.Core.Organisations;
using FieldMate.Core.Telemetry;

namespace FieldMate.Api.Access;

public enum AccessLevel
{
    /// <summary>A valid token only. Used by the onboarding flows that may create the FieldMate user.</summary>
    AuthenticatedIdentity,

    /// <summary>A resolved, active FieldMate user (X-Ray policy <c>profile.self</c>).</summary>
    User,

    /// <summary>A trusted organisation context plus an Access Core permission decision.</summary>
    Organisation,
}

public sealed record AccessRequirement(AccessLevel Level, string? Permission);

public static class AccessEndpointExtensions
{
    public const string OrganisationHeader = "X-Organisation-Id";

    public static RouteHandlerBuilder RequireAuthenticatedIdentity(this RouteHandlerBuilder builder) =>
        builder.Require(new AccessRequirement(AccessLevel.AuthenticatedIdentity, null));

    public static RouteHandlerBuilder RequireFieldMateUser(this RouteHandlerBuilder builder) =>
        builder.Require(new AccessRequirement(AccessLevel.User, null));

    /// <summary>Organisation-scoped: requires the <c>X-Organisation-Id</c> header and the given permission.</summary>
    public static RouteHandlerBuilder RequirePermission(this RouteHandlerBuilder builder, string permission) =>
        builder.Require(new AccessRequirement(AccessLevel.Organisation, permission));

    private static RouteHandlerBuilder Require(this RouteHandlerBuilder builder, AccessRequirement requirement) =>
        builder.WithMetadata(requirement).AddEndpointFilter<AccessFilter>();

    public static AuthenticatedPrincipal GetAuthenticatedPrincipal(this HttpContext http) =>
        http.Features.Get<AuthenticatedPrincipal>() ?? throw MissingAccessFilter();

    public static FieldMateUser GetFieldMateUser(this HttpContext http) =>
        http.Features.Get<FieldMateUser>() ?? throw MissingAccessFilter();

    public static FieldMateRequestContext GetRequestContext(this HttpContext http) =>
        http.Features.Get<FieldMateRequestContext>() ?? throw MissingAccessFilter();

    private static InvalidOperationException MissingAccessFilter() =>
        new("Endpoint is missing the access requirement needed for this context.");
}

/// <summary>
/// The CR AP-13 request path, applied before any handler runs:
/// JWT → token validation → identity resolution → FieldMate user → membership validation → trusted context → Access Core.
/// </summary>
internal sealed class AccessFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var services = http.RequestServices;
        var cancellationToken = http.RequestAborted;
        var requirement = http.GetEndpoint()?.Metadata.GetMetadata<AccessRequirement>()
            ?? throw new InvalidOperationException("AccessFilter applied without an AccessRequirement.");
        var telemetry = services.GetRequiredService<RequestTelemetry>();

        // 1. Authenticate: provider-specific validation stays behind the adapter.
        var bearerToken = ReadBearerToken(http.Request) ?? throw FieldMateException.AuthRequired();
        var validation = await services.GetRequiredService<IIdentityProviderAdapter>().ValidateTokenAsync(bearerToken, cancellationToken);
        var principal = validation.Principal ?? throw FieldMateException.InvalidToken(validation.FailureReason);
        telemetry.AuthenticationProvider = principal.Provider;
        http.Features.Set(principal);
        if (requirement.Level == AccessLevel.AuthenticatedIdentity)
        {
            return await next(context);
        }

        // 2. Resolve the canonical FieldMate user: authentication_identity → user_profile → at least one valid
        //    membership. Read-only: a token never creates a user; only onboarding flows do.
        var resolved = await services.GetRequiredService<IdentityRepository>().FindUserAsync(principal.Subject, cancellationToken)
            ?? throw FieldMateException.IdentityNotProvisioned();
        var user = resolved.User;
        telemetry.UserId = user.UserId;
        if (!user.IsActive)
        {
            throw FieldMateException.UserDisabled();
        }

        if (!resolved.HasActiveMembership)
        {
            throw FieldMateException.NoActiveMembership();
        }

        http.Features.Set(user);
        if (requirement.Level == AccessLevel.User)
        {
            return await next(context);
        }

        // 3. Organisation context: the requested organisation is untrusted until membership is validated.
        var headerValues = http.Request.Headers[AccessEndpointExtensions.OrganisationHeader];
        var requestedOrganisationId = OrganisationContextService.ParseRequestedOrganisation(
            headerValues.Count > 1 ? "invalid" : headerValues.FirstOrDefault());
        telemetry.RequestedOrganisationId = requestedOrganisationId;

        var userContext = new UserContext(user.UserId, principal.Provider, telemetry.CorrelationId);
        var requestContext = await services.GetRequiredService<OrganisationContextService>()
            .EstablishAsync(userContext, requestedOrganisationId, cancellationToken);
        telemetry.OrganisationId = requestContext.OrganisationId;

        // 4. Access Core decides.
        var decision = await services.GetRequiredService<IAccessCore>()
            .EvaluateAsync(requestContext, new AccessRequest(requirement.Permission!), cancellationToken);
        if (!decision.Allowed)
        {
            throw FieldMateException.AccessDenied(decision.Reason);
        }

        http.Features.Set(requestContext);
        return await next(context);
    }

    private static string? ReadBearerToken(HttpRequest request)
    {
        const string scheme = "Bearer ";
        var values = request.Headers.Authorization;
        if (values.Count != 1 || values[0] is not { } header || !header.StartsWith(scheme, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = header[scheme.Length..].Trim();
        return token.Length == 0 ? null : token;
    }
}
