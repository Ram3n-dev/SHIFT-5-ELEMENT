using LimitPlus.Api.Models;

namespace LimitPlus.Api.Services;

/// <summary>
/// Безопасные шаблоны объяснений. Берут только числа из запроса и ничего не пересчитывают.
/// Не советуют кредиты, займы, рассрочку, инвестиции и банковские продукты.
/// </summary>
public static class ExplanationTemplates
{
    public const string NotEnoughData = "Данных недостаточно для точного объяснения.";

    public static string Build(ExplainRequest request)
    {
        string text = request.Topic switch
        {
            ExplainTopic.WhyLimit => WhyLimit(request),
            ExplainTopic.PurchaseImpact => PurchaseImpact(request),
            ExplainTopic.ReduceRisk => ReduceRisk(request),
            _ => NotEnoughData,
        };

        return ExplanationGuard.LimitWords(text);
    }

    /// <summary>Факты списком — их получает языковая модель, если она включена.</summary>
    public static string DescribeFacts(ExplainRequest request)
    {
        var lines = new List<string>
        {
            request.Topic switch
            {
                ExplainTopic.WhyLimit => "Вопрос: почему такой дневной лимит",
                ExplainTopic.PurchaseImpact => "Вопрос: что изменится после покупки",
                _ => "Вопрос: как снизить риск",
            },
        };

        if (request.DaysUntilStipend is int days) lines.Add($"Дней до стипендии: {days}");
        if (request.TotalBalance is decimal total) lines.Add($"Доступно сейчас: {TextFormat.Rub(total)}");
        if (request.MandatoryExpenses is decimal mandatory) lines.Add($"Обязательные траты до стипендии: {TextFormat.Rub(mandatory)}");
        if (request.Reserve is decimal reserve) lines.Add($"Резерв: {TextFormat.Rub(reserve)}");
        if (request.FreeMoney is decimal free) lines.Add($"Свободно до стипендии: {TextFormat.Rub(free)}");
        if (request.DailyLimit is decimal limit) lines.Add($"Дневной лимит: {TextFormat.Rub(limit)}");
        if (!string.IsNullOrWhiteSpace(request.PurchaseName)) lines.Add($"Покупка: {request.PurchaseName.Trim()}");
        if (request.PurchaseAmount is decimal amount) lines.Add($"Сумма покупки: {TextFormat.Rub(amount)}");
        if (request.DailyLimitAfter is decimal after) lines.Add($"Лимит после покупки: {TextFormat.Rub(after)}");
        if (request.LimitChange is decimal change) lines.Add($"Изменение лимита: {TextFormat.Rub(change)}");

        return string.Join('\n', lines);
    }

    private static string WhyLimit(ExplainRequest request)
    {
        // Если какого-то числа нет, объяснять не на чем.
        if (request is not
            {
                DaysUntilStipend: int days,
                TotalBalance: decimal total,
                MandatoryExpenses: decimal mandatory,
                Reserve: decimal reserve,
                FreeMoney: decimal free,
                DailyLimit: decimal limit,
            })
        {
            return NotEnoughData;
        }

        string start = $"Сейчас доступно {TextFormat.Rub(total)}: {TextFormat.Rub(mandatory)} нужно на обязательные траты, " +
                       $"{TextFormat.Rub(reserve)} вы оставляете в резерве.";

        if (limit <= 0)
        {
            return $"{start} После этого свободных денег до стипендии почти не остаётся, " +
                   $"поэтому дневной лимит — {TextFormat.Rub(limit)}.";
        }

        return $"{start} Свободно {TextFormat.Rub(free)} на {days} {TextFormat.Days(days)} до стипендии, " +
               $"поэтому ориентир — до {TextFormat.Rub(limit)} в день.";
    }

    private static string PurchaseImpact(ExplainRequest request)
    {
        if (request is not
            {
                DaysUntilStipend: int days,
                PurchaseAmount: decimal amount,
                DailyLimit: decimal before,
                DailyLimitAfter: decimal after,
                Decision: PurchaseDecision decision,
            })
        {
            return NotEnoughData;
        }

        string purchase = string.IsNullOrWhiteSpace(request.PurchaseName)
            ? "покупки"
            : $"покупки «{request.PurchaseName.Trim()}»";

        string change = before == after
            ? $"После {purchase} за {TextFormat.Rub(amount)} ориентир останется {TextFormat.Rub(after)} в день."
            : $"После {purchase} за {TextFormat.Rub(amount)} ориентир изменится с {TextFormat.Rub(before)} " +
              $"до {TextFormat.Rub(after)} в день.";

        string verdict = decision switch
        {
            PurchaseDecision.Safe => "Покупка укладывается в ваш финансовый план.",
            PurchaseDecision.Warning => "Покупка возможна, но заметно сократит ваш дневной запас.",
            PurchaseDecision.Critical => "После обязательных расходов свободного бюджета до стипендии не останется.",
            _ => "Покупка приведёт к отрицательному остатку, поэтому её лучше отложить до стипендии.",
        };

        return $"{change} До стипендии {days} {TextFormat.Days(days)}. {verdict}";
    }

    private static string ReduceRisk(ExplainRequest request)
    {
        if (request is not { DaysUntilStipend: int days, DailyLimit: decimal limit })
        {
            return NotEnoughData;
        }

        // Свободных денег нет уже сейчас.
        if (limit <= 0)
        {
            return $"До стипендии {days} {TextFormat.Days(days)}, а свободных денег почти нет. " +
                   "Снизить риск помогут отказ от необязательных покупок и перенос их на время после стипендии. " +
                   "Проверьте, все ли обязательные платежи нужно оплатить именно сейчас. " +
                   "Если не хватает на еду, обратитесь к близким или в профком за материальной помощью.";
        }

        // Свободные деньги есть, но проверяемая покупка их съест.
        if (request.Decision is PurchaseDecision.Critical or PurchaseDecision.NotRecommended)
        {
            string problem = request.Decision == PurchaseDecision.Critical
                ? "Эта покупка заберёт все свободные деньги до стипендии"
                : "На эту покупку сейчас не хватает денег";

            return $"Сейчас ориентир — до {TextFormat.Rub(limit)} в день ещё {days} {TextFormat.Days(days)}. " +
                   $"{problem}, поэтому её лучше перенести на время после стипендии. " +
                   "Снизить риск помогут запись каждой траты и отказ от других необязательных покупок.";
        }

        string purchaseHint = request is { Decision: PurchaseDecision.Warning, DailyLimitAfter: decimal after }
            ? $" Если купить сейчас, ориентир снизится до {TextFormat.Rub(after)} в день, поэтому покупку можно отложить до стипендии."
            : "";

        return $"Чтобы спокойно дожить до стипендии, держитесь ориентира до {TextFormat.Rub(limit)} в день " +
               $"ещё {days} {TextFormat.Days(days)}. " +
               "Снизить риск помогут запись каждой траты и перенос необязательных покупок на время после стипендии. " +
               "Резерв лучше не трогать без крайней необходимости." +
               purchaseHint;
    }
}
