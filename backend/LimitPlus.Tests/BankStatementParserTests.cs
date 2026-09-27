using System.Text.Json;
using LimitPlus.Api.Data;
using LimitPlus.Api.Logic;
using LimitPlus.Api.Services;
using Xunit;

namespace LimitPlus.Tests;

public class BankRequestDiagnosticsTests
{
    [Fact]
    public void Describe_IncludesInnerException_AndHidesAccountNumber()
    {
        var inner = new System.Security.Authentication.AuthenticationException(
            "The remote certificate is invalid according to the validation procedure.");
        var outer = new HttpRequestException(
            "The SSL connection could not be established, see inner exception. https://business.tbank.ru/openapi/sandbox/api/v1/statement?accountNumber=40702810110011000430",
            inner);

        string text = BankRequestDiagnostics.Describe(outer);

        Assert.Contains("HttpRequestException", text);
        Assert.Contains("AuthenticationException", text);
        Assert.Contains("remote certificate is invalid", text);
        Assert.DoesNotContain("40702810110011000430", text);
        Assert.DoesNotContain("accountNumber", text);
    }
}

public class BankStatementParserTests
{
    private const string Statement = """
        {
          "accountNumber": "40702810110011000430",
          "balance": 150000.25,
          "owner": "Иванов Иван Иванович",
          "inn": "7707083893",
          "kpp": "770701001",
          "bik": "044525974",
          "operations": [
            {
              "id": "64be58f9-c7fc-0027-96ba-763ec56a2317",
              "date": "2022-02-02T20:07:04Z",
              "amount": 484.5,
              "currency": "RUB",
              "merchant": "Tinkoff.cc_trans",
              "category": "Переводы",
              "description": "Перевод собственных средств на счет",
              "payerName": "Иванов Иван Иванович",
              "payerInn": "7707083893",
              "payerAccount": "40702810110011000430",
              "payerBik": "044525974",
              "payerKpp": "770701001",
              "cardNumber": "5536913812345678",
              "phone": "+79991234567",
              "email": "ivan@example.com"
            }
          ]
        }
        """;

    [Fact]
    public void Parse_KeepsOnlySafeOperationFields()
    {
        SafeBankStatement statement = BankStatementParser.Parse(Statement);

        Assert.Equal(150000.25m, statement.Balance);
        SafeOperation operation = Assert.Single(statement.Operations);
        Assert.Equal("64be58f9-c7fc-0027-96ba-763ec56a2317", operation.Id);
        Assert.Equal(new DateTime(2022, 2, 2, 20, 7, 4, DateTimeKind.Utc), operation.Date);
        Assert.Equal(484.5m, operation.Amount);
        Assert.Equal("RUB", operation.Currency);
        Assert.Equal("Tinkoff.cc_trans", operation.Merchant);
        Assert.Equal("Переводы", operation.Category);
        Assert.Equal("Перевод собственных средств на счет", operation.Description);
    }

    [Fact]
    public void Parse_DropsPersonalData()
    {
        SafeBankStatement statement = BankStatementParser.Parse(Statement);
        string dumped = JsonSerializer.Serialize(statement);

        Assert.DoesNotContain("40702810110011000430", dumped);
        Assert.DoesNotContain("7707083893", dumped);
        Assert.DoesNotContain("770701001", dumped);
        Assert.DoesNotContain("044525974", dumped);
        Assert.DoesNotContain("5536913812345678", dumped);
        Assert.DoesNotContain("79991234567", dumped);
        Assert.DoesNotContain("ivan@example.com", dumped);
        Assert.DoesNotContain("Иванов", dumped);
    }

    [Fact]
    public void Parse_ReadsNestedAmount_AndRedactsCardInDescription()
    {
        const string json = """
            {
              "transactions": [
                {
                  "operationId": "op-10001",
                  "operationDate": "2024-05-01T10:00:00Z",
                  "amount": { "value": -120.5, "currency": "RUB" },
                  "merchantName": "Пятёрочка",
                  "categoryName": "Супермаркеты",
                  "paymentPurpose": "Оплата картой 5536 9138 1234 5678"
                }
              ]
            }
            """;

        SafeOperation operation = Assert.Single(BankStatementParser.Parse(json).Operations);

        Assert.Equal(120.5m, operation.Amount);
        Assert.Equal("Пятёрочка", operation.Merchant);
        Assert.Equal("Супермаркеты", operation.Category);
        Assert.False(operation.Incoming);
        Assert.DoesNotContain("5536", operation.Description);
        Assert.DoesNotContain("5678", operation.Description);
    }

