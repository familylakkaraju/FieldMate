using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace FieldMate.Core.Onboarding;

/// <summary>
/// Invitation secrets: 256 random bits, delivered out of band (link or message) and stored only as a SHA-256 hash.
/// Possession of the token is the proof required to join; a database leak does not reveal usable tokens.
/// </summary>
public static class InvitationTokens
{
    public const int MinLength = 32;
    public const int MaxLength = 128;

    public static (string Token, byte[] Hash) Create()
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
        return (token, Hash(token));
    }

    public static byte[] Hash(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));

    public static bool IsWellFormed(string? token) =>
        token is { Length: >= MinLength and <= MaxLength } && token.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
}
