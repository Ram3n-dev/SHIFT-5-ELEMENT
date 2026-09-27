using LimitPlus.Api.Logic;
using Xunit;

namespace LimitPlus.Tests;

public class BudgetCalculatorTests
{
    // Фиксированная дата, чтобы результат не зависел от дня запуска тестов.
    private static readonly DateOnly Today = new(2026, 9, 26);
    private static readonly DateOnly StipendIn10Days = Today.AddDays(10);

    /// <summary>Демо-сценарий: карта 4 200 ₽, наличные 800 ₽, обязательные траты 1 200 ₽, резерв 400 ₽.</summary>
    private static BudgetInput Demo(
        decimal card = 4200, decimal spentToday = 0, int periodDays = 1, DateOnly? stipend = null,
        List<RecurringItem>? recurring = null, decimal savings = 0, bool savingsIncluded = false) =>
        new(
            Accounts: [new MoneyAccount(card, true), new MoneyAccount(800, true), new MoneyAccount(savings, savingsIncluded)],
            MandatoryLeft: 1200,
            Reserve: 400,
            Recurring: recurring ?? [],
            Today: Today,
            StipendDate: stipend ?? StipendIn10Days,
            SpentToday: spentToday,
            LimitPeriodDays: periodDays);

    // 1. Нормальный расчёт
    [Fact]
    public void Calculate_DemoScenario_Gives340PerDay()
    {
        BudgetResult result = BudgetCalculator.Calculate(Demo());

        Assert.Equal(10, result.DaysUntilStipend);
        Assert.Equal(5000m, result.TotalBalance);
        Assert.Equal(1200m, result.MandatoryExpenses);
        Assert.Equal(3400m, result.FreeMoney);
        Assert.Equal(340m, result.DayLimit);
        Assert.Equal(BudgetStatus.Safe, result.Status);
    }

    // 2. Лимит на 3 дня и на неделю — дневной лимит × число дней
    [Theory]
    [InlineData(1, 340)]
    [InlineData(3, 1020)]
    [InlineData(7, 2380)]
    public void PeriodLimit_IsDayLimitTimesDays(int periodDays, decimal expected)
    {
        BudgetResult result = BudgetCalculator.Calculate(Demo(periodDays: periodDays));

        Assert.Equal(periodDays, result.PeriodDays);
        Assert.Equal(expected, result.PeriodLimit);
    }

    // 3. Неделя, а до стипендии 4 дня — считаем только до стипендии
    [Fact]
    public void PeriodLimit_StopsAtStipend()
    {
        BudgetResult result = BudgetCalculator.Calculate(Demo(periodDays: 7, stipend: Today.AddDays(4)));

        Assert.Equal(4, result.PeriodDays);
        Assert.Equal(result.DayLimit * 4, result.PeriodLimit);
    }

    // 4. Сегодняшние траты не меняют лимит дня, а уменьшают остаток на сегодня
    [Fact]
    public void SpentToday_KeepsDayLimit_AndReducesLeftToday()
    {
        // Кофе за 180 ₽ уже списан с карты: на карте 4 020 ₽.
        BudgetResult result = BudgetCalculator.Calculate(Demo(card: 4020, spentToday: 180, periodDays: 3));

        Assert.Equal(340m, result.DayLimit);
        Assert.Equal(160m, result.LeftToday);
        Assert.Equal(1020m - 180m, result.LeftInPeriod);
    }

    // 5. Safe-покупка: наушники за 650 ₽ из демо-сценария
    [Fact]
    public void CheckPurchase_Headphones650_IsSafeAndLimitBecomes275()
    {
        PurchaseResult result = BudgetCalculator.CheckPurchase(BudgetCalculator.Calculate(Demo()), 650);

        Assert.Equal(4350m, result.BalanceAfter);
        Assert.Equal(340m, result.DailyLimitBefore);
        Assert.Equal(275m, result.DailyLimitAfter);
        Assert.Equal(-65m, result.LimitChange);
        // Лимит падает на 19% — меньше порога в 20%, поэтому покупка укладывается в план.
        Assert.Equal(PurchaseDecision.Safe, result.Decision);
    }

