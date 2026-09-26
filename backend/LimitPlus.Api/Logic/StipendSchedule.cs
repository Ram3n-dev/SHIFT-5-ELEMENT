namespace LimitPlus.Api.Logic;

/// <summary>
/// Даты стипендии по её числу месяца. Если в месяце нет такого числа (31 февраля),
/// берём последний день месяца.
/// </summary>
public static class StipendSchedule
{
    /// <summary>Ближайшая стипендия строго после сегодняшнего дня.</summary>
    public static DateOnly NextDate(int stipendDay, DateOnly today)
    {
        DateOnly thisMonth = DateIn(today.Year, today.Month, stipendDay);
        if (thisMonth > today)
        {
            return thisMonth;
        }

        DateOnly nextMonth = today.AddMonths(1);
        return DateIn(nextMonth.Year, nextMonth.Month, stipendDay);
    }

    /// <summary>Последняя стипендия: сегодня или раньше. С неё начинается текущий период.</summary>
    public static DateOnly PreviousDate(int stipendDay, DateOnly today)
    {
        DateOnly thisMonth = DateIn(today.Year, today.Month, stipendDay);
        if (thisMonth <= today)
        {
            return thisMonth;
        }

        DateOnly previousMonth = today.AddMonths(-1);
        return DateIn(previousMonth.Year, previousMonth.Month, stipendDay);
    }

    private static DateOnly DateIn(int year, int month, int day) =>
        new(year, month, Math.Min(day, DateTime.DaysInMonth(year, month)));
}
