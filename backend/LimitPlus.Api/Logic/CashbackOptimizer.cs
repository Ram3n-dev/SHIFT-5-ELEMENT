namespace LimitPlus.Api.Logic;

/// <summary>
/// Вариант кэшбэка, который банк предложил пользователю. Category — наша категория трат,
/// "*" — все покупки (например, «1% на всё»), null — не удалось сопоставить.
/// </summary>
public record CashbackOption(Guid Id, string Name, decimal Percent, string? Category);

/// <summary>Вариант кэшбэка и сколько рублей он принесёт по тратам пользователя.</summary>
public record CashbackPick(Guid Id, string Name, decimal Percent, string? Category, decimal ExpectedRub);

public record CashbackPlan(List<CashbackPick> Best, List<CashbackPick> Rest, decimal ExpectedTotal, bool CapReached);

public record CashbackMonthResult(
    List<CashbackPick> PerOption,
    decimal Total,
    decimal BestPossible,
    decimal OnePercent,
    bool CapReached);

/// <summary>
/// Подбор категорий кэшбэка. Считает только код: ИИ потом объясняет готовый результат.
/// Кэшбэк = траты по категории × процент. Если на одну категорию подходят два варианта, берём больший.
/// Сумма за месяц не больше лимита банка.
/// </summary>
public static class CashbackOptimizer
{
    public const string AllPurchases = "*";
    public const decimal DefaultMonthlyCap = 3000m;
    public const int PickCount = 4;
    public const int MaxOptions = 20;

    /// <summary>
    /// Перебирает все наборы из <paramref name="pickCount"/> вариантов и выбирает самый выгодный.
    /// <paramref name="monthlySpend"/> — траты картой по категориям за месяц.
    /// </summary>
    public static CashbackPlan Recommend(
        IReadOnlyList<CashbackOption> options,
        IReadOnlyDictionary<string, decimal> monthlySpend,
        decimal monthlyCap = DefaultMonthlyCap,
        int pickCount = PickCount)
    {
        int count = Math.Min(pickCount, options.Count);
        int[] bestSet = [];
        decimal bestTotal = -1;

        foreach (int[] set in Combinations(options.Count, count))
        {
            decimal total = Total(set.Select(i => options[i]).ToList(), monthlySpend, monthlyCap);
            if (total > bestTotal)
            {
                bestTotal = total;
                bestSet = set;
            }
        }

        List<CashbackOption> chosen = bestSet.Select(i => options[i]).ToList();
        Dictionary<Guid, decimal> contribution = Contributions(chosen, monthlySpend);

        List<CashbackPick> best = chosen
            .Select(o => ToPick(o, contribution.GetValueOrDefault(o.Id)))
            .OrderByDescending(p => p.ExpectedRub)
            .ToList();

        List<CashbackPick> rest = options
            .Where(o => !chosen.Contains(o))
            .Select(o => ToPick(o, Standalone(o, monthlySpend)))
            .OrderByDescending(p => p.ExpectedRub)
            .ToList();

        decimal uncapped = Uncapped(chosen, monthlySpend);
        return new CashbackPlan(best, rest, Math.Max(0, bestTotal), uncapped > monthlyCap);
    }

    /// <summary>Итоги месяца: сколько принёс выбранный набор по реальным тратам и сколько можно было получить.</summary>
    public static CashbackMonthResult Evaluate(
        IReadOnlyList<CashbackOption> allOptions,
        IReadOnlyList<CashbackOption> chosen,
        IReadOnlyDictionary<string, decimal> actualSpend,
        decimal monthlyCap = DefaultMonthlyCap)
    {
        Dictionary<Guid, decimal> contribution = Contributions(chosen, actualSpend);
        List<CashbackPick> perOption = chosen
            .Select(o => ToPick(o, contribution.GetValueOrDefault(o.Id)))
            .OrderByDescending(p => p.ExpectedRub)
            .ToList();

        decimal total = Total(chosen, actualSpend, monthlyCap);
        decimal bestPossible = allOptions.Count == 0 ? total : Recommend(allOptions, actualSpend, monthlyCap).ExpectedTotal;
        decimal onePercent = Math.Min(monthlyCap, BudgetCalculator.RoundRub(actualSpend.Values.Sum() * 0.01m));

        return new CashbackMonthResult(perOption, total, Math.Max(total, bestPossible), onePercent,
            Uncapped(chosen, actualSpend) > monthlyCap);
    }

    /// <summary>Кэшбэк набора: по каждой категории берём лучший процент, итог не больше лимита.</summary>
    public static decimal Total(IReadOnlyList<CashbackOption> set, IReadOnlyDictionary<string, decimal> spend, decimal monthlyCap) =>
        Math.Min(monthlyCap, Uncapped(set, spend));

    private static decimal Uncapped(IReadOnlyList<CashbackOption> set, IReadOnlyDictionary<string, decimal> spend) =>
        BudgetCalculator.RoundRub(spend.Sum(pair => pair.Value * BestPercent(set, pair.Key) / 100));

    private static decimal BestPercent(IReadOnlyList<CashbackOption> set, string category) =>
        set.Where(o => Applies(o, category)).Select(o => o.Percent).DefaultIfEmpty(0m).Max();

    private static bool Applies(CashbackOption option, string category) =>
        option.Category == AllPurchases || option.Category == category;

    /// <summary>Сколько рублей принёс каждый вариант набора (категория достаётся варианту с большим процентом).</summary>
    private static Dictionary<Guid, decimal> Contributions(IReadOnlyList<CashbackOption> set, IReadOnlyDictionary<string, decimal> spend)
    {
        var result = set.ToDictionary(o => o.Id, _ => 0m);
        foreach ((string category, decimal amount) in spend)
        {
            CashbackOption? winner = set.Where(o => Applies(o, category)).OrderByDescending(o => o.Percent).FirstOrDefault();
            if (winner is not null)
            {
                result[winner.Id] += amount * winner.Percent / 100;
            }
        }

        return result.ToDictionary(pair => pair.Key, pair => BudgetCalculator.RoundRub(pair.Value));
    }

    /// <summary>Сколько принёс бы вариант сам по себе.</summary>
    private static decimal Standalone(CashbackOption option, IReadOnlyDictionary<string, decimal> spend) =>
        BudgetCalculator.RoundRub(spend.Where(pair => Applies(option, pair.Key)).Sum(pair => pair.Value * option.Percent / 100));

    private static CashbackPick ToPick(CashbackOption option, decimal rub) =>
        new(option.Id, option.Name, option.Percent, option.Category, rub);

    /// <summary>Все наборы из k индексов от 0 до n−1: {0,1,2,3}, {0,1,2,4}, …</summary>
    private static IEnumerable<int[]> Combinations(int n, int k)
    {
        if (k == 0)
        {
            yield return [];
            yield break;
        }

        int[] indexes = Enumerable.Range(0, k).ToArray();
        while (true)
        {
            yield return (int[])indexes.Clone();

            int position = k - 1;
            while (position >= 0 && indexes[position] == n - k + position)
            {
                position--;
            }

            if (position < 0)
            {
                yield break;
            }

            indexes[position]++;
            for (int i = position + 1; i < k; i++)
            {
                indexes[i] = indexes[i - 1] + 1;
            }
        }
    }
}
