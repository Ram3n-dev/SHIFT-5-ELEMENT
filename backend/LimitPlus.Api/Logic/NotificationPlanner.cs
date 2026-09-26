namespace LimitPlus.Api.Logic;

/// <summary>Напоминание от Енота. Pose — поза маскота в уведомлении внутри приложения.</summary>
public record Reminder(string Key, string Title, string Text, string Pose);

public record PartnerDeadline(Guid Id, string Merchant, DateOnly ValidUntil);

public record ReminderContext(
    DateOnly Today,
    int Hour,
    bool DayMarked,
    bool OverToday,
    int Streak,
    int DaysUntilStipend,
    bool StipendToday,
    bool CashbackChosenForNextMonth,
    IReadOnlyList<PartnerDeadline> PartnerOffers);

/// <summary>
/// Решает, о чём Енот напомнит сейчас. Тексты в стиле Duolingo: коротко, по-дружески и без сумм,
/// чтобы на экране блокировки не было финансовых данных.
/// Ключ напоминания включает дату — одно и то же напоминание не придёт дважды за день.
/// </summary>
public static class NotificationPlanner
{
    public const int MaxPerDay = 2;
    private static readonly int[] StreakMilestones = [3, 7, 14, 30, 60, 100];

    public static List<Reminder> Plan(ReminderContext context)
    {
        string date = context.Today.ToString("yyyy-MM-dd");
        var reminders = new List<Reminder>();

        if (context.StipendToday)
        {
            reminders.Add(new Reminder($"stipend:{date}", "Сегодня стипендия!",
                "Отметь, когда придёт, — Енот пересчитает лимит.", "celebrate"));
        }

        if (context.OverToday)
        {
            reminders.Add(new Reminder($"over:{date}", "Вышли за лимит — не страшно",
                "Завтра Енот пересчитает лимит на оставшиеся дни. Главное — записывать траты.", "worried"));
        }

        if (!context.DayMarked && context.Hour >= 20 && context.Streak >= 2)
        {
            reminders.Add(new Reminder($"streak-risk:{date}",
                $"Серия {context.Streak} {TextFormat.Days(context.Streak)} под угрозой",
                "Запиши сегодняшние траты или нажми «Сегодня без трат».", "worried"));
        }
        else if (!context.DayMarked && context.Hour >= 19)
        {
            reminders.Add(new Reminder($"evening:{date}", "Енот ждёт отчёт",
                "Запиши траты за сегодня — это займёт минуту.", "hello"));
        }

        if (context.DayMarked && !context.OverToday && StreakMilestones.Contains(context.Streak))
        {
            reminders.Add(new Reminder($"streak:{context.Streak}:{date}",
                $"Серия {context.Streak} {TextFormat.Days(context.Streak)}!",
                "Так держать — огонёк горит.", "celebrate"));
        }

        if (context.DaysUntilStipend == 3)
        {
            reminders.Add(new Reminder($"stipend-soon:{date}", "До стипендии 3 дня",
                "Ты справляешься. Держись ориентира ещё чуть-чуть.", "calm"));
        }

        int daysLeftInMonth = DateTime.DaysInMonth(context.Today.Year, context.Today.Month) - context.Today.Day;
        if (daysLeftInMonth <= 2 && !context.CashbackChosenForNextMonth)
        {
            DateOnly nextMonth = context.Today.AddMonths(1);
            reminders.Add(new Reminder($"cashback:{nextMonth:yyyy-MM}", "Время выбирать кэшбэк",
                $"Загрузи скриншот категорий на {TextFormat.MonthName(nextMonth)} — Енот подберёт выгодные.", "count"));
        }

        foreach (PartnerDeadline offer in context.PartnerOffers)
        {
            int daysLeft = offer.ValidUntil.DayNumber - context.Today.DayNumber;
            if (daysLeft is >= 0 and <= 2)
            {
                string text = daysLeft == 0
                    ? "Предложение действует последний день."
                    : $"Осталось {daysLeft} {TextFormat.Days(daysLeft)}.";
                reminders.Add(new Reminder($"offer:{offer.Id}", $"Кэшбэк в «{offer.Merchant}» скоро закончится", text, "think"));
            }
        }

        return reminders;
    }
}
