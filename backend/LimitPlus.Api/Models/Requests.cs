using System.ComponentModel.DataAnnotations;

namespace LimitPlus.Api.Models;

// Все суммы — в рублях. Атрибуты проверяют данные ещё до расчёта:
// при ошибке ASP.NET Core сам вернёт 400 с описанием проблемы.

public class AccountInput
{
    [Required(ErrorMessage = "У счёта должен быть id")]
    [StringLength(64)]
    public string Id { get; set; } = "";

    [StringLength(40, ErrorMessage = "Название счёта — не длиннее 40 символов")]
    public string Name { get; set; } = "";

    public AccountType Type { get; set; }

    [Range(-10_000_000d, 10_000_000d, ErrorMessage = "Баланс счёта вне допустимого диапазона")]
    public decimal Balance { get; set; }

    /// <summary>Входит ли счёт в деньги на повседневные траты.</summary>
    public bool IncludeInSpending { get; set; }
}

public class RecurringExpenseInput
{
    [StringLength(64)]
    public string Id { get; set; } = "";

    [StringLength(60, ErrorMessage = "Название регулярной траты — не длиннее 60 символов")]
    public string Name { get; set; } = "";

    [Range(0d, 10_000_000d, ErrorMessage = "Сумма регулярной траты не может быть отрицательной")]
    public decimal Amount { get; set; }

    [StringLength(40)]
    public string Category { get; set; } = "";

    public DateOnly NextDate { get; set; }

    public bool Enabled { get; set; } = true;
}

public class CalculateRequest
{
    [MaxLength(20, ErrorMessage = "Слишком много счетов")]
    public List<AccountInput> Accounts { get; set; } = [];

    public DateOnly StipendDate { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Обязательные траты не могут быть отрицательными")]
    public decimal ManualMandatoryExpenses { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Резерв не может быть отрицательным")]
    public decimal Reserve { get; set; }

    [MaxLength(50, ErrorMessage = "Слишком много регулярных трат")]
    public List<RecurringExpenseInput> RecurringExpenses { get; set; } = [];

    /// <summary>
    /// Сегодняшняя дата пользователя. Её передаёт браузер, потому что сервер
    /// может работать в другом часовом поясе. Если не передана — берём дату сервера.
    /// </summary>
    public DateOnly? Today { get; set; }
}

public class PurchaseCheckRequest
{
    [Range(-10_000_000d, 10_000_000d, ErrorMessage = "Баланс вне допустимого диапазона")]
    public decimal TotalBalance { get; set; }

    public DateOnly StipendDate { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Обязательные траты не могут быть отрицательными")]
    public decimal MandatoryExpenses { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Резерв не может быть отрицательным")]
    public decimal Reserve { get; set; }

    [StringLength(60, ErrorMessage = "Название покупки — не длиннее 60 символов")]
    public string PurchaseName { get; set; } = "";

    [Range(0d, 10_000_000d, MinimumIsExclusive = true, ErrorMessage = "Сумма покупки должна быть больше нуля")]
    public decimal PurchaseAmount { get; set; }

    public DateOnly? Today { get; set; }
}

/// <summary>
/// Уже рассчитанные числа, которые нужно объяснить. Все поля, кроме темы, необязательные:
/// если для темы не хватает чисел, ответ — «Данных недостаточно для точного объяснения».
/// </summary>
public class ExplainRequest
{
    public ExplainTopic Topic { get; set; }

    public int? DaysUntilStipend { get; set; }

    public decimal? TotalBalance { get; set; }

    public decimal? MandatoryExpenses { get; set; }

    public decimal? Reserve { get; set; }

    public decimal? FreeMoney { get; set; }

    public decimal? DailyLimit { get; set; }

    public BudgetStatus? Status { get; set; }

    [StringLength(60, ErrorMessage = "Название покупки — не длиннее 60 символов")]
    public string? PurchaseName { get; set; }

    public decimal? PurchaseAmount { get; set; }

    public decimal? DailyLimitAfter { get; set; }

    public decimal? LimitChange { get; set; }

    public PurchaseDecision? Decision { get; set; }
}
