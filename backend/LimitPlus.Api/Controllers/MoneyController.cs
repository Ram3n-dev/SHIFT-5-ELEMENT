using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Счета, операции (включая импорт учебной выписки) и регулярные траты.</summary>
[Route("api")]
public class MoneyController : AppControllerBase
{
    private readonly MoneyRepository _money;

    public MoneyController(MoneyRepository money)
    {
        _money = money;
    }

    // ---------- Счета ----------

    [HttpGet("accounts")]
    public async Task<List<AccountDto>> GetAccounts() =>
        (await _money.GetAccountsAsync(UserId)).Select(AccountDto.From).ToList();

    [HttpPost("accounts")]
    public async Task<AccountDto> CreateAccount(AccountRequest request)
    {
        AccountRow row = ToRow(Guid.NewGuid(), request);
        await _money.CreateAccountAsync(UserId, row);
        return AccountDto.From(row);
    }

    [HttpPut("accounts/{id:guid}")]
    public async Task<ActionResult<AccountDto>> UpdateAccount(Guid id, AccountRequest request)
    {
        AccountRow row = ToRow(id, request);
        return await _money.UpdateAccountAsync(UserId, row) ? AccountDto.From(row) : NotFound();
    }

    [HttpDelete("accounts/{id:guid}")]
    public async Task<IActionResult> DeleteAccount(Guid id) =>
        await _money.DeleteAccountAsync(UserId, id) ? NoContent() : NotFound();

    private static AccountRow ToRow(Guid id, AccountRequest request) => new()
    {
        Id = id,
        Name = request.Name.Trim(),
        Type = ToDbValue(request.Type),
        Balance = request.Balance,
        IncludeInSpending = request.IncludeInSpending,
    };

    // ---------- Операции ----------

    /// <summary>Операции за период. По умолчанию — последние 90 дней.</summary>
    [HttpGet("operations")]
    public async Task<List<OperationDto>> GetOperations(
        [FromQuery(Name = "from")] DateOnly? fromDate, [FromQuery(Name = "to")] DateOnly? toDate)
    {
        DateOnly end = toDate ?? Today;
        DateOnly start = fromDate ?? end.AddDays(-90);
        return (await _money.GetOperationsAsync(UserId, start, end)).Select(OperationDto.From).ToList();
    }

    [HttpPost("operations")]
    public async Task<IActionResult> AddOperation(OperationRequest request)
    {
        string? error = await ValidateAsync([request], request.AccountId);
        if (error is not null)
        {
            return Problem(title: "Некорректные данные", detail: error, statusCode: StatusCodes.Status400BadRequest);
        }

        await _money.AddOperationsAsync(UserId, [ToRow(request, request.AccountId)]);
        return NoContent();
    }

    /// <summary>Импорт учебной CSV-выписки. Файл разбирается в браузере, сюда приходят уже готовые операции.</summary>
    [HttpPost("operations/import")]
    public async Task<IActionResult> Import(ImportRequest request)
    {
        string? error = await ValidateAsync(request.Operations, request.AccountId);
        if (error is not null)
        {
            return Problem(title: "Некорректные данные", detail: error, statusCode: StatusCodes.Status400BadRequest);
        }

        bool affectsBalance = !request.BalanceIncludesOperations;
        await _money.AddOperationsAsync(UserId, request.Operations.Select(o => ToRow(o, request.AccountId, affectsBalance)).ToList());
        return NoContent();
    }

    [HttpDelete("operations/{id:guid}")]
    public async Task<IActionResult> DeleteOperation(Guid id) =>
        await _money.DeleteOperationAsync(UserId, id) ? NoContent() : NotFound();

    /// <summary>Проверяет счёт, категории и даты. null — всё в порядке.</summary>
    private async Task<string?> ValidateAsync(IReadOnlyList<OperationRequest> operations, Guid? accountId)
    {
        if (accountId is not null && (await _money.GetAccountsAsync(UserId)).All(a => a.Id != accountId))
        {
            return "Такого счёта нет.";
        }

        foreach (OperationRequest operation in operations)
        {
            if (!Categories.IsKnown(operation.Category, operation.Type))
            {
                return $"Неизвестная категория «{operation.Category}».";
            }

            if (operation.Date > Today || operation.Date < Today.AddYears(-6))
            {
                return "Дата операции должна быть не позже сегодняшней и не раньше чем шесть лет назад.";
            }
        }

        return null;
    }

    private static OperationRow ToRow(OperationRequest request, Guid? accountId, bool affectsBalance = true) => new()
    {
        Id = Guid.NewGuid(),
        AccountId = accountId,
        Type = ToDbValue(request.Type),
        Amount = Math.Round(request.Amount, 2),
        Category = request.Category,
        Description = request.Description.Trim(),
        Date = request.Date,
        IsMandatory = request.Type == OperationType.Expense && request.IsMandatory,
        AffectsBalance = affectsBalance,
    };

    // ---------- Регулярные траты ----------

    [HttpGet("recurring")]
    public async Task<List<RecurringDto>> GetRecurring() =>
        (await _money.GetRecurringAsync(UserId)).Select(RecurringDto.From).ToList();

    [HttpPost("recurring")]
    public async Task<RecurringDto> CreateRecurring(RecurringRequest request)
    {
        RecurringRow row = ToRow(Guid.NewGuid(), request);
        await _money.CreateRecurringAsync(UserId, row);
        return RecurringDto.From(row);
    }

    [HttpPut("recurring/{id:guid}")]
    public async Task<ActionResult<RecurringDto>> UpdateRecurring(Guid id, RecurringRequest request)
    {
        RecurringRow row = ToRow(id, request);
        return await _money.UpdateRecurringAsync(UserId, row) ? RecurringDto.From(row) : NotFound();
    }

    [HttpDelete("recurring/{id:guid}")]
    public async Task<IActionResult> DeleteRecurring(Guid id) =>
        await _money.DeleteRecurringAsync(UserId, id) ? NoContent() : NotFound();

    /// <summary>«Оплачено»: расход со счёта и перенос платежа на следующий месяц.</summary>
    [HttpPost("recurring/{id:guid}/paid")]
    public async Task<IActionResult> MarkPaid(Guid id, AccountChoiceRequest request)
    {
        if (request.AccountId is Guid accountId && (await _money.GetAccountsAsync(UserId)).All(a => a.Id != accountId))
        {
            return Problem(title: "Некорректные данные", detail: "Такого счёта нет.", statusCode: StatusCodes.Status400BadRequest);
        }

        return await _money.MarkRecurringPaidAsync(UserId, id, request.AccountId, Today) ? NoContent() : NotFound();
    }

    private static RecurringRow ToRow(Guid id, RecurringRequest request) => new()
    {
        Id = id,
        Name = request.Name.Trim(),
        Amount = request.Amount,
        Category = request.Category,
        NextDate = request.NextDate,
        Enabled = request.Enabled,
    };

    /// <summary>Card → "card", Expense → "expense": так значения хранятся в базе.</summary>
    private static string ToDbValue(Enum value) => value.ToString().ToLowerInvariant();
}
