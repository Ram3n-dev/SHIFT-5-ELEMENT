using LimitPlus.Api.Models;

namespace LimitPlus.Api.Services;

/// <summary>
/// Все финансовые формулы Лимит+ живут здесь. Frontend сам ничего не считает — только вызывает API.
/// </summary>
public static class BudgetCalculator
{
    /// <summary>Если дневной лимит меньше этой суммы, бюджет считается напряжённым.</summary>
    public const decimal LowDailyLimit = 200m;

    /// <summary>Если покупка уменьшает дневной лимит на эту долю или больше — это предупреждение.</summary>
    public const decimal NoticeableLimitDrop = 0.20m;

    public static CalculateResponse Calculate(CalculateRequest request, DateOnly today)
    {
        int days = DaysUntilStipend(today, request.StipendDate);

        // В повседневные траты идут только счета с include_in_spending = true.
        decimal totalBalance = RoundRub(request.Accounts
            .Where(account => account.IncludeInSpending)
            .Sum(account => account.Balance));

        // Регулярные платежи, которые спишутся с сегодняшнего дня по день стипендии включительно.
        // Платёж в день стипендии тоже учитываем: стипендия может прийти позже списания.
        List<UpcomingPayment> upcomingPayments = request.RecurringExpenses
            .Where(expense => expense.Enabled && expense.NextDate >= today && expense.NextDate <= request.StipendDate)
            .OrderBy(expense => expense.NextDate)
            .Select(expense => new UpcomingPayment(expense.Id, expense.Name, RoundRub(expense.Amount), expense.NextDate))
            .ToList();

        decimal mandatoryExpenses = RoundRub(request.ManualMandatoryExpenses) + upcomingPayments.Sum(payment => payment.Amount);
        decimal reserve = RoundRub(request.Reserve);
        decimal freeMoney = totalBalance - mandatoryExpenses - reserve;
        decimal dailyLimit = DailyLimit(freeMoney, days);
        BudgetStatus status = GetBudgetStatus(dailyLimit);

        return new CalculateResponse(
            DaysUntilStipend: days,
            TotalBalance: totalBalance,
            MandatoryExpenses: mandatoryExpenses,
            Reserve: reserve,
            FreeMoney: freeMoney,
            DailyLimit: dailyLimit,
            Status: status,
            Message: GetBudgetMessage(status, dailyLimit),
            UpcomingPayments: upcomingPayments);
    }

    public static PurchaseCheckResponse CheckPurchase(PurchaseCheckRequest request, DateOnly today)
    {
        int days = DaysUntilStipend(today, request.StipendDate);

        decimal totalBalance = RoundRub(request.TotalBalance);
        decimal mandatoryExpenses = RoundRub(request.MandatoryExpenses);
        decimal reserve = RoundRub(request.Reserve);
        decimal purchaseAmount = RoundRub(request.PurchaseAmount);

        decimal limitBefore = DailyLimit(totalBalance - mandatoryExpenses - reserve, days);
        decimal balanceAfter = totalBalance - purchaseAmount;
        decimal limitAfter = DailyLimit(balanceAfter - mandatoryExpenses - reserve, days);
        decimal limitChange = limitAfter - limitBefore;

        PurchaseDecision decision = GetPurchaseDecision(
            totalBalance, mandatoryExpenses + reserve, balanceAfter, limitBefore, limitAfter);

        return new PurchaseCheckResponse(
            BalanceAfter: balanceAfter,
            DailyLimitBefore: limitBefore,
            DailyLimitAfter: limitAfter,
            LimitChange: limitChange,
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
                "Дата стипендии должна быть позже сегодняшнего дня. Укажите дату следующей стипендии в настройках.");
        }

        return days;
    }

    /// <summary>Дневной лимит округляется вниз, чтобы не обещать больше, чем есть.</summary>
    private static decimal DailyLimit(decimal freeMoney, int days) =>
        freeMoney <= 0 ? 0 : Math.Floor(freeMoney / days);

    /// <summary>Все остальные суммы округляются до целых рублей.</summary>
    private static decimal RoundRub(decimal value) =>
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
        BudgetStatus.Safe => $"Ваш ориентир — до {TextFormat.Rub(dailyLimit)} в день.",
        BudgetStatus.Warning => $"Бюджет напряжённый: до {TextFormat.Rub(dailyLimit)} в день до стипендии.",
        _ => "После обязательных расходов свободного бюджета до стипендии не остаётся.",
    };

    private static string GetPurchaseMessage(PurchaseDecision decision, decimal limitChange)
    {
        string drop = TextFormat.Rub(-limitChange);

        return decision switch
        {
            PurchaseDecision.Safe when limitChange < 0 =>
                $"Покупка укладывается в ваш финансовый план. Дневной лимит снизится на {drop}.",
            PurchaseDecision.Safe =>
                "Покупка укладывается в ваш финансовый план.",
            PurchaseDecision.Warning =>
                $"Покупка возможна, но заметно сократит ваш дневной запас: лимит снизится на {drop}.",
            PurchaseDecision.Critical =>
                "После обязательных расходов свободного бюджета до стипендии не остаётся.",
            _ =>
                "Покупка приведёт к отрицательному остатку. Лучше отложить её до стипендии.",
        };
    }
}
