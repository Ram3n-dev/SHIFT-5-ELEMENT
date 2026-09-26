namespace LimitPlus.Api.Logic;

/// <summary>Категории операций. Такие же списки есть во фронтенде (src/lib/categories.ts).</summary>
public static class Categories
{
    public const string Other = "Другое";
    public const string Stipend = "Стипендия";

    public static readonly string[] Expense =
    [
        "Продукты", "Кафе и доставка", "Транспорт", "Такси", "Учёба", "Связь",
        "Подписки", "Здоровье", "Развлечения", "Одежда", Other,
    ];

    public static readonly string[] Income = [Stipend, "Подработка", "Перевод", Other];

    /// <summary>Необязательные категории: здесь ищем «лишние» траты.</summary>
    public static readonly HashSet<string> Optional =
    [
        "Кафе и доставка", "Такси", "Развлечения", "Одежда", "Подписки", Other,
    ];

    public static bool IsKnown(string category, OperationType type) =>
        (type == OperationType.Income ? Income : Expense).Contains(category);
}
