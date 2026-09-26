using System.Globalization;

namespace LimitPlus.Api.Services;

/// <summary>Форматирование сумм и слов для сообщений пользователю.</summary>
public static class TextFormat
{
    private const char NoBreakSpace = '\u00A0';

    /// <summary>3400 → «3 400 ₽», −65 → «−65 ₽». Пробелы неразрывные, чтобы сумма не переносилась.</summary>
    public static string Rub(decimal value)
    {
        string digits = Math.Abs(value)
            .ToString("#,0", CultureInfo.InvariantCulture)
            .Replace(',', NoBreakSpace);
        string sign = value < 0 ? "\u2212" : "";

        return $"{sign}{digits}{NoBreakSpace}₽";
    }

    /// <summary>Правильная форма слова «день»: 1 день, 3 дня, 10 дней, 21 день.</summary>
    public static string Days(int count)
    {
        int lastTwoDigits = Math.Abs(count) % 100;
        int lastDigit = Math.Abs(count) % 10;

        if (lastTwoDigits is >= 11 and <= 14)
        {
            return "дней";
        }

        return lastDigit switch
        {
            1 => "день",
            2 or 3 or 4 => "дня",
            _ => "дней",
        };
    }
}
