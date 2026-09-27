import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Logo from '../components/Logo'
import { Card } from '../components/ui'

const COOKIES = [
  { name: 'lp_auth', purpose: 'Вход в аккаунт. Без неё придётся входить на каждой странице.', kind: 'Обязательная', term: '30 дней, продлевается при входе' },
  {
    name: '.AspNetCore.Correlation.*',
    purpose: 'Защита входа через Google от подмены запроса.',
    kind: 'Обязательная',
    term: 'Несколько минут, удаляется после входа',
  },
  { name: 'lp_consent', purpose: 'Твой выбор в баннере cookie.', kind: 'Обязательная', term: '180 дней' },
]

/** Как Енотономика обращается с данными. Страница открыта и без входа. */
export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-page px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Назад"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Logo />
        </div>

        <h1 className="text-3xl font-bold text-ink">Данные и cookie</h1>
        <p className="text-muted">
          Енотономика — учебный проект для хакатона. Вводи только учебные данные: не указывай реальные пароли банков, коды из SMS, CVV и полные номера
          карт. Выписка из учебной песочницы банка разбирается на сервере: в приложении остаются только сумма, дата, категория и описание, без счетов, ИНН и ФИО.
        </p>

        <Section title="Что мы храним">
          <ul className="list-disc space-y-1 pl-5">
            <li>логин, почту и хеш пароля (сам пароль не хранится) либо имя и почту из Google, либо «Гость» при демо-входе;</li>
            <li>то, что ты вводишь сам: город, стипендию, счета, операции, регулярные платежи, резерв;</li>
            <li>выбор кэшбэка, партнёрские предложения, переписку с Енотом, отметки дней для огонька;</li>
            <li>согласия: на обработку данных и выбор в баннере cookie.</li>
          </ul>
          <p>Данные лежат в базе PostgreSQL на сервере проекта и нужны только для расчёта твоего бюджета.</p>
        </Section>

        <Section title="Что остаётся на твоём устройстве">
          <p>
            CSV-выписка и скриншоты кэшбэка разбираются прямо в браузере — на сервер уходят только готовые строки, которые ты проверил.
            Для распознавания скриншотов браузер один раз скачивает программу и словари tesseract.js с CDN jsDelivr. Тема оформления
            хранится в браузере (localStorage), шрифт Onest подгружается с Google Fonts.
          </p>
        </Section>

        <Section title="Енот и ИИ">
          <p>
            Все цифры считает код Енотономики. Чтобы объяснить их простыми словами, вопрос и рассчитанные цифры (лимит, суммы по категориям,
            регион) отправляются в сервис RouterAI — без имени и почты. Если ИИ недоступен, ответ собирается по шаблону. Ответы Енота —
            ориентир, а не финансовая рекомендация. Не пиши в чат личные данные.
          </p>
        </Section>

        <Section title="Cookie">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Название</th>
                  <th className="py-2 pr-3 font-medium">Зачем</th>
                  <th className="py-2 pr-3 font-medium">Тип</th>
                  <th className="py-2 font-medium">Срок</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map((cookie) => (
                  <tr key={cookie.name} className="border-t border-line align-top">
                    <td className="py-2 pr-3 font-mono text-xs text-ink">{cookie.name}</td>
                    <td className="py-2 pr-3 text-ink">{cookie.purpose}</td>
                    <td className="py-2 pr-3 text-ink">{cookie.kind}</td>
                    <td className="py-2 text-ink">{cookie.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Статистика: если в баннере выбрано «Разрешить всё», браузер сообщает серверу, какие экраны открывались. Событие не связано с
            аккаунтом и не содержит сумм. Отдельных рекламных или аналитических cookie нет. Выбор можно изменить в профиле: «Настройки
            cookie».
          </p>
        </Section>

        <Section title="Как удалить данные">
          <p>
            В профиле есть кнопка «Удалить мои данные» — она сразу стирает профиль, счета, операции, кэшбэк и переписку. Демо-профили
            удаляются автоматически через 7 дней.
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 text-ink">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </Card>
  )
}
