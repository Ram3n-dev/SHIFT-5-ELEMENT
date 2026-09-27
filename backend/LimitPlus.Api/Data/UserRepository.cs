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
<<<<<<< HEAD
        id, email, login, name, is_demo, is_admin, last_seen_at, pd_consent_at, onboarded_at, region_code, city,
        stipend_amount, stipend_day, stipend_confirmed_on, mandatory_monthly, mandatory_left, reserve,
        limit_period_days, theme, notifications_enabled
=======
        id, email, name, is_demo, pd_consent_at, onboarded_at, region_code, city, stipend_amount, stipend_day,
        stipend_confirmed_on, mandatory_monthly, mandatory_left, reserve, limit_period_days, theme, notifications_enabled
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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

<<<<<<< HEAD
    /// <summary>Находит пользователя по Google-аккаунту или создаёт нового. Если почта уже есть — привязывает Google к этому аккаунту.</summary>
    public async Task<Guid> UpsertGoogleUserAsync(string googleSub, string email, string name)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        try
        {
            return await connection.ExecuteScalarAsync<Guid>(
                """
                INSERT INTO users (id, google_sub, email, name)
                VALUES (@Id, @GoogleSub, @Email, @Name)
                ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
                RETURNING id
                """,
                new { Id = Guid.NewGuid(), GoogleSub = googleSub, Email = email, Name = name });
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            Guid? existing = await connection.ExecuteScalarAsync<Guid?>(
                """
                UPDATE users
                SET google_sub = COALESCE(google_sub, @GoogleSub)
                WHERE lower(email) = lower(@Email)
                RETURNING id
                """,
                new { GoogleSub = googleSub, Email = email });
            if (existing is Guid id)
            {
                return id;
            }

            throw;
        }
    }

    /// <summary>Регистрация по логину, почте и хешу пароля. false — логин или почта уже заняты.</summary>
    public async Task<Guid?> RegisterAsync(string login, string email, string name, string passwordHash, bool isAdmin)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        try
        {
            return await connection.ExecuteScalarAsync<Guid>(
                """
                INSERT INTO users (id, login, email, name, password_hash, is_admin)
                VALUES (@Id, @Login, @Email, @Name, @PasswordHash, @IsAdmin)
                RETURNING id
                """,
                new
                {
                    Id = Guid.NewGuid(),
                    Login = login,
                    Email = email,
                    Name = name,
                    PasswordHash = passwordHash,
                    IsAdmin = isAdmin,
                });
        }
        catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return null;
        }
    }

    public async Task<bool> LoginTakenAsync(string login)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE lower(login) = lower(@Login))", new { Login = login });
    }

    public async Task<bool> EmailTakenAsync(string email)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = lower(@Email))", new { Email = email });
    }

    public async Task<bool> AnyAdminAsync()
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<bool>("SELECT EXISTS(SELECT 1 FROM users WHERE is_admin)");
    }

    public async Task PromoteAdminAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync("UPDATE users SET is_admin = true WHERE id = @UserId", new { UserId = userId });
    }

    public async Task<CredentialRow?> FindByLoginOrEmailAsync(string loginOrEmail)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<CredentialRow>(
            """
            SELECT id, name, password_hash
            FROM users
            WHERE lower(login) = lower(@Value) OR lower(email) = lower(@Value)
            ORDER BY CASE WHEN lower(login) = lower(@Value) THEN 0 ELSE 1 END
            LIMIT 1
            """,
            new { Value = loginOrEmail });
    }

    public async Task TouchLastSeenAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync("UPDATE users SET last_seen_at = now() WHERE id = @UserId", new { UserId = userId });
    }

    public async Task<int> CountAsync()
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.ExecuteScalarAsync<int>("SELECT count(*)::int FROM users");
    }

    public async Task<List<AdminUserRow>> ListForAdminAsync()
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<AdminUserRow> rows = await connection.QueryAsync<AdminUserRow>(
            """
            SELECT COALESCE(NULLIF(name, ''), NULLIF(login, ''), 'Гость') AS nickname, last_seen_at
            FROM users
            ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
            """);
        return rows.ToList();
=======
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
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
