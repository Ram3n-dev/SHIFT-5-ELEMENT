using LimitPlus.Api.Data;
using LimitPlus.Api.Logic;

namespace LimitPlus.Api.Services;

/// <summary>Итоги кэшбэка за месяц и сумма за всё время.</summary>
public record CashbackSummary(DateOnly Month, CashbackMonthResult? Result, decimal AllTimeTotal);

/// <summary>
/// Кэшбэк: какие траты у пользователя по категориям и сколько принесёт (или принёс) выбор категорий.
/// Считаются только покупки картой — наличные кэшбэк не дают.
/// </summary>
public class CashbackService
{
    /// <summary>По скольким дням считаем средние траты для подбора категорий.</summary>
    public const int SpendWindowDays = 90;

    private readonly CashbackRepository _cashback;
    private readonly MoneyRepository _money;

    public CashbackService(CashbackRepository cashback, MoneyRepository money)
    {
        _cashback = cashback;
        _money = money;
    }

    public static DateOnly MonthStart(DateOnly date) => new(date.Year, date.Month, 1);

    /// <summary>«2026-10» → 1 октября 2026. Неверная строка — null.</summary>
    public static DateOnly? ParseMonth(string? month) =>
        DateOnly.TryParseExact($"{month}-01", "yyyy-MM-dd", out DateOnly date) ? date : null;

    public static List<CashbackOption> ToOptions(IEnumerable<CashbackOptionRow> rows) =>
        rows.Select(r => new CashbackOption(r.Id, r.Name, r.Percent, r.Category)).ToList();

    /// <summary>
    /// Траты картой по категориям в пересчёте на месяц (30 дней) за последние 90 дней.
    /// Если истории меньше двух недель, всё равно делим на 14 дней, чтобы не раздувать прогноз.
    /// </summary>
    public static Dictionary<string, decimal> MonthlySpend(IReadOnlyList<ExpenseItem> expenses, DateOnly today)
    {
        DateOnly windowStart = today.AddDays(-(SpendWindowDays - 1));
        List<ExpenseItem> card = expenses.Where(e => e.IsCard && e.Date >= windowStart && e.Date <= today).ToList();
        if (card.Count == 0)
        {
            return new Dictionary<string, decimal>();
        }

        int daysCovered = Math.Max(14, today.DayNumber - card.Min(e => e.Date).DayNumber + 1);
        return card
            .GroupBy(e => e.Category)
            .ToDictionary(g => g.Key, g => BudgetCalculator.RoundRub(g.Sum(e => e.Amount) * 30 / daysCovered));
    }

    /// <summary>Фактические траты картой по категориям за календарный месяц.</summary>
    public static Dictionary<string, decimal> ActualSpend(IReadOnlyList<ExpenseItem> expenses, DateOnly month)
    {
        DateOnly monthEnd = month.AddMonths(1).AddDays(-1);
        return expenses
            .Where(e => e.IsCard && e.Date >= month && e.Date <= monthEnd)
            .GroupBy(e => e.Category)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));
    }

    /// <summary>Лучший набор категорий из вариантов месяца по тратам пользователя.</summary>
    public async Task<CashbackPlan?> PlanAsync(Guid userId, DateOnly month, UserState state)
    {
        List<CashbackOptionRow> rows = await _cashback.GetOptionsAsync(userId, month);
        if (rows.Count == 0)
        {
            return null;
        }

        return CashbackOptimizer.Recommend(ToOptions(rows), MonthlySpend(state.Expenses, state.Today));
    }

    /// <summary>Итоги месяца по выбранным категориям и общая сумма за последний год.</summary>
    public async Task<CashbackSummary> SummaryAsync(Guid userId, DateOnly month, DateOnly today)
    {
        DateOnly yearAgo = MonthStart(today).AddMonths(-11);
        List<CashbackOptionRow> allRows = await _cashback.GetOptionsSinceAsync(userId, yearAgo);
        List<DateOnly> chosenMonths = allRows.Where(r => r.Chosen && r.Month <= month).Select(r => r.Month).Distinct().ToList();
        if (chosenMonths.Count == 0)
        {
            return new CashbackSummary(month, null, 0);
        }

        DateOnly from = chosenMonths.Min();
        List<ExpenseItem> expenses = (await _money.GetOperationsAsync(userId, from, today))
            .Where(o => o.Type == "expense")
            .Select(o => new ExpenseItem(o.Date, o.Amount, o.Category, o.IsMandatory || o.IsRecurring, o.AccountType == "card"))
            .ToList();

        CashbackMonthResult? result = null;
        decimal allTime = 0;
        foreach (DateOnly chosenMonth in chosenMonths)
        {
            List<CashbackOptionRow> monthRows = allRows.Where(r => r.Month == chosenMonth).ToList();
            CashbackMonthResult monthResult = CashbackOptimizer.Evaluate(
                ToOptions(monthRows), ToOptions(monthRows.Where(r => r.Chosen)), ActualSpend(expenses, chosenMonth));

            allTime += monthResult.Total;
            if (chosenMonth == month)
            {
                result = monthResult;
            }
        }

        return new CashbackSummary(month, result, allTime);
    }
}
