using FieldMate.Api.Endpoints;
using FieldMate.Core.Errors;
using FieldMate.Core.Telemetry;

namespace FieldMate.Api.Hosting;

/// <summary>
/// Outermost application middleware: establishes the correlation ID, maps failures to problem responses and emits
/// exactly one telemetry record per request. No other layer logs successful requests (CR AP-18).
/// </summary>
public sealed class RequestPipelineMiddleware(
    RequestDelegate next, ITelemetrySink sink, TimeProvider timeProvider, FieldMateHostOptions host)
{
    public const string CorrelationHeader = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext http, RequestTelemetry telemetry)
    {
        var started = timeProvider.GetTimestamp();
        telemetry.CorrelationId = CorrelationIds.Resolve(
            http.Request.Headers[CorrelationHeader].Count == 1 ? http.Request.Headers[CorrelationHeader][0] : null,
            http.Request.Headers.TraceParent.Count == 1 ? http.Request.Headers.TraceParent[0] : null);
        http.Response.Headers[CorrelationHeader] = telemetry.CorrelationId;

        try
        {
            await next(http);
            if (http.Response.StatusCode == StatusCodes.Status404NotFound && http.GetEndpoint() is null)
            {
                telemetry.ErrorCode ??= ErrorCodes.RouteNotFound;
            }
        }
        catch (FieldMateException ex)
        {
            telemetry.ErrorCode = ex.ErrorCode;
            telemetry.Reason = ex.DiagnosticReason;
            await ProblemResponses.WriteAsync(http, ex.StatusCode, ex.ErrorCode, ex.Message, telemetry.CorrelationId);
        }
        catch (OperationCanceledException) when (http.RequestAborted.IsCancellationRequested)
        {
            telemetry.Reason = "request_aborted";
        }
        catch (Exception ex)
        {
            telemetry.ErrorCode = ErrorCodes.InternalError;
            telemetry.Exception = ex;
            await ProblemResponses.WriteAsync(
                http, StatusCodes.Status500InternalServerError, ErrorCodes.InternalError, "An unexpected error occurred.", telemetry.CorrelationId);
        }
        finally
        {
            Emit(http, telemetry, timeProvider.GetElapsedTime(started));
        }
    }

    private void Emit(HttpContext http, RequestTelemetry telemetry, TimeSpan elapsed)
    {
        var endpoint = http.GetEndpoint();
        var operation = endpoint?.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName ?? "Unmatched";
        var status = http.Response.StatusCode;

        // Successful health checks are noise, not signal (CR AP-15).
        if (operation == FoundationEndpoints.HealthOperation && status < 400)
        {
            return;
        }

        var exception = telemetry.Exception;
        sink.Write(new TelemetryEvent(
            Level: status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO",
            Timestamp: timeProvider.GetUtcNow(),
            Environment: host.Environment,
            Operation: operation,
            Scope: telemetry.Scope,
            OrganisationId: telemetry.OrganisationId,
            RequestedOrganisationId: telemetry.OrganisationId is null ? telemetry.RequestedOrganisationId : null,
            UserId: telemetry.UserId,
            CorrelationId: telemetry.CorrelationId,
            ResourceId: telemetry.ResourceId,
            AuthenticationProvider: telemetry.AuthenticationProvider,
            Method: http.Request.Method,
            // The route template, never the raw path: bounded cardinality and no identifiers or PII from URLs.
            Route: (endpoint as RouteEndpoint)?.RoutePattern.RawText ?? "(unmatched)",
            Status: status,
            ErrorCode: telemetry.ErrorCode,
            Reason: telemetry.Reason,
            DurationMs: (long)elapsed.TotalMilliseconds,
            ExceptionType: exception?.GetType().FullName,
            ExceptionMessage: Truncate(exception?.Message, 512),
            StackTrace: Truncate(exception?.StackTrace, 4000)));
    }

    private static string? Truncate(string? value, int max) =>
        value is null || value.Length <= max ? value : value[..max];
}
