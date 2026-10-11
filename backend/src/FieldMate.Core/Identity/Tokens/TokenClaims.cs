using Microsoft.IdentityModel.JsonWebTokens;

namespace FieldMate.Core.Identity.Tokens;

/// <summary>Claims of a decoded token, normalised to strings, independent of where the token was verified.</summary>
public sealed class TokenClaims
{
    private readonly Dictionary<string, string> _values;

    public TokenClaims(IEnumerable<KeyValuePair<string, string>> values, IReadOnlyList<string> audiences)
    {
        _values = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (name, value) in values)
        {
            _values.TryAdd(name, value);
        }

        Audiences = audiences;
    }

    public IReadOnlyList<string> Audiences { get; }

    public string? Get(string name) =>
        _values.TryGetValue(name, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

    public static TokenClaims FromJsonWebToken(JsonWebToken token) =>
        new(token.Claims.Select(c => KeyValuePair.Create(c.Type, c.Value)), token.Audiences.ToList());

    /// <summary>Claims forwarded by the API Gateway JWT authorizer. Array claims arrive rendered as <c>[a b]</c>.</summary>
    public static TokenClaims FromGatewayClaims(IDictionary<string, string> claims)
    {
        var audiences = claims.TryGetValue("aud", out var raw) ? ParseGatewayArray(raw) : [];
        return new TokenClaims(claims, audiences);
    }

    internal static IReadOnlyList<string> ParseGatewayArray(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return [];
        }

        var trimmed = raw.Trim();
        if (trimmed.StartsWith('[') && trimmed.EndsWith(']'))
        {
            trimmed = trimmed[1..^1];
        }

        return trimmed.Split([' ', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}
