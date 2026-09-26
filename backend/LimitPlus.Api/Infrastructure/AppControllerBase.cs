using System.Globalization;
using System.Security.Claims;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace LimitPlus.Api.Infrastructure;

/// <summary>
/// Общая основа контроллеров: id пользователя из cookie входа и «сегодня» по часам пользователя.
/// Браузер присылает свою дату в заголовке X-Local-Date, потому что сервер может жить в другом часовом поясе.
/// </summary>
[ApiController]
[Authorize]
public abstract class AppControllerBase : ControllerBase
{
    public const string UserIdClaim = "uid";

    protected Guid UserId => GetUserId(User);

    protected DateOnly Today => LocalToday(HttpContext);

    protected int Hour => LocalHour(HttpContext);

    public static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(UserIdClaim), out Guid id) ? id : Guid.Empty;

    /// <summary>Дата пользователя из заголовка. Верим ей, только если она отличается от даты по UTC не больше чем на сутки.</summary>
    public static DateOnly LocalToday(HttpContext context)
    {
        DateOnly utcToday = DateOnly.FromDateTime(DateTime.UtcNow);
        string? header = context.Request.Headers["X-Local-Date"];
        if (DateOnly.TryParseExact(header, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly local)
            && Math.Abs(local.DayNumber - utcToday.DayNumber) <= 1)
        {
            return local;
        }

        return utcToday;
    }

    public static int LocalHour(HttpContext context)
    {
        string? header = context.Request.Headers["X-Local-Hour"];
        return int.TryParse(header, out int hour) && hour is >= 0 and <= 23 ? hour : DateTime.UtcNow.Hour;
    }
}

/// <summary>
/// Превращает ошибки расчёта в понятные ответы: 400 с текстом ошибки
/// и 409, если пользователь ещё не прошёл онбординг.
/// </summary>
public class AppExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is BudgetValidationException validation)
        {
            context.Result = Problem(StatusCodes.Status400BadRequest, "Некорректные данные", validation.Message);
            context.ExceptionHandled = true;
        }
        else if (context.Exception is NotOnboardedException notOnboarded)
        {
            context.Result = Problem(StatusCodes.Status409Conflict, "Нужен онбординг", notOnboarded.Message);
            context.ExceptionHandled = true;
        }
    }

    private static ObjectResult Problem(int status, string title, string detail) =>
        new(new ProblemDetails { Status = status, Title = title, Detail = detail }) { StatusCode = status };
}
