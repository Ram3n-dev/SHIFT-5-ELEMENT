using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Профиль: кто вошёл, онбординг, настройки бюджета и удаление всех данных.</summary>
[Route("api")]
public class ProfileController : AppControllerBase
{
    private readonly UserRepository _users;

    public ProfileController(UserRepository users)
    {
        _users = users;
    }

    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me()
    {
        UserRow? user = await _users.GetAsync(UserId);
        if (user is null)
        {
            // Пользователя удалили, а cookie осталась.
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }

        var dto = new UserDto(user.Id, user.Name, user.Email, user.IsDemo, user.OnboardedAt is not null, user.PdConsentAt is not null);
        return new MeResponse(dto, ProfileDto.From(user, Today));
    }

    /// <summary>
    /// Ответы онбординга. Текущая стипендия считается уже полученной: пользователь указал деньги, которые есть сейчас.
    /// </summary>
    [HttpPost("onboarding")]
    public async Task<ActionResult<MeResponse>> Onboarding(OnboardingRequest request)
    {
        if (!request.PdConsent)
        {
            return Problem(title: "Нужно согласие", detail: "Без согласия на обработку данных Лимит+ не сможет посчитать бюджет.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        string? regionCode = Regions.Find(request.RegionCode)?.Code;
        await _users.CompleteOnboardingAsync(UserId, new OnboardingData(
            City: string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim(),
            RegionCode: regionCode,
            StipendAmount: request.StipendAmount,
            StipendDay: request.StipendDay,
            StipendConfirmedOn: StipendSchedule.PreviousDate(request.StipendDay, Today),
            Card: request.Card,
            Cash: request.Cash,
            Savings: request.Savings,
            MandatoryMonthly: request.MandatoryMonthly,
            Reserve: request.Reserve,
            LimitPeriodDays: BudgetCalculator.NormalizePeriod(request.LimitPeriodDays)));

        return await Me();
    }

    [HttpPut("profile")]
    public async Task<ActionResult<MeResponse>> Update(ProfileUpdateRequest request)
    {
        UserRow? user = await _users.GetAsync(UserId);
        if (user is null)
        {
            return Unauthorized();
        }

        if (request.City is not null)
        {
            user.City = request.City.Trim();
        }

        if (request.RegionCode is not null)
        {
            user.RegionCode = Regions.Find(request.RegionCode)?.Code;
        }

        user.StipendAmount = request.StipendAmount ?? user.StipendAmount;
        user.StipendDay = request.StipendDay ?? user.StipendDay;
        user.MandatoryMonthly = request.MandatoryMonthly ?? user.MandatoryMonthly;
        user.MandatoryLeft = request.MandatoryLeft ?? user.MandatoryLeft;
        user.Reserve = request.Reserve ?? user.Reserve;
        user.LimitPeriodDays = request.LimitPeriodDays is int period ? BudgetCalculator.NormalizePeriod(period) : user.LimitPeriodDays;
        user.Theme = request.Theme ?? user.Theme;
        user.NotificationsEnabled = request.NotificationsEnabled ?? user.NotificationsEnabled;

        await _users.UpdateSettingsAsync(UserId, user);
        return await Me();
    }

    /// <summary>«Удалить мои данные»: стирает пользователя и всё, что с ним связано, и выходит из аккаунта.</summary>
    [HttpDelete("profile")]
    public async Task<IActionResult> Delete()
    {
        await _users.DeleteAsync(UserId);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
