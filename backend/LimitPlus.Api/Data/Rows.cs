namespace LimitPlus.Api.Data;

// Строки таблиц базы. Dapper сопоставляет колонки в snake_case со свойствами
// (включено в Database.Configure: MatchNamesWithUnderscores).

public class UserRow
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
<<<<<<< HEAD
    public string? Login { get; set; }
    public string Name { get; set; } = "";
    public bool IsDemo { get; set; }
    public bool IsAdmin { get; set; }
    public DateTime? LastSeenAt { get; set; }
=======
    public string Name { get; set; } = "";
    public bool IsDemo { get; set; }
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    public DateTime? PdConsentAt { get; set; }
    public DateTime? OnboardedAt { get; set; }
    public string? RegionCode { get; set; }
    public string? City { get; set; }
    public decimal StipendAmount { get; set; }
    public int StipendDay { get; set; }
    public DateOnly? StipendConfirmedOn { get; set; }
    public decimal MandatoryMonthly { get; set; }
    public decimal MandatoryLeft { get; set; }
    public decimal Reserve { get; set; }
    public int LimitPeriodDays { get; set; }
    public string Theme { get; set; } = "system";
    public bool NotificationsEnabled { get; set; }
}

public class AccountRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "card";
    public decimal Balance { get; set; }
    public bool IncludeInSpending { get; set; }
}

public class OperationRow
{
    public Guid Id { get; set; }
    public Guid? AccountId { get; set; }
    public string Type { get; set; } = "expense";
    public decimal Amount { get; set; }
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public DateOnly Date { get; set; }
    public bool IsMandatory { get; set; }
    public bool IsRecurring { get; set; }

    /// <summary>false — операция из выписки: баланс счёта её уже учитывает.</summary>
    public bool AffectsBalance { get; set; } = true;

    // Из присоединённой таблицы accounts: тип счёта и входит ли он в повседневные траты.
    public string? AccountName { get; set; }
    public string? AccountType { get; set; }
    public bool? InSpending { get; set; }
}

public class RecurringRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Amount { get; set; }
    public string Category { get; set; } = "";
    public DateOnly NextDate { get; set; }
    public bool Enabled { get; set; }
}

public class SnapshotRow
{
    public DateOnly Date { get; set; }
    public decimal DayLimit { get; set; }
    public bool NoSpendConfirmed { get; set; }
}

public class CashbackOptionRow
{
    public Guid Id { get; set; }
    public DateOnly Month { get; set; }
    public string Name { get; set; } = "";
    public decimal Percent { get; set; }
    public string? Category { get; set; }
    public bool Chosen { get; set; }
}

public class PartnerOfferRow
{
    public Guid Id { get; set; }
    public string Merchant { get; set; } = "";
    public decimal Percent { get; set; }
    public string? Category { get; set; }
    public DateOnly? ValidUntil { get; set; }
}

public class ChatMessageRow
{
    public long Id { get; set; }
    public string Role { get; set; } = "";
    public string Text { get; set; } = "";
    public string? Source { get; set; }
    public DateTime CreatedAt { get; set; }
}

<<<<<<< HEAD
public class AdminUserRow
{
    public string Nickname { get; set; } = "";
    public DateTime? LastSeenAt { get; set; }
}

/// <summary>Только для проверки пароля при входе. В ответы API не попадает.</summary>
public class CredentialRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? PasswordHash { get; set; }
}

=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
public class RegionalPriceRow
{
    public string RegionCode { get; set; } = "";
    public string RegionName { get; set; } = "";
    public decimal FoodBasketMonth { get; set; }
    public string Period { get; set; } = "";
    public string Source { get; set; } = "";
}
