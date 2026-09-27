namespace LimitPlus.Api.Logic;

public record BudgetInput(
    IReadOnlyList<MoneyAccount> Accounts,
    decimal MandatoryLeft,
    decimal Reserve,
    IReadOnlyList<RecurringItem> Recurring,
    DateOnly Today,
    DateOnly StipendDate,
    decimal SpentToday,
    int LimitPeriodDays);

public record UpcomingPayment(Guid Id, string Name, decimal Amount, DateOnly NextDate);

public record BudgetResult(
    int DaysUntilStipend,
    DateOnly StipendDate,
    decimal TotalBalance,
    decimal MandatoryExpenses,
    decimal Reserve,
    decimal FreeMoney,
    decimal FreeAtDayStart,
    decimal DayLimit,
    decimal SpentToday,
    decimal LeftToday,
    int PeriodDays,
    decimal PeriodLimit,
    decimal LeftInPeriod,
    BudgetStatus Status,
    string Message,
    List<UpcomingPayment> UpcomingPayments);

public record PurchaseResult(
    decimal Amount,
    decimal BalanceAfter,
    decimal DailyLimitBefore,
    decimal DailyLimitAfter,
    decimal LimitChange,
    decimal LeftTodayAfter,
    PurchaseDecision Decision,
    string Message);

/// <summary>
<<<<<<< HEAD
/// Все финансовые формулы Енотономики живут здесь. Frontend и ИИ ничего не считают.
=======
/// Все финансовые формулы Лимит+ живут здесь. Frontend и ИИ ничего не считают.
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
/// </summary>
public static class BudgetCalculator
{
    /// <summary>Если дневной лимит меньше этой суммы, бюджет считается напряжённым.</summary>
    public const decimal LowDailyLimit = 200m;

    /// <summary>Если покупка уменьшает дневной лимит на эту долю или больше — это предупреждение.</summary>
    public const decimal NoticeableLimitDrop = 0.20m;

    /// <summary>На сколько дней можно показывать лимит: день, 3 дня или неделя.</summary>
    public static readonly int[] AllowedPeriods = [1, 3, 7];

    public static BudgetResult Calculate(BudgetInput input)
    {
        int days = DaysUntilStipend(input.Today, input.StipendDate);

        // В повседневные траты идут только счета с include_in_spending = true.
        decimal totalBalance = RoundRub(input.Accounts.Where(a => a.IncludeInSpending).Sum(a => a.Balance));

        // Регулярные платежи с сегодняшнего дня по день стипендии включительно.
        List<UpcomingPayment> upcoming = input.Recurring
            .Where(r => r.Enabled && r.NextDate >= input.Today && r.NextDate <= input.StipendDate)
            .OrderBy(r => r.NextDate)
            .Select(r => new UpcomingPayment(r.Id, r.Name, RoundRub(r.Amount), r.NextDate))
            .ToList();

        decimal mandatory = RoundRub(Math.Max(0m, input.MandatoryLeft)) + upcoming.Sum(p => p.Amount);
        decimal reserve = RoundRub(input.Reserve);
        decimal freeMoney = totalBalance - mandatory - reserve;
        decimal spentToday = RoundRub(input.SpentToday);

        // Лимит дня считаем по деньгам на начало дня: сегодняшние траты уже «внутри» этого лимита.
        // Перерасход сегодня уменьшит лимит на следующие дни, экономия — увеличит.
        decimal freeAtDayStart = freeMoney + spentToday;
        decimal dayLimit = DailyLimit(freeAtDayStart, days);

        // Лимит на 3 дня или неделю — это дневной лимит, умноженный на число дней (но не дальше стипендии).
        int periodDays = Math.Min(NormalizePeriod(input.LimitPeriodDays), days);
        decimal periodLimit = dayLimit * periodDays;

        BudgetStatus status = GetBudgetStatus(dayLimit);

        return new BudgetResult(
            DaysUntilStipend: days,
            StipendDate: input.StipendDate,
            TotalBalance: totalBalance,
            MandatoryExpenses: mandatory,
            Reserve: reserve,
            FreeMoney: freeMoney,
            FreeAtDayStart: freeAtDayStart,
            DayLimit: dayLimit,
            SpentToday: spentToday,
            LeftToday: dayLimit - spentToday,
            PeriodDays: periodDays,
            PeriodLimit: periodLimit,
            LeftInPeriod: periodLimit - spentToday,
            Status: status,
            Message: GetBudgetMessage(status, dayLimit),
            UpcomingPayments: upcoming);
    }

