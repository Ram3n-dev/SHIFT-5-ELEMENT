namespace LimitPlus.Api.Models;

/// <summary>Регулярный платёж, который спишется до стипендии.</summary>
public record UpcomingPayment(string Id, string Name, decimal Amount, DateOnly NextDate);

public record CalculateResponse(
    int DaysUntilStipend,
    decimal TotalBalance,
    decimal MandatoryExpenses,
    decimal Reserve,
    decimal FreeMoney,
    decimal DailyLimit,
    BudgetStatus Status,
    string Message,
    List<UpcomingPayment> UpcomingPayments);

public record PurchaseCheckResponse(
    decimal BalanceAfter,
    decimal DailyLimitBefore,
    decimal DailyLimitAfter,
    decimal LimitChange,
    PurchaseDecision Decision,
    string Message);

public record ExplainResponse(string Text, ExplanationSource Source);