    [Fact]
    public void Parse_TBankStatement_KeepsMerchantName_AndDropsCounterpartyDetails()
    {
        const string json = """
            {
              "balances": { "balanceEnd": 1000, "operationsCount": 1 },
              "nextCursor": "cursor-should-not-be-stored",
              "operations": [
                {
                  "operationId": "64be58f9-c7fc-0027-96ba-763ec56a2317",
                  "operationDate": "2022-02-02T20:07:04Z",
                  "operationStatus": "Transaction",
                  "accountNumber": "40702810110011000430",
                  "bic": "044525974",
                  "typeOfOperation": "Credit",
                  "category": "Переводы",
                  "documentNumber": "123456",
                  "payPurpose": "Перевод собственных средств на счет",
                  "rubleAmount": 484.5,
                  "accountAmount": 484.5,
                  "counterParty": {
                    "account": "40817810099910004312",
                    "inn": "7707083893",
                    "kpp": "770701001",
                    "name": "Tinkoff.cc_trans",
                    "bankName": "АО ТБанк",
                    "bankBic": "044525974",
                    "corrAccount": "30101810145250000974"
                  },
                  "payer": {
                    "name": "Иванов Иван Иванович",
                    "inn": "500100732259",
                    "account": "40817810100000000001"
                  },
                  "cardNumber": "5536913812345678"
                }
              ]
            }
            """;

        SafeOperation operation = Assert.Single(BankStatementParser.Parse(json).Operations);
        string dumped = System.Text.Json.JsonSerializer.Serialize(operation);

        Assert.Equal("64be58f9-c7fc-0027-96ba-763ec56a2317", operation.Id);
        Assert.Equal(new DateTime(2022, 2, 2, 20, 7, 4, DateTimeKind.Utc), operation.Date);
        Assert.Equal(484.5m, operation.Amount);
        Assert.Equal("RUB", operation.Currency);
        Assert.Equal("Tinkoff.cc_trans", operation.Merchant);
        Assert.Equal("Переводы", operation.Category);
        Assert.Equal("Перевод собственных средств на счет", operation.Description);
        Assert.True(operation.Incoming);

        Assert.DoesNotContain("40702810110011000430", dumped);
        Assert.DoesNotContain("40817810099910004312", dumped);
        Assert.DoesNotContain("30101810145250000974", dumped);
        Assert.DoesNotContain("7707083893", dumped);
        Assert.DoesNotContain("770701001", dumped);
        Assert.DoesNotContain("044525974", dumped);
        Assert.DoesNotContain("5536913812345678", dumped);
        Assert.DoesNotContain("500100732259", dumped);
        Assert.DoesNotContain("Иванов", dumped);
        Assert.DoesNotContain("cursor-should-not-be-stored", dumped);
        Assert.DoesNotContain("123456", dumped);
    }

