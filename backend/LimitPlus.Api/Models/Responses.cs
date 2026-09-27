using LimitPlus.Api.Data;
using LimitPlus.Api.Logic;

namespace LimitPlus.Api.Models;

// Ответы API. В JSON имена полей пишутся в snake_case.

public record AuthConfigResponse(bool GoogleEnabled, bool DemoEnabled);

public record UserDto(Guid Id, string Name, string? Email, bool IsDemo, bool Onboarded, bool PdConsent, bool IsAdmin);

public record ProfileDto(
    string? City,
    string? RegionCode,
    string? RegionName,
    decimal StipendAmount,
    int StipendDay,
    DateOnly NextStipendDate,
    decimal MandatoryMonthly,
    decimal MandatoryLeft,
    decimal Reserve,
    int LimitPeriodDays,
    string Theme,
    bool NotificationsEnabled)
{
    public static ProfileDto From(UserRow user, DateOnly today) => new(
        user.City,
        user.RegionCode,
        Regions.Find(user.RegionCode)?.Name,
        user.StipendAmount,
        user.StipendDay,
        StipendSchedule.NextDate(user.StipendDay, today),
        user.MandatoryMonthly,
        user.MandatoryLeft,
        user.Reserve,
        user.LimitPeriodDays,
        user.Theme,
        user.NotificationsEnabled);
}

public record MeResponse(UserDto User, ProfileDto Profile);

public record AccountDto(Guid Id, string Name, string Type, decimal Balance, bool IncludeInSpending)
{
    public static AccountDto From(AccountRow row) => new(row.Id, row.Name, row.Type, row.Balance, row.IncludeInSpending);
}

public record OperationDto(
    Guid Id,
    Guid? AccountId,
    string? AccountName,
    string Type,
    decimal Amount,
    string Category,
    string Description,
    DateOnly Date,
    bool IsMandatory,
    bool IsRecurring)
{
    public static OperationDto From(OperationRow row) => new(
        row.Id, row.AccountId, row.AccountName, row.Type, row.Amount, row.Category, row.Description, row.Date,
        row.IsMandatory, row.IsRecurring);
}

public record RecurringDto(Guid Id, string Name, decimal Amount, string Category, DateOnly NextDate, bool Enabled)
{
    public static RecurringDto From(RecurringRow row) => new(row.Id, row.Name, row.Amount, row.Category, row.NextDate, row.Enabled);
}

/// <summary>Когда стипендия. Due = стипендия уже должна была прийти, но пользователь её ещё не отметил.</summary>
public record StipendInfo(DateOnly NextDate, int DaysUntil, decimal Amount, bool Due, DateOnly DueDate);

public record CashbackTile(string Month, string MonthName, List<string> Chosen, decimal EarnedSoFar, bool NextMonthReady);

public record DashboardResponse(
    string Name,
    BudgetResult Budget,
    StreakResult Streak,
    StipendInfo Stipend,
    RegionalInfo? Regional,
    bool BelowFoodMinimum,
    List<AccountDto> Accounts,
    string Tip,
    CashbackTile Cashback);

/// <summary>Анализ трат: сравнение с прошлым периодом, лишние траты и как дотянуть до стипендии.</summary>
public record AnalyticsResponse(
    PeriodComparison Comparison,
    List<WasteFlag> Waste,
    LastingPlan Lasting,
    Dictionary<string, decimal> ByCategory);

public record CashbackOptionDto(Guid Id, string Name, decimal Percent, string? Category, bool Chosen)
{
    public static CashbackOptionDto From(CashbackOptionRow row) => new(row.Id, row.Name, row.Percent, row.Category, row.Chosen);
}

public record CashbackMonthResponse(
    string Month,
    string MonthName,
    List<CashbackOptionDto> Options,
    CashbackPlan? Plan,
    string? Explanation);

public record CashbackResultsResponse(string Month, string MonthName, CashbackMonthResult? Result, decimal AllTimeTotal);

public record PartnerOfferDto(Guid Id, string Merchant, decimal Percent, string? Category, DateOnly? ValidUntil)
{
    public static PartnerOfferDto From(PartnerOfferRow row) => new(row.Id, row.Merchant, row.Percent, row.Category, row.ValidUntil);
}

public record ChatMessageDto(long Id, string Role, string Text, string? Source, DateTime CreatedAt)
{
    public static ChatMessageDto From(ChatMessageRow row) => new(row.Id, row.Role, row.Text, row.Source, row.CreatedAt);
}

public record RegionDto(string Code, string Name, string[] Cities);

public record AdminUserDto(string Nickname, DateTime? LastSeenAt);

public record AdminOverviewResponse(string Prompt, bool PromptCustomized, int UserCount, List<AdminUserDto> Users);

public record SafeOperationDto(
    string Id,
    string Date,
    decimal Amount,
    string Currency,
    string Merchant,
    string Category,
    string Description,
    string Type,
    string? Mcc,
    string OperationType);

public record BankImportResponse(int Imported, int Skipped, decimal? Balance, List<SafeOperationDto> Operations);
