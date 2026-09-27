using System.Globalization;
using System.Net.Http;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>
/// Учебная выписка из песочницы банка. Сырой ответ не сохраняется:
/// в приложение попадают только обезличенные операции.
/// </summary>
[Route("api/bank")]
public class BankController : AppControllerBase
{
    private readonly BankSandboxClient _bank;
    private readonly MoneyRepository _money;
    private readonly ILogger<BankController> _logger;

    public BankController(BankSandboxClient bank, MoneyRepository money, ILogger<BankController> logger)
    {
        _bank = bank;
        _money = money;
        _logger = logger;
    }

    [HttpPost("import")]
    public async Task<ActionResult<BankImportResponse>> Import(BankImportRequest request, CancellationToken cancellationToken)
    {
        List<AccountRow> accounts = await _money.GetAccountsAsync(UserId);
        if (accounts.All(account => account.Id != request.AccountId))
        {
            return Problem(title: "Некорректные данные", detail: "Такого счёта нет.", statusCode: StatusCodes.Status400BadRequest);
        }

        string json;
        try
        {
            json = await _bank.FetchStatementAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            string cause = BankRequestDiagnostics.Describe(exception);
            _logger.LogWarning(exception, "Песочница T-Bank недоступна: {Cause}", cause);
            return Problem(
                title: "Банк недоступен",
                detail: $"Не удалось получить выписку из песочницы T-Bank. {cause}",
                statusCode: StatusCodes.Status502BadGateway);
        }

        SafeBankStatement statement;
        try
        {
            statement = BankStatementParser.Parse(json);
        }
        catch (Exception exception) when (exception is System.Text.Json.JsonException or FormatException)
        {
            _logger.LogWarning("Выписка банка не разобралась ({ErrorType})", exception.GetType().Name);
            return Problem(title: "Не удалось разобрать выписку", detail: "Ответ песочницы не похож на выписку.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        // Сырой JSON дальше не используем: в базу и в ответ идут только безопасные поля.
        json = "";

        var drafts = new List<(SafeOperation Source, AppOperationDraft Draft)>();
        foreach (SafeOperation operation in statement.Operations)
        {
            AppOperationDraft? draft = BankOperationMapper.Map(operation, Today);
            if (draft is not null)
            {
                drafts.Add((operation, draft));
            }
        }

        DateOnly from = drafts.Count == 0 ? Today : drafts.Min(item => item.Draft.Date);
        DateOnly to = drafts.Count == 0 ? Today : drafts.Max(item => item.Draft.Date);
        HashSet<string> existing = drafts.Count == 0
            ? []
            : (await _money.GetOperationsAsync(UserId, from, to))
                .Select(row => Key(row.Date, row.Amount, row.Category, row.Description))
                .ToHashSet(StringComparer.Ordinal);

        var fresh = new List<OperationRow>();
        int skipped = 0;
        foreach ((SafeOperation _, AppOperationDraft draft) in drafts)
        {
            string key = Key(draft.Date, draft.Amount, draft.Category, draft.Description);
            if (!existing.Add(key))
            {
                skipped++;
                continue;
            }

            fresh.Add(new OperationRow
            {
                Id = Guid.NewGuid(),
                AccountId = request.AccountId,
                Type = draft.Type,
                Amount = draft.Amount,
                Category = draft.Category,
                Description = draft.Description,
                Date = draft.Date,
                AffectsBalance = false,
            });
        }

        if (fresh.Count > 0)
        {
            await _money.AddOperationsAsync(UserId, fresh);
        }

        List<SafeOperationDto> preview = drafts
            .Select(item => new SafeOperationDto(
                item.Source.Id,
                item.Source.Date.ToUniversalTime().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                item.Draft.Amount,
                "RUB",
                item.Source.Merchant,
                item.Draft.Category,
                item.Source.Description,
                item.Draft.Type,
                item.Source.Mcc,
                item.Draft.Type == "income" ? "credit" : "debit"))
            .ToList();

        return new BankImportResponse(fresh.Count, skipped, statement.Balance, preview);
    }

    private static string Key(DateOnly date, decimal amount, string category, string description) =>
        $"{date:yyyy-MM-dd}|{amount.ToString(CultureInfo.InvariantCulture)}|{category}|{description}";
}
