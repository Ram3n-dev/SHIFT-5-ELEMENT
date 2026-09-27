using LimitPlus.Api.Logic;
using Xunit;

namespace LimitPlus.Tests;

public class StreakCalculatorTests
{
    private static readonly DateOnly Today = new(2026, 9, 26);

    /// <summary>
    /// История по буквам, последняя буква — сегодня.
    /// K, O, M, N — пользователь заходил (есть снимок дня), _ — не заходил вовсе.
    /// Для огонька важен сам вход, а не то, уложился ли день в лимит.
    /// </summary>
    private static List<DayActivity> History(string days)
    {
        var result = new List<DayActivity>();
        for (int i = 0; i < days.Length; i++)
        {
            DateOnly date = Today.AddDays(i - days.Length + 1);
            switch (days[i])
            {
                case 'K': result.Add(new DayActivity(date, 300, 200, true, false)); break;
                case 'O': result.Add(new DayActivity(date, 300, 450, true, false)); break;
                case 'M': result.Add(new DayActivity(date, 300, 0, false, false)); break;
                case 'N': result.Add(new DayActivity(date, 300, 0, false, true)); break;
            }
        }

        return result;
    }

    [Fact]
    public void Visits_GrowStreak_UnvisitedTodayDoesNotBreakIt()
    {
        StreakResult result = StreakCalculator.Calculate(History("KKKKK_"), Today);

        Assert.Equal(5, result.Current);
        Assert.Equal(DayStatus.Pending, result.TodayStatus);
    }

    [Fact]
    public void VisitWithoutOperations_CountsToday()
    {
        StreakResult result = StreakCalculator.Calculate(History("MMMMMM"), Today);

        Assert.Equal(6, result.Current);
        Assert.Equal(DayStatus.Kept, result.TodayStatus);
    }

    [Fact]
    public void NoSpendConfirmation_KeepsDay()
    {
        Assert.Equal(3, StreakCalculator.Calculate(History("KNK"), Today).Current);
    }

    [Fact]
    public void OneMissedDay_IsFrozen_AndStreakContinues()
    {
        StreakResult result = StreakCalculator.Calculate(History("KK_KK"), Today);

        Assert.Equal(4, result.Current);
        Assert.Contains(result.Week, day => day.Status == DayStatus.Frozen);
        Assert.False(result.FreezeAvailable);
    }

    [Fact]
    public void SecondMissedDayWithinWeek_BreaksStreak()
    {
        StreakResult result = StreakCalculator.Calculate(History("KK_K_KK"), Today);

        Assert.Equal(2, result.Current);
        Assert.Equal(3, result.Best);
    }

    [Fact]
    public void Overspending_DoesNotBreakLoginStreak()
    {
        StreakResult result = StreakCalculator.Calculate(History("KKKOKK"), Today);

        Assert.Equal(6, result.Current);
        Assert.Equal(DayStatus.Kept, result.TodayStatus);
    }

    [Fact]
    public void OverspendingToday_StillCountsTheVisit()
    {
        StreakResult result = StreakCalculator.Calculate(History("KKKO"), Today);

        Assert.Equal(4, result.Current);
        Assert.Equal(DayStatus.Kept, result.TodayStatus);
    }

    [Fact]
    public void EmptyHistory_IsZero_AndWeekHasSevenDays()
    {
        StreakResult result = StreakCalculator.Calculate([], Today);

        Assert.Equal(0, result.Current);
        Assert.Equal(7, result.Week.Count);
        Assert.Equal(Today, result.Week[^1].Date);
    }
}
