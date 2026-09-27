using LimitPlus.Api.Ai;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Чат с Енотом: готовые вопросы-подсказки, история и ответы.</summary>
[Route("api/ai")]
public class AiController : AppControllerBase
{
    private readonly AssistantService _assistant;
    private readonly ChatRepository _chat;

    public AiController(AssistantService assistant, ChatRepository chat)
    {
        _assistant = assistant;
        _chat = chat;
    }

    [HttpGet("prompts")]
    public PromptPreset[] PromptList() => Prompts.All;

    [HttpGet("history")]
    public async Task<List<ChatMessageDto>> History() =>
        (await _chat.GetRecentAsync(UserId, 40)).Select(ChatMessageDto.From).ToList();

    [HttpDelete("history")]
    public async Task<IActionResult> ClearHistory()
    {
        await _chat.ClearAsync(UserId);
        return NoContent();
    }

    /// <summary>Вопрос Еноту. Ответ — ориентир, а не финансовая рекомендация: так и подписываем в интерфейсе.</summary>
    [HttpPost("chat")]
    public async Task<ActionResult<ChatMessageDto>> Chat(ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message) && Prompts.Find(request.PromptId) is null)
        {
            return Problem(title: "Некорректные данные", detail: "Напиши вопрос или выбери подсказку.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var answer = await _assistant.AnswerAsync(UserId, Today, request.Message, request.PromptId);
        return ChatMessageDto.From(answer);
    }
}
