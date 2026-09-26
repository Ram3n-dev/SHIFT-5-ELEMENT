using Dapper;
using Npgsql;

namespace LimitPlus.Api.Data;

/// <summary>Варианты кэшбэка по месяцам и партнёрские предложения.</summary>
public class CashbackRepository
{
    private readonly NpgsqlDataSource _db;

    public CashbackRepository(NpgsqlDataSource db)
    {
        _db = db;
    }

    /// <summary>Варианты кэшбэка за месяц. month — первое число месяца.</summary>
    public async Task<List<CashbackOptionRow>> GetOptionsAsync(Guid userId, DateOnly month)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<CashbackOptionRow> rows = await connection.QueryAsync<CashbackOptionRow>(
            """
            SELECT id, month, name, percent, category, chosen
            FROM cashback_options
            WHERE user_id = @UserId AND month = @Month
            ORDER BY percent DESC, name
            """,
            new { UserId = userId, Month = month });
        return rows.ToList();
    }

    /// <summary>Все варианты начиная с месяца <paramref name="fromMonth"/> — для итогов «за всё время».</summary>
    public async Task<List<CashbackOptionRow>> GetOptionsSinceAsync(Guid userId, DateOnly fromMonth)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<CashbackOptionRow> rows = await connection.QueryAsync<CashbackOptionRow>(
            """
            SELECT id, month, name, percent, category, chosen
            FROM cashback_options
            WHERE user_id = @UserId AND month >= @FromMonth
            ORDER BY month, percent DESC
            """,
            new { UserId = userId, FromMonth = fromMonth });
        return rows.ToList();
    }

    /// <summary>Заменяет варианты месяца новыми (после скриншота или ручного ввода). Выбор сбрасывается.</summary>
    public async Task ReplaceOptionsAsync(Guid userId, DateOnly month, IReadOnlyList<CashbackOptionRow> options)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync();

        await connection.ExecuteAsync(
            "DELETE FROM cashback_options WHERE user_id = @UserId AND month = @Month",
            new { UserId = userId, Month = month },
            transaction);

        foreach (CashbackOptionRow option in options)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO cashback_options (id, user_id, month, name, percent, category, chosen)
                VALUES (@Id, @UserId, @Month, @Name, @Percent, @Category, false)
                """,
                new { option.Id, UserId = userId, Month = month, option.Name, option.Percent, option.Category },
                transaction);
        }

        await transaction.CommitAsync();
    }

    /// <summary>Отмечает выбранные варианты месяца, остальные снимает.</summary>
    public async Task ChooseAsync(Guid userId, DateOnly month, IReadOnlyList<Guid> optionIds)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            UPDATE cashback_options
            SET chosen = (id = ANY(@Ids))
            WHERE user_id = @UserId AND month = @Month
            """,
            new { UserId = userId, Month = month, Ids = optionIds.ToArray() });
    }

    // ---------- Партнёрские предложения ----------

    public async Task<List<PartnerOfferRow>> GetOffersAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<PartnerOfferRow> rows = await connection.QueryAsync<PartnerOfferRow>(
            """
            SELECT id, merchant, percent, category, valid_until
            FROM partner_offers
            WHERE user_id = @UserId
            ORDER BY valid_until NULLS LAST, merchant
            """,
            new { UserId = userId });
        return rows.ToList();
    }

    public async Task AddOfferAsync(Guid userId, PartnerOfferRow offer)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO partner_offers (id, user_id, merchant, percent, category, valid_until)
            VALUES (@Id, @UserId, @Merchant, @Percent, @Category, @ValidUntil)
            """,
            new { offer.Id, UserId = userId, offer.Merchant, offer.Percent, offer.Category, offer.ValidUntil });
    }

    public async Task<bool> DeleteOfferAsync(Guid userId, Guid offerId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        int changed = await connection.ExecuteAsync(
            "DELETE FROM partner_offers WHERE id = @Id AND user_id = @UserId", new { Id = offerId, UserId = userId });
        return changed > 0;
    }
}
