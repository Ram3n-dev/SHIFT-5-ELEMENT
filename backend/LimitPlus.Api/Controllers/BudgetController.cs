using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>
/// REST API Лимит+. Сервер ничего не хранит: получил данные, посчитал, вернул ответ.
/// </summary>
[ApiController]
[Route("api")]
public class BudgetController : ControllerBase
{
    private readonly ExplanationService _explanationService;

    public BudgetController(ExplanationService explanationService)
    {
        _explanationService = explanationService;
    }

    /// <summary>Дневной лимит до стипендии.</summary>
    [HttpPost("calculate")]
    public ActionResult<CalculateResponse> Calculate(CalculateRequest request)
    {
        try
        {
            return BudgetCalculator.Calculate(request, ResolveToday(request.Today));
        }
        catch (BudgetValidationException exception)
        {
            return BadRequestWithMessage(exception.Message);
        }
    }

    /// <summary>Что будет с дневным лимитом после покупки.</summary>
    [HttpPost("purchase-check")]
    public ActionResult<PurchaseCheckResponse> PurchaseCheck(PurchaseCheckRequest request)
    {
        try
        {
            return BudgetCalculator.CheckPurchase(request, ResolveToday(request.Today));
        }
        catch (BudgetValidationException exception)
        {
            return BadRequestWithMessage(exception.Message);
        }
    }

    /// <summary>Короткое объяснение уже готового расчёта. Числа здесь не считаются.</summary>
    [HttpPost("explain")]
    public async Task<ExplainResponse> Explain(ExplainRequest request, CancellationToken cancellationToken)
    {
        return await _explanationService.ExplainAsync(request, cancellationToken);
    }

    private static DateOnly ResolveToday(DateOnly? today) =>
        today ?? DateOnly.FromDateTime(DateTime.Now);

    private ObjectResult BadRequestWithMessage(string message) =>
        Problem(title: "Некорректные данные", detail: message, statusCode: StatusCodes.Status400BadRequest);
}
