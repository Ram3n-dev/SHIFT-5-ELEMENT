using LimitPlus.Api.Ai;
using LimitPlus.Api.Data;
using LimitPlus.Api.Infrastructure;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Models;
using LimitPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LimitPlus.Api.Controllers;

/// <summary>Главная: лимит, огонёк, стипендия, цены региона, кэшбэк месяца и совет Енота. Плюс проверка покупки.</summary>
[Route("api")]
public class DashboardController : AppControllerBase
{
    private readonly UserStateService _states;
    private readonly MoneyRepository _money;
    private readonly UserRepository _users;
    private readonly CashbackRepository _cashback;

    public DashboardController(
        UserStateService states, MoneyRepository money, UserRepository users, CashbackRepository cashback)
    {
        _states = states;
        _money = money;
        _users = users;
        _cashback = cashback;
    }

    [HttpGet("dashboard")]
    public async Task<DashboardResponse> Dashboard()
    {
        UserState state = await _states.LoadAsync(UserId, Today);
        BudgetResult budget = state.Budget;

        DateOnly dueDate = StipendSchedule.PreviousDate(state.User.StipendDay, Today);
        bool stipendDue = Today.DayNumber - dueDate.DayNumber <= 5
                          && (state.User.StipendConfirmedOn is null || state.User.StipendConfirmedOn < dueDate);

        return new DashboardResponse(
            Name: state.User.Name,
            Budget: budget,
            Streak: state.Streak,
            Stipend: new StipendInfo(budget.StipendDate, budget.DaysUntilStipend, state.User.StipendAmount, stipendDue, dueDate),
            Regional: state.Regional,
            BelowFoodMinimum: state.Regional is not null && budget.DayLimit < state.Regional.FoodPerDay,
            Accounts: state.Accounts.Select(AccountDto.From).ToList(),
            Tip: AssistantTemplates.TipOfTheDay(AssistantService.BasicFacts(state)),
            Cashback: await CashbackTileAsync(state));
    }

    /// <summary>Что будет с дневным лимитом после покупки.</summary>
    [HttpPost("purchase-check")]
    public async Task<PurchaseResult> PurchaseCheck(PurchaseRequest request)
    {
        UserState state = await _states.LoadAsync(UserId, Today);
        return BudgetCalculator.CheckPurchase(state.Budget, request.Amount);
    }

    /// <summary>Анализ трат: сравнение с прошлым периодом, лишние траты, как дотянуть.</summary>
    [HttpGet("analytics")]
    public async Task<AnalyticsResponse> Analytics()
    {
        UserState state = await _states.LoadAsync(UserId, Today);
        Dictionary<string, decimal> byCategory = SpendingAnalyzer.SumByCategory(state.Expenses, state.PeriodStart, Today);
        return new AnalyticsResponse(state.Comparison, state.Waste, state.Lasting, byCategory);
    }

    /// <summary>«Сегодня без трат»: отмечает день для огонька.</summary>
    [HttpPost("day/no-spend")]
    public async Task<IActionResult> NoSpend()
    {
        UserState state = await _states.LoadAsync(UserId, Today);
        await _money.ConfirmNoSpendAsync(UserId, Today, state.Budget.DayLimit);
        return NoContent();
    }

    /// <summary>
    /// Стипендия пришла: доход на выбранный счёт и новый период — обязательные траты снова на полный месяц.
    /// </summary>
    [HttpPost("stipend/received")]
    public async Task<IActionResult> StipendReceived(AccountChoiceRequest request)
    {
        UserRow? user = await _users.GetAsync(UserId);
        if (user is null)
        {
            return Unauthorized();
        }

        if (request.AccountId is Guid accountId && (await _money.GetAccountsAsync(UserId)).All(a => a.Id != accountId))
        {
            return Problem(title: "Некорректные данные", detail: "Такого счёта нет.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (user.StipendAmount > 0)
        {
            await _money.AddOperationsAsync(UserId,
            [
                new OperationRow
                {
                    Id = Guid.NewGuid(),
                    AccountId = request.AccountId,
                    Type = "income",
                    Amount = user.StipendAmount,
                    Category = Categories.Stipend,
                    Description = "Стипендия",
                    Date = Today,
                },
            ]);
        }

        await _users.ConfirmStipendAsync(UserId, StipendSchedule.PreviousDate(user.StipendDay, Today));
        return NoContent();
    }

    /// <summary>Плитка кэшбэка: выбранные категории месяца и сколько они уже принесли по тратам картой.</summary>
    private async Task<CashbackTile> CashbackTileAsync(UserState state)
    {
        DateOnly month = CashbackService.MonthStart(Today);
        List<CashbackOptionRow> options = await _cashback.GetOptionsAsync(UserId, month);
        List<CashbackOptionRow> chosen = options.Where(o => o.Chosen).ToList();
        List<CashbackOptionRow> next = await _cashback.GetOptionsAsync(UserId, month.AddMonths(1));

        decimal earned = chosen.Count == 0
            ? 0
            : CashbackOptimizer.Total(CashbackService.ToOptions(chosen), CashbackService.ActualSpend(state.Expenses, month),
                CashbackOptimizer.DefaultMonthlyCap);

        return new CashbackTile(
            Month: month.ToString("yyyy-MM"),
            MonthName: TextFormat.MonthName(month),
            Chosen: chosen.Select(o => $"{o.Name} {o.Percent:0.#}%").ToList(),
            EarnedSoFar: earned,
            NextMonthReady: next.Any(o => o.Chosen));
    }
}
