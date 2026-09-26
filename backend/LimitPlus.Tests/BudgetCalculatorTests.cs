using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Xunit;

namespace LimitPlus.Tests;

public class BudgetCalculatorTests
{
    // Фиксированная дата, чтобы результат не зависел от дня запуска тестов.
    private static readonly DateOnly Today = new(2026, 9, 26);
    private static readonly DateOnly StipendIn10Days = Today.AddDays(10);

    /// <summary>Демо-сценарий: карта 4 200 ₽, наличные 800 ₽, обязательные траты 1 200 ₽, резерв 400 ₽.</summary>
    private static CalculateRequest DemoBudget() => new()
    {
        Accounts =
        [
            new AccountInput { Id = "card-1", Name = "Карта", Type = AccountType.Card, Balance = 4200, IncludeInSpending = true },
            new AccountInput { Id = "cash-1", Name = "Наличные", Type = AccountType.Cash, Balance = 800, IncludeInSpending = true },
        ],
        StipendDate = StipendIn10Days,
        ManualMandatoryExpenses = 1200,
        Reserve = 400,
    };

    private static PurchaseCheckRequest Purchase(decimal amount, decimal totalBalance = 5000) => new()
    {
        TotalBalance = totalBalance,
        StipendDate = StipendIn10Days,
        MandatoryExpenses = 1200,
        Reserve = 400,
        PurchaseName = "Покупка",
        PurchaseAmount = amount,
    };

    // 1. Нормальный расчёт
    [Fact]
    public void Calculate_DemoScenario_Gives340PerDay()
    {
        CalculateResponse result = BudgetCalculator.Calculate(DemoBudget(), Today);

        Assert.Equal(10, result.DaysUntilStipend);
        Assert.Equal(5000m, result.TotalBalance);
        Assert.Equal(1200m, result.MandatoryExpenses);
        Assert.Equal(400m, result.Reserve);
        Assert.Equal(3400m, result.FreeMoney);
        Assert.Equal(340m, result.DailyLimit);
        Assert.Equal(BudgetStatus.Safe, result.Status);
    }

    // 2. Safe-покупка: наушники за 650 ₽ из демо-сценария
    [Fact]
    public void CheckPurchase_Headphones650_IsSafeAndLimitBecomes275()
    {
        PurchaseCheckResponse result = BudgetCalculator.CheckPurchase(Purchase(650), Today);

        Assert.Equal(4350m, result.BalanceAfter);
        Assert.Equal(340m, result.DailyLimitBefore);
        Assert.Equal(275m, result.DailyLimitAfter);
        Assert.Equal(-65m, result.LimitChange);
        // Лимит падает на 19% — меньше порога в 20%, поэтому покупка укладывается в план.
        Assert.Equal(PurchaseDecision.Safe, result.Decision);
    }

    // 3. Warning-покупка
    [Fact]
    public void CheckPurchase_LimitDropsBy20PercentOrMore_IsWarning()
    {
        PurchaseCheckResponse result = BudgetCalculator.CheckPurchase(Purchase(1000), Today);

        Assert.Equal(240m, result.DailyLimitAfter); // (4 000 − 1 200 − 400) / 10
        Assert.Equal(-100m, result.LimitChange);    // −29%
        Assert.Equal(PurchaseDecision.Warning, result.Decision);
    }

    // 4. Critical-покупка
    [Fact]
    public void CheckPurchase_TakesAllFreeMoney_IsCritical()
    {
        PurchaseCheckResponse result = BudgetCalculator.CheckPurchase(Purchase(3400), Today);

        Assert.Equal(1600m, result.BalanceAfter);
        Assert.Equal(0m, result.DailyLimitAfter);
        Assert.Equal(PurchaseDecision.Critical, result.Decision);
    }

    // 5. Покупка приводит к отрицательному остатку
    [Fact]
    public void CheckPurchase_MoreThanBalance_IsNotRecommended()
    {
        PurchaseCheckResponse result = BudgetCalculator.CheckPurchase(Purchase(6000), Today);

        Assert.Equal(-1000m, result.BalanceAfter);
        Assert.Equal(0m, result.DailyLimitAfter);
        Assert.Equal(PurchaseDecision.NotRecommended, result.Decision);
    }

