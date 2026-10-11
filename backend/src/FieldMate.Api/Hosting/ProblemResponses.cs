using FieldMate.Core.Errors;

namespace FieldMate.Api.Hosting;

/// <summary>RFC 9457 problem details carrying a stable <c>errorCode</c> and the request's <c>correlationId</c>.</summary>
public sealed record ProblemBody(string Type, string Title, int Status, string ErrorCode, string CorrelationId);

internal static class ProblemResponses
{
    public static async Task WriteAsync(HttpContext http, int status, string errorCode, string title, string correlationId)
    {
        if (http.Response.HasStarted)
        {
            return;
        }

        http.Response.Clear();
        http.Response.StatusCode = status;
        if (status == StatusCodes.Status401Unauthorized)
        {
            http.Response.Headers.WWWAuthenticate = errorCode == ErrorCodes.AuthInvalidToken
                ? "Bearer error=\"invalid_token\""
                : "Bearer";
        }

        http.Response.Headers[RequestPipelineMiddleware.CorrelationHeader] = correlationId;
        await http.Response.WriteAsJsonAsync(
            new ProblemBody("about:blank", title, status, errorCode, correlationId),
            options: null,
            contentType: "application/problem+json");
    }
}
