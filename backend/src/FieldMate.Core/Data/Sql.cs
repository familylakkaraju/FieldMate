using Npgsql;

namespace FieldMate.Core.Data;

/// <summary>Identifier generation and small helpers for explicit, parameterised SQL.</summary>
public static class Ids
{
    /// <summary>UUIDv7: time-ordered, so primary-key inserts stay append-friendly in B-tree indexes.</summary>
    public static Guid New() => Guid.CreateVersion7();
}

internal static class NpgsqlCommandExtensions
{
    /// <summary>Appends a positional (<c>$n</c>) parameter. Every value reaches PostgreSQL as a parameter, never as SQL text.</summary>
    public static NpgsqlCommand With<T>(this NpgsqlCommand command, T value)
    {
        command.Parameters.Add(new NpgsqlParameter<T> { TypedValue = value });
        return command;
    }

    /// <summary>Same as <see cref="With{T}(NpgsqlCommand, T)"/> for one statement of an <see cref="NpgsqlBatch"/>.</summary>
    public static NpgsqlBatchCommand With<T>(this NpgsqlBatchCommand command, T value)
    {
        command.Parameters.Add(new NpgsqlParameter<T> { TypedValue = value });
        return command;
    }

    public static Guid? GetGuidOrNull(this NpgsqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);

    public static string? GetStringOrNull(this NpgsqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);

    public static DateTimeOffset? GetTimestampOrNull(this NpgsqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetFieldValue<DateTimeOffset>(ordinal);
}
