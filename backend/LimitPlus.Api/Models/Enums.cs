namespace LimitPlus.Api.Models;

// В JSON значения пишутся в snake_case: card, not_recommended, why_limit (настройка в Program.cs).

/// <summary>Тип счёта.</summary>
public enum AccountType
{
    Card,
    Cash,
    Savings,
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

/// <summary>Вопрос, на который нужно объяснение.</summary>
public enum ExplainTopic
{
    WhyLimit,
    PurchaseImpact,
    ReduceRisk,
}

/// <summary>Кто написал объяснение: шаблон или языковая модель.</summary>
public enum ExplanationSource
{
    Template,
    Llm,
}
