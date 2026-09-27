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

/// <summary>Какие способы входа включены в настройках и какие логины считаются администраторами.</summary>
public record AuthSettings(bool GoogleEnabled, bool DemoEnabled, IReadOnlySet<string> AdminLogins);

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

    /// <summary>Регистрация: логин, почта и пароль. Пароль в базу попадает только как хеш.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        string login = request.Login.Trim();
        string email = request.Email.Trim().ToLowerInvariant();

        if (await _users.LoginTakenAsync(login))
        {
            return Problem(title: "Логин занят", detail: "Выбери другой логин.", statusCode: StatusCodes.Status409Conflict);
        }

        if (await _users.EmailTakenAsync(email))
        {
            return Problem(title: "Почта занята", detail: "На эту почту уже есть аккаунт. Войди или укажи другую.", statusCode: StatusCodes.Status409Conflict);
        }

        bool isAdmin = _settings.AdminLogins.Contains(login) || !await _users.AnyAdminAsync();
        Guid? userId = await _users.RegisterAsync(login, email, login, PasswordHasher.Hash(request.Password), isAdmin);
        if (userId is null)
        {
            return Problem(title: "Не удалось зарегистрироваться", detail: "Логин или почта уже заняты.", statusCode: StatusCodes.Status409Conflict);
        }

        await _users.TouchLastSeenAsync(userId.Value);
        await SignInAsync(HttpContext, userId.Value, login);
        return NoContent();
    }

    /// <summary>Вход зарегистрированного пользователя по логину или почте и паролю.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        string loginOrEmail = request.Login.Trim();
        CredentialRow? account = await _users.FindByLoginOrEmailAsync(loginOrEmail);
        bool ok = account is not null && PasswordHasher.Verify(request.Password, account.PasswordHash);
        if (!ok || account is null)
        {
            return Problem(title: "Не удалось войти", detail: "Неверный логин или пароль.", statusCode: StatusCodes.Status401Unauthorized);
        }

        UserRow? profile = await _users.GetAsync(account.Id);
        if (profile?.Login is string knownLogin && _settings.AdminLogins.Contains(knownLogin))
        {
            await _users.PromoteAdminAsync(account.Id);
        }

        await _users.TouchLastSeenAsync(account.Id);
        await SignInAsync(HttpContext, account.Id, account.Name);
        return NoContent();
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
        await users.TouchLastSeenAsync(userId);
        context.Identity.AddClaim(new Claim(AppControllerBase.UserIdClaim, userId.ToString()));
    }
}
