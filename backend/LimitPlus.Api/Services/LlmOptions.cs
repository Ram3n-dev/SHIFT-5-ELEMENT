namespace LimitPlus.Api.Services;

/// <summary>
/// Настройки языковой модели (секция «Llm» в appsettings.json или переменные окружения Llm__...).
/// По умолчанию модель выключена: приложение работает на шаблонах и без API-ключей.
/// </summary>
public class LlmOptions
{
    public const string SectionName = "Llm";

    public bool Enabled { get; set; }

    /// <summary>Адрес OpenAI-совместимого API. Для Ollama: http://localhost:11434/v1</summary>
    public string BaseUrl { get; set; } = "http://localhost:11434/v1";

    /// <summary>Название модели, например модель T-lite из Ollama. Пустое значение = модель выключена.</summary>
    public string Model { get; set; } = "";

    /// <summary>Ключ API, если сервис его требует. Для локальной Ollama не нужен.</summary>
    public string ApiKey { get; set; } = "";

    public int TimeoutSeconds { get; set; } = 15;
}
