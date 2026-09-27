using LimitPlus.Api.Data;
using LimitPlus.Api.Logic;

namespace LimitPlus.Api.Services;

/// <summary>Всё, что известно о пользователе на сегодня: данные из базы и готовые расчёты.</summary>
public record UserState(
    UserRow User,
    DateOnly Today,
    DateOnly PeriodStart,
    List<AccountRow> Accounts,
    List<RecurringRow> Recurring,
    List<OperationRow> Operations,
    List<ExpenseItem> Expenses,
    BudgetResult Budget,
    StreakResult Streak,
    PeriodComparison Comparison,
    List<WasteFlag> Waste,
    LastingPlan Lasting,
    RegionalInfo? Regional);

/// <summary>Пользователь не прошёл онбординг — считать пока нечего.</summary>
public class NotOnboardedException : Exception
{
    public NotOnboardedException()
        : base("Сначала ответьте на вопросы онбординга.")
    {
    }
}

/// <summary>
/// Собирает состояние пользователя: читает данные из базы и вызывает расчёты из папки Logic.
/// Заодно сохраняет снимок лимита на сегодня — по снимкам считается огонёк.
/// </summary>
public class UserStateService
{
    /// <summary>За сколько дней загружаем операции: хватает на два периода стипендии и кэшбэк за 3 месяца.</summary>
    public const int HistoryDays = 120;

    private readonly UserRepository _users;
    private readonly MoneyRepository _money;
    private readonly MiscRepository _misc;

    public UserStateService(UserRepository users, MoneyRepository money, MiscRepository misc)
    {
        _users = users;
        _money = money;
        _misc = misc;
    }

    public async Task<UserState> LoadAsync(Guid userId, DateOnly today)
    {
        UserRow user = await _users.GetAsync(userId) ?? throw new NotOnboardedException();
        if (user.OnboardedAt is null)
        {
            throw new NotOnboardedException();
        }

        List<AccountRow> accounts = await _money.GetAccountsAsync(userId);
        List<RecurringRow> recurring = await _money.GetRecurringAsync(userId);

        DateOnly periodStart = StipendSchedule.PreviousDate(user.StipendDay, today);
        DateOnly previousStart = StipendSchedule.PreviousDate(user.StipendDay, periodStart.AddDays(-1));
        DateOnly historyStart = today.AddDays(-HistoryDays);
        DateOnly from = previousStart < historyStart ? previousStart : historyStart;

        List<OperationRow> operations = await _money.GetOperationsAsync(userId, from, today);

        // Для лимита — только траты со счетов, которые в него входят: другие траты баланс «в лимите» не меняли.
        decimal spentToday = operations
            .Where(o => o.Date == today && o.InSpending == true && IsEverydaySpending(o))
            .Sum(o => o.Amount);

        BudgetResult budget = BudgetCalculator.Calculate(new BudgetInput(
            Accounts: accounts.Select(a => new MoneyAccount(a.Balance, a.IncludeInSpending)).ToList(),
            MandatoryLeft: user.MandatoryLeft,
            Reserve: user.Reserve,
            Recurring: recurring.Select(r => new RecurringItem(r.Id, r.Name, r.Amount, r.NextDate, r.Enabled)).ToList(),
            Today: today,
            StipendDate: StipendSchedule.NextDate(user.StipendDay, today),
            SpentToday: spentToday,
            LimitPeriodDays: user.LimitPeriodDays));

        await _money.SaveSnapshotAsync(userId, today, budget.DayLimit);
        List<SnapshotRow> snapshots = await _money.GetSnapshotsAsync(userId, historyStart);

<<<<<<< HEAD
        // Огонёк: снимок дня создаётся при открытии приложения и считается ежедневным входом.
=======
        // Огонёк: для каждого дня со снимком — лимит, траты и была ли активность.
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        Dictionary<DateOnly, decimal> spentByDay = operations
            .Where(IsEverydaySpending)
            .GroupBy(o => o.Date)
            .ToDictionary(g => g.Key, g => g.Sum(o => o.Amount));
        HashSet<DateOnly> daysWithOperations = operations.Select(o => o.Date).ToHashSet();

        List<DayActivity> activities = snapshots
            .Select(s => new DayActivity(
                s.Date, s.DayLimit, spentByDay.GetValueOrDefault(s.Date), daysWithOperations.Contains(s.Date), s.NoSpendConfirmed))
            .ToList();
        StreakResult streak = StreakCalculator.Calculate(activities, today);

        // Аналитика трат.
        List<ExpenseItem> expenses = operations
            .Where(o => o.Type == "expense")
            .Select(o => new ExpenseItem(o.Date, o.Amount, o.Category, o.IsMandatory || o.IsRecurring, o.AccountType == "card"))
            .ToList();

        List<decimal> overLimit = activities
            .Where(a => a.Date >= periodStart && a.Spent > a.DayLimit)
            .Select(a => a.Spent - a.DayLimit)
            .ToList();

        PeriodComparison comparison = SpendingAnalyzer.ComparePeriods(expenses, periodStart, previousStart, today);
        List<WasteFlag> waste = SpendingAnalyzer.FindWasteful(expenses, today, overLimit);
        LastingPlan lasting = SpendingAnalyzer.HowToLast(expenses, periodStart, today, budget.DayLimit);

        RegionalInfo? regional = BuildRegional(user.RegionCode, await _misc.GetRegionalPricesAsync());

        return new UserState(user, today, periodStart, accounts, recurring, operations, expenses,
            budget, streak, comparison, waste, lasting, regional);
    }

    /// <summary>
    /// Повседневные траты: расход, не обязательный и не регулярный, со счёта, который входит в траты
    /// (или со счёта, который потом удалили).
    /// </summary>
    public static bool IsEverydaySpending(OperationRow operation) =>
        operation.Type == "expense" && !operation.IsMandatory && !operation.IsRecurring && operation.InSpending != false;

    /// <summary>Цены региона. Если по региону данных нет — среднее по России.</summary>
    public static RegionalInfo? BuildRegional(string? regionCode, List<RegionalPriceRow> prices)
    {
        RegionalPriceRow? own = prices.FirstOrDefault(p => p.RegionCode == regionCode);
        if (own is not null)
        {
            return RegionalPrices.Build(own.RegionName, own.FoodBasketMonth, false, own.Period, own.Source);
        }

        RegionalPriceRow? russia = prices.FirstOrDefault(p => p.RegionCode == Regions.RussiaCode);
        if (russia is null)
        {
            return null;
        }

        string name = Regions.Find(regionCode)?.Name ?? russia.RegionName;
        return RegionalPrices.Build(name, russia.FoodBasketMonth, true, russia.Period, russia.Source);
    }
}
