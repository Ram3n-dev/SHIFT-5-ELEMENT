using LimitPlus.Api.Models;

namespace LimitPlus.Api.Services;

/// <summary>
/// Готовит объяснение расчёта. Сначала всегда строится безопасный шаблон.
/// Если в настройках включена языковая модель, она переписывает шаблон простыми словами,
/// а ExplanationGuard не пропускает ответы с новыми числами, запрещёнными темами или длиннее 70 слов.
/// Если модель выключена, недоступна или ответила плохо — пользователь получает шаблон.
/// </summary>
public class ExplanationService
{
    private readonly LlmClient _llmClient;
    private readonly ILogger<ExplanationService> _logger;

    public ExplanationService(LlmClient llmClient, ILogger<ExplanationService> logger)
    {
        _llmClient = llmClient;
        _logger = logger;
    }

    public async Task<ExplainResponse> ExplainAsync(ExplainRequest request, CancellationToken cancellationToken)
    {
        string template = ExplanationTemplates.Build(request);

        if (!_llmClient.IsEnabled || template == ExplanationTemplates.NotEnoughData)
        {
            return new ExplainResponse(template, ExplanationSource.Template);
        }

        string facts = ExplanationTemplates.DescribeFacts(request);

        try
        {
            string? rewritten = await _llmClient.RewriteAsync(facts, template, cancellationToken);
            if (rewritten is not null && ExplanationGuard.IsAcceptable(rewritten, $"{template}\n{facts}"))
            {
                return new ExplainResponse(rewritten, ExplanationSource.Llm);
            }

            _logger.LogInformation("Ответ языковой модели не прошёл проверку, показываем шаблон");
        }
        catch (Exception exception)
        {
            // В лог пишем только тип ошибки — без сумм и других данных пользователя.
            _logger.LogWarning("Языковая модель недоступна ({ErrorType}), показываем шаблон", exception.GetType().Name);
        }

        return new ExplainResponse(template, ExplanationSource.Template);
    }
}
