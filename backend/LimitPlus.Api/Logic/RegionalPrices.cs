namespace LimitPlus.Api.Logic;

/// <summary>
/// Цены региона: стоимость условного (минимального) набора продуктов питания по данным Росстата.
/// IsRussiaAverage = true — по региону данных нет, показываем среднее по России.
/// </summary>
public record RegionalInfo(
    string RegionName,
    decimal FoodBasketMonth,
    decimal FoodPerDay,
    bool IsRussiaAverage,
    string Period,
    string Source);

public static class RegionalPrices
{
    public static RegionalInfo Build(string regionName, decimal foodBasketMonth, bool isRussiaAverage, string period, string source) =>
        new(regionName, BudgetCalculator.RoundRub(foodBasketMonth),
            BudgetCalculator.RoundRub(foodBasketMonth / 30), isRussiaAverage, period, source);
}
