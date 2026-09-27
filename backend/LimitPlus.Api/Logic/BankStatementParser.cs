using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace LimitPlus.Api.Logic;

/// <summary>Операция из банковской выписки после отбрасывания персональных данных.</summary>
public record SafeOperation(
    string Id,
    DateTime Date,
    decimal Amount,
    string Currency,
    string Merchant,
    string Category,
    string Description,
    bool? Incoming,
    string? Mcc = null);

public record SafeBankStatement(decimal? Balance, List<SafeOperation> Operations);

/// <summary>
/// Разбирает ответ ручки выписки и оставляет поля операции:
/// id, date, amount, currency, merchant, category, description, mcc.
/// Категорию по MCC здесь не выбирает — это делает справочник в пайплайне расходов.
/// Номера счетов, ИНН, КПП, БИК, ФИО, карты, телефоны и почта не попадают в результат.
/// </summary>
public static partial class BankStatementParser
{
    private static readonly HashSet<string> ForbiddenKeys = new(StringComparer.Ordinal)
    {
        "account", "accountnumber", "accountnum", "corraccount", "settlementaccount",
        "inn", "kpp", "bik", "bic", "bankbik", "swift",
        "card", "cardnumber", "pan", "maskedpan", "cardholder",
        "phone", "mobile", "email", "passport", "snils",
        "fio", "fullname", "lastname", "firstname", "middlename", "patronymic",
        "payer", "payee", "recipient", "sender", "counterparty", "customer", "client", "person", "owner",
        "address", "ks", "rs",
    };

    private static readonly string[] IdKeys = ["operationid", "id", "transactionid", "uuid", "operationuuid"];
    private static readonly string[] DateKeys = ["operationdate", "date", "datetime", "authorizationdate", "drawdate", "trxnpostdate", "transactiondate", "authdate", "executedat", "postedat", "bookingdate", "chargedate"];
    private static readonly string[] AmountKeys = ["rubleamount", "accountamount", "amount", "sum", "summ", "operationamount", "transactionamount"];
    private static readonly string[] CurrencyKeys = ["currency", "operationcurrencydigitalcode", "currencycode", "curr"];
    private static readonly string[] MerchantKeys = ["merchant", "merchantname", "brand", "terminalname", "tradename"];
    private static readonly string[] CategoryKeys = ["category", "categoryname", "operationcategory", "mccdescription"];
    private static readonly string[] DescriptionKeys = ["paypurpose", "paymentpurpose", "description", "purpose", "details", "narrative", "ground"];
    private static readonly string[] DirectionKeys = ["typeofoperation", "operationtype", "transactiontype", "direction", "debitcredit", "dc", "flow"];

    private static readonly HashSet<string> IncomeWords = new(StringComparer.Ordinal)
    {
        "credit", "in", "incoming", "income", "deposit", "зачисление", "пополнение", "приход", "кредит",
    };

    private static readonly HashSet<string> ExpenseWords = new(StringComparer.Ordinal)
    {
        "debit", "out", "outgoing", "expense", "withdraw", "списание", "расход", "покупка", "дебет",
    };

    public static SafeBankStatement Parse(string json)
    {
        using JsonDocument document = JsonDocument.Parse(json);
        decimal? balance = ReadBalance(document.RootElement, 0);
        var operations = new List<SafeOperation>();
        Walk(document.RootElement, null, operations);

        var unique = new List<SafeOperation>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (SafeOperation operation in operations)
        {
            if (seen.Add(operation.Id))
            {
                unique.Add(operation);
            }
        }

        return new SafeBankStatement(balance, unique);
    }

