using System.Text.RegularExpressions;

namespace LimitPlus.Api.Ai;

/// <summary>
/// Правила для ответа ИИ. Ответ модели показывается, только если проходит все проверки,
/// иначе пользователь видит безопасный шаблон.
/// </summary>
public static class ExplanationGuard
{
    public const int MaxWords = 120;

<<<<<<< HEAD
    // Темы, которые Енотономика не обсуждает: кредиты, займы, рассрочка, инвестиции, банковские продукты.
=======
    // Темы, которые Лимит+ не обсуждает: кредиты, займы, рассрочка, инвестиции, банковские продукты.
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    private static readonly string[] ForbiddenFragments =
    [
        "кредит", "займ", "заём", "заем", "в долг", "одолж", "рассрочк", "микрофинанс",
        "инвест", "акци", "облигац", "брокер", "крипт", "ипотек", "вклад", "депозит",
    ];

    // Числа вида «340», «3 400» или «3 400» с неразрывным пробелом.
    private static readonly Regex NumberPattern = new(@"\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+", RegexOptions.Compiled);

    /// <param name="text">Проверяемый текст (ответ модели).</param>
    /// <param name="sourceText">Исходные факты и вопрос пользователя: только числа отсюда можно упоминать.</param>
    public static bool IsAcceptable(string text, string sourceText, int maxWords = MaxWords)
    {
        if (string.IsNullOrWhiteSpace(text) || CountWords(text) > maxWords)
        {
            return false;
        }

        if (MentionsForbiddenTopic(text))
        {
            return false;
        }

        // Модель не должна придумывать числа: каждое число из ответа должно быть в исходных фактах.
        HashSet<string> allowedNumbers = ExtractNumbers(sourceText);
        return ExtractNumbers(text).All(number => allowedNumbers.Contains(number));
    }

    public static bool MentionsForbiddenTopic(string text)
    {
        string lower = text.ToLowerInvariant();
        return ForbiddenFragments.Any(fragment => lower.Contains(fragment));
    }

    /// <summary>Считает слова: всё, где есть хотя бы одна буква или цифра.</summary>
    public static int CountWords(string text) =>
        text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
            .Count(word => word.Any(char.IsLetterOrDigit));

    /// <summary>«3 400 ₽ и 10 дней» → {"3400", "10"}.</summary>
    public static HashSet<string> ExtractNumbers(string text) =>
        NumberPattern.Matches(text)
            .Select(match => new string(match.Value.Where(char.IsDigit).ToArray()))
            .ToHashSet();
}
