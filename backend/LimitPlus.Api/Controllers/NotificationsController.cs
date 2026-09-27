using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>
/// Напоминания Енота в стиле Duolingo. Браузер спрашивает их при открытии приложения и раз в несколько минут,
/// показывает внутри приложения или системным уведомлением и сообщает, что показал.
/// </summary>
[Route("api/notifications")]
public class NotificationsController : AppControllerBase
{
    private readonly UserStateService _states;
    private readonly CashbackRepository _cashback;
    private readonly MiscRepository _misc;

    public NotificationsController(UserStateService states, CashbackRepository cashback, MiscRepository misc)
    {
        _states = states;
        _cashback = cashback;
        _misc = misc;
    }

    [HttpGet]
    public async Task<List<Reminder>> Due()
    {
        UserState state = await _states.LoadAsync(UserId, Today);
        if (!state.User.NotificationsEnabled)
        {
            return [];
        }

        DateOnly dueDate = StipendSchedule.PreviousDate(state.User.StipendDay, Today);
        DateOnly nextMonth = CashbackService.MonthStart(Today).AddMonths(1);
        bool nextMonthChosen = (await _cashback.GetOptionsAsync(UserId, nextMonth)).Any(o => o.Chosen);

        var context = new ReminderContext(
            Today: Today,
            Hour: Hour,
            DayMarked: state.Streak.TodayStatus == DayStatus.Kept || state.Streak.TodayStatus == DayStatus.Over,
            OverToday: state.Streak.TodayStatus == DayStatus.Over,
            Streak: state.Streak.Current,
            DaysUntilStipend: state.Budget.DaysUntilStipend,
            StipendToday: dueDate == Today && (state.User.StipendConfirmedOn is null || state.User.StipendConfirmedOn < dueDate),
            CashbackChosenForNextMonth: nextMonthChosen,
            PartnerOffers: (await _cashback.GetOffersAsync(UserId))
                .Where(o => o.ValidUntil is not null)
                .Select(o => new PartnerDeadline(o.Id, o.Merchant, o.ValidUntil!.Value))
                .ToList());

        List<Reminder> planned = NotificationPlanner.Plan(context);
        if (planned.Count == 0)
        {
            return [];
        }

        HashSet<string> sent = await _misc.GetSentKeysAsync(UserId, planned.Select(r => r.Key).ToList());
        int slotsLeft = NotificationPlanner.MaxPerDay - await _misc.CountSentOnAsync(UserId, Today);

        return planned.Where(r => !sent.Contains(r.Key)).Take(Math.Max(0, slotsLeft)).ToList();
    }

    /// <summary>Напоминание показано — больше не присылаем.</summary>
    [HttpPost("{key}/shown")]
    public async Task<IActionResult> Shown(string key)
    {
        if (key.Length > 80)
        {
            return BadRequest();
        }

        await _misc.MarkSentAsync(UserId, key, Today);
        return NoContent();
    }
}
