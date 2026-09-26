using Dapper;
using Npgsql;

namespace LimitPlus.Api.Data;

/// <summary>Данные онбординга: всё, что пользователь ответил на вопросы при первом входе.</summary>
public record OnboardingData(
    string? City,
    string? RegionCode,
    decimal StipendAmount,
    int StipendDay,
    DateOnly StipendConfirmedOn,
    decimal Card,
    decimal Cash,
    decimal Savings,
    decimal MandatoryMonthly,
    decimal Reserve,
    int LimitPeriodDays);

/// <summary>Пользователи и их настройки бюджета.</summary>
public class UserRepository
{
    private const string UserColumns =
        """
        id, email, name, is_demo, pd_consent_at, onboarded_at, region_code, city, stipend_amount, stipend_day,
        stipend_confirmed_on, mandatory_monthly, mandatory_left, reserve, limit_period_days, theme, notifications_enabled
        """;

    private readonly NpgsqlDataSource _db;

    public UserRepository(NpgsqlDataSource db)
    {
        _db = db;
    }

    public async Task<UserRow?> GetAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<UserRow>(
            $"SELECT {UserColumns} FROM users WHERE id = @UserId", new { UserId = userId });
    }

    /// <summary>Находит пользователя по Google-аккаунту или создаёт нового. Возвращает id.</summary>
    public async Task<Guid> UpsertGoogleUserAsync(string googleSub, string email, string name)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<Guid>(
            """
            INSERT INTO users (id, google_sub, email, name)
            VALUES (@Id, @GoogleSub, @Email, @Name)
            ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
            RETURNING id
            """,
            new { Id = Guid.NewGuid(), GoogleSub = googleSub, Email = email, Name = name });
    }

    public async Task<Guid> CreateDemoUserAsync()
    {
        Guid id = Guid.NewGuid();
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        // Заодно убираем демо-профили старше недели (то же делается при запуске сервера).
        await connection.ExecuteAsync("DELETE FROM users WHERE is_demo AND created_at < now() - interval '7 days'");
        await connection.ExecuteAsync(
            "INSERT INTO users (id, name, is_demo) VALUES (@Id, 'Гость', true)", new { Id = id });
        return id;
    }

    /// <summary>
    /// Сохраняет ответы онбординга одной транзакцией: настройки, согласие на обработку данных и счета.
    /// Повторный онбординг заменяет счета.
    /// </summary>
    public async Task CompleteOnboardingAsync(Guid userId, OnboardingData data)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync();

        await connection.ExecuteAsync(
            """
            UPDATE users
            SET city = @City, region_code = @RegionCode, stipend_amount = @StipendAmount, stipend_day = @StipendDay,
                stipend_confirmed_on = @StipendConfirmedOn, mandatory_monthly = @MandatoryMonthly,
                mandatory_left = @MandatoryMonthly, reserve = @Reserve, limit_period_days = @LimitPeriodDays,
                pd_consent_at = COALESCE(pd_consent_at, now()), onboarded_at = now()
            WHERE id = @UserId
            """,
            new
            {
                UserId = userId,
                data.City,
                data.RegionCode,
                data.StipendAmount,
                data.StipendDay,
                data.StipendConfirmedOn,
                data.MandatoryMonthly,
                data.Reserve,
                data.LimitPeriodDays,
            },
            transaction);

        await connection.ExecuteAsync(
            "INSERT INTO consents (user_id, kind, value, version) VALUES (@UserId, 'personal_data', 'granted', 'v1')",
            new { UserId = userId },
            transaction);

        await connection.ExecuteAsync("DELETE FROM accounts WHERE user_id = @UserId", new { UserId = userId }, transaction);

        var accounts = new[]
        {
            new { Name = "Карта", Type = "card", Balance = data.Card, Include = true },
            new { Name = "Наличные", Type = "cash", Balance = data.Cash, Include = true },
            new { Name = "Накопления", Type = "savings", Balance = data.Savings, Include = false },
        };

        foreach (var account in accounts)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO accounts (id, user_id, name, type, balance, include_in_spending)
                VALUES (@Id, @UserId, @Name, @Type, @Balance, @Include)
                """,
                new { Id = Guid.NewGuid(), UserId = userId, account.Name, account.Type, account.Balance, account.Include },
                transaction);
        }

        await transaction.CommitAsync();
    }

    public async Task UpdateSettingsAsync(Guid userId, UserRow settings)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            UPDATE users
            SET city = @City, region_code = @RegionCode, stipend_amount = @StipendAmount, stipend_day = @StipendDay,
                mandatory_monthly = @MandatoryMonthly, mandatory_left = @MandatoryLeft, reserve = @Reserve,
                limit_period_days = @LimitPeriodDays, theme = @Theme, notifications_enabled = @NotificationsEnabled
            WHERE id = @UserId
            """,
            new
            {
                UserId = userId,
                settings.City,
                settings.RegionCode,
                settings.StipendAmount,
                settings.StipendDay,
                settings.MandatoryMonthly,
                settings.MandatoryLeft,
                settings.Reserve,
                settings.LimitPeriodDays,
                settings.Theme,
                settings.NotificationsEnabled,
            });
    }

    /// <summary>Стипендия пришла: новый период, обязательные траты снова на полный месяц.</summary>
    public async Task ConfirmStipendAsync(Guid userId, DateOnly stipendDate)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync(
            """
            UPDATE users
            SET stipend_confirmed_on = @StipendDate, mandatory_left = mandatory_monthly
            WHERE id = @UserId
            """,
            new { UserId = userId, StipendDate = stipendDate });
    }

    /// <summary>Удаляет пользователя и все его данные (каскадом по внешним ключам).</summary>
    public async Task DeleteAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync("DELETE FROM users WHERE id = @UserId", new { UserId = userId });
    }
}
