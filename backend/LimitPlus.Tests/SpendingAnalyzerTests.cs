using LimitPlus.Api.Logic;
using Xunit;

namespace LimitPlus.Tests;

public class SpendingAnalyzerTests
{
    private static readonly DateOnly Today = new(2026, 9, 26);
    private static readonly DateOnly PeriodStart = new(2026, 9, 25);     // стипендия 25-го
    private static readonly DateOnly PreviousStart = new(2026, 8, 25);

    private static ExpenseItem Spend(DateOnly date, decimal amount, string category, bool mandatory = false) =>
        new(date, amount, category, mandatory, IsCard: true);

    [Fact]
    public void ComparePeriods_ComparesSameNumberOfDays()
    {
        List<ExpenseItem> expenses =
        [
            // Прошлый период: первые 2 дня — 300 ₽ на доставку, потом ещё 5 000 ₽ (не должны попасть в сравнение).
            Spend(PreviousStart, 300, "Кафе и доставка"),
            Spend(PreviousStart.AddDays(10), 5000, "Продукты"),
            // Текущий период: 2 дня — 1 400 ₽ на доставку, 200 ₽ на такси, общага (обязательная) не считается.
            Spend(PeriodStart, 900, "Кафе и доставка"),
            Spend(Today, 500, "Кафе и доставка"),
            Spend(Today, 200, "Такси"),
            Spend(Today, 3000, "Другое", mandatory: true),
        ];

        PeriodComparison result = SpendingAnalyzer.ComparePeriods(expenses, PeriodStart, PreviousStart, Today);

        Assert.True(result.HasPrevious);
        Assert.Equal(2, result.DaysCompared);
        Assert.Equal(1600m, result.CurrentTotal);
        Assert.Equal(300m, result.PreviousTotal);
        Assert.Equal("Кафе и доставка", result.Increases[0].Category);
        Assert.Equal(1100m, result.Increases[0].Delta);
    }

    [Fact]
    public void ComparePeriods_WithoutHistory_HasNoPrevious()
    {
        PeriodComparison result = SpendingAnalyzer.ComparePeriods(
            [Spend(Today, 500, "Такси")], PeriodStart, PreviousStart, Today);

        Assert.False(result.HasPrevious);
        Assert.Empty(result.Increases);
    }

    [Fact]
    public void FindWasteful_FlagsFrequentSmallAndOverLimitDays()
    {
        List<ExpenseItem> expenses =
        [
            Spend(Today, 250, "Кафе и доставка"),
            Spend(Today.AddDays(-1), 280, "Кафе и доставка"),
            Spend(Today.AddDays(-2), 290, "Кафе и доставка"),
            Spend(Today.AddDays(-3), 270, "Кафе и доставка"),
            Spend(Today.AddDays(-4), 150, "Развлечения"),
            Spend(Today.AddDays(-10), 999, "Кафе и доставка"), // старше недели — не считается
            Spend(Today, 800, "Продукты"),                     // продукты — не «лишние»
        ];

        List<WasteFlag> flags = SpendingAnalyzer.FindWasteful(expenses, Today, [120m, 80m]);

        WasteFlag frequent = Assert.Single(flags, f => f.Kind == "frequent");
        Assert.Equal(4, frequent.Count);
        Assert.Equal(1090m, frequent.Sum);
        Assert.Equal(5, Assert.Single(flags, f => f.Kind == "small").Count);
        Assert.Equal(200m, Assert.Single(flags, f => f.Kind == "over_limit").Sum);
    }

    [Fact]
    public void HowToLast_ShowsPaceAndSavingFromTopCategory()
    {
        List<ExpenseItem> expenses =
        [
            Spend(PeriodStart, 600, "Кафе и доставка"),
            Spend(Today, 400, "Кафе и доставка"),
            Spend(Today, 200, "Продукты"),
        ];

        LastingPlan plan = SpendingAnalyzer.HowToLast(expenses, PeriodStart, Today, dayLimit: 340);

        Assert.Equal(600m, plan.AveragePerDay);   // 1 200 ₽ за 2 дня
        Assert.True(plan.OverPace);
        Assert.Equal("Кафе и доставка", plan.TopCategory);
        Assert.Equal(250m, plan.SavingIfHalved);  // 500 ₽ в день / 2
    }
}
