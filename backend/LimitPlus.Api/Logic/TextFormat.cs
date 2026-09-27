using System.Globalization;

namespace LimitPlus.Api.Logic;

/// <summary>Форматирование сумм и слов для сообщений пользователю.</summary>
public static class TextFormat
{
    private const char NoBreakSpace = '\u00A0';

    /// <summary>3400 → «3 400 ₽», −65 → «−65 ₽». Пробелы неразрывные, чтобы сумма не переносилась.</summary>
    public static string Rub(decimal value)
    {
        string digits = Math.Round(Math.Abs(value), 0, MidpointRounding.AwayFromZero)
            .ToString("#,0", CultureInfo.InvariantCulture)
            .Replace(',', NoBreakSpace);
        string sign = value <= -0.5m ? "\u2212" : "";

        return $"{sign}{digits}{NoBreakSpace}₽";
    }

    /// <summary>Правильная форма слова «день»: 1 день, 3 дня, 10 дней, 21 день.</summary>
    public static string Days(int count) => Plural(count, "день", "дня", "дней");

    /// <summary>1 раз, 3 раза, 5 раз.</summary>
    public static string Times(int count) => Plural(count, "раз", "раза", "раз");

    public static string Plural(int count, string one, string few, string many)
    {
        int lastTwoDigits = Math.Abs(count) % 100;
        int lastDigit = Math.Abs(count) % 10;

        if (lastTwoDigits is >= 11 and <= 14)
        {
            return many;
        }

        return lastDigit switch
        {
            1 => one,
            2 or 3 or 4 => few,
            _ => many,
        };
    }

    /// <summary>«октябрь», «ноябрь» — название месяца для заголовков.</summary>
    public static string MonthName(DateOnly month)
    {
        string[] names =
        [
            "январь", "февраль", "март", "апрель", "май", "июнь",
            "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
        ];
        return names[month.Month - 1];
    }
}
