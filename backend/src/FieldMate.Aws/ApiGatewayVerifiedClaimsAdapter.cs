using Amazon.Lambda.APIGatewayEvents;
using FieldMate.Core.Identity;
using FieldMate.Core.Identity.Tokens;
using Microsoft.AspNetCore.Http;

namespace FieldMate.Aws;

/// <summary>
/// Identity adapter for the AWS deployment. The API Gateway HTTP API JWT authorizer has already verified the token's
/// signature against the Cognito JWKS, plus issuer, audience/client_id and expiry, and forwarded the claims in the
/// Lambda request context. This adapter re-applies the shared claim rules (defence in depth: issuer, client,
/// <c>token_use=access</c>, expiry) and maps the result to the provider-neutral principal.
/// </summary>
/// <remarks>
/// Verifying at the gateway means the Lambda never needs internet egress to fetch JWKS, so it runs in private
/// subnets with no NAT Gateway (CR AP-01, §17). Requests that did not pass the authorizer carry no claims and fail.
/// </remarks>
public sealed class ApiGatewayVerifiedClaimsAdapter(
    IHttpContextAccessor httpContextAccessor, IdentityOptions options, TimeProvider timeProvider) : IIdentityProviderAdapter
{
    // Amazon.Lambda.AspNetCoreServer stores the raw Lambda event under this key (AbstractAspNetCoreFunction.LAMBDA_REQUEST_OBJECT).
    internal const string LambdaRequestObjectKey = "LambdaRequestObject";

    public ValueTask<TokenValidationOutcome> ValidateTokenAsync(string bearerToken, CancellationToken cancellationToken)
    {
        var request = httpContextAccessor.HttpContext?.Items[LambdaRequestObjectKey] as APIGatewayHttpApiV2ProxyRequest;
        var claims = request?.RequestContext?.Authorizer?.Jwt?.Claims;
        if (claims is null || claims.Count == 0)
        {
            return new(TokenValidationOutcome.Failure("gateway_claims_missing"));
        }

        var tokenClaims = TokenClaims.FromGatewayClaims(claims);
        var failure = TokenClaimRules.Validate(tokenClaims, options, timeProvider.GetUtcNow());
        return new(failure is null
            ? TokenValidationOutcome.Success(ProviderClaimMapper.Map(tokenClaims, options))
            : TokenValidationOutcome.Failure(failure));
    }

    public IdentityEntryPoints GetEntryPoints() => IdentityEntryPoints.From(options);
}
