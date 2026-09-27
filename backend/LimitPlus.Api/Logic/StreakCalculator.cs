namespace LimitPlus.Api.Logic;

/// <summary>Статус дня для огонька.</summary>
public enum DayStatus
{
    /// <summary>До начала пользования приложением.</summary>
    None,

    /// <summary>День отмечен (есть записи или «сегодня без трат») и траты в пределах лимита.</summary>
    Kept,

    /// <summary>Траты за день больше лимита — серия прерывается.</summary>
    Over,

    /// <summary>День не отмечен: не заходил и ничего не записал.</summary>
    Missed,

    /// <summary>Пропуск, который закрыла заморозка. Серию не прерывает, но и не увеличивает.</summary>
    Frozen,

    /// <summary>Сегодня: день ещё не отмечен.</summary>
    Pending,
}

/// <summary>
/// Что известно про один день: лимит на начало дня (снимок), сколько потрачено сверх обязательного,
/// были ли записи и нажал ли пользователь «Сегодня без трат».
/// </summary>
public record DayActivity(DateOnly Date, decimal DayLimit, decimal Spent, bool HasOperations, bool NoSpendConfirmed);

public record StreakDay(DateOnly Date, DayStatus Status);

public record StreakResult(
    int Current,
    int Best,
    DayStatus TodayStatus,
    bool FreezeAvailable,
    List<StreakDay> Week);

/// <summary>
/// Огонёк за ежедневный вход. Правила:
/// 1. День засчитан, если пользователь открыл приложение: на этот день есть снимок.
/// 2. Один пропущенный день раз в 7 дней закрывает заморозка — серия сохраняется.
/// 3. Сегодняшний день, пока пользователь ещё не заходил, серию не рвёт.
/// </summary>
public static class StreakCalculator
{
    public const int FreezeEveryDays = 7;

    public static StreakResult Calculate(IReadOnlyList<DayActivity> activities, DateOnly today)
    {
        var byDate = activities.Where(a => a.Date <= today).ToDictionary(a => a.Date);
        if (byDate.Count == 0)
        {
            return new StreakResult(0, 0, DayStatus.Pending, true, BuildWeek(new Dictionary<DateOnly, DayStatus>(), today));
        }

        DateOnly start = byDate.Keys.Min();
        var statuses = new Dictionary<DateOnly, DayStatus>();
        int run = 0;
        int best = 0;
        DateOnly? lastFreeze = null;

        for (DateOnly day = start; day <= today; day = day.AddDays(1))
        {
            bool isToday = day == today;
            DayStatus status = StatusOf(byDate.GetValueOrDefault(day), isToday);

            if (status == DayStatus.Kept)
            {
                run++;
            }
            else if (status == DayStatus.Missed && run > 0 && CanFreeze(lastFreeze, day))
            {
                status = DayStatus.Frozen;
                lastFreeze = day;
            }
            else if (status != DayStatus.Pending)
            {
                run = 0;
            }

            best = Math.Max(best, run);
            statuses[day] = status;
        }

        return new StreakResult(
            Current: run,
            Best: best,
            TodayStatus: statuses[today],
            FreezeAvailable: CanFreeze(lastFreeze, today),
            Week: BuildWeek(statuses, today));
    }

    /// <summary>Снимок дня появляется, когда пользователь открывает приложение. Это и есть ежедневный вход.</summary>
    private static DayStatus StatusOf(DayActivity? day, bool isToday)
    {
        if (day is null)
        {
            return isToday ? DayStatus.Pending : DayStatus.Missed;
        }

        return DayStatus.Kept;
    }

    private static bool CanFreeze(DateOnly? lastFreeze, DateOnly day) =>
        lastFreeze is null || day.DayNumber - lastFreeze.Value.DayNumber >= FreezeEveryDays;

    /// <summary>Последние 7 дней, заканчивая сегодняшним, — для точек под огоньком.</summary>
    private static List<StreakDay> BuildWeek(Dictionary<DateOnly, DayStatus> statuses, DateOnly today)
    {
        var week = new List<StreakDay>();
        for (int offset = 6; offset >= 0; offset--)
        {
            DateOnly day = today.AddDays(-offset);
            DayStatus status = statuses.TryGetValue(day, out DayStatus known)
                ? known
                : (day == today ? DayStatus.Pending : DayStatus.None);
            week.Add(new StreakDay(day, status));
        }

        return week;
    }
}
