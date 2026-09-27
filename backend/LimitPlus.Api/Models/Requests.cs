using System.ComponentModel.DataAnnotations;
using LimitPlus.Api.Logic;

namespace LimitPlus.Api.Models;

// Тела запросов. Атрибуты проверяют данные ещё до контроллера:
// при ошибке ASP.NET Core сам вернёт 400 с описанием проблемы.

<<<<<<< HEAD
public class RegisterRequest
{
    [Required(ErrorMessage = "Укажи логин")]
    [StringLength(32, MinimumLength = 3, ErrorMessage = "Логин — от 3 до 32 символов")]
    [RegularExpression(@"^[\p{L}\p{N}_-]+$", ErrorMessage = "Логин: буквы, цифры, _ и -")]
    public string Login { get; set; } = "";

    [Required(ErrorMessage = "Укажи почту")]
    [EmailAddress(ErrorMessage = "Почта выглядит неверно")]
    [StringLength(120)]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Укажи пароль")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Пароль — не короче 8 символов")]
    public string Password { get; set; } = "";
}

public class LoginRequest
{
    [Required(ErrorMessage = "Укажи логин или почту")]
    [StringLength(120)]
    public string Login { get; set; } = "";

    [Required(ErrorMessage = "Укажи пароль")]
    [StringLength(128)]
    public string Password { get; set; } = "";
}

public class PromptUpdateRequest
{
    [StringLength(4000, ErrorMessage = "Промпт — не длиннее 4000 символов")]
    public string Prompt { get; set; } = "";
}

public class FeedbackRequest
{
    [Range(0, 5, ErrorMessage = "Оценка — от 0 до 5")]
    public int Rating { get; set; }

    [StringLength(1000, ErrorMessage = "Отзыв — не длиннее 1000 символов")]
    public string Text { get; set; } = "";
}

public class BankImportRequest
{
    public Guid AccountId { get; set; }
}

=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
public class OnboardingRequest
{
    /// <summary>Согласие на обработку персональных данных — без него онбординг не завершить.</summary>
    public bool PdConsent { get; set; }

    [StringLength(60)]
    public string? City { get; set; }

    [StringLength(4)]
    public string? RegionCode { get; set; }

    [Range(0d, 1_000_000d, ErrorMessage = "Размер стипендии вне допустимого диапазона")]
    public decimal StipendAmount { get; set; }

    [Range(1, 31, ErrorMessage = "Число стипендии — от 1 до 31")]
    public int StipendDay { get; set; } = 25;

