namespace LimitPlus.Api.Ai;

/// <summary>
/// Настройки языковой модели (секция «Llm» в appsettings.json или переменные окружения Llm__...).
/// Подходит любой OpenAI-совместимый API: RouterAI, DeepSeek, Ollama.
/// Без ключа или с Enabled = false приложение отвечает шаблонами.
/// </summary>
public class LlmOptions
{
    public const string SectionName = "Llm";

    public bool Enabled { get; set; }

    /// <summary>Адрес OpenAI-совместимого API, например https://routerai.ru/api/v1</summary>
    public string BaseUrl { get; set; } = "https://routerai.ru/api/v1";

    /// <summary>Идентификатор модели у провайдера, например deepseek/deepseek-v4-pro-0813.</summary>
    public string Model { get; set; } = "";

    /// <summary>Ключ API. Хранится только в .env на сервере и никогда не уходит в браузер.</summary>
    public string ApiKey { get; set; } = "";

    public int TimeoutSeconds { get; set; } = 40;
}
