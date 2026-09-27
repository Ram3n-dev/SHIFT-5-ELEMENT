using LimitPlus.Api.Ai;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>
<<<<<<< HEAD
/// Кэшбэк — главная фишка Енотономики. Пользователь приносит варианты, которые предложил банк
=======
/// Кэшбэк — главная фишка Лимит+. Пользователь приносит варианты, которые предложил банк
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
/// (скриншот распознаётся в браузере), код подбирает лучшие 4 по его тратам, а в конце месяца считает итог.
/// Месяц в адресе — «2026-10».
/// </summary>
[Route("api")]
public class CashbackController : AppControllerBase
{
    private readonly CashbackRepository _cashback;
    private readonly CashbackService _service;
    private readonly UserStateService _states;

    public CashbackController(CashbackRepository cashback, CashbackService service, UserStateService states)
    {
        _cashback = cashback;
        _service = service;
        _states = states;
    }

    [HttpGet("cashback/{month}")]
    public async Task<ActionResult<CashbackMonthResponse>> GetMonth(string month)
    {
        if (CashbackService.ParseMonth(month) is not DateOnly start)
        {
            return BadMonth();
        }

        return await BuildResponseAsync(start);
    }

    /// <summary>Сохраняет варианты месяца (после скриншота или ручного ввода) и сразу подбирает лучшие.</summary>
    [HttpPut("cashback/{month}/options")]
    public async Task<ActionResult<CashbackMonthResponse>> SaveOptions(string month, CashbackOptionsRequest request)
    {
        if (CashbackService.ParseMonth(month) is not DateOnly start)
        {
            return BadMonth();
        }

        List<CashbackOptionRow> rows = request.Options
            .Select(o => new CashbackOptionRow
            {
                Id = Guid.NewGuid(),
                Name = o.Name.Trim(),
                Percent = o.Percent,
                Category = NormalizeCategory(o.Category) ?? CashbackCategories.Guess(o.Name),
            })
            .ToList();

        await _cashback.ReplaceOptionsAsync(UserId, start, rows);
        return await BuildResponseAsync(start);
    }

    [HttpPost("cashback/{month}/choose")]
    public async Task<ActionResult<CashbackMonthResponse>> Choose(string month, CashbackChooseRequest request)
    {
        if (CashbackService.ParseMonth(month) is not DateOnly start)
        {
            return BadMonth();
        }

        await _cashback.ChooseAsync(UserId, start, request.OptionIds);
        return await BuildResponseAsync(start);
    }

    /// <summary>Итоги месяца: сколько принесли выбранные категории по тратам картой и сумма за год.</summary>
    [HttpGet("cashback/{month}/results")]
    public async Task<ActionResult<CashbackResultsResponse>> Results(string month)
    {
        if (CashbackService.ParseMonth(month) is not DateOnly start)
        {
            return BadMonth();
        }

        CashbackSummary summary = await _service.SummaryAsync(UserId, start, Today);
        return new CashbackResultsResponse(month, TextFormat.MonthName(start), summary.Result, summary.AllTimeTotal);
    }

    // ---------- Партнёрские предложения ----------

    [HttpGet("partner-offers")]
    public async Task<List<PartnerOfferDto>> GetOffers() =>
        (await _cashback.GetOffersAsync(UserId)).Select(PartnerOfferDto.From).ToList();

    [HttpPost("partner-offers")]
    public async Task<PartnerOfferDto> AddOffer(PartnerOfferRequest request)
    {
        var row = new PartnerOfferRow
        {
            Id = Guid.NewGuid(),
            Merchant = request.Merchant.Trim(),
            Percent = request.Percent,
            Category = NormalizeCategory(request.Category) ?? CashbackCategories.Guess(request.Merchant),
            ValidUntil = request.ValidUntil,
        };
        await _cashback.AddOfferAsync(UserId, row);
        return PartnerOfferDto.From(row);
    }

    [HttpDelete("partner-offers/{id:guid}")]
    public async Task<IActionResult> DeleteOffer(Guid id) =>
        await _cashback.DeleteOfferAsync(UserId, id) ? NoContent() : NotFound();

    private async Task<CashbackMonthResponse> BuildResponseAsync(DateOnly month)
    {
        List<CashbackOptionRow> rows = await _cashback.GetOptionsAsync(UserId, month);
        CashbackPlan? plan = null;
        string? explanation = null;

        if (rows.Count > 0)
        {
            UserState state = await _states.LoadAsync(UserId, Today);
            plan = CashbackOptimizer.Recommend(CashbackService.ToOptions(rows), CashbackService.MonthlySpend(state.Expenses, Today));
            explanation = AssistantTemplates.DescribePlan(plan, TextFormat.MonthName(month));
        }

        return new CashbackMonthResponse(
            month.ToString("yyyy-MM"), TextFormat.MonthName(month), rows.Select(CashbackOptionDto.From).ToList(), plan, explanation);
    }

    /// <summary>Категория из списка наших категорий трат или «*» (все покупки). Остальное — null.</summary>
    private static string? NormalizeCategory(string? category) =>
        category == CashbackOptimizer.AllPurchases || (category is not null && Categories.Expense.Contains(category))
            ? category
            : null;

    private ObjectResult BadMonth() =>
        Problem(title: "Некорректные данные", detail: "Месяц нужно указать в формате ГГГГ-ММ.", statusCode: StatusCodes.Status400BadRequest);
}
