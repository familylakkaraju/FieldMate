using Microsoft.IdentityModel.Tokens;

namespace FieldMate.Core.Identity.Oidc;

public interface ISigningKeyProvider
{
    /// <param name="refresh">Request fresh keys (an unknown <c>kid</c> usually means the issuer rotated keys).</param>
    ValueTask<IReadOnlyList<SecurityKey>> GetKeysAsync(bool refresh, CancellationToken cancellationToken);
}

/// <summary>Keys from an inline JWKS document (tests, air-gapped environments).</summary>
public sealed class StaticSigningKeyProvider(string jwksJson) : ISigningKeyProvider
{
    private readonly IReadOnlyList<SecurityKey> _keys = [.. new JsonWebKeySet(jwksJson).GetSigningKeys()];

    public ValueTask<IReadOnlyList<SecurityKey>> GetKeysAsync(bool refresh, CancellationToken cancellationToken) => new(_keys);
}

/// <summary>Keys fetched from the issuer's JWKS endpoint, cached, with rate-limited refresh on key rotation.</summary>
public sealed class JwksSigningKeyProvider(HttpClient httpClient, Uri jwksUri, TimeProvider timeProvider) : ISigningKeyProvider
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(1);
    private static readonly TimeSpan MinimumRefreshInterval = TimeSpan.FromMinutes(5);

    private readonly SemaphoreSlim _gate = new(1, 1);
    private IReadOnlyList<SecurityKey> _keys = [];
    private DateTimeOffset _fetchedAt = DateTimeOffset.MinValue;

    public async ValueTask<IReadOnlyList<SecurityKey>> GetKeysAsync(bool refresh, CancellationToken cancellationToken)
    {
        if (!NeedsFetch(refresh))
        {
            return _keys;
        }

        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (NeedsFetch(refresh))
            {
                var json = await httpClient.GetStringAsync(jwksUri, cancellationToken);
                _keys = [.. new JsonWebKeySet(json).GetSigningKeys()];
                _fetchedAt = timeProvider.GetUtcNow();
            }

            return _keys;
        }
        finally
        {
            _gate.Release();
        }
    }

    private bool NeedsFetch(bool refresh)
    {
        var age = timeProvider.GetUtcNow() - _fetchedAt;
        return _keys.Count == 0 || age > CacheLifetime || (refresh && age > MinimumRefreshInterval);
    }
}
