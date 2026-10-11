using FieldMate.Core.Onboarding;
using FieldMate.Core.Telemetry;
using FieldMate.Database;

namespace FieldMate.UnitTests;

public sealed class PlatformTests
{
    [Theory]
    [InlineData("corr-12345678", "corr-12345678")]
    [InlineData("abc", null)]
    [InlineData("has spaces in it", null)]
    [InlineData("line\nbreak-injection", null)]
    public void Correlation_ids_are_accepted_only_when_log_safe(string header, string? expected)
    {
        var resolved = CorrelationIds.Resolve(header, traceparent: null);

        if (expected is null)
        {
            Assert.NotEqual(header, resolved);
            Assert.Matches("^[0-9a-f]{32}$", resolved);
        }
        else
        {
            Assert.Equal(expected, resolved);
        }
    }

    [Fact]
    public void W3C_trace_id_is_used_when_no_correlation_header_is_sent() =>
        Assert.Equal("4bf92f3577b34da6a3ce929d0e0e4736",
            CorrelationIds.Resolve(null, "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"));

    [Fact]
    public void Telemetry_is_one_compact_json_line_without_null_fields()
    {
        var writer = new StringWriter();
        var sink = new JsonLineTelemetrySink(writer);

        sink.Write(new TelemetryEvent("INFO", DateTimeOffset.UnixEpoch, "dev", "GetCurrentUser", "PLATFORM", null, null,
            Guid.Empty, "corr-1", null, "COGNITO", "GET", "/me", 200, null, null, 41));

        var line = writer.ToString().TrimEnd();
        Assert.DoesNotContain('\n', line);
        Assert.StartsWith("{\"level\":\"INFO\"", line);
        Assert.Contains("\"durationMs\":41", line);
        Assert.DoesNotContain("organisationId", line);
        Assert.DoesNotContain("errorCode", line);
    }

    [Fact]
    public void Embedded_migrations_are_contiguous_up_down_pairs()
    {
        var migrations = MigrationCatalog.LoadEmbedded();

        Assert.Equal(Enumerable.Range(1, migrations.Count), migrations.Select(m => m.Version));
        Assert.All(migrations, m => Assert.False(string.IsNullOrWhiteSpace(m.DownSql)));
    }

    [Fact]
    public void Migration_checksums_ignore_line_endings()
    {
        var unix = new Migration(1, "x", "SELECT 1;\nSELECT 2;\n", "");
        var windows = new Migration(1, "x", "SELECT 1;\r\nSELECT 2;\r\n", "");

        Assert.Equal(unix.Checksum, windows.Checksum);
    }

    [Fact]
    public void Invitation_tokens_are_random_url_safe_and_stored_only_as_hashes()
    {
        var (first, hash) = InvitationTokens.Create();
        var (second, _) = InvitationTokens.Create();

        Assert.NotEqual(first, second);
        Assert.True(InvitationTokens.IsWellFormed(first));
        Assert.Equal(32, hash.Length);
        Assert.Equal(hash, InvitationTokens.Hash(first));
        Assert.False(InvitationTokens.IsWellFormed("short"));
        Assert.False(InvitationTokens.IsWellFormed(new string('a', 40) + "/+="));
    }
}