    private static void Walk(JsonElement element, string? key, List<SafeOperation> operations)
    {
        if (key is not null && IsForbidden(key))
        {
            return;
        }

        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                if (!ContainsOperationArray(element) && TryReadOperation(element, out SafeOperation? operation))
                {
                    operations.Add(operation!);
                    return;
                }

                foreach (JsonProperty property in element.EnumerateObject())
                {
                    Walk(property.Value, property.Name, operations);
                }

                break;
            case JsonValueKind.Array:
                foreach (JsonElement item in element.EnumerateArray())
                {
                    Walk(item, key, operations);
                }

                break;
        }
    }

    private static bool ContainsOperationArray(JsonElement element)
    {
        foreach (JsonProperty property in element.EnumerateObject())
        {
            if (IsForbidden(property.Name) || property.Value.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (JsonElement item in property.Value.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Object && HasAmountAndDate(item))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static bool HasAmountAndDate(JsonElement element) =>
        TryReadAmount(element, out _, out _) && TryReadDate(element, out _);

    private static bool TryReadOperation(JsonElement element, out SafeOperation? operation)
    {
        operation = null;
        if (!TryReadAmount(element, out decimal amount, out string? nestedCurrency) || !TryReadDate(element, out DateTimeOffset date))
        {
            return false;
        }

        string? id = ReadString(element, IdKeys);
        string merchant = Sanitize(ReadMerchant(element));
        string category = Sanitize(ReadString(element, CategoryKeys));
        string description = Sanitize(ReadString(element, DescriptionKeys));
        string? mcc = ReadMcc(element);
        bool? incoming = ReadDirection(element);
        if (id is null && merchant.Length == 0 && category.Length == 0 && description.Length == 0 && incoming is null && mcc is null)
        {
            return false;
        }

        if (amount < 0)
        {
            incoming = false;
            amount = Math.Abs(amount);
        }
        else if (incoming is null)
        {
            incoming = GuessIncoming(category, description, merchant);
        }

        string currency = NormalizeCurrency(ReadString(element, CurrencyKeys) ?? nestedCurrency);
        operation = new SafeOperation(
            SafeId(id, date, amount, currency, merchant, category, description),
            date.UtcDateTime,
            amount,
            currency,
            merchant,
            category,
            description,
            incoming,
            mcc);
        return true;
    }

    /// <summary>Исходный MCC, если банк его прислал. Категорию по нему здесь не выбираем.</summary>
    private static string? ReadMcc(JsonElement element)
    {
        if (!TryProperty(element, "mcc", out JsonElement value) && !TryProperty(element, "merchantcategorycode", out value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out long code) && code >= 0)
        {
            return code.ToString(CultureInfo.InvariantCulture);
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            string? text = value.GetString()?.Trim();
            return string.IsNullOrEmpty(text) ? null : text;
        }

        return null;
    }

    private static bool? GuessIncoming(string category, string description, string merchant)
    {
        string text = $"{category} {description} {merchant}".ToLowerInvariant().Replace('ё', 'е');
        if (text.Contains("зачисл") || text.Contains("пополн") || text.Contains("стипенд")
            || text.Contains("зарплат") || text.Contains("возврат") || text.Contains("кэшбэк")
            || text.Contains("кешбэк") || text.Contains("на счет"))
        {
            return true;
        }

        if (text.Contains("списан") || text.Contains("покуп") || text.Contains("оплат"))
        {
            return false;
        }

        return null;
    }

    private static bool? ReadDirection(JsonElement element)
    {
        string? raw = ReadString(element, DirectionKeys);
        if (raw is null || raw.Length > 40)
        {
            return null;
        }

        string token = raw.Trim().ToLowerInvariant().Replace('ё', 'е');
        if (IncomeWords.Contains(token))
        {
            return true;
        }

        if (ExpenseWords.Contains(token))
        {
            return false;
        }

        return null;
    }

    private static string ReadMerchant(JsonElement element)
    {
        if (TryGet(element, MerchantKeys, out JsonElement value))
        {
            if (value.ValueKind == JsonValueKind.String)
            {
                return value.GetString() ?? "";
            }

            if (value.ValueKind == JsonValueKind.Object)
            {
                return ReadString(value, ["name", "title", "brand"]) ?? "";
            }
        }

        // У T-Bank название контрагента лежит во вложенном объекте. Берём только name:
        // счёт, ИНН, КПП и БИК из этого объекта не читаем.
        return ReadNestedName(element, "counterparty");
    }

    private static string ReadNestedName(JsonElement element, string objectKey)
    {
        if (!TryProperty(element, objectKey, out JsonElement party) || party.ValueKind != JsonValueKind.Object)
        {
            return "";
        }

        if (!TryProperty(party, "name", out JsonElement name) || name.ValueKind != JsonValueKind.String)
        {
            return "";
        }

        return name.GetString() ?? "";
    }

    private static bool TryReadAmount(JsonElement element, out decimal amount, out string? currency)
    {
        amount = 0;
        currency = null;
        if (!TryGet(element, AmountKeys, out JsonElement value))
        {
            return false;
        }

        return TryMoney(value, out amount, out currency);
    }

    private static bool TryMoney(JsonElement value, out decimal amount, out string? currency)
    {
        amount = 0;
        currency = null;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out amount))
        {
            return true;
        }

        if (value.ValueKind == JsonValueKind.String
            && decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out amount))
        {
            return true;
        }

        if (value.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        currency = ReadString(value, CurrencyKeys);
        foreach (string key in new[] { "value", "amount", "sum", "summ" })
        {
            if (TryGet(value, [key], out JsonElement nested) && TryMoney(nested, out amount, out string? nestedCurrency))
            {
                currency ??= nestedCurrency;
                return true;
            }
        }

        return false;
    }

    private static bool TryReadDate(JsonElement element, out DateTimeOffset date)
    {
        date = default;
        string? raw = ReadString(element, DateKeys);
        return raw is not null && DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out date);
    }

    private static decimal? ReadBalance(JsonElement element, int depth)
    {
        if (depth > 3 || element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (JsonProperty property in element.EnumerateObject())
        {
            string key = Norm(property.Name);
            if (key is "balance" or "outgoingbalance" or "availablebalance" or "closingbalance" or "currentbalance"
                && TryMoney(property.Value, out decimal amount, out _))
            {
                return amount;
            }
        }

        foreach (JsonProperty property in element.EnumerateObject())
        {
            if (Norm(property.Name) is "data" or "result" or "payload" or "statement" or "body")
            {
                decimal? nested = ReadBalance(property.Value, depth + 1);
                if (nested is not null)
                {
                    return nested;
                }
            }
        }

        return null;
    }

    private static string? ReadString(JsonElement element, string[] keys)
    {
        if (!TryGet(element, keys, out JsonElement value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        string? text = value.GetString()?.Trim();
        return string.IsNullOrEmpty(text) ? null : text;
    }

    /// <summary>Ищет поля в заданном порядке, а не в порядке JSON. Запрещённые ключи пропускает.</summary>
    private static bool TryGet(JsonElement element, string[] keys, out JsonElement value)
    {
        foreach (string wanted in keys)
        {
            if (TryProperty(element, wanted, out value) && !IsForbidden(wanted))
            {
                return true;
            }
        }

        value = default;
        return false;
    }

    private static bool TryProperty(JsonElement element, string normalizedName, out JsonElement value)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            value = default;
            return false;
        }

        foreach (JsonProperty property in element.EnumerateObject())
        {
            if (Norm(property.Name) == normalizedName)
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private static string SafeId(string? raw, DateTimeOffset date, decimal amount, string currency, string merchant, string category, string description)
    {
        if (raw is not null && Guid.TryParse(raw, out Guid id))
        {
            return id.ToString();
        }

        if (raw is not null && SafeToken().IsMatch(raw) && !LongDigits().IsMatch(raw))
        {
            return raw;
        }

        string material = $"{date:O}|{amount.ToString(CultureInfo.InvariantCulture)}|{currency}|{merchant}|{category}|{description}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material))).ToLowerInvariant()[..32];
    }

    internal static string Sanitize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return "";
        }

        string value = text;
        value = Email().Replace(value, " ");
        value = Phone().Replace(value, " ");
        value = CardOrAccount().Replace(value, " ");
        value = LabeledId().Replace(value, " ");
        value = PersonName().Replace(value, " ");
        value = Whitespace().Replace(value, " ").Trim();
        return value.Length <= 200 ? value : value[..200].Trim();
    }

    private static string NormalizeCurrency(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            return "RUB";
        }

        string code = currency.Trim().ToUpperInvariant();
        return code is "RUB" or "RUR" or "643" ? "RUB" : code.Length == 3 && code.All(char.IsLetter) ? code : "RUB";
    }

    private static bool IsForbidden(string raw)
    {
        string key = Norm(raw);
        // accountAmount — сумма, а не номер счёта.
        if (key.EndsWith("amount", StringComparison.Ordinal))
        {
            return false;
        }

        if (ForbiddenKeys.Contains(key))
        {
            return true;
        }

        string[] parts = ["account", "payer", "payee", "recipient", "sender", "counterparty", "card", "passport", "phone", "email", "fullname", "cardholder", "customer", "owner"];
        foreach (string part in parts)
        {
            if (key.Contains(part, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static string Norm(string key) => key.Replace("_", "").Replace("-", "").ToLowerInvariant();

    [GeneratedRegex(@"^[A-Za-z0-9_-]{8,64}$", RegexOptions.CultureInvariant)]
    private static partial Regex SafeToken();

    [GeneratedRegex(@"\d{12,}", RegexOptions.CultureInvariant)]
    private static partial Regex LongDigits();

    [GeneratedRegex(@"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex Email();

    [GeneratedRegex(@"(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}", RegexOptions.CultureInvariant)]
    private static partial Regex Phone();

    [GeneratedRegex(@"(?:\d[ \-]?){13,20}", RegexOptions.CultureInvariant)]
    private static partial Regex CardOrAccount();

    [GeneratedRegex(@"(?i)\b(?:инн|кпп|бик|bik|inn|kpp)\b\s*\d{9,12}")]
    private static partial Regex LabeledId();

    [GeneratedRegex(@"\b[А-ЯЁ][а-яё]{1,}(?:\s+[А-ЯЁ][а-яё]{1,}){2}\b")]
    private static partial Regex PersonName();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
