using LimitPlus.Api.Logic;
using Xunit;

namespace LimitPlus.Tests;

public class CashbackOptimizerTests
{
    // Траты картой за месяц по категориям.
    private static readonly Dictionary<string, decimal> Spend = new()
    {
        ["Продукты"] = 6000,
        ["Кафе и доставка"] = 600,
        ["Такси"] = 500,
        ["Развлечения"] = 100,
        ["Здоровье"] = 200,
    };

    private static CashbackOption Option(string name, decimal percent) =>
        new(Guid.NewGuid(), name, percent, CashbackCategories.Guess(name));

    private static readonly List<CashbackOption> Options =
    [
        Option("Супермаркеты", 5),
        Option("Кафе и рестораны", 10),
        Option("Такси", 7),
        Option("Фастфуд", 5),
        Option("Кино", 15),
        Option("Аптеки", 5),
        Option("Красота", 7),
        Option("Спорттовары", 5),
    ];

    [Fact]
    public void Recommend_PicksFourMostProfitable()
    {
        CashbackPlan plan = CashbackOptimizer.Recommend(Options, Spend);

        // Супермаркеты 300 + Кафе 60 + Такси 35 + Кино 15 = 410. Фастфуд совпадает с кафе и ничего не добавляет.
        Assert.Equal(410m, plan.ExpectedTotal);
        Assert.Equal("Супермаркеты, Кафе и рестораны, Такси, Кино", string.Join(", ", plan.Best.Select(p => p.Name)));
        Assert.Equal(4, plan.Rest.Count);
    }

    [Fact]
    public void SameCategoryTwice_CountsOnlyTheBestPercent()
    {
        List<CashbackOption> set = [Option("Кафе и рестораны", 10), Option("Фастфуд", 5)];

        Assert.Equal(60m, CashbackOptimizer.Total(set, Spend, CashbackOptimizer.DefaultMonthlyCap));
    }

    [Fact]
    public void OnePercentOnEverything_AppliesToAllCategories()
    {
        List<CashbackOption> set = [Option("1% на все покупки", 1), Option("Супермаркеты", 5)];

        // Продукты 5% (300), остальное 1%: (600 + 500 + 100 + 200) × 1% = 14.
        Assert.Equal(314m, CashbackOptimizer.Total(set, Spend, CashbackOptimizer.DefaultMonthlyCap));
    }

    [Fact]
    public void MonthlyCap_LimitsTotal()
    {
        var bigSpend = new Dictionary<string, decimal> { ["Продукты"] = 100_000 };
        CashbackPlan plan = CashbackOptimizer.Recommend([Option("Супермаркеты", 5)], bigSpend);

        Assert.Equal(3000m, plan.ExpectedTotal);
        Assert.True(plan.CapReached);
    }

    [Fact]
    public void Evaluate_ComparesWithBestPossibleAndOnePercent()
    {
        List<CashbackOption> chosen = [Options[0], Options[4], Options[6], Options[7]]; // Супермаркеты, Кино, Красота, Спорттовары
        CashbackMonthResult result = CashbackOptimizer.Evaluate(Options, chosen, Spend);

        Assert.Equal(315m, result.Total);        // 300 + 15
        Assert.Equal(410m, result.BestPossible);
        Assert.Equal(74m, result.OnePercent);    // 7 400 × 1%
    }

    [Theory]
    [InlineData("Супермаркеты", "Продукты")]
    [InlineData("Фастфуд", "Кафе и доставка")]
    [InlineData("Местный транспорт", "Транспорт")]
    [InlineData("1% на все покупки", "*")]
    [InlineData("Красота", null)]
    public void Guess_MapsBankCategoryNames(string name, string? expected)
    {
        Assert.Equal(expected, CashbackCategories.Guess(name));
    }
}
