using System.Text.RegularExpressions;

namespace FieldMate.Core.Telemetry;

public static partial class CorrelationIds
{
    /// <summary>
    /// Accepts a caller-supplied correlation ID only if it is short and log-safe; otherwise falls back to the W3C
    /// <c>traceparent</c> trace ID (so it lines up with OpenTelemetry traces), and finally generates one.
    /// </summary>
    public static string Resolve(string? correlationHeader, string? traceparent)
    {
        if (correlationHeader is not null && SafeCorrelationId().IsMatch(correlationHeader))
        {
            return correlationHeader;
        }

        if (traceparent is not null)
        {
            var match = TraceParent().Match(traceparent);
            if (match.Success && match.Groups[1].Value != new string('0', 32))
            {
                return match.Groups[1].Value;
            }
        }

        return Guid.CreateVersion7().ToString("N");
    }

    [GeneratedRegex("^[A-Za-z0-9._:-]{8,128}$")]
    private static partial Regex SafeCorrelationId();

    [GeneratedRegex("^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$")]
    private static partial Regex TraceParent();
}