    /// <summary>Что станет с дневным лимитом, если сегодня купить вещь за <paramref name="purchaseAmount"/>.</summary>
    public static PurchaseResult CheckPurchase(BudgetResult budget, decimal purchaseAmount)
    {
        decimal amount = RoundRub(purchaseAmount);
        decimal limitBefore = budget.DayLimit;
        decimal limitAfter = DailyLimit(budget.FreeAtDayStart - amount, budget.DaysUntilStipend);
        decimal balanceAfter = budget.TotalBalance - amount;
        decimal limitChange = limitAfter - limitBefore;

        PurchaseDecision decision = GetPurchaseDecision(
            budget.TotalBalance, budget.MandatoryExpenses + budget.Reserve, balanceAfter, limitBefore, limitAfter);

        return new PurchaseResult(
            Amount: amount,
            BalanceAfter: balanceAfter,
            DailyLimitBefore: limitBefore,
            DailyLimitAfter: limitAfter,
            LimitChange: limitChange,
            LeftTodayAfter: limitAfter - budget.SpentToday,
            Decision: decision,
            Message: GetPurchaseMessage(decision, limitChange));
    }

    /// <summary>
    /// Сколько дней нужно продержаться: сегодняшний день считается, день стипендии — нет.
    /// Например, сегодня 26 сентября, стипендия 6 октября — это 10 дней.
    /// </summary>
    public static int DaysUntilStipend(DateOnly today, DateOnly stipendDate)
    {
        int days = stipendDate.DayNumber - today.DayNumber;
        if (days <= 0)
        {
            throw new BudgetValidationException(
                "Дата стипендии должна быть позже сегодняшнего дня. Проверь число стипендии в профиле.");
        }

        return days;
    }

    public static int NormalizePeriod(int periodDays) => AllowedPeriods.Contains(periodDays) ? periodDays : 1;

    /// <summary>Дневной лимит округляется вниз, чтобы не обещать больше, чем есть.</summary>
    public static decimal DailyLimit(decimal freeMoney, int days) =>
        freeMoney <= 0 ? 0 : Math.Floor(freeMoney / days);

    /// <summary>Все остальные суммы округляются до целых рублей.</summary>
    public static decimal RoundRub(decimal value) =>
        Math.Round(value, 0, MidpointRounding.AwayFromZero);

    private static BudgetStatus GetBudgetStatus(decimal dailyLimit)
    {
        if (dailyLimit <= 0)
        {
            return BudgetStatus.Critical;
        }

        return dailyLimit < LowDailyLimit ? BudgetStatus.Warning : BudgetStatus.Safe;
    }

    private static PurchaseDecision GetPurchaseDecision(
        decimal totalBalance,
        decimal mandatoryAndReserve,
        decimal balanceAfter,
        decimal limitBefore,
        decimal limitAfter)
    {
        if (balanceAfter < 0)
        {
            return PurchaseDecision.NotRecommended;
        }

        if (limitAfter <= 0 || totalBalance < mandatoryAndReserve)
        {
            return PurchaseDecision.Critical;
        }

        // Здесь limitBefore >= limitAfter > 0, поэтому делить можно.
        decimal drop = (limitBefore - limitAfter) / limitBefore;
        return drop >= NoticeableLimitDrop ? PurchaseDecision.Warning : PurchaseDecision.Safe;
    }

    private static string GetBudgetMessage(BudgetStatus status, decimal dailyLimit) => status switch
    {
        BudgetStatus.Safe => $"Твой ориентир — до {TextFormat.Rub(dailyLimit)} в день.",
        BudgetStatus.Warning => $"Бюджет напряжённый: до {TextFormat.Rub(dailyLimit)} в день до стипендии.",
        _ => "После обязательных трат и резерва свободных денег до стипендии не остаётся.",
    };

    private static string GetPurchaseMessage(PurchaseDecision decision, decimal limitChange)
    {
        string drop = TextFormat.Rub(-limitChange);

        return decision switch
        {
            PurchaseDecision.Safe when limitChange < 0 =>
                $"Покупка укладывается в план. Дневной лимит снизится на {drop}.",
            PurchaseDecision.Safe =>
                "Покупка укладывается в план.",
            PurchaseDecision.Warning =>
                $"Купить можно, но дневной лимит заметно снизится — на {drop}.",
            PurchaseDecision.Critical =>
                "После покупки свободных денег до стипендии не останется.",
            _ =>
                "Денег на счетах не хватит: баланс уйдёт в минус. Лучше отложить до стипендии.",
        };
    }
}
