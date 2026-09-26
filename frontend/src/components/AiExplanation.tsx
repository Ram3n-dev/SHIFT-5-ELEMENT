import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card, ErrorState, Spinner } from './ui'
import { api } from '../lib/api'
import type { CalculateResponse, ExplainFacts, ExplainResponse, ExplainTopic } from '../types'

const TOPIC_LABELS: Record<ExplainTopic, string> = {
  why_limit: 'Почему такой лимит?',
  purchase_impact: 'Что изменится после покупки?',
  reduce_risk: 'Как снизить риск?',
}

/** Факты для объяснения берём из готового расчёта — объяснение ничего не пересчитывает. */
export function budgetFacts(calculation: CalculateResponse): ExplainFacts {
  return {
    days_until_stipend: calculation.days_until_stipend,
    total_balance: calculation.total_balance,
    mandatory_expenses: calculation.mandatory_expenses,
    reserve: calculation.reserve,
    free_money: calculation.free_money,
    daily_limit: calculation.daily_limit,
    status: calculation.status,
  }
}

interface Props {
  topics: ExplainTopic[]
  facts: ExplainFacts
}

/** Короткое объяснение расчёта: шаблон на backend или языковая модель, если она включена. */
export default function AiExplanation({ topics, facts }: Props) {
  const [activeTopic, setActiveTopic] = useState<ExplainTopic | null>(null)
  const [answer, setAnswer] = useState<ExplainResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(topic: ExplainTopic) {
    setActiveTopic(topic)
    setAnswer(null)
    setError(null)
    setLoading(true)
    try {
      setAnswer(await api.explain({ topic, ...facts }))
    } catch (explainError) {
      setError(explainError instanceof Error ? explainError.message : 'Не удалось получить объяснение.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="size-5 text-teal-600" aria-hidden="true" />
        Объяснение расчёта
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => ask(topic)}
            disabled={loading}
            aria-pressed={activeTopic === topic}
            className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition disabled:cursor-wait ${
              activeTopic === topic
                ? 'bg-teal-600 text-white ring-teal-600'
                : 'bg-white text-teal-800 ring-teal-200 hover:bg-teal-50'
            }`}
          >
            {TOPIC_LABELS[topic]}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="size-4" />
          Готовим объяснение…
        </p>
      )}

      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}

      {answer && (
        <div className="mt-4 rounded-2xl bg-teal-50 p-4" aria-live="polite">
          <p className="text-sm leading-relaxed text-slate-800">{answer.text}</p>
          <p className="mt-2 text-xs text-slate-500">
            {answer.source === 'llm'
              ? 'Текст переписала языковая модель по готовому расчёту'
              : 'Объяснение по шаблону на основе расчёта'}
          </p>
        </div>
      )}
    </Card>
  )
}
