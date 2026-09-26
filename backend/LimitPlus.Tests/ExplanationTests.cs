using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Xunit;

namespace LimitPlus.Tests;

public class ExplanationTests
{
    private static ExplainRequest DemoFacts(ExplainTopic topic, PurchaseDecision decision = PurchaseDecision.Safe) => new()
    {
        Topic = topic,
        DaysUntilStipend = 10,
        TotalBalance = 5000,
        MandatoryExpenses = 1200,
        Reserve = 400,
        FreeMoney = 3400,
        DailyLimit = 340,
        Status = BudgetStatus.Safe,
        PurchaseName = "Наушники",
        PurchaseAmount = 650,
        DailyLimitAfter = 275,
        LimitChange = -65,
        Decision = decision,
    };

    [Theory]
    [InlineData(ExplainTopic.WhyLimit, PurchaseDecision.Safe)]
    [InlineData(ExplainTopic.PurchaseImpact, PurchaseDecision.Safe)]
    [InlineData(ExplainTopic.PurchaseImpact, PurchaseDecision.NotRecommended)]
    [InlineData(ExplainTopic.ReduceRisk, PurchaseDecision.Warning)]
    [InlineData(ExplainTopic.ReduceRisk, PurchaseDecision.Critical)]
    public void Templates_AreShortAndUseOnlyInputNumbers(ExplainTopic topic, PurchaseDecision decision)
    {
        ExplainRequest facts = DemoFacts(topic, decision);

        string text = ExplanationTemplates.Build(facts);

        Assert.NotEqual(ExplanationTemplates.NotEnoughData, text);
        Assert.True(ExplanationGuard.CountWords(text) <= ExplanationGuard.MaxWords);
        Assert.True(ExplanationGuard.IsAcceptable(text, ExplanationTemplates.DescribeFacts(facts)));
    }

    [Fact]
    public void WhyLimit_ExplainsDemoNumbers()
    {
        string text = ExplanationTemplates.Build(DemoFacts(ExplainTopic.WhyLimit));

        Assert.Contains("340", text);
        Assert.Contains("10 дней", text);
    }

    [Fact]
    public void MissingNumbers_GiveNotEnoughDataMessage()
    {
        var request = new ExplainRequest { Topic = ExplainTopic.WhyLimit, DailyLimit = 340 };

        Assert.Equal("Данных недостаточно для точного объяснения.", ExplanationTemplates.Build(request));
    }

    [Fact]
    public void ReduceRisk_WithoutFreeMoney_GivesSafeAdvice()
    {
        var request = new ExplainRequest { Topic = ExplainTopic.ReduceRisk, DaysUntilStipend = 10, DailyLimit = 0 };

        string text = ExplanationTemplates.Build(request);

        Assert.Contains("свободных денег почти нет", text);
        Assert.True(ExplanationGuard.IsAcceptable(text, ExplanationTemplates.DescribeFacts(request)));
    }

    [Theory]
    [InlineData("Возьмите кредит на 650 ₽, и лимит останется 340 ₽ в день.")] // запрещённая тема
    [InlineData("После покупки у вас останется 999 ₽ в день.")]              // придуманное число
    public void Guard_RejectsUnsafeModelAnswers(string modelAnswer)
    {
        string facts = ExplanationTemplates.DescribeFacts(DemoFacts(ExplainTopic.PurchaseImpact));

        Assert.False(ExplanationGuard.IsAcceptable(modelAnswer, facts));
    }

    [Fact]
    public void Guard_AcceptsRephrasingWithSameNumbers()
    {
        string facts = ExplanationTemplates.DescribeFacts(DemoFacts(ExplainTopic.PurchaseImpact));

        Assert.True(ExplanationGuard.IsAcceptable(
            "Если купить наушники за 650 ₽, в день можно будет тратить до 275 ₽ вместо 340 ₽.", facts));
    }
}
