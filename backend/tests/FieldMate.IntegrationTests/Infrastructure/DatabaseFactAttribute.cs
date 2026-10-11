using System.Runtime.CompilerServices;

namespace FieldMate.IntegrationTests.Infrastructure;

internal static class DatabaseRequirement
{
    public static string? SkipReason =>
        TestDatabase.IsConfigured || TestDatabase.RequiredByEnvironment
            ? null
            : "Set FIELDMATE_TEST_DB to a PostgreSQL 15+ owner connection string to run integration tests.";
}

/// <summary>A fact that needs PostgreSQL: skipped locally without FIELDMATE_TEST_DB, never skipped in CI.</summary>
public sealed class DatabaseFactAttribute : FactAttribute
{
    public DatabaseFactAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = -1)
        : base(sourceFilePath, sourceLineNumber) => Skip = DatabaseRequirement.SkipReason;
}

/// <summary>A theory that needs PostgreSQL: skipped locally without FIELDMATE_TEST_DB, never skipped in CI.</summary>
public sealed class DatabaseTheoryAttribute : TheoryAttribute
{
    public DatabaseTheoryAttribute([CallerFilePath] string? sourceFilePath = null, [CallerLineNumber] int sourceLineNumber = -1)
        : base(sourceFilePath, sourceLineNumber) => Skip = DatabaseRequirement.SkipReason;
}