    // 6. Warning, critical и not_recommended
    [Theory]
    [InlineData(1000, PurchaseDecision.Warning)]
    [InlineData(3400, PurchaseDecision.Critical)]
    [InlineData(6000, PurchaseDecision.NotRecommended)]
    public void CheckPurchase_Decisions(decimal amount, PurchaseDecision expected)
    {
        PurchaseResult result = BudgetCalculator.CheckPurchase(BudgetCalculator.Calculate(Demo()), amount);

        Assert.Equal(expected, result.Decision);
    }

    // 7. Обязательные траты + резерв больше баланса
    [Fact]
    public void MandatoryAndReserveMoreThanBalance_IsCritical()
    {
        BudgetResult budget = BudgetCalculator.Calculate(Demo(card: 500));

        Assert.Equal(-300m, budget.FreeMoney);
        Assert.Equal(0m, budget.DayLimit);
        Assert.Equal(BudgetStatus.Critical, budget.Status);
        Assert.Equal(PurchaseDecision.Critical, BudgetCalculator.CheckPurchase(budget, 100).Decision);
    }

    // 8. Дата стипендии не в будущем — ошибка
    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    public void StipendDateNotInFuture_Throws(int daysFromToday)
    {
        Assert.Throws<BudgetValidationException>(() => BudgetCalculator.Calculate(Demo(stipend: Today.AddDays(daysFromToday))));
    }

    // 9. Накопления, исключённые из трат, не влияют на лимит; включённые — увеличивают
    [Theory]
    [InlineData(false, 340)]
    [InlineData(true, 440)]
    public void Savings_CountOnlyWhenIncluded(bool included, decimal expected)
    {
        BudgetResult result = BudgetCalculator.Calculate(Demo(savings: 1000, savingsIncluded: included));

        Assert.Equal(expected, result.DayLimit);
    }

    // 10. Учитываются только включённые регулярные платежи до стипендии
    [Fact]
    public void OnlyEnabledRecurringExpensesUntilStipendAreCounted()
    {
        Guid dorm = Guid.NewGuid();
        BudgetResult result = BudgetCalculator.Calculate(Demo(recurring:
        [
            new RecurringItem(dorm, "Общежитие", 1000, Today.AddDays(3), true),
            new RecurringItem(Guid.NewGuid(), "Интернет", 300, Today.AddDays(15), true),
            new RecurringItem(Guid.NewGuid(), "Подписка", 199, Today.AddDays(2), false),
            new RecurringItem(Guid.NewGuid(), "Старый платёж", 500, Today.AddDays(-1), true),
        ]));

        Assert.Equal(2200m, result.MandatoryExpenses);
        Assert.Equal(240m, result.DayLimit);
        Assert.Equal(dorm, Assert.Single(result.UpcomingPayments).Id);
    }

    // 11. Напряжённый бюджет и округление вниз
    [Fact]
    public void LowLimitIsWarning_AndLimitIsRoundedDown()
    {
        Assert.Equal(BudgetStatus.Warning, BudgetCalculator.Calculate(Demo(card: 2400)).Status);
        Assert.Equal(485m, BudgetCalculator.Calculate(Demo(stipend: Today.AddDays(7))).DayLimit); // 3 400 / 7 = 485,7
    }

    // 12. Даты стипендии по числу месяца
    [Theory]
    [InlineData(25, "2026-09-26", "2026-10-25", "2026-09-25")]
    [InlineData(26, "2026-09-26", "2026-10-26", "2026-09-26")]
    [InlineData(31, "2026-09-26", "2026-09-30", "2026-08-31")]
    [InlineData(31, "2027-02-10", "2027-02-28", "2027-01-31")]
    public void StipendSchedule_NextAndPrevious(int day, string today, string next, string previous)
    {
        DateOnly date = DateOnly.Parse(today);

        Assert.Equal(DateOnly.Parse(next), StipendSchedule.NextDate(day, date));
        Assert.Equal(DateOnly.Parse(previous), StipendSchedule.PreviousDate(day, date));
    }
}
