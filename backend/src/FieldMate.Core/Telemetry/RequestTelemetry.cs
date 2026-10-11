namespace FieldMate.Core.Telemetry;

/// <summary>
/// Trace context accumulated while one request runs, emitted as exactly one structured record when it completes
/// (CR AP-15, AP-18). Holds identifiers only: never tokens, headers, request or response bodies.
/// </summary>
public sealed class RequestTelemetry
{
    public string Operation { get; set; } = "Unknown";

    public string CorrelationId { get; set; } = "";

    /// <summary>Set only once organisation context is trusted (membership validated).</summary>
    public Guid? OrganisationId { get; set; }

    /// <summary>The client-requested organisation, recorded on denial for diagnosis. Never used for attribution.</summary>
    public Guid? RequestedOrganisationId { get; set; }

    public Guid? UserId { get; set; }

    public string? ResourceId { get; set; }

    public string? AuthenticationProvider { get; set; }

    public string? ErrorCode { get; set; }

    /// <summary>Short machine-readable reason, e.g. <c>token_expired</c>. Never contains user data.</summary>
    public string? Reason { get; set; }

    public Exception? Exception { get; set; }

    /// <summary><c>ORGANISATION</c> once tenant context is trusted; otherwise <c>PLATFORM</c> (CR AP-16).</summary>
    public string Scope => OrganisationId is null ? "PLATFORM" : "ORGANISATION";
}
