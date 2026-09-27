namespace LimitPlus.Api.Logic;

/// <summary>
/// Справочник MCC → категория расхода. Парсер его не знает: новые коды добавляются только здесь.
/// MCC помогает отнести торговую операцию к категории, но не означает, что банк начислит кэшбэк по этой же категории.
/// </summary>
public static class MccCategoryCatalog
{
    public const string Uncategorized = "uncategorized";

    private static readonly Dictionary<string, string> ByCode = new(StringComparer.Ordinal)
    {
        ["5411"] = "supermarket",
        ["5541"] = "gas_station",
        ["5812"] = "restaurant",
        ["5912"] = "pharmacy",
    };

    /// <summary>Есть ли для этого MCC категория. Пустой код и неизвестный код — false.</summary>
    public static bool TryGetCategory(string? mcc, out string category)
    {
        string? code = Normalize(mcc);
        if (code is not null && ByCode.TryGetValue(code, out string? found))
        {
            category = found;
            return true;
        }

        category = Uncategorized;
        return false;
    }

    /// <summary>Категория из справочника либо <see cref="Uncategorized"/>, если соответствия нет.</summary>
    public static string CategoryOrUncategorized(string? mcc) =>
        TryGetCategory(mcc, out string category) ? category : Uncategorized;

    public static bool IsCategory(string category) =>
        category == Uncategorized || ByCode.ContainsValue(category);

    /// <summary>Четырёхзначный код для поиска. Исходную строку операции это не заменяет.</summary>
    public static string? Normalize(string? mcc)
    {
        if (string.IsNullOrWhiteSpace(mcc))
        {
            return null;
        }

        string digits = new string(mcc.Where(char.IsDigit).ToArray());
        if (digits.Length is < 1 or > 4)
        {
            return null;
        }

        return digits.PadLeft(4, '0');
    }
}
