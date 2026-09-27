namespace LimitPlus.Api.Logic;

public record CategoryChange(string Category, decimal Current, decimal Previous, decimal Delta);

/// <summary>Сравнение первых N дней текущего периода с теми же N днями прошлого.</summary>
public record PeriodComparison(
    bool HasPrevious,
    int DaysCompared,
    decimal CurrentTotal,
    decimal PreviousTotal,
    List<CategoryChange> Increases);

/// <summary>Одна «лишняя» трата: частые траты в категории, мелкие покупки или дни сверх лимита.</summary>
public record WasteFlag(string Kind, string Category, int Count, decimal Sum);

/// <summary>Как дотянуть до стипендии: средний расход в день против лимита и что даст экономия.</summary>
public record LastingPlan(
    decimal AveragePerDay,
    decimal DayLimit,
    bool OverPace,
    string? TopCategory,
    decimal TopCategoryPerDay,
    decimal SavingIfHalved);

/// <summary>
/// Аналитика трат. Считает только необязательные расходы: обязательные и регулярные платежи не «лишние».
/// </summary>
public static class SpendingAnalyzer
{
    public const int FrequentCount = 4;
    public const int SmallPurchasesCount = 5;
    public const decimal SmallPurchaseLimit = 300m;

    public static PeriodComparison ComparePeriods(
        IReadOnlyList<ExpenseItem> expenses, DateOnly currentStart, DateOnly previousStart, DateOnly today)
    {
        int daysElapsed = today.DayNumber - currentStart.DayNumber + 1;
        DateOnly previousEnd = previousStart.AddDays(daysElapsed - 1);
        if (previousEnd >= currentStart)
        {
            previousEnd = currentStart.AddDays(-1);
        }

        Dictionary<string, decimal> current = SumByCategory(expenses, currentStart, today);
        Dictionary<string, decimal> previous = SumByCategory(expenses, previousStart, previousEnd);
        bool hasPrevious = expenses.Any(e => e.Date >= previousStart && e.Date < currentStart);

        List<CategoryChange> increases = current.Keys.Union(previous.Keys)
            .Select(category =>
            {
                decimal now = current.GetValueOrDefault(category);
                decimal before = previous.GetValueOrDefault(category);
                return new CategoryChange(category, now, before, now - before);
            })
            .Where(change => change.Delta > 0)
            .OrderByDescending(change => change.Delta)
            .Take(3)
            .ToList();

        return new PeriodComparison(
            HasPrevious: hasPrevious,
            DaysCompared: daysElapsed,
            CurrentTotal: current.Values.Sum(),
            PreviousTotal: previous.Values.Sum(),
            Increases: hasPrevious ? increases : []);
    }

    /// <summary>
    /// Ищет «лишние» траты за последние 7 дней и дни сверх лимита в текущем периоде.
    /// <paramref name="overLimit"/> — сколько потрачено сверх лимита в каждый такой день.
    /// </summary>
    public static List<WasteFlag> FindWasteful(
        IReadOnlyList<ExpenseItem> expenses, DateOnly today, IReadOnlyList<decimal> overLimit)
    {
        DateOnly weekStart = today.AddDays(-6);
        List<ExpenseItem> week = expenses
            .Where(e => !e.IsMandatory && e.Date >= weekStart && e.Date <= today && Categories.Optional.Contains(e.Category))
            .ToList();

        var flags = new List<WasteFlag>();

        foreach (var group in week.GroupBy(e => e.Category))
        {
            if (group.Count() >= FrequentCount)
            {
                flags.Add(new WasteFlag("frequent", group.Key, group.Count(), group.Sum(e => e.Amount)));
            }
        }

        List<ExpenseItem> small = week.Where(e => e.Amount < SmallPurchaseLimit).ToList();
        if (small.Count >= SmallPurchasesCount)
        {
            flags.Add(new WasteFlag("small", "", small.Count, small.Sum(e => e.Amount)));
        }

        if (overLimit.Count > 0)
        {
            flags.Add(new WasteFlag("over_limit", "", overLimit.Count, overLimit.Sum()));
        }

        return flags.OrderByDescending(flag => flag.Sum).ToList();
    }

    /// <summary>Средний необязательный расход в день за текущий период и эффект, если урезать главную категорию вдвое.</summary>
    public static LastingPlan HowToLast(
        IReadOnlyList<ExpenseItem> expenses, DateOnly currentStart, DateOnly today, decimal dayLimit)
    {
        int daysElapsed = Math.Max(1, today.DayNumber - currentStart.DayNumber + 1);
        List<ExpenseItem> period = expenses
            .Where(e => !e.IsMandatory && e.Date >= currentStart && e.Date <= today)
            .ToList();

        decimal averagePerDay = BudgetCalculator.RoundRub(period.Sum(e => e.Amount) / daysElapsed);

        var top = period
            .Where(e => Categories.Optional.Contains(e.Category))
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Sum = g.Sum(e => e.Amount) })
            .OrderByDescending(g => g.Sum)
            .FirstOrDefault();

        decimal topPerDay = top is null ? 0 : BudgetCalculator.RoundRub(top.Sum / daysElapsed);

        return new LastingPlan(
            AveragePerDay: averagePerDay,
            DayLimit: dayLimit,
            OverPace: averagePerDay > dayLimit,
            TopCategory: top?.Category,
            TopCategoryPerDay: topPerDay,
            SavingIfHalved: Math.Floor(topPerDay / 2));
    }

    /// <summary>Необязательные траты по категориям за период [from; to].</summary>
    public static Dictionary<string, decimal> SumByCategory(IReadOnlyList<ExpenseItem> expenses, DateOnly from, DateOnly to) =>
        expenses
            .Where(e => !e.IsMandatory && e.Date >= from && e.Date <= to)
            .GroupBy(e => e.Category)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));
}
