using System.Text.RegularExpressions;

namespace LimitPlus.Api.Ai;

/// <summary>Готовый вопрос-подсказка в чате с Енотом.</summary>
public record PromptPreset(string Id, string Text);

/// <summary>Темы ответов. По теме выбирается шаблон и факты для ИИ.</summary>
public static class Topics
{
    public const string WhyLimit = "why_limit";
    public const string Faster = "faster";
    public const string HowToLast = "how_to_last";
    public const string Wasteful = "wasteful";
    public const string CashbackPick = "cashback_pick";
    public const string CashbackResults = "cashback_results";
    public const string Regional = "regional";
    public const string Streak = "streak";
    public const string Purchase = "purchase";
    public const string Forbidden = "forbidden";
    public const string General = "general";
}

public static class Prompts
{
    private static readonly Regex AmountPattern = new(@"\d{1,3}(?:[ \u00A0]\d{3})+|\d+", RegexOptions.Compiled);

    /// <summary>Частые вопросы — показываются в чате как подсказки. Id совпадает с темой.</summary>
    public static readonly PromptPreset[] All =
    [
        new(Topics.WhyLimit, "Почему у меня такой лимит?"),
        new(Topics.Faster, "Почему деньги кончаются быстрее, чем в прошлый раз?"),
        new(Topics.HowToLast, "Как дотянуть до стипендии?"),
        new(Topics.Wasteful, "Где у меня лишние траты?"),
        new(Topics.CashbackPick, "Какие категории кэшбэка выбрать?"),
        new(Topics.CashbackResults, "Сколько мне принёс кэшбэк?"),
        new(Topics.Regional, "Сколько стоит еда в моём регионе?"),
        new(Topics.Streak, "Как работает огонёк?"),
    ];

    public static PromptPreset? Find(string? id) => All.FirstOrDefault(p => p.Id == id);

    /// <summary>Определяет тему свободного вопроса по ключевым словам.</summary>
    public static string DetectTopic(string message)
    {
        string text = message.ToLowerInvariant().Replace('ё', 'е');

        if (ExplanationGuard.MentionsForbiddenTopic(text))
        {
            return Topics.Forbidden;
        }

        if (ParseAmount(message) is not null && (text.Contains("куп") || text.Contains("покуп") || text.Contains("потрат")))
        {
            return Topics.Purchase;
        }

        bool aboutCashback = text.Contains("кэшбэк") || text.Contains("кешбэк") || text.Contains("кэшбек") || text.Contains("кешбек");
        if (aboutCashback)
        {
            return text.Contains("получ") || text.Contains("итог") || text.Contains("принес") || text.Contains("сколько")
                ? Topics.CashbackResults
                : Topics.CashbackPick;
        }

        if (text.Contains("быстр") || text.Contains("прошл"))
        {
            return Topics.Faster;
        }

        if (text.Contains("дотян") || text.Contains("хватит") || text.Contains("не хватает") || text.Contains("продерж"))
        {
            return Topics.HowToLast;
        }

        if (text.Contains("лишн") || text.Contains("нерацион") || text.Contains("куда уход") || text.Contains("на что трач"))
        {
            return Topics.Wasteful;
        }

        if (text.Contains("огон") || text.Contains("сери"))
        {
            return Topics.Streak;
        }

        if (text.Contains("цен") || text.Contains("продукт") || text.Contains("регион") || text.Contains("еда"))
        {
            return Topics.Regional;
        }

        if (text.Contains("лимит"))
        {
            return Topics.WhyLimit;
        }

        return Topics.General;
    }

    /// <summary>Сумма из вопроса: «наушники за 3 500» → 3500. Нет суммы — null.</summary>
    public static decimal? ParseAmount(string message)
    {
        Match match = AmountPattern.Match(message);
        if (!match.Success)
        {
            return null;
        }

        string digits = new(match.Value.Where(char.IsDigit).ToArray());
        return decimal.TryParse(digits, out decimal amount) && amount > 0 ? amount : null;
    }
}
