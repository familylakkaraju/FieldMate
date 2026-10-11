using Amazon;
using Amazon.RDS.Util;
using FieldMate.Core.Data;

namespace FieldMate.Aws;

/// <summary>
/// Short-lived RDS IAM authentication tokens, signed locally with the Lambda role's credentials. No stored application
/// password, and no network call to Secrets Manager (which would need a NAT Gateway or VPC endpoint from private
/// subnets). Works identically against the RDS instance endpoint or an RDS Proxy endpoint.
/// </summary>
public sealed class RdsIamCredentialProvider(RegionEndpoint region) : IDbCredentialProvider
{
    public async ValueTask<string> GetPasswordAsync(string host, int port, string username, CancellationToken cancellationToken) =>
        await RDSAuthTokenGenerator.GenerateAuthTokenAsync(region, host, port, username);

    public static RdsIamCredentialProvider FromEnvironment()
    {
        var regionName = Environment.GetEnvironmentVariable("AWS_REGION")
            ?? throw new InvalidOperationException("AWS_REGION is not set; RDS IAM authentication requires it.");
        return new RdsIamCredentialProvider(RegionEndpoint.GetBySystemName(regionName));
    }
}
