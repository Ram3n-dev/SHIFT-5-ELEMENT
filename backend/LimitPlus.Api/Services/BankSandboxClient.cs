using System.Net.Http.Headers;

namespace LimitPlus.Api.Services;

/// <summary>
/// Песочница T-Bank. Номер счёта уходит только в этот запрос и больше нигде не сохраняется.
/// Другие ручки T-Bank не вызываются.
/// </summary>
public class BankOptions
{
    public const string SectionName = "Bank";

    public const string StatementEndpoint = "https://business.tbank.ru/openapi/sandbox/api/v1/statement";

    public const string SandboxToken = "TBankSandboxToken";

    public string AccountNumber { get; set; } = "40702810110011000430";

    public string From { get; set; } = "2024-04-26T21:00:00.000Z";
}

/// <summary>
/// Один запрос выписки. Сырой JSON сразу отдаётся парсеру и не сохраняется.
/// </summary>
public class BankSandboxClient
{
    private readonly HttpClient _http;
    private readonly BankOptions _options;

    public BankSandboxClient(HttpClient http, Microsoft.Extensions.Options.IOptions<BankOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task<string> FetchStatementAsync(CancellationToken cancellationToken)
    {
        string url = BankOptions.StatementEndpoint
            + "?accountNumber=" + Uri.EscapeDataString(_options.AccountNumber)
            + "&from=" + Uri.EscapeDataString(_options.From);

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", BankOptions.SandboxToken);
        request.Headers.Accept.ParseAdd("application/json");

        using HttpResponseMessage response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}
