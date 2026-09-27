<<<<<<< HEAD
-- Енотономика: схема базы данных PostgreSQL.
=======
-- Лимит+: схема базы данных PostgreSQL.
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
-- Выполняется при каждом запуске backend: IF NOT EXISTS не трогает уже созданные таблицы.
-- Удаление пользователя (ON DELETE CASCADE) стирает все его данные — так работает «Удалить мои данные».

CREATE TABLE IF NOT EXISTS users (
    id                    uuid PRIMARY KEY,
    google_sub            text UNIQUE,
    email                 text,
    name                  text NOT NULL DEFAULT '',
    is_demo               boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    pd_consent_at         timestamptz,
    onboarded_at          timestamptz,
    region_code           text,
    city                  text,
    stipend_amount        numeric(12, 2) NOT NULL DEFAULT 0,
    stipend_day           integer NOT NULL DEFAULT 25 CHECK (stipend_day BETWEEN 1 AND 31),
    stipend_confirmed_on  date,
    mandatory_monthly     numeric(12, 2) NOT NULL DEFAULT 0,
    mandatory_left        numeric(12, 2) NOT NULL DEFAULT 0,
    reserve               numeric(12, 2) NOT NULL DEFAULT 0,
    limit_period_days     integer NOT NULL DEFAULT 1 CHECK (limit_period_days IN (1, 3, 7)),
    theme                 text NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    notifications_enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS accounts (
    id                  uuid PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name                text NOT NULL,
    type                text NOT NULL CHECK (type IN ('card', 'cash', 'savings')),
    balance             numeric(12, 2) NOT NULL DEFAULT 0,
    include_in_spending boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts (user_id);

CREATE TABLE IF NOT EXISTS operations (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    account_id   uuid REFERENCES accounts (id) ON DELETE SET NULL,
    type         text NOT NULL CHECK (type IN ('expense', 'income')),
    amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
    category     text NOT NULL,
    description  text NOT NULL DEFAULT '',
    date         date NOT NULL,
    is_mandatory boolean NOT NULL DEFAULT false,
    is_recurring boolean NOT NULL DEFAULT false,
    -- false — операция из выписки, баланс счёта её уже учитывает (при удалении баланс не меняем)
    affects_balance boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operations_user_date_idx ON operations (user_id, date);

CREATE TABLE IF NOT EXISTS recurring_expenses (
    id        uuid PRIMARY KEY,
    user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name      text NOT NULL,
    amount    numeric(12, 2) NOT NULL CHECK (amount >= 0),
    category  text NOT NULL,
    next_date date NOT NULL,
    enabled   boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS recurring_user_idx ON recurring_expenses (user_id);

-- Лимит дня, зафиксированный в тот день, когда пользователь открывал приложение. Нужен для огонька.
CREATE TABLE IF NOT EXISTS day_snapshots (
    user_id            uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    date               date NOT NULL,
    day_limit          numeric(12, 2) NOT NULL,
    no_spend_confirmed boolean NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, date)
);

-- Варианты кэшбэка, которые банк предложил пользователю на месяц (со скриншота или вручную).
CREATE TABLE IF NOT EXISTS cashback_options (
    id       uuid PRIMARY KEY,
    user_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    month    date NOT NULL,
    name     text NOT NULL,
    percent  numeric(5, 2) NOT NULL CHECK (percent > 0 AND percent <= 100),
    category text,
    chosen   boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS cashback_user_month_idx ON cashback_options (user_id, month);

CREATE TABLE IF NOT EXISTS partner_offers (
    id          uuid PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    merchant    text NOT NULL,
    percent     numeric(5, 2) NOT NULL CHECK (percent > 0 AND percent <= 100),
    category    text,
    valid_until date,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_offers_user_idx ON partner_offers (user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         bigserial PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('user', 'assistant')),
    text       text NOT NULL,
    source     text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages (user_id, id);

-- Какие напоминания уже показаны, чтобы не повторяться.
CREATE TABLE IF NOT EXISTS notification_log (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key     text NOT NULL,
    sent_on date NOT NULL,
    PRIMARY KEY (user_id, key)
);

-- Согласия: на cookie и на обработку персональных данных.
CREATE TABLE IF NOT EXISTS consents (
    id         bigserial PRIMARY KEY,
    user_id    uuid REFERENCES users (id) ON DELETE CASCADE,
    kind       text NOT NULL CHECK (kind IN ('cookies', 'personal_data')),
    value      text NOT NULL,
    version    text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Стоимость условного (минимального) набора продуктов питания по регионам (Росстат), ₽ в месяц.
CREATE TABLE IF NOT EXISTS regional_prices (
    region_code       text PRIMARY KEY,
    region_name       text NOT NULL,
    food_basket_month numeric(12, 2) NOT NULL,
    period            text NOT NULL,
    source            text NOT NULL
);

-- Анонимная статистика экранов. Пишется, только если пользователь разрешил аналитические cookie.
CREATE TABLE IF NOT EXISTS analytics_events (
    id         bigserial PRIMARY KEY,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
<<<<<<< HEAD

-- Вход по логину и почте. Пароль хранится только как хеш PBKDF2, не открытым текстом.
ALTER TABLE users ADD COLUMN IF NOT EXISTS login text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_idx ON users (lower(login)) WHERE login IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email)) WHERE email IS NOT NULL AND email <> '';

-- Настройки приложения, в том числе текст поведения Енота для языковой модели.
CREATE TABLE IF NOT EXISTS app_settings (
    key   text PRIMARY KEY,
    value text NOT NULL
);

-- Отзывы из формы «Обратная связь».
CREATE TABLE IF NOT EXISTS feedback (
    id         bigserial PRIMARY KEY,
    user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
    rating     integer NOT NULL CHECK (rating BETWEEN 0 AND 5),
    text       text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
