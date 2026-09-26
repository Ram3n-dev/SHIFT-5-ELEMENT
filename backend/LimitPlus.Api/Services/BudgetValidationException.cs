namespace LimitPlus.Api.Services;

/// <summary>
/// Ошибка во входных данных, которую нужно показать пользователю.
/// Например, дата стипендии уже прошла.
/// </summary>
public class BudgetValidationException : Exception
{
    public BudgetValidationException(string message)
        : base(message)
    {
    }
}
