namespace LimitPlus.Api.Logic;

/// <summary>
/// Сопоставляет названия категорий кэшбэка из банка («Супермаркеты», «Фастфуд») с нашими категориями трат.
/// Если не нашли — null: такой вариант пользователь может сопоставить вручную.
/// </summary>
public static class CashbackCategories
{
    // Порядок важен: сначала более точные слова.
    private static readonly (string Keyword, string Category)[] Keywords =
    [
        ("все покупки", CashbackOptimizer.AllPurchases),
        ("на всё", CashbackOptimizer.AllPurchases),
        ("на все", CashbackOptimizer.AllPurchases),
        ("любые покупки", CashbackOptimizer.AllPurchases),
        ("супермаркет", "Продукты"),
        ("продукт", "Продукты"),
        ("магазины у дома", "Продукты"),
        ("фастфуд", "Кафе и доставка"),
        ("фаст-фуд", "Кафе и доставка"),
        ("кафе", "Кафе и доставка"),
        ("ресторан", "Кафе и доставка"),
        ("доставк", "Кафе и доставка"),
        ("такси", "Такси"),
        ("каршеринг", "Такси"),
        ("транспорт", "Транспорт"),
        ("аптек", "Здоровье"),
        ("медицин", "Здоровье"),
        ("кино", "Развлечения"),
        ("театр", "Развлечения"),
        ("развлечен", "Развлечения"),
        ("спорт", "Развлечения"),
        ("одежд", "Одежда"),
        ("обув", "Одежда"),
        ("книг", "Учёба"),
        ("образован", "Учёба"),
        ("канцеляр", "Учёба"),
        ("связь", "Связь"),
        ("мобильн", "Связь"),
        ("цифров", "Подписки"),
        ("подписк", "Подписки"),
        ("музык", "Подписки"),
    ];

    public static string? Guess(string bankCategoryName)
    {
        string name = bankCategoryName.Trim().ToLowerInvariant().Replace('ё', 'е');
        foreach ((string keyword, string category) in Keywords)
        {
            if (name.Contains(keyword.Replace('ё', 'е')))
            {
                return category;
            }
        }

        return null;
    }
}
