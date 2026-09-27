using LimitPlus.Api.Ai;
using LimitPlus.Api.Logic;
using Xunit;

namespace LimitPlus.Tests;

public class AssistantTests
{
    private static readonly DateOnly Today = new(2026, 9, 26);

    private static AssistantFacts DemoFacts()
    {
        BudgetResult budget = BudgetCalculator.Calculate(new BudgetInput(
            [new MoneyAccount(4200, true), new MoneyAccount(800, true)], 1200, 400, [], Today, Today.AddDays(10), 0, 1));

        return new AssistantFacts(
            budget,
            StreakCalculator.Calculate([], Today),
            new PeriodComparison(true, 2, 1600, 300, [new CategoryChange("Кафе и доставка", 1400, 300, 1100)]),
            [new WasteFlag("frequent", "Кафе и доставка", 4, 1090)],
            new LastingPlan(600, 340, true, "Кафе и доставка", 500, 250),
            RegionalPrices.Build("Красноярский край", 9733.2m, false, "июль 2026", "Росстат"),
            null, null, null, null);
    }

    [Theory]
    [InlineData(Topics.WhyLimit)]
    [InlineData(Topics.Faster)]
    [InlineData(Topics.HowToLast)]
    [InlineData(Topics.Wasteful)]
    [InlineData(Topics.CashbackPick)]
    [InlineData(Topics.CashbackResults)]
    [InlineData(Topics.Regional)]
    [InlineData(Topics.Streak)]
    public void Templates_UseOnlyNumbersFromFacts(string topic)
    {
        AssistantFacts facts = DemoFacts();

        string text = AssistantTemplates.Build(topic, facts, "");

        Assert.True(ExplanationGuard.IsAcceptable(text, AssistantTemplates.DescribeFacts(facts)), text);
    }

    [Fact]
    public void WhyLimit_ExplainsDemoNumbers()
    {
        string text = AssistantTemplates.Build(Topics.WhyLimit, DemoFacts(), "");

        Assert.Contains("340", text);
        Assert.Contains("10 дней", text);
    }

    [Fact]
    public void Purchase_FromFreeText_UsesCalculator()
    {
        string text = AssistantTemplates.Build(Topics.Purchase, DemoFacts(), "Можно купить наушники за 650?");

        Assert.Contains("275", text);
    }

    [Theory]
    [InlineData("Почему деньги кончаются быстрее?", Topics.Faster)]
    [InlineData("Как дотянуть до стипендии", Topics.HowToLast)]
    [InlineData("Хочу купить кроссовки за 3 500", Topics.Purchase)]
    [InlineData("Какой кэшбэк выбрать?", Topics.CashbackPick)]
    [InlineData("Может, взять кредит?", Topics.Forbidden)]
    [InlineData("Привет!", Topics.General)]
    public void DetectTopic_ByKeywords(string message, string expected)
    {
        Assert.Equal(expected, Prompts.DetectTopic(message));
    }

    [Theory]
    [InlineData("Возьми кредит на 650 ₽, и лимит останется 340 ₽ в день.")] // запрещённая тема
    [InlineData("После покупки у тебя останется 999 ₽ в день.")]           // придуманное число
    public void Guard_RejectsUnsafeAnswers(string answer)
    {
        Assert.False(ExplanationGuard.IsAcceptable(answer, AssistantTemplates.DescribeFacts(DemoFacts())));
    }

    [Fact]
    public void Guard_AcceptsRephrasingWithSameNumbers()
    {
        Assert.True(ExplanationGuard.IsAcceptable(
            "Сейчас можно тратить до 340 ₽ в день, до стипендии 10 дней.", AssistantTemplates.DescribeFacts(DemoFacts())));
    }

    [Fact]
    public void Notifications_EveningReminder_AndDailyKeys()
    {
        var context = new ReminderContext(Today, 21, DayMarked: false, OverToday: false, Streak: 5, DaysUntilStipend: 3,
            StipendToday: false, CashbackChosenForNextMonth: true, PartnerOffers: []);

        List<Reminder> reminders = NotificationPlanner.Plan(context);

        Assert.Contains(reminders, r => r.Key == "streak-risk:2026-09-26");
        Assert.Contains(reminders, r => r.Key == "stipend-soon:2026-09-26");
        Assert.DoesNotContain(reminders, r => r.Key.StartsWith("evening"));
        Assert.All(reminders, r => Assert.DoesNotContain("₽", r.Text));
    }
}
