using System.Text.Json;
using System.Text.Json.Serialization;

namespace FieldMate.Core.Telemetry;

public sealed record TelemetryEvent(
    string Level,
    DateTimeOffset Timestamp,
    string Environment,
    string Operation,
    string Scope,
    Guid? OrganisationId,
    Guid? RequestedOrganisationId,
    Guid? UserId,
    string CorrelationId,
    string? ResourceId,
    string? AuthenticationProvider,
    string Method,
    string Route,
    int Status,
    string? ErrorCode,
    string? Reason,
    long DurationMs,
    string? ExceptionType = null,
    string? ExceptionMessage = null,
    string? StackTrace = null);

public interface ITelemetrySink
{
    void Write(TelemetryEvent telemetryEvent);
}

/// <summary>
/// Writes each event as a single JSON line to stdout. In Lambda that lands in CloudWatch Logs, where Logs Insights
/// discovers the fields (organisationId, correlationId, errorCode, durationMs, ...) without any metrics API calls.
/// </summary>
public sealed class JsonLineTelemetrySink(TextWriter writer) : ITelemetrySink
{
    private readonly Lock _gate = new();

    public void Write(TelemetryEvent telemetryEvent)
    {
        var line = JsonSerializer.Serialize(telemetryEvent, TelemetryJsonContext.Default.TelemetryEvent);
        lock (_gate)
        {
            writer.WriteLine(line);
            writer.Flush();
        }
    }
}

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(TelemetryEvent))]
internal sealed partial class TelemetryJsonContext : JsonSerializerContext;
