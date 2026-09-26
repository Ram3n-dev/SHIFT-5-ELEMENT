using System.Text;
using LimitPlus.Api.Logic;
using static LimitPlus.Api.Logic.TextFormat;

namespace LimitPlus.Api.Ai;

/// <summary>Всё, что код уже посчитал про пользователя. ИИ получает эти факты и ничего не пересчитывает.</summary>
public record AssistantFacts(
    BudgetResult Budget,
    StreakResult Streak,
    PeriodComparison Comparison,
    List<WasteFlag> Waste,
    LastingPlan Lasting,
    RegionalInfo? Regional,
    CashbackPlan? CashbackPlan,
    string? CashbackPlanMonth,
    CashbackMonthResult? LastCashback,
    string? LastCashbackMonth);

/// <summary>
/// Безопасные ответы-шаблоны. Берут только готовые числа из фактов.
/// Не советуют кредиты, займы, рассрочку, инвестиции и банковские продукты.
/// </summary>
public static class AssistantTemplates
{
    public const string ForbiddenAnswer =
        "Я не советую кредиты, займы, рассрочку, инвестиции и другие финансовые продукты. " +
        "Могу помочь с лимитом до стипендии, тратами и кэшбэком.";

    public const string GeneralAnswer =
        "Я помогаю дотянуть до стипендии: объясняю лимит, ищу лишние траты и подбираю кэшбэк. " +
        "Выбери готовый вопрос ниже или спроси про свой лимит.";

    public static string Build(string topic, AssistantFacts facts, string message) => topic switch
    {
        Topics.WhyLimit => WhyLimitText(facts.Budget),
        Topics.Faster => FasterText(facts.Comparison),
        Topics.HowToLast => HowToLastText(facts),
        Topics.Wasteful => WastefulText(facts.Waste),
        Topics.CashbackPick => CashbackPickText(facts),
        Topics.CashbackResults => CashbackResultsText(facts),
        Topics.Regional => RegionalText(facts),
        Topics.Streak => StreakText(facts.Streak),
        Topics.Purchase => PurchaseText(facts.Budget, Prompts.ParseAmount(message)),
        Topics.Forbidden => ForbiddenAnswer,
        _ => GeneralAnswer,
    };

    /// <summary>Короткий совет дня для главной — самое полезное из фактов.</summary>
    public static string TipOfTheDay(AssistantFacts facts)
    {
        if (facts.Budget.DayLimit <= 0)
        {
            return HowToLastText(facts);
        }

        WasteFlag? frequent = facts.Waste.FirstOrDefault(f => f.Kind == "frequent");
        if (frequent is not null)
        {
            return $"На «{frequent.Category}» за неделю ушло {Rub(frequent.Sum)} — {frequent.Count} {Times(frequent.Count)}. " +
                   "Если сократить, лимит на следующие дни подрастёт.";
        }

        CategoryChange? increase = facts.Comparison.Increases.FirstOrDefault();
        if (increase is not null)
        {
            return $"На «{increase.Category}» в этот раз уходит больше, чем в прошлом периоде: " +
                   $"{Rub(increase.Current)} против {Rub(increase.Previous)}.";
        }

        if (facts.Lasting.OverPace)
        {
            return $"В среднем ты тратишь {Rub(facts.Lasting.AveragePerDay)} в день — больше лимита. " +
                   "Пара дней экономии — и всё выровняется.";
        }

        return $"Идёшь в пределах лимита. Ориентир — до {Rub(facts.Budget.DayLimit)} в день, так держать.";
    }

