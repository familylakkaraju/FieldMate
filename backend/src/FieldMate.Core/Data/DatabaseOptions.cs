namespace FieldMate.Core.Data;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>Full Npgsql connection string (local development and tests). When set, the discrete settings are ignored.</summary>
    public string? ConnectionString { get; set; }

    /// <summary>RDS instance or RDS Proxy endpoint. The application does not care which (CR §10).</summary>
    public string? Host { get; set; }

    public int Port { get; set; } = 5432;

    public string Name { get; set; } = "fieldmate";

    public string Username { get; set; } = "fieldmate_app";

    /// <summary><c>Password</c> (from <see cref="ConnectionString"/>) or <c>Dynamic</c> (short-lived credentials from an
    /// <see cref="IDbCredentialProvider"/>, e.g. RDS IAM authentication tokens).</summary>
    public string Authentication { get; set; } = DatabaseAuthentication.Password;

    public string SslMode { get; set; } = "VerifyFull";

    /// <summary>CA bundle used to verify the server certificate (the RDS global bundle in AWS).</summary>
    public string? RootCertificatePath { get; set; }

    /// <summary>A Lambda execution environment serves one request at a time, so a tiny pool is enough and keeps
    /// total connections bounded by concurrency.</summary>
    public int MaxPoolSize { get; set; } = 2;

    public int CommandTimeoutSeconds { get; set; } = 15;

    public string ApplicationName { get; set; } = "fieldmate-api";
}

public static class DatabaseAuthentication
{
    public const string Password = "Password";
    public const string Dynamic = "Dynamic";
}
