using LimitPlus.Api.Ai;
using LimitPlus.Api.Data;
using LimitPlus.Api.Logic;

namespace LimitPlus.Api.Services;

/// <summary>
/// Чат с Енотом. Порядок всегда один:
/// 1) код считает факты и готовит безопасный шаблон ответа;
/// 2) если модель подключена, она пересказывает шаблон живым языком;
/// 3) ExplanationGuard проверяет ответ модели (новые числа, запрещённые темы, длина) — иначе показываем шаблон.
/// </summary>
public class AssistantService
{
    private const int HistoryForModel = 6;

<<<<<<< HEAD
    public const string DefaultSystemPrompt =
        "Ты — Енот, дружелюбный помощник приложения Енотономика. Помогаешь студенту дотянуть до стипендии. " +
=======
    private const string SystemPrompt =
        "Ты — Енот, дружелюбный помощник приложения Лимит+. Помогаешь студенту дотянуть до стипендии. " +
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        "Отвечай по-русски, на «ты», коротко: несколько предложений, без markdown и списков. " +
        "Используй только числа из фактов, черновика и вопроса. Ничего не считай сам и не придумывай новых чисел. " +
        "Не советуй кредиты, займы, рассрочку, инвестиции, вклады и другие банковские продукты. " +
        "Ты даёшь ориентир, а не рекомендацию: пиши «можно», «ориентир», а не «ты должен». " +
        "Если вопрос не про деньги, траты, стипендию или кэшбэк — мягко верни разговор к бюджету.";

    private readonly UserStateService _states;
    private readonly CashbackService _cashback;
    private readonly ChatRepository _chat;
<<<<<<< HEAD
    private readonly MiscRepository _settings;
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    private readonly LlmClient _llm;
    private readonly ILogger<AssistantService> _logger;

    public AssistantService(
<<<<<<< HEAD
        UserStateService states, CashbackService cashback, ChatRepository chat, MiscRepository settings,
        LlmClient llm, ILogger<AssistantService> logger)
=======
        UserStateService states, CashbackService cashback, ChatRepository chat, LlmClient llm, ILogger<AssistantService> logger)
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    {
        _states = states;
        _cashback = cashback;
        _chat = chat;
<<<<<<< HEAD
        _settings = settings;
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        _llm = llm;
        _logger = logger;
    }

    /// <summary>Факты без кэшбэка — для совета дня на главной.</summary>
    public static AssistantFacts BasicFacts(UserState state) =>
        new(state.Budget, state.Streak, state.Comparison, state.Waste, state.Lasting, state.Regional, null, null, null, null);

    /// <summary>Все факты, включая подбор кэшбэка на следующий (или текущий) месяц и итог прошлого месяца.</summary>
    public async Task<AssistantFacts> BuildFactsAsync(Guid userId, UserState state)
    {
        DateOnly thisMonth = CashbackService.MonthStart(state.Today);
        DateOnly planMonth = thisMonth.AddMonths(1);
        CashbackPlan? plan = await _cashback.PlanAsync(userId, planMonth, state);
        if (plan is null)
        {
            planMonth = thisMonth;
            plan = await _cashback.PlanAsync(userId, planMonth, state);
        }

        DateOnly lastMonth = thisMonth.AddMonths(-1);
        CashbackSummary summary = await _cashback.SummaryAsync(userId, lastMonth, state.Today);

        return BasicFacts(state) with
        {
            CashbackPlan = plan,
            CashbackPlanMonth = TextFormat.MonthName(planMonth),
            LastCashback = summary.Result,
            LastCashbackMonth = TextFormat.MonthName(lastMonth),
        };
    }

    public async Task<ChatMessageRow> AnswerAsync(
        Guid userId, DateOnly today, string message, string? promptId)
    {
        PromptPreset? preset = Prompts.Find(promptId);
        string question = preset?.Text ?? message.Trim();
        string topic = preset?.Id ?? Prompts.DetectTopic(question);

        UserState state = await _states.LoadAsync(userId, today);
        AssistantFacts facts = await BuildFactsAsync(userId, state);
        string template = AssistantTemplates.Build(topic, facts, question);

        List<ChatMessageRow> history = await _chat.GetRecentAsync(userId, HistoryForModel);
        await _chat.AddAsync(userId, "user", question, null);

        string answer = template;
        string source = "template";

        if (_llm.IsEnabled && topic != Topics.Forbidden)
        {
            string factsText = AssistantTemplates.DescribeFacts(facts);
            try
            {
                // Без отмены по уходу со страницы: ответ сохранится в историю, и Енот покажет его в следующий раз.
<<<<<<< HEAD
                string? rewritten = await _llm.CompleteAsync(
                    await BuildMessagesAsync(factsText, history, question, template), CancellationToken.None);
=======
                string? rewritten = await _llm.CompleteAsync(BuildMessages(factsText, history, question, template), CancellationToken.None);
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
                if (rewritten is not null && ExplanationGuard.IsAcceptable(rewritten, $"{factsText}\n{template}\n{question}"))
                {
                    answer = rewritten;
                    source = "llm";
                }
                else
                {
                    _logger.LogInformation("Ответ языковой модели не прошёл проверку, показываем шаблон");
                }
            }
            catch (Exception exception)
            {
                // В лог пишем только тип ошибки — без сумм и других данных пользователя.
                _logger.LogWarning("Языковая модель недоступна ({ErrorType}), показываем шаблон", exception.GetType().Name);
            }
        }

        return await _chat.AddAsync(userId, "assistant", answer, source);
    }

<<<<<<< HEAD
    private async Task<List<ChatTurn>> BuildMessagesAsync(string facts, List<ChatMessageRow> history, string question, string template)
    {
        string? custom = await _settings.GetSettingAsync(MiscRepository.LlmPromptKey);
        string prompt = string.IsNullOrWhiteSpace(custom) ? DefaultSystemPrompt : custom.Trim();
        var messages = new List<ChatTurn> { new("system", $"{prompt}\n\nФакты:\n{facts}") };
        messages.AddRange(history.Select(m => new ChatTurn(m.Role, m.Text)));
        messages.Add(new ChatTurn("system",
            $"Черновик ответа по расчёту Енотономика (перескажи своими словами, числа не меняй):\n{template}"));
=======
    private static List<ChatTurn> BuildMessages(string facts, List<ChatMessageRow> history, string question, string template)
    {
        var messages = new List<ChatTurn> { new("system", $"{SystemPrompt}\n\nФакты:\n{facts}") };
        messages.AddRange(history.Select(m => new ChatTurn(m.Role, m.Text)));
        messages.Add(new ChatTurn("system",
            $"Черновик ответа по расчёту Лимит+ (перескажи своими словами, числа не меняй):\n{template}"));
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        messages.Add(new ChatTurn("user", question));
        return messages;
    }
}