    /// <summary>Факты списком — их получает языковая модель.</summary>
    public static string DescribeFacts(AssistantFacts facts)
    {
        BudgetResult b = facts.Budget;
        var lines = new StringBuilder();
        lines.AppendLine($"Дней до стипендии: {b.DaysUntilStipend}");
        lines.AppendLine($"Доступно сейчас: {Rub(b.TotalBalance)}");
        lines.AppendLine($"Обязательные траты до стипендии: {Rub(b.MandatoryExpenses)}");
        lines.AppendLine($"Резерв: {Rub(b.Reserve)}");
        lines.AppendLine($"Свободно на начало дня: {Rub(b.FreeAtDayStart)}");
        lines.AppendLine($"Лимит на день: {Rub(b.DayLimit)}, потрачено сегодня: {Rub(b.SpentToday)}, осталось сегодня: {Rub(b.LeftToday)}");
        if (b.PeriodDays > 1)
        {
            lines.AppendLine($"Лимит на {b.PeriodDays} {Days(b.PeriodDays)}: {Rub(b.PeriodLimit)}");
        }

        lines.AppendLine($"Серия дней в лимите: {facts.Streak.Current}");

        if (facts.Comparison.HasPrevious)
        {
            lines.AppendLine($"За первые {facts.Comparison.DaysCompared} {Days(facts.Comparison.DaysCompared)} периода потрачено " +
                             $"{Rub(facts.Comparison.CurrentTotal)}, в прошлом периоде за те же дни — {Rub(facts.Comparison.PreviousTotal)}");
            foreach (CategoryChange change in facts.Comparison.Increases)
            {
                lines.AppendLine($"Рост в категории «{change.Category}»: {Rub(change.Current)} против {Rub(change.Previous)} (+{Rub(change.Delta)})");
            }
        }

        foreach (WasteFlag flag in facts.Waste)
        {
            lines.AppendLine(DescribeWaste(flag));
        }

        lines.AppendLine($"Средний необязательный расход в день: {Rub(facts.Lasting.AveragePerDay)}");
        if (facts.Lasting.TopCategory is not null)
        {
            lines.AppendLine($"Главная необязательная категория: «{facts.Lasting.TopCategory}», {Rub(facts.Lasting.TopCategoryPerDay)} в день; " +
                             $"если сократить вдвое — освободится {Rub(facts.Lasting.SavingIfHalved)} в день");
        }

        if (facts.Regional is not null)
        {
            lines.AppendLine($"Минимальный набор продуктов ({facts.Regional.RegionName}, Росстат, {facts.Regional.Period}): " +
                             $"{Rub(facts.Regional.FoodBasketMonth)} в месяц, около {Rub(facts.Regional.FoodPerDay)} в день");
        }

        if (facts.CashbackPlan is { Best.Count: > 0 } plan)
        {
            lines.AppendLine($"Лучшие категории кэшбэка на {facts.CashbackPlanMonth}: " +
                             string.Join(", ", plan.Best.Select(p => $"{p.Name} {p.Percent:0.#}% (~{Rub(p.ExpectedRub)})")) +
                             $", всего около {Rub(plan.ExpectedTotal)} в месяц");
        }

        if (facts.LastCashback is not null)
        {
            lines.AppendLine($"Кэшбэк за {facts.LastCashbackMonth}: около {Rub(facts.LastCashback.Total)}, " +
                             $"с 1% на всё было бы {Rub(facts.LastCashback.OnePercent)}");
        }

        return lines.ToString();
    }

    private static string WhyLimitText(BudgetResult b)
    {
        string start = $"Сейчас доступно {Rub(b.TotalBalance)}: {Rub(b.MandatoryExpenses)} нужно на обязательные траты, " +
                       $"{Rub(b.Reserve)} ты оставляешь в резерве.";

        if (b.DayLimit <= 0)
        {
            return $"{start} После этого свободных денег до стипендии почти не остаётся, поэтому дневной лимит — {Rub(0)}.";
        }

        string period = b.PeriodDays > 1 ? $" На {b.PeriodDays} {Days(b.PeriodDays)} — до {Rub(b.PeriodLimit)}." : "";
        return $"{start} Свободно {Rub(b.FreeAtDayStart)} на {b.DaysUntilStipend} {Days(b.DaysUntilStipend)} до стипендии, " +
               $"поэтому ориентир — до {Rub(b.DayLimit)} в день.{period}";
    }

    private static string FasterText(PeriodComparison c)
    {
        if (!c.HasPrevious)
        {
            return "Пока не с чем сравнить: нужен хотя бы один прошлый период между стипендиями. " +
                   "Записывай траты — в следующем месяце Енот покажет разницу.";
        }

        string totals = $"За первые {c.DaysCompared} {Days(c.DaysCompared)} ушло {Rub(c.CurrentTotal)} " +
                        $"против {Rub(c.PreviousTotal)} в прошлый раз.";

        if (c.Increases.Count == 0)
        {
            return $"{totals} Темп не выше прошлого — деньги уходят не быстрее.";
        }

        string growth = string.Join(", ", c.Increases.Select(i => $"«{i.Category}» (+{Rub(i.Delta)})"));
        return $"{totals} Больше всего выросли: {growth}.";
    }

    private static string HowToLastText(AssistantFacts facts)
    {
        BudgetResult b = facts.Budget;
        if (b.DayLimit <= 0)
        {
            return $"До стипендии {b.DaysUntilStipend} {Days(b.DaysUntilStipend)}, а свободных денег почти нет. " +
                   "Помогут отказ от необязательных покупок и перенос их на время после стипендии. " +
                   "Если не хватает на еду, обратись к близким или в профком за материальной помощью.";
        }

        LastingPlan plan = facts.Lasting;
        var text = new StringBuilder($"Ориентир — до {Rub(b.DayLimit)} в день ещё {b.DaysUntilStipend} {Days(b.DaysUntilStipend)}. ");
        text.Append(plan.OverPace
            ? $"Сейчас ты тратишь в среднем {Rub(plan.AveragePerDay)} в день — это больше лимита. "
            : $"В среднем ты тратишь {Rub(plan.AveragePerDay)} в день — это в пределах лимита. ");

        if (plan.TopCategory is not null && plan.SavingIfHalved > 0)
        {
            text.Append($"Если вдвое сократить «{plan.TopCategory}», освободится около {Rub(plan.SavingIfHalved)} в день. ");
        }

        if (facts.Regional is not null)
        {
            text.Append($"Минимальный набор продуктов в регионе стоит около {Rub(facts.Regional.FoodPerDay)} в день.");
        }

        return text.ToString().Trim();
    }

