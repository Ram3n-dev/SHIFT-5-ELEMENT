using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace LimitPlus.Api.Ai;

/// <summary>Одно сообщение диалога для модели: role = system, user или assistant.</summary>
public record ChatTurn(string Role, string Content);

/// <summary>
/// Клиент OpenAI-совместимого API (RouterAI, DeepSeek, Ollama).
/// Модель получает готовые факты и черновик ответа — считать ей нечего.
/// </summary>
public class LlmClient
{
    private readonly HttpClient _httpClient;
    private readonly LlmOptions _options;

    public LlmClient(HttpClient httpClient, IOptions<LlmOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public bool IsEnabled => _options.Enabled && !string.IsNullOrWhiteSpace(_options.Model);

    public async Task<string?> CompleteAsync(IReadOnlyList<ChatTurn> messages, CancellationToken cancellationToken)
    {
        var body = new
        {
            model = _options.Model,
            temperature = 0.3,
            max_tokens = 500,
            stream = false,
            messages = messages.Select(m => new { role = m.Role, content = m.Content }).ToArray(),
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

    /// <summary>Убирает «размышления» reasoning-моделей (блок &lt;think&gt;) и разметку markdown.</summary>
    private static string CleanUp(string content)
    {
        string text = Regex.Replace(content, @"<think>[\s\S]*?</think>", "", RegexOptions.IgnoreCase);
        text = text.Replace("**", "").Replace("__", "").Replace("#", "");
        return text.Trim();
    }
}
