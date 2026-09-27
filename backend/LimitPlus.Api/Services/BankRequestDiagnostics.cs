using System.Text.RegularExpressions;

namespace LimitPlus.Api.Services;

/// <summary>Текст причины сетевой ошибки без query-строки и длинных номеров.</summary>
public static partial class BankRequestDiagnostics
{
    public static string Describe(Exception exception)
    {
        var parts = new List<string>();
        var seen = new HashSet<Exception>();
        Walk(exception, parts, seen);
        return parts.Count == 0 ? exception.GetType().Name : string.Join(" → ", parts);
    }

    private static void Walk(Exception? exception, List<string> parts, HashSet<Exception> seen)
    {
        while (exception is not null && seen.Add(exception))
        {
            parts.Add($"{exception.GetType().Name}: {Redact(exception.Message)}");
            if (exception is AggregateException aggregate)
            {
                foreach (Exception inner in aggregate.InnerExceptions)
                {
                    Walk(inner, parts, seen);
                }

                return;
            }

            exception = exception.InnerException;
        }
    }

    private static string Redact(string message)
    {
        string withoutQuery = Query().Replace(message, "");
        return LongNumber().Replace(withoutQuery, "…");
    }

    [GeneratedRegex(@"\?[^\s]*")]
    private static partial Regex Query();

    [GeneratedRegex(@"\d{12,}")]
    private static partial Regex LongNumber();
}
