using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace LimitPlus.Api.Services;

/// <summary>
/// Клиент OpenAI-совместимого API (например, Ollama с моделью T-lite).
/// Модель получает готовые факты и шаблон и только переписывает текст понятнее — считать ей нечего.
/// </summary>
public class LlmClient
{
    private const string SystemPrompt =
        "Ты помогаешь студенту понять готовый расчёт бюджета до стипендии. " +
        "Пиши по-русски, коротко, не больше 60 слов. " +
        "Используй только числа из данных и черновика, ничего не считай сам и не добавляй новых чисел. " +
        "Не советуй кредиты, займы, рассрочку, инвестиции, вклады и другие финансовые продукты. " +
        "Не принимай решения за пользователя. " +
        "Если данных мало, ответь: «Данных недостаточно для точного объяснения».";

    private readonly HttpClient _httpClient;
    private readonly LlmOptions _options;

    public LlmClient(HttpClient httpClient, IOptions<LlmOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public bool IsEnabled => _options.Enabled && !string.IsNullOrWhiteSpace(_options.Model);

    public async Task<string?> RewriteAsync(string facts, string draft, CancellationToken cancellationToken)
    {
        var body = new
        {
            model = _options.Model,
            temperature = 0.2,
            max_tokens = 300,
            stream = false,
            messages = new[]
            {
                new { role = "system", content = SystemPrompt },
                new
                {
                    role = "user",
                    content = $"Данные расчёта:\n{facts}\n\nЧерновик:\n{draft}\n\n" +
                              "Перепиши черновик простыми словами. Сохрани все числа как есть.",
                },
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_options.BaseUrl.TrimEnd('/')}/chat/completions")
        {
            Content = JsonContent.Create(body),
        };

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using JsonDocument json = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        string? content = json.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return content is null ? null : CleanUp(content);
    }

    /// <summary>Убирает «размышления» reasoning-моделей (блок &lt;think&gt;) и лишние пробелы.</summary>
    private static string CleanUp(string content) =>
        Regex.Replace(content, @"<think>[\s\S]*?</think>", "", RegexOptions.IgnoreCase).Trim();
}
