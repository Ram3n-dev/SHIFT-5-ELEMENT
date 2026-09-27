using Dapper;
using LimitPlus.Api.Logic;
using Npgsql;

namespace LimitPlus.Api.Data;

/// <summary>
/// Счета, операции, регулярные траты и снимки дневного лимита.
/// Операция сразу меняет баланс счёта — в одной транзакции, чтобы данные не разошлись.
/// </summary>
public class MoneyRepository
{
    private const string OperationColumns =
        """
        o.id, o.account_id, o.type, o.amount, o.category, o.description, o.date, o.is_mandatory, o.is_recurring, o.affects_balance,
        a.name AS account_name, a.type AS account_type, a.include_in_spending AS in_spending
        """;

    private readonly NpgsqlDataSource _db;

    public MoneyRepository(NpgsqlDataSource db)
    {
        _db = db;
    }

    // ---------- Счета ----------

    public async Task<List<AccountRow>> GetAccountsAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<AccountRow> rows = await connection.QueryAsync<AccountRow>(
            """
            SELECT id, name, type, balance, include_in_spending
            FROM accounts
            WHERE user_id = @UserId
            ORDER BY created_at, name
            """,
            new { UserId = userId });
        return rows.ToList();
    }

    public async Task CreateAccountAsync(Guid userId, AccountRow account)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO accounts (id, user_id, name, type, balance, include_in_spending)
            VALUES (@Id, @UserId, @Name, @Type, @Balance, @IncludeInSpending)
            """,
            new { account.Id, UserId = userId, account.Name, account.Type, account.Balance, account.IncludeInSpending });
    }

    /// <summary>Возвращает false, если такого счёта у пользователя нет.</summary>
    public async Task<bool> UpdateAccountAsync(Guid userId, AccountRow account)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        int changed = await connection.ExecuteAsync(
            """
            UPDATE accounts
            SET name = @Name, type = @Type, balance = @Balance, include_in_spending = @IncludeInSpending
            WHERE id = @Id AND user_id = @UserId
            """,
            new { account.Id, UserId = userId, account.Name, account.Type, account.Balance, account.IncludeInSpending });
        return changed > 0;
    }

    public async Task<bool> DeleteAccountAsync(Guid userId, Guid accountId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        int changed = await connection.ExecuteAsync(
            "DELETE FROM accounts WHERE id = @Id AND user_id = @UserId", new { Id = accountId, UserId = userId });
        return changed > 0;
    }

    // ---------- Операции ----------

    public async Task<List<OperationRow>> GetOperationsAsync(Guid userId, DateOnly from, DateOnly to)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<OperationRow> rows = await connection.QueryAsync<OperationRow>(
            $"""
            SELECT {OperationColumns}
            FROM operations o
            LEFT JOIN accounts a ON a.id = o.account_id
            WHERE o.user_id = @UserId AND o.date BETWEEN @From AND @To
            ORDER BY o.date DESC, o.created_at DESC
            """,
            new { UserId = userId, From = from, To = to });
        List<OperationRow> list = rows.ToList();
        List<OperationRow> redacted = list.Where(BankOperationMapper.RedactStored).ToList();
        if (redacted.Count > 0)
        {
            await connection.ExecuteAsync(
                """
                UPDATE operations
                SET type = @Type, category = @Category, description = @Description
                WHERE id = @Id AND user_id = @UserId
                """,
                redacted.Select(row => new { row.Id, UserId = userId, row.Type, row.Category, row.Description }));
        }

        return list;
    }

    /// <summary>
    /// Добавляет операции и меняет балансы счетов. Обязательный расход уменьшает план обязательных трат.
    /// Операции из выписки с AffectsBalance = false баланс не меняют: он уже их учитывает.
    /// </summary>
    public async Task AddOperationsAsync(Guid userId, IReadOnlyList<OperationRow> operations)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync();

        foreach (OperationRow operation in operations)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO operations
                    (id, user_id, account_id, type, amount, category, description, date, is_mandatory, is_recurring, affects_balance)
                VALUES
                    (@Id, @UserId, @AccountId, @Type, @Amount, @Category, @Description, @Date, @IsMandatory, @IsRecurring, @AffectsBalance)
                """,
                new
                {
                    operation.Id,
                    UserId = userId,
                    operation.AccountId,
                    operation.Type,
                    operation.Amount,
                    operation.Category,
                    operation.Description,
                    operation.Date,
                    operation.IsMandatory,
                    operation.IsRecurring,
                    operation.AffectsBalance,
                },
                transaction);

            if (operation.AffectsBalance)
            {
                await ApplyToBalanceAsync(connection, transaction, userId, operation, sign: 1);
            }
        }

        await transaction.CommitAsync();
    }

    /// <summary>Удаляет операцию и возвращает её сумму на счёт (если она меняла баланс). false — операции нет.</summary>
    public async Task<bool> DeleteOperationAsync(Guid userId, Guid operationId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync();

        OperationRow? operation = await connection.QuerySingleOrDefaultAsync<OperationRow>(
            """
            DELETE FROM operations
            WHERE id = @Id AND user_id = @UserId
            RETURNING id, account_id, type, amount, category, description, date, is_mandatory, is_recurring, affects_balance
            """,
            new { Id = operationId, UserId = userId },
            transaction);

        if (operation is null)
        {
            return false;
        }

        if (operation.AffectsBalance)
        {
            await ApplyToBalanceAsync(connection, transaction, userId, operation, sign: -1);
        }

        await transaction.CommitAsync();
        return true;
    }

    /// <summary>
    /// sign = 1 — операцию добавили, sign = −1 — удалили.
    /// Расход уменьшает баланс, доход увеличивает. Обязательный расход уменьшает остаток плана обязательных трат.
    /// </summary>
    private static async Task ApplyToBalanceAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId, OperationRow operation, int sign)
    {
        decimal delta = (operation.Type == "income" ? operation.Amount : -operation.Amount) * sign;

        if (operation.AccountId is not null)
        {
            await connection.ExecuteAsync(
                "UPDATE accounts SET balance = balance + @Delta WHERE id = @AccountId AND user_id = @UserId",
                new { Delta = delta, operation.AccountId, UserId = userId },
                transaction);
        }

        if (operation.Type == "expense" && operation.IsMandatory)
        {
            await connection.ExecuteAsync(
                """
                UPDATE users
                SET mandatory_left = LEAST(mandatory_monthly, GREATEST(0, mandatory_left - @Amount))
                WHERE id = @UserId
                """,
                new { Amount = operation.Amount * sign, UserId = userId },
                transaction);
        }
    }

    // ---------- Регулярные траты ----------

    public async Task<List<RecurringRow>> GetRecurringAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<RecurringRow> rows = await connection.QueryAsync<RecurringRow>(
            """
            SELECT id, name, amount, category, next_date, enabled
            FROM recurring_expenses
            WHERE user_id = @UserId
            ORDER BY next_date, name
            """,
            new { UserId = userId });
        return rows.ToList();
    }

    public async Task CreateRecurringAsync(Guid userId, RecurringRow item)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO recurring_expenses (id, user_id, name, amount, category, next_date, enabled)
            VALUES (@Id, @UserId, @Name, @Amount, @Category, @NextDate, @Enabled)
            """,
            new { item.Id, UserId = userId, item.Name, item.Amount, item.Category, item.NextDate, item.Enabled });
    }

    /// <summary>Возвращает false, если такой регулярной траты у пользователя нет.</summary>
    public async Task<bool> UpdateRecurringAsync(Guid userId, RecurringRow item)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        int changed = await connection.ExecuteAsync(
            """
            UPDATE recurring_expenses
            SET name = @Name, amount = @Amount, category = @Category, next_date = @NextDate, enabled = @Enabled
            WHERE id = @Id AND user_id = @UserId
            """,
            new { item.Id, UserId = userId, item.Name, item.Amount, item.Category, item.NextDate, item.Enabled });
        return changed > 0;
    }

    public async Task<bool> DeleteRecurringAsync(Guid userId, Guid id)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        int changed = await connection.ExecuteAsync(
            "DELETE FROM recurring_expenses WHERE id = @Id AND user_id = @UserId", new { Id = id, UserId = userId });
        return changed > 0;
    }

    /// <summary>Регулярная трата оплачена: расход со счёта и перенос даты на месяц вперёд.</summary>
    public async Task<bool> MarkRecurringPaidAsync(Guid userId, Guid recurringId, Guid? accountId, DateOnly today)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync();

        RecurringRow? item = await connection.QuerySingleOrDefaultAsync<RecurringRow>(
            """
            UPDATE recurring_expenses
            SET next_date = (next_date + interval '1 month')::date
            WHERE id = @Id AND user_id = @UserId
            RETURNING id, name, amount, category, next_date, enabled
            """,
            new { Id = recurringId, UserId = userId },
            transaction);

        if (item is null)
        {
            return false;
        }

        if (item.Amount > 0)
        {
            var operation = new OperationRow
            {
                Id = Guid.NewGuid(),
                AccountId = accountId,
                Type = "expense",
                Amount = item.Amount,
                Category = item.Category,
                Description = item.Name,
                Date = today,
                IsRecurring = true,
            };

            await connection.ExecuteAsync(
                """
                INSERT INTO operations (id, user_id, account_id, type, amount, category, description, date, is_mandatory, is_recurring)
                VALUES (@Id, @UserId, @AccountId, 'expense', @Amount, @Category, @Description, @Date, false, true)
                """,
                new { operation.Id, UserId = userId, operation.AccountId, operation.Amount, operation.Category, operation.Description, operation.Date },
                transaction);

            await ApplyToBalanceAsync(connection, transaction, userId, operation, sign: 1);
        }

        await transaction.CommitAsync();
        return true;
    }

    // ---------- Снимки лимита для огонька ----------

    public async Task<List<SnapshotRow>> GetSnapshotsAsync(Guid userId, DateOnly from)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<SnapshotRow> rows = await connection.QueryAsync<SnapshotRow>(
            """
            SELECT date, day_limit, no_spend_confirmed
            FROM day_snapshots
            WHERE user_id = @UserId AND date >= @From
            ORDER BY date
            """,
            new { UserId = userId, From = from });
        return rows.ToList();
    }

    /// <summary>Запоминает лимит дня. Вызывается при каждом расчёте главной — сохраняется последнее значение.</summary>
    public async Task SaveSnapshotAsync(Guid userId, DateOnly date, decimal dayLimit)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO day_snapshots (user_id, date, day_limit)
            VALUES (@UserId, @Date, @DayLimit)
            ON CONFLICT (user_id, date) DO UPDATE SET day_limit = EXCLUDED.day_limit
            """,
            new { UserId = userId, Date = date, DayLimit = dayLimit });
    }

    /// <summary>«Сегодня без трат»: день отмечен, даже если записей нет.</summary>
    public async Task ConfirmNoSpendAsync(Guid userId, DateOnly date, decimal dayLimit)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO day_snapshots (user_id, date, day_limit, no_spend_confirmed)
            VALUES (@UserId, @Date, @DayLimit, true)
            ON CONFLICT (user_id, date) DO UPDATE SET no_spend_confirmed = true
            """,
            new { UserId = userId, Date = date, DayLimit = dayLimit });
    }
}