    // 6. Обязательные траты + резерв больше баланса
    [Fact]
    public void MandatoryAndReserveMoreThanBalance_IsCritical()
    {
        CalculateRequest request = DemoBudget();
        request.Accounts[0].Balance = 500; // всего 1 300 ₽, а нужно 1 200 + 400

        CalculateResponse budget = BudgetCalculator.Calculate(request, Today);
        PurchaseCheckResponse purchase = BudgetCalculator.CheckPurchase(Purchase(100, budget.TotalBalance), Today);

        Assert.Equal(-300m, budget.FreeMoney);
        Assert.Equal(0m, budget.DailyLimit);
        Assert.Equal(BudgetStatus.Critical, budget.Status);
        Assert.Equal(PurchaseDecision.Critical, purchase.Decision);
    }

    // 7. Дата стипендии в прошлом (и сегодняшняя — тоже ошибка: нужна следующая стипендия)
    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    public void StipendDateNotInFuture_Throws(int daysFromToday)
    {
        CalculateRequest request = DemoBudget();
        request.StipendDate = Today.AddDays(daysFromToday);

        Assert.Throws<BudgetValidationException>(() => BudgetCalculator.Calculate(request, Today));
        Assert.Throws<BudgetValidationException>(
            () => BudgetCalculator.CheckPurchase(new PurchaseCheckRequest
            {
                TotalBalance = 5000,
                StipendDate = request.StipendDate,
                PurchaseAmount = 100,
            }, Today));
    }

    // 8. Исключённый из трат накопительный счёт не влияет на лимит
    [Fact]
    public void ExcludedSavings_DoNotChangeDailyLimit()
    {
        CalculateRequest request = DemoBudget();
        request.Accounts.Add(new AccountInput
        {
            Id = "savings-1",
            Name = "Накопления",
            Type = AccountType.Savings,
            Balance = 10_000,
            IncludeInSpending = false,
        });

        CalculateResponse result = BudgetCalculator.Calculate(request, Today);

        Assert.Equal(5000m, result.TotalBalance);
        Assert.Equal(340m, result.DailyLimit);
    }

    [Fact]
    public void IncludedSavings_IncreaseDailyLimit()
    {
        CalculateRequest request = DemoBudget();
        request.Accounts.Add(new AccountInput
        {
            Id = "savings-1",
            Name = "Накопления",
            Type = AccountType.Savings,
            Balance = 1000,
            IncludeInSpending = true,
        });

        CalculateResponse result = BudgetCalculator.Calculate(request, Today);

        Assert.Equal(6000m, result.TotalBalance);
        Assert.Equal(440m, result.DailyLimit); // (6 000 − 1 200 − 400) / 10
    }

    [Fact]
    public void OnlyEnabledRecurringExpensesUntilStipendAreCounted()
    {
        CalculateRequest request = DemoBudget();
        request.RecurringExpenses =
        [
            new RecurringExpenseInput { Id = "dorm", Name = "Общежитие", Amount = 1000, NextDate = Today.AddDays(3) },
            new RecurringExpenseInput { Id = "internet", Name = "Интернет", Amount = 300, NextDate = Today.AddDays(15) },
            new RecurringExpenseInput { Id = "music", Name = "Подписка", Amount = 199, NextDate = Today.AddDays(2), Enabled = false },
            new RecurringExpenseInput { Id = "old", Name = "Старый платёж", Amount = 500, NextDate = Today.AddDays(-1) },
        ];

        CalculateResponse result = BudgetCalculator.Calculate(request, Today);

        // Учитывается только общежитие: интернет — после стипендии, подписка выключена, старый платёж в прошлом.
        Assert.Equal(2200m, result.MandatoryExpenses); // 1 200 вручную + 1 000
        Assert.Equal(240m, result.DailyLimit);         // (5 000 − 2 200 − 400) / 10
        UpcomingPayment payment = Assert.Single(result.UpcomingPayments);
        Assert.Equal("dorm", payment.Id);
    }

    [Fact]
    public void LowDailyLimit_IsWarning()
    {
        CalculateRequest request = DemoBudget();
        request.Accounts[0].Balance = 2400; // всего 3 200 ₽ → свободно 1 600 ₽ → 160 ₽ в день

        CalculateResponse result = BudgetCalculator.Calculate(request, Today);

        Assert.Equal(160m, result.DailyLimit);
        Assert.Equal(BudgetStatus.Warning, result.Status);
    }

    [Fact]
    public void DailyLimit_IsRoundedDown()
    {
        CalculateRequest request = DemoBudget();
        request.StipendDate = Today.AddDays(7); // 3 400 / 7 = 485,71…

        CalculateResponse result = BudgetCalculator.Calculate(request, Today);

        Assert.Equal(485m, result.DailyLimit);
    }
}