    private static string WastefulText(List<WasteFlag> waste)
    {
        if (waste.Count == 0)
        {
            return "За последнюю неделю явно лишних трат не видно — так держать.";
        }

        return "Вот на что стоит посмотреть: " + string.Join("; ", waste.Select(DescribeWaste)) +
               ". Это можно сократить без больших потерь.";
    }

    private static string DescribeWaste(WasteFlag flag) => flag.Kind switch
    {
        "frequent" => $"«{flag.Category}» — {flag.Count} {Times(flag.Count)} за неделю, {Rub(flag.Sum)}",
        "small" => $"{flag.Count} мелких покупок до {Rub(SpendingAnalyzer.SmallPurchaseLimit)} за неделю — {Rub(flag.Sum)}",
        _ => $"{flag.Count} {Days(flag.Count)} сверх лимита в этом периоде — {Rub(flag.Sum)} сверху",
    };

    private static string CashbackPickText(AssistantFacts facts)
    {
        if (facts.CashbackPlan is not { Best.Count: > 0 } plan)
        {
            return "Загрузи скриншот категорий кэшбэка на экране «Кэшбэк» — Енот подберёт выгодные по твоим тратам.";
        }

        return DescribePlan(plan, facts.CashbackPlanMonth ?? "месяц");
    }

    /// <summary>Объяснение подбора кэшбэка: что взять, сколько принесёт и какой «заманчивый» вариант невыгоден.</summary>
    public static string DescribePlan(CashbackPlan plan, string monthName)
    {
        if (plan.Best.Count == 0)
        {
            return "Добавь варианты кэшбэка — Енот подберёт выгодные по твоим тратам.";
        }

        string best = string.Join(", ", plan.Best.Select(p => $"«{p.Name}» {p.Percent:0.#}% (~{Rub(p.ExpectedRub)})"));
        var text = new StringBuilder($"На {monthName} выгоднее всего: {best} — примерно {Rub(plan.ExpectedTotal)} в месяц.");

        decimal minBestPercent = plan.Best.Min(p => p.Percent);
        CashbackPick? tempting = plan.Rest.FirstOrDefault(p => p.Percent > minBestPercent);
        if (tempting is not null)
        {
            text.Append($" «{tempting.Name}» {tempting.Percent:0.#}% выглядит заманчиво, но по твоим тратам выйдет около {Rub(tempting.ExpectedRub)}.");
        }

        if (plan.CapReached)
        {
            text.Append($" Упрёмся в лимит банка — {Rub(CashbackOptimizer.DefaultMonthlyCap)} в месяц.");
        }

        return text.ToString();
    }

    private static string CashbackResultsText(AssistantFacts facts)
    {
        if (facts.LastCashback is null)
        {
            return "Пока нет выбранных категорий кэшбэка за прошлый месяц. Выбери их на экране «Кэшбэк» — " +
                   "в конце месяца Енот посчитает итог.";
        }

        CashbackMonthResult r = facts.LastCashback;
        return $"За {facts.LastCashbackMonth} по операциям в Лимит+ кэшбэк — около {Rub(r.Total)}. " +
               $"С «1% на всё» было бы {Rub(r.OnePercent)}, а максимум при другом выборе — {Rub(r.BestPossible)}.";
    }

    private static string RegionalText(AssistantFacts facts)
    {
        if (facts.Regional is null)
        {
            return "Выбери город в профиле — покажу цены твоего региона.";
        }

        RegionalInfo r = facts.Regional;
        string average = r.IsRussiaAverage ? " По твоему региону данных пока нет — это среднее по России." : "";
        return $"Минимальный набор продуктов ({r.RegionName}) стоит {Rub(r.FoodBasketMonth)} в месяц — около {Rub(r.FoodPerDay)} в день " +
               $"(Росстат, {r.Period}). Твой лимит — {Rub(facts.Budget.DayLimit)} в день.{average}";
    }

    private static string StreakText(StreakResult s) =>
        "Огонёк растёт, если каждый день записывать траты (или нажать «Сегодня без трат») и не выходить за лимит. " +
        "Перерасход обнуляет серию, а один пропущенный день раз в неделю закрывает заморозка. " +
        $"Сейчас серия — {s.Current} {Days(s.Current)}, рекорд — {s.Best}.";

    private static string PurchaseText(BudgetResult budget, decimal? amount)
    {
        if (amount is null)
        {
            return GeneralAnswer;
        }

        PurchaseResult r = BudgetCalculator.CheckPurchase(budget, amount.Value);
        string verdict = r.Decision switch
        {
            PurchaseDecision.Safe => "Покупка укладывается в план.",
            PurchaseDecision.Warning => "Покупка возможна, но заметно сократит дневной запас.",
            PurchaseDecision.Critical => "После неё свободных денег до стипендии не останется.",
            _ => "На неё сейчас не хватает денег — лучше отложить до стипендии.",
        };

        return $"Если купить за {Rub(r.Amount)}, лимит изменится с {Rub(r.DailyLimitBefore)} до {Rub(r.DailyLimitAfter)} в день. {verdict}";
    }
}
