using LimitPlus.Api.Data;

namespace LimitPlus.Api.Logic;

/// <summary>Готовая операция приложения из обезличенной банковской строки.</summary>
public record AppOperationDraft(string Type, decimal Amount, string Category, string Description, DateOnly Date);

/// <summary>Переводит безопасные поля выписки в категории и описания Енотономики. Персональных полей здесь уже нет.</summary>
public static class BankOperationMapper
{
    public static AppOperationDraft? Map(SafeOperation operation, DateOnly today)
    {
        if (operation.Currency != "RUB" || operation.Amount <= 0)
        {
            return null;
        }

        DateOnly date = DateOnly.FromDateTime(operation.Date);
        if (date > today || date < today.AddYears(-6))
        {
            return null;
        }

        // Поступление и перевод не переклассифицируем по MCC: это признак торговой операции.
        if (operation.Incoming == true && !IsTax(operation.Category, operation.Merchant, operation.Description))
        {
            string incomeCategory = IncomeCategory(operation);
            return new AppOperationDraft("income", decimal.Round(operation.Amount, 2), incomeCategory, incomeCategory, date);
        }

        // MCC есть — категория только из справочника. Нет соответствия — uncategorized, без догадки по тексту.
        if (!string.IsNullOrWhiteSpace(operation.Mcc))
        {
            string byMcc = MccCategoryCatalog.CategoryOrUncategorized(operation.Mcc);
            return new AppOperationDraft("expense", decimal.Round(operation.Amount, 2), byMcc, byMcc, date);
        }

        if (IsTax(operation.Category, operation.Merchant, operation.Description))
        {
            return new AppOperationDraft("expense", decimal.Round(operation.Amount, 2), "Налоги", "Налоги", date);
        }

        string category = ExpenseCategory(operation);
        return new AppOperationDraft("expense", decimal.Round(operation.Amount, 2), category, category, date);
    }

    /// <summary>
    /// У уже сохранённой операции из выписки убирает текст банка и оставляет категорию.
    /// true — строку в базе нужно перезаписать.
    /// </summary>
    public static bool RedactStored(OperationRow row)
    {
        if (row.AffectsBalance)
        {
            return false;
        }

        string type = row.Type;
        string category = row.Category;
        if (IsTax(row.Category, row.Description))
        {
            type = "expense";
            category = "Налоги";
        }

        if (row.Type == type && row.Category == category && row.Description == category)
        {
            return false;
        }

        row.Type = type;
        row.Category = category;
        row.Description = category;
        return true;
    }

    private static bool IsTax(params string[] parts)
    {
        string text = string.Join(' ', parts).ToLowerInvariant().Replace('ё', 'е');
        return text.Contains("ифнс") || text.Contains("фнс") || text.Contains("налог") || text.Contains("пошлин") || text.Contains("казначей");
    }

    private static string IncomeCategory(SafeOperation operation)
    {
        string text = $"{operation.Category} {operation.Description} {operation.Merchant}".ToLowerInvariant();
        if (text.Contains("стипенд"))
        {
            return Categories.Stipend;
        }

        if (text.Contains("подработ") || text.Contains("зарплат"))
        {
            return "Подработка";
        }

        return "Перевод";
    }

    private static string ExpenseCategory(SafeOperation operation)
    {
        if (Categories.Expense.Contains(operation.Category))
        {
            return operation.Category;
        }

        string text = $"{operation.Category} {operation.Merchant} {operation.Description}".ToLowerInvariant().Replace('ё', 'е');
        if (text.Contains("ифнс") || text.Contains("фнс") || text.Contains("налог") || text.Contains("пошлин") || text.Contains("казначей"))
        {
            return "Налоги";
        }

        string? guessed = CashbackCategories.Guess(text);
        if (guessed is not null && guessed != CashbackOptimizer.AllPurchases && Categories.Expense.Contains(guessed))
        {
            return guessed;
        }

        return Categories.Other;
    }
}
