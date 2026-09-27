using System.Net.Security;
using System.Security.Authentication;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using LimitPlus.Api.Ai;
using LimitPlus.Api.Controllers;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Локальные настройки для разработки (ключ ИИ, строка подключения). Файл не попадает в git.
// Переменные окружения добавляем ещё раз, чтобы они по-прежнему были главнее файлов.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true);
builder.Configuration.AddEnvironmentVariables();

// ---------- JSON: snake_case, как в контракте API, и кириллица без \u-экранирования ----------
builder.Services
    .AddControllers(options => options.Filters.Add<AppExceptionFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
        options.JsonSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
    });

// ---------- База данных PostgreSQL ----------
string connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Не задана строка подключения ConnectionStrings:Default.");
Database.Configure();
builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionString));
builder.Services.AddSingleton<UserRepository>();
builder.Services.AddSingleton<MoneyRepository>();
builder.Services.AddSingleton<CashbackRepository>();
builder.Services.AddSingleton<ChatRepository>();
builder.Services.AddSingleton<MiscRepository>();

// ---------- Расчёты и ИИ ----------
builder.Services.AddScoped<UserStateService>();
builder.Services.AddScoped<CashbackService>();
builder.Services.AddScoped<AssistantService>();
builder.Services.Configure<LlmOptions>(builder.Configuration.GetSection(LlmOptions.SectionName));
builder.Services.AddHttpClient<LlmClient>((services, client) =>
{
    LlmOptions llm = services.GetRequiredService<IOptions<LlmOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(llm.TimeoutSeconds);
});

builder.Services.Configure<BankOptions>(builder.Configuration.GetSection(BankOptions.SectionName));
// Обход проверки сертификата — только у клиента песочницы T-Bank, не у остальных HTTPS-запросов.
// В Production выключен, пока явно не задан Bank:AllowInvalidCertificate (так собран docker-compose).
bool allowSandboxCertificateBypass = !builder.Environment.IsProduction()
    || builder.Configuration.GetValue("Bank:AllowInvalidCertificate", false);
builder.Services.AddHttpClient<BankSandboxClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
.ConfigurePrimaryHttpMessageHandler(() =>
{
    var handler = new SocketsHttpHandler
    {
        SslOptions = new SslClientAuthenticationOptions
        {
            EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
        },
    };
    if (allowSandboxCertificateBypass)
    {
        handler.SslOptions.RemoteCertificateValidationCallback = static (_, _, _, _) => true;
    }

    return handler;
});

// ---------- Вход: cookie + Google ----------
// Ключи шифрования cookie храним в папке (в Docker — в томе), чтобы после перезапуска не разлогинивало.
string? keysPath = builder.Configuration["DataProtection:KeysPath"];
if (!string.IsNullOrWhiteSpace(keysPath))
{
    builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

string googleClientId = builder.Configuration["Google:ClientId"] ?? "";
string googleClientSecret = builder.Configuration["Google:ClientSecret"] ?? "";
bool googleEnabled = googleClientId.Length > 0 && googleClientSecret.Length > 0;
bool demoEnabled = builder.Configuration.GetValue("Auth:DemoLogin", true);
string[] adminLogins = builder.Configuration.GetSection("Auth:AdminLogins").Get<string[]>() ?? ["admin"];
builder.Services.AddSingleton(new AuthSettings(
    googleEnabled,
    demoEnabled,
    adminLogins.ToHashSet(StringComparer.OrdinalIgnoreCase)));

AuthenticationBuilder authentication = builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "lp_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(30);
        options.SlidingExpiration = true;

        // Для API вместо перенаправления на страницу входа — просто 401/403.
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

if (googleEnabled)
{
    authentication.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.CallbackPath = "/signin-google";
        // На http://localhost cookie с SameSite=None браузер не примет — для входа хватает Lax.
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.Events.OnCreatingTicket = AuthController.OnGoogleTicketAsync;
    });
}

builder.Services.AddAuthorization();

var app = builder.Build();

await Database.InitializeAsync(app.Services.GetRequiredService<NpgsqlDataSource>(), app.Logger);

// Защита от подделки запросов (CSRF): изменяющие запросы к API должны прийти с заголовком,
// который сайт на чужом домене поставить не может.
app.Use(async (context, next) =>
{
    bool changesData = !HttpMethods.IsGet(context.Request.Method)
                       && !HttpMethods.IsHead(context.Request.Method)
                       && !HttpMethods.IsOptions(context.Request.Method);

    if (changesData
        && context.Request.Path.StartsWithSegments("/api")
        && context.Request.Headers["X-Requested-With"] != "limitplus")
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { title = "Запрос отклонён", detail = "Нет заголовка X-Requested-With." });
        return;
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
