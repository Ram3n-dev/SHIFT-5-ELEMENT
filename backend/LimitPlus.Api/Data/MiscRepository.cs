using Dapper;
using Npgsql;

namespace LimitPlus.Api.Data;

/// <summary>Согласия, анонимная статистика, журнал напоминаний и цены регионов.</summary>
public class MiscRepository
{
    private readonly NpgsqlDataSource _db;

    public MiscRepository(NpgsqlDataSource db)
    {
        _db = db;
    }

    public async Task AddConsentAsync(Guid? userId, string kind, string value, string version)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            "INSERT INTO consents (user_id, kind, value, version) VALUES (@UserId, @Kind, @Value, @Version)",
            new { UserId = userId, Kind = kind, Value = value, Version = version });
    }

    /// <summary>Анонимное событие: только название экрана, без пользователя.</summary>
    public async Task AddEventAsync(string name)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync("INSERT INTO analytics_events (name) VALUES (@Name)", new { Name = name });
    }

    public async Task<List<RegionalPriceRow>> GetRegionalPricesAsync()
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<RegionalPriceRow> rows = await connection.QueryAsync<RegionalPriceRow>(
            "SELECT region_code, region_name, food_basket_month, period, source FROM regional_prices");
        return rows.ToList();
    }

    // ---------- Напоминания ----------

    public async Task<HashSet<string>> GetSentKeysAsync(Guid userId, IReadOnlyList<string> keys)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<string> rows = await connection.QueryAsync<string>(
            "SELECT key FROM notification_log WHERE user_id = @UserId AND key = ANY(@Keys)",
            new { UserId = userId, Keys = keys.ToArray() });
        return rows.ToHashSet();
    }

    public async Task<int> CountSentOnAsync(Guid userId, DateOnly date)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<int>(
            "SELECT count(*)::int FROM notification_log WHERE user_id = @UserId AND sent_on = @Date",
            new { UserId = userId, Date = date });
    }

<<<<<<< HEAD
    public const string LlmPromptKey = "llm_system_prompt";

    public async Task<string?> GetSettingAsync(string key)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<string?>(
            "SELECT value FROM app_settings WHERE key = @Key", new { Key = key });
    }

    public async Task SetSettingAsync(string key, string value)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO app_settings (key, value)
            VALUES (@Key, @Value)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """,
            new { Key = key, Value = value });
    }

    public async Task DeleteSettingAsync(string key)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync("DELETE FROM app_settings WHERE key = @Key", new { Key = key });
    }

    public async Task AddFeedbackAsync(Guid userId, int rating, string text)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            "INSERT INTO feedback (user_id, rating, text) VALUES (@UserId, @Rating, @Text)",
            new { UserId = userId, Rating = rating, Text = text });
    }

=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    public async Task MarkSentAsync(Guid userId, string key, DateOnly date)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            INSERT INTO notification_log (user_id, key, sent_on)
            VALUES (@UserId, @Key, @Date)
            ON CONFLICT (user_id, key) DO NOTHING
            """,
            new { UserId = userId, Key = key, Date = date });
    }
}
