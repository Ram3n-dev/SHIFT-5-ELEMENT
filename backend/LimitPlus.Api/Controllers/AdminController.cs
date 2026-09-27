using LimitPlus.Api.Ai;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Админ-панель: поведение Енота и список пользователей.</summary>
[Route("api/admin")]
public class AdminController : AppControllerBase
{
    private readonly UserRepository _users;
    private readonly MiscRepository _misc;

    public AdminController(UserRepository users, MiscRepository misc)
    {
        _users = users;
        _misc = misc;
    }

    [HttpGet]
    public async Task<ActionResult<AdminOverviewResponse>> Overview()
    {
        if (!await IsAdminAsync())
        {
            return Forbid();
        }

        string? custom = await _misc.GetSettingAsync(MiscRepository.LlmPromptKey);
        bool customized = !string.IsNullOrWhiteSpace(custom);
        List<AdminUserDto> users = (await _users.ListForAdminAsync())
            .Select(user => new AdminUserDto(user.Nickname, user.LastSeenAt))
            .ToList();

        return new AdminOverviewResponse(
            customized ? custom!.Trim() : AssistantService.DefaultSystemPrompt,
            customized,
            await _users.CountAsync(),
            users);
    }

    [HttpPut("prompt")]
    public async Task<ActionResult<AdminOverviewResponse>> UpdatePrompt(PromptUpdateRequest request)
    {
        if (!await IsAdminAsync())
        {
            return Forbid();
        }

        string prompt = request.Prompt.Trim();
        if (prompt.Length == 0)
        {
            await _misc.DeleteSettingAsync(MiscRepository.LlmPromptKey);
        }
        else if (prompt.Length < 20)
        {
            return Problem(title: "Слишком короткий промпт", detail: "Опиши поведение Енота хотя бы в паре предложений.",
                statusCode: StatusCodes.Status400BadRequest);
        }
        else
        {
            await _misc.SetSettingAsync(MiscRepository.LlmPromptKey, prompt);
        }

        return await Overview();
    }

    private async Task<bool> IsAdminAsync()
    {
        UserRow? user = await _users.GetAsync(UserId);
        return user?.IsAdmin == true;
    }
}