    [Fact]
    public void Map_TurnsTransferIntoIncome_AndStoreIntoExpense()
    {
        SafeBankStatement statement = BankStatementParser.Parse(Statement);
        AppOperationDraft? transfer = BankOperationMapper.Map(statement.Operations[0], new DateOnly(2026, 9, 27));

        Assert.NotNull(transfer);
        Assert.Equal("income", transfer!.Type);
        Assert.Equal("Перевод", transfer.Category);
        Assert.Equal("Перевод", transfer.Description);
        Assert.DoesNotContain("Tinkoff", transfer.Description);
        Assert.Equal(new DateOnly(2022, 2, 2), transfer.Date);

        var purchase = new SafeOperation("1", new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc), 120.5m, "RUB", "Пятёрочка", "Супермаркеты", "Покупка", false);
        AppOperationDraft? expense = BankOperationMapper.Map(purchase, new DateOnly(2026, 9, 27));
        Assert.Equal("expense", expense!.Type);
        Assert.Equal("Продукты", expense.Category);
        Assert.Equal("Продукты", expense.Description);
    }

    [Fact]
    public void Map_TaxOfficePayment_BecomesTaxes()
    {
        var payment = new SafeOperation(
            "1",
            new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            176.54m,
            "RUB",
            "Межрайонная ИФНС России № 17 по Воронежской области",
            "fee",
            "Оплата услуг по договору 17369058. НДС не облагается",
            true);

        AppOperationDraft? draft = BankOperationMapper.Map(payment, new DateOnly(2026, 9, 27));

        Assert.NotNull(draft);
        Assert.Equal("expense", draft!.Type);
        Assert.Equal("Налоги", draft.Category);
        Assert.Equal("Налоги", draft.Description);
        Assert.DoesNotContain("ИФНС", draft.Description);
        Assert.DoesNotContain("17369058", draft.Description);
        Assert.Equal(176.54m, draft.Amount);
    }

    [Fact]
    public void RedactStored_ReplacesSavedTaxOfficeTextWithCategory()
    {
        var row = new OperationRow
        {
            AffectsBalance = false,
            Type = "income",
            Category = "Перевод",
            Description = "Межрайонная ИФНС России № 17 по Воронежской области: Оплата услуг по договору...",
        };

        Assert.True(BankOperationMapper.RedactStored(row));
        Assert.Equal("expense", row.Type);
        Assert.Equal("Налоги", row.Category);
        Assert.Equal("Налоги", row.Description);
        Assert.False(BankOperationMapper.RedactStored(row));
    }

    [Fact]
    public void Parse_KeepsMcc_WithoutReplacingMerchantOrDescription()
    {
        const string json = """
            {
              "operations": [
                {
                  "operationId": "fuel-1",
                  "operationDate": "2026-09-27T12:00:00Z",
                  "typeOfOperation": "Debit",
                  "rubleAmount": 3500,
                  "mcc": 5541,
                  "merchant": "АЗС №123",
                  "description": "Оплата топлива",
                  "category": "Прочее"
                }
              ]
            }
            """;

        SafeOperation operation = Assert.Single(BankStatementParser.Parse(json).Operations);

        Assert.Equal("5541", operation.Mcc);
        Assert.Equal("АЗС №123", operation.Merchant);
        Assert.Equal("Оплата топлива", operation.Description);
        Assert.Equal("Прочее", operation.Category);
        Assert.False(operation.Incoming);
    }

    [Fact]
    public void Map_UsesMccCatalog_ForExpense_AndLeavesTransferAlone()
    {
        var fuel = new SafeOperation(
            "fuel-1",
            new DateTime(2026, 9, 27, 0, 0, 0, DateTimeKind.Utc),
            3500m,
            "RUB",
            "АЗС №123",
            "Прочее",
            "Оплата топлива",
            false,
            "5541");

        AppOperationDraft? expense = BankOperationMapper.Map(fuel, new DateOnly(2026, 9, 27));
        Assert.Equal("expense", expense!.Type);
        Assert.Equal("gas_station", expense.Category);
        Assert.Equal("5541", fuel.Mcc);
        Assert.Equal("АЗС №123", fuel.Merchant);
        Assert.Equal("Оплата топлива", fuel.Description);

        var unknown = fuel with { Mcc = "9999", Merchant = "Пятёрочка" };
        AppOperationDraft? uncategorized = BankOperationMapper.Map(unknown, new DateOnly(2026, 9, 27));
        Assert.Equal(MccCategoryCatalog.Uncategorized, uncategorized!.Category);

        var transfer = fuel with { Incoming = true, Mcc = "5411", Category = "Переводы", Description = "Перевод собственных средств на счет" };
        AppOperationDraft? income = BankOperationMapper.Map(transfer, new DateOnly(2026, 9, 27));
        Assert.Equal("income", income!.Type);
        Assert.Equal("Перевод", income.Category);
    }

    [Theory]
    [InlineData("5411", "supermarket")]
    [InlineData("5541", "gas_station")]
    [InlineData("5812", "restaurant")]
    [InlineData("5912", "pharmacy")]
    [InlineData("0000", "uncategorized")]
    public void MccCatalog_MapsKnownCodes_AndDoesNotInventTheRest(string mcc, string category)
    {
        Assert.Equal(category, MccCategoryCatalog.CategoryOrUncategorized(mcc));
    }
}
