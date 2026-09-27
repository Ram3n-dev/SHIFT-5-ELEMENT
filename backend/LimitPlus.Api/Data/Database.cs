using System.Data;
using System.Globalization;
using Dapper;
using Npgsql;

namespace LimitPlus.Api.Data;

/// <summary>Подключение к PostgreSQL, создание таблиц и загрузка справочных данных.</summary>
public static class Database
{
    /// <summary>Настройки Dapper: колонки snake_case ↔ свойства PascalCase, поддержка DateOnly.</summary>
    public static void Configure()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
        SqlMapper.AddTypeHandler(new DateOnlyHandler());
    }

    /// <summary>
    /// Создаёт таблицы (если их нет), загружает цены регионов и удаляет старых демо-пользователей.
    /// В Docker база может стартовать чуть позже backend, поэтому пробуем несколько раз.
    /// </summary>
    public static async Task InitializeAsync(NpgsqlDataSource dataSource, ILogger logger)
    {
        string dataFolder = Path.Combine(AppContext.BaseDirectory, "Data");
        string schema = await File.ReadAllTextAsync(Path.Combine(dataFolder, "schema.sql"));

        for (int attempt = 1; ; attempt++)
        {
            try
            {
                await using NpgsqlConnection connection = await dataSource.OpenConnectionAsync();
                await connection.ExecuteAsync(schema);
                break;
            }
            catch (NpgsqlException exception) when (exception.IsTransient && attempt < 15)
            {
                logger.LogWarning("База данных ещё не готова (попытка {Attempt}), ждём 2 секунды", attempt);
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }

        await using (NpgsqlConnection connection = await dataSource.OpenConnectionAsync())
        {
            foreach (RegionalPriceRow price in ReadRegionalPrices(Path.Combine(dataFolder, "regional-prices.csv")))
            {
                await connection.ExecuteAsync(
                    """
                    INSERT INTO regional_prices (region_code, region_name, food_basket_month, period, source)
                    VALUES (@RegionCode, @RegionName, @FoodBasketMonth, @Period, @Source)
                    ON CONFLICT (region_code) DO UPDATE
                    SET region_name = EXCLUDED.region_name,
                        food_basket_month = EXCLUDED.food_basket_month,
                        period = EXCLUDED.period,
                        source = EXCLUDED.source
                    """,
                    price);
            }

            // Демо-входы живут неделю.
            await connection.ExecuteAsync("DELETE FROM users WHERE is_demo AND created_at < now() - interval '7 days'");
        }
    }

    /// <summary>CSV через «;»: region_code;region_name;food_basket_month;period;source.</summary>
    private static IEnumerable<RegionalPriceRow> ReadRegionalPrices(string path)
    {
        if (!File.Exists(path))
        {
            yield break;
        }

        foreach (string line in File.ReadLines(path).Skip(1))
        {
            string[] cells = line.Split(';');
            if (cells.Length < 5 || !decimal.TryParse(cells[2], NumberStyles.Number, CultureInfo.InvariantCulture, out decimal price))
            {
                continue;
            }

            yield return new RegionalPriceRow
            {
                RegionCode = cells[0].Trim(),
                RegionName = cells[1].Trim(),
                FoodBasketMonth = price,
                Period = cells[3].Trim(),
                Source = cells[4].Trim(),
            };
        }
    }

    /// <summary>Dapper по умолчанию не умеет DateOnly — учим его читать и писать даты.</summary>
    private sealed class DateOnlyHandler : SqlMapper.TypeHandler<DateOnly>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly value)
        {
            parameter.DbType = DbType.Date;
            parameter.Value = value;
        }

        public override DateOnly Parse(object value) => value switch
        {
            DateOnly date => date,
            DateTime dateTime => DateOnly.FromDateTime(dateTime),
            _ => DateOnly.Parse(value.ToString()!, CultureInfo.InvariantCulture),
        };
    }
}
