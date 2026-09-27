namespace LimitPlus.Api.Logic;

/// <summary>Категории операций. Такие же списки есть во фронтенде (src/lib/categories.ts).</summary>
public static class Categories
{
    public const string Other = "Другое";
    public const string Stipend = "Стипендия";

    public static readonly string[] Expense =
    [
        "Продукты", "Кафе и доставка", "Транспорт", "Такси", "Учёба", "Связь",
<<<<<<< HEAD
        "Подписки", "Здоровье", "Развлечения", "Одежда", "Налоги", Other,
=======
        "Подписки", "Здоровье", "Развлечения", "Одежда", Other,
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    ];

    public static readonly string[] Income = [Stipend, "Подработка", "Перевод", Other];

    /// <summary>Необязательные категории: здесь ищем «лишние» траты.</summary>
    public static readonly HashSet<string> Optional =
    [
        "Кафе и доставка", "Такси", "Развлечения", "Одежда", "Подписки", Other,
    ];

    public static bool IsKnown(string category, OperationType type) =>
<<<<<<< HEAD
        type == OperationType.Income
            ? Income.Contains(category)
            : Expense.Contains(category) || MccCategoryCatalog.IsCategory(category);
=======
        (type == OperationType.Income ? Income : Expense).Contains(category);
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
}