    [Range(-10_000_000d, 10_000_000d, ErrorMessage = "Баланс карты вне допустимого диапазона")]
    public decimal Card { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Наличные не могут быть отрицательными")]
    public decimal Cash { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Накопления не могут быть отрицательными")]
    public decimal Savings { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Обязательные траты не могут быть отрицательными")]
    public decimal MandatoryMonthly { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Резерв не может быть отрицательным")]
    public decimal Reserve { get; set; }

    public int LimitPeriodDays { get; set; } = 1;
}

/// <summary>Изменение настроек профиля. Поля, которые не пришли (null), не меняются.</summary>
public class ProfileUpdateRequest
{
    [StringLength(60)]
    public string? City { get; set; }

    [StringLength(4)]
    public string? RegionCode { get; set; }

    [Range(0d, 1_000_000d, ErrorMessage = "Размер стипендии вне допустимого диапазона")]
    public decimal? StipendAmount { get; set; }

    [Range(1, 31, ErrorMessage = "Число стипендии — от 1 до 31")]
    public int? StipendDay { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Обязательные траты не могут быть отрицательными")]
    public decimal? MandatoryMonthly { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Обязательные траты не могут быть отрицательными")]
    public decimal? MandatoryLeft { get; set; }

    [Range(0d, 10_000_000d, ErrorMessage = "Резерв не может быть отрицательным")]
    public decimal? Reserve { get; set; }

    public int? LimitPeriodDays { get; set; }

    [RegularExpression("^(system|light|dark)$", ErrorMessage = "Тема: system, light или dark")]
    public string? Theme { get; set; }

    public bool? NotificationsEnabled { get; set; }
}

public class AccountRequest
{
    [Required(ErrorMessage = "Укажи название счёта")]
    [StringLength(40, ErrorMessage = "Название счёта — не длиннее 40 символов")]
    public string Name { get; set; } = "";

    public AccountType Type { get; set; }

    [Range(-10_000_000d, 10_000_000d, ErrorMessage = "Баланс вне допустимого диапазона")]
    public decimal Balance { get; set; }

    public bool IncludeInSpending { get; set; } = true;
}

public class OperationRequest
{
    public OperationType Type { get; set; }

    [Range(0.01d, 10_000_000d, ErrorMessage = "Сумма должна быть больше нуля")]
    public decimal Amount { get; set; }

    [Required(ErrorMessage = "Выбери категорию")]
    [StringLength(40)]
    public string Category { get; set; } = "";

    [StringLength(80, ErrorMessage = "Описание — не длиннее 80 символов")]
    public string Description { get; set; } = "";

    public Guid? AccountId { get; set; }

    public DateOnly Date { get; set; }

    /// <summary>Обязательная трата (общежитие, проезд): уменьшает план обязательных трат, а не дневной лимит.</summary>
    public bool IsMandatory { get; set; }
}

public class ImportRequest
{
    public Guid AccountId { get; set; }

    [MinLength(1, ErrorMessage = "В файле нет операций")]
    [MaxLength(1000, ErrorMessage = "За один раз можно импортировать не больше 1000 операций")]
    public List<OperationRequest> Operations { get; set; } = [];

    /// <summary>
    /// true — выписка про прошлое, а баланс счёта указан «сейчас» и уже её учитывает: балансы не меняем.
    /// false — зачислить и списать суммы, как будто операции прошли только что.
    /// </summary>
    public bool BalanceIncludesOperations { get; set; } = true;
}

public class RecurringRequest
{
    [Required(ErrorMessage = "Укажи название")]
    [StringLength(60)]
    public string Name { get; set; } = "";

    [Range(0d, 10_000_000d, ErrorMessage = "Сумма не может быть отрицательной")]
    public decimal Amount { get; set; }

    [Required]
    [StringLength(40)]
    public string Category { get; set; } = "Другое";

    public DateOnly NextDate { get; set; }

    public bool Enabled { get; set; } = true;
}

public class AccountChoiceRequest
{
    public Guid? AccountId { get; set; }
}

public class PurchaseRequest
{
    [StringLength(60, ErrorMessage = "Название покупки — не длиннее 60 символов")]
    public string Name { get; set; } = "";

    [Range(0d, 10_000_000d, MinimumIsExclusive = true, ErrorMessage = "Сумма покупки должна быть больше нуля")]
    public decimal Amount { get; set; }
}

public class CashbackOptionInput
{
    [Required(ErrorMessage = "Укажи категорию кэшбэка")]
    [StringLength(60)]
    public string Name { get; set; } = "";

    [Range(0.1d, 100d, ErrorMessage = "Процент кэшбэка — от 0,1 до 100")]
    public decimal Percent { get; set; }

    /// <summary>Наша категория трат. Не указана — угадаем по названию.</summary>
    [StringLength(40)]
    public string? Category { get; set; }
}

public class CashbackOptionsRequest
{
    [MaxLength(20, ErrorMessage = "Не больше 20 вариантов кэшбэка")]
    public List<CashbackOptionInput> Options { get; set; } = [];
}

public class CashbackChooseRequest
{
    [MaxLength(20)]
    public List<Guid> OptionIds { get; set; } = [];
}

public class PartnerOfferRequest
{
    [Required(ErrorMessage = "Укажи магазин")]
    [StringLength(60)]
    public string Merchant { get; set; } = "";

    [Range(0.1d, 100d, ErrorMessage = "Процент кэшбэка — от 0,1 до 100")]
    public decimal Percent { get; set; }

    [StringLength(40)]
    public string? Category { get; set; }

    public DateOnly? ValidUntil { get; set; }
}

public class ChatRequest
{
    [StringLength(500, ErrorMessage = "Вопрос — не длиннее 500 символов")]
    public string Message { get; set; } = "";

    /// <summary>Id готовой подсказки. Если есть — Message можно не заполнять.</summary>
    [StringLength(40)]
    public string? PromptId { get; set; }
}

public class ConsentRequest
{
    [RegularExpression("^(cookies|personal_data)$")]
    public string Kind { get; set; } = "cookies";

    [Required]
    [StringLength(60)]
    public string Value { get; set; } = "";

    [Required]
    [StringLength(10)]
    public string Version { get; set; } = "v1";
}

public class EventRequest
{
    [Required]
    [StringLength(60)]
    [RegularExpression("^[a-z0-9_:/-]+$")]
    public string Name { get; set; } = "";
}
