import { useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { showSystemNotification } from '../lib/browserNotifications'
import { useApp } from '../state/AppContext'

const CHECK_EVERY_MS = 5 * 60 * 1000

/**
 * Напоминания Енота в стиле Duolingo. Какие и когда показывать, решает сервер (не больше двух в день).
 * Вкладка открыта — показываем внутри приложения, свёрнута — системным уведомлением (если разрешено).
 */
export default function Reminders() {
  const { showToast } = useApp()
  const busy = useRef(false)
  const shown = useRef(new Set<string>())

  useEffect(() => {
    const check = async () => {
      if (busy.current) return
      busy.current = true
      try {
        const due = await api.reminders()
        for (const reminder of due) {
          if (shown.current.has(reminder.key)) continue
          shown.current.add(reminder.key)

          const outside = document.hidden && (await showSystemNotification(reminder.title, reminder.text, reminder.key))
          if (!outside) showToast({ title: reminder.title, text: reminder.text, pose: reminder.pose })
          await api.reminderShown(reminder.key)
        }
      } catch {
        // Напоминания не главное: если сервер не ответил, попробуем в следующий раз.
      } finally {
        busy.current = false
      }
    }

    const onVisible = () => {
      if (!document.hidden) check()
    }

    check()
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [showToast])

  return null
}
