using System.Security.Claims;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Какие способы входа включены в настройках.</summary>
public record AuthSettings(bool GoogleEnabled, bool DemoEnabled);

/// <summary>
/// Вход через Google и демо-вход. После входа браузер получает cookie lp_auth (HttpOnly),
/// пароли и токены Google мы не храним.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthSettings _settings;
    private readonly UserRepository _users;

    public AuthController(AuthSettings settings, UserRepository users)
    {
        _settings = settings;
        _users = users;
    }

    [HttpGet("config")]
    public AuthConfigResponse Config() => new(_settings.GoogleEnabled, _settings.DemoEnabled);

    /// <summary>Переход на страницу входа Google. После входа Google вернёт пользователя на /signin-google, а оттуда — на главную.</summary>
    [HttpGet("google")]
    public IActionResult Google()
    {
        if (!_settings.GoogleEnabled)
        {
            return NotFound();
        }

        return Challenge(new AuthenticationProperties { RedirectUri = "/" }, GoogleDefaults.AuthenticationScheme);
    }

    /// <summary>Вход без Google: создаёт временного пользователя (хранится неделю). Для показа на защите.</summary>
    [HttpPost("demo")]
    public async Task<IActionResult> Demo()
    {
        if (!_settings.DemoEnabled)
        {
            return NotFound();
        }

        Guid userId = await _users.CreateDemoUserAsync();
        await SignInAsync(HttpContext, userId, "Гость");
        return NoContent();
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    public static Task SignInAsync(HttpContext context, Guid userId, string name)
    {
        var identity = new ClaimsIdentity(CookieAuthenticationDefaults.AuthenticationScheme);
        identity.AddClaim(new Claim(AppControllerBase.UserIdClaim, userId.ToString()));
        identity.AddClaim(new Claim(ClaimTypes.Name, name));
        return context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }

    /// <summary>
    /// Вызывается, когда Google подтвердил вход: находим пользователя по Google-id или создаём нового
    /// и кладём наш id в cookie входа.
    /// </summary>
    public static async Task OnGoogleTicketAsync(OAuthCreatingTicketContext context)
    {
        string? googleId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (googleId is null || context.Identity is null)
        {
            context.Fail("Google не вернул идентификатор пользователя.");
            return;
        }

        string email = context.Principal!.FindFirstValue(ClaimTypes.Email) ?? "";
        string name = context.Principal.FindFirstValue(ClaimTypes.GivenName)
                      ?? context.Principal.FindFirstValue(ClaimTypes.Name)
                      ?? email;

        UserRepository users = context.HttpContext.RequestServices.GetRequiredService<UserRepository>();
        Guid userId = await users.UpsertGoogleUserAsync(googleId, email, name);
        context.Identity.AddClaim(new Claim(AppControllerBase.UserIdClaim, userId.ToString()));
    }
}
