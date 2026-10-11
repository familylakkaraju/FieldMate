using Npgsql;

namespace FieldMate.Core.Data;

/// <summary>
/// Supplies short-lived database credentials. The AWS implementation generates RDS IAM authentication tokens locally,
/// which avoids both stored application passwords and any runtime call to a secrets service.
/// </summary>
public interface IDbCredentialProvider
{
    ValueTask<string> GetPasswordAsync(string host, int port, string username, CancellationToken cancellationToken);
}

public static class FieldMateDataSource
{
    // IAM tokens are valid for 15 minutes for establishing new connections; refresh well before that.
    private static readonly TimeSpan CredentialRefreshInterval = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan CredentialRetryInterval = TimeSpan.FromSeconds(5);

    public static NpgsqlDataSource Create(DatabaseOptions options, IDbCredentialProvider? credentials = null)
    {
        var builder = new NpgsqlDataSourceBuilder(BuildConnectionString(options));

        if (options.ConnectionString is null && options.Authentication == DatabaseAuthentication.Dynamic)
        {
            if (credentials is null)
            {
                throw new InvalidOperationException("Database:Authentication is Dynamic but no IDbCredentialProvider is registered.");
            }

            builder.UsePeriodicPasswordProvider(
                (settings, ct) => credentials.GetPasswordAsync(settings.Host!, settings.Port, settings.Username!, ct),
                CredentialRefreshInterval,
                CredentialRetryInterval);
        }

        return builder.Build();
    }

    private static string BuildConnectionString(DatabaseOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.ConnectionString))
        {
            return options.ConnectionString;
        }

        if (string.IsNullOrWhiteSpace(options.Host))
        {
            throw new InvalidOperationException("Database:ConnectionString or Database:Host must be configured.");
        }

        var csb = new NpgsqlConnectionStringBuilder
        {
            Host = options.Host,
            Port = options.Port,
            Database = options.Name,
            Username = options.Username,
            SslMode = Enum.Parse<SslMode>(options.SslMode, ignoreCase: true),
            MaxPoolSize = options.MaxPoolSize,
            CommandTimeout = options.CommandTimeoutSeconds,
            Timeout = 10,
            ApplicationName = options.ApplicationName,
        };

        if (!string.IsNullOrWhiteSpace(options.RootCertificatePath))
        {
            csb.RootCertificate = options.RootCertificatePath;
        }

        return csb.ConnectionString;
    }
}
