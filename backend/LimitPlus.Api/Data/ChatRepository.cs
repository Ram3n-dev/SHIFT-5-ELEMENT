using Dapper;
using Npgsql;

namespace LimitPlus.Api.Data;

/// <summary>История чата с Енотом.</summary>
public class ChatRepository
{
    private readonly NpgsqlDataSource _db;

    public ChatRepository(NpgsqlDataSource db)
    {
        _db = db;
    }

    /// <summary>Последние сообщения в порядке от старых к новым.</summary>
    public async Task<List<ChatMessageRow>> GetRecentAsync(Guid userId, int limit)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        IEnumerable<ChatMessageRow> rows = await connection.QueryAsync<ChatMessageRow>(
            """
            SELECT id, role, text, source, created_at
            FROM (
                SELECT id, role, text, source, created_at
                FROM chat_messages
                WHERE user_id = @UserId
                ORDER BY id DESC
                LIMIT @Limit
            ) recent
            ORDER BY id
            """,
            new { UserId = userId, Limit = limit });
        return rows.ToList();
    }

    public async Task<ChatMessageRow> AddAsync(Guid userId, string role, string text, string? source)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        return await connection.QuerySingleAsync<ChatMessageRow>(
            """
            INSERT INTO chat_messages (user_id, role, text, source)
            VALUES (@UserId, @Role, @Text, @Source)
            RETURNING id, role, text, source, created_at
            """,
            new { UserId = userId, Role = role, Text = text, Source = source });
    }

    public async Task ClearAsync(Guid userId)
    {
        await using NpgsqlConnection connection = await _db.OpenConnectionAsync();
        await connection.ExecuteAsync("DELETE FROM chat_messages WHERE user_id = @UserId", new { UserId = userId });
    }
}
