using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Справочник регионов, согласия (cookie, персональные данные) и анонимная статистика.</summary>
[ApiController]
[Route("api")]
public class MiscController : ControllerBase
{
    private readonly MiscRepository _misc;

    public MiscController(MiscRepository misc)
    {
        _misc = misc;
    }

    [HttpGet("regions")]
    public IEnumerable<RegionDto> RegionList() =>
        Regions.All.OrderBy(r => r.Name).Select(r => new RegionDto(r.Code, r.Name, r.Cities));

    /// <summary>
    /// Записывает выбор пользователя в баннере cookie или согласие на обработку данных.
    /// Работает и до входа: тогда запись без пользователя.
    /// </summary>
    [HttpPost("consent")]
    public async Task<IActionResult> Consent(ConsentRequest request)
    {
        Guid userId = AppControllerBase.GetUserId(User);
        await _misc.AddConsentAsync(userId == Guid.Empty ? null : userId, request.Kind, request.Value, request.Version);
        return NoContent();
    }

    /// <summary>
    /// Анонимное событие (например, открыт экран). Браузер отправляет его, только если пользователь
    /// разрешил аналитические cookie. Пользователь не сохраняется.
    /// </summary>
    [HttpPost("events")]
    public async Task<IActionResult> Event(EventRequest request)
    {
        await _misc.AddEventAsync(request.Name);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpGet("health")]
    public IActionResult Health() => Ok(new { status = "ok" });
<<<<<<< HEAD

    /// <summary>Оценка и короткий отзыв. В базу не попадают ничего, кроме оценки, текста и id пользователя.</summary>
    [Authorize]
    [HttpPost("feedback")]
    public async Task<IActionResult> Feedback(FeedbackRequest request)
    {
        Guid userId = AppControllerBase.GetUserId(User);
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        await _misc.AddFeedbackAsync(userId, request.Rating, request.Text.Trim());
        return NoContent();
    }
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
}
