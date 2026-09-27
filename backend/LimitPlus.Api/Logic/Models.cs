namespace LimitPlus.Api.Logic;

// Типы, с которыми работают расчёты. В JSON значения пишутся в snake_case (настройка в Program.cs).

public enum AccountType
{
    Card,
    Cash,
    Savings,
}

public enum OperationType
{
    Expense,
    Income,
}

/// <summary>Состояние бюджета до стипендии.</summary>
public enum BudgetStatus
{
    Safe,
    Warning,
    Critical,
}

/// <summary>Вывод по планируемой покупке.</summary>
public enum PurchaseDecision
{
    Safe,
    Warning,
    Critical,
    NotRecommended,
}

/// <summary>Счёт: сколько на нём денег и входит ли он в повседневные траты.</summary>
public record MoneyAccount(decimal Balance, bool IncludeInSpending);

/// <summary>Регулярная трата: общежитие, интернет, подписка.</summary>
public record RecurringItem(Guid Id, string Name, decimal Amount, DateOnly NextDate, bool Enabled);

/// <summary>
/// Расход для аналитики. IsMandatory — обязательная или регулярная трата (её не считаем «лишней»).
/// IsCard — оплачено картой: только такие покупки дают кэшбэк.
/// </summary>
public record ExpenseItem(DateOnly Date, decimal Amount, string Category, bool IsMandatory, bool IsCard);

/// <summary>Ошибка во входных данных, которую нужно показать пользователю.</summary>
public class BudgetValidationException : Exception
{
    public BudgetValidationException(string message)
        : base(message)
    {
    }
}
