import { useMemo, useState } from 'react'
import type { DayString, EstimationAccuracy, GoalWithProgress } from '@shared/types'
import { formatMinutes, toDayString } from '@shared/time'
import { parseQuickAdd } from '@shared/quickAdd'
import { adjustEstimate } from '@shared/stats'
import { api, report } from '../api'
import { timeLabel } from './Chips'

interface Props {
  day: DayString
  goals: GoalWithProgress[]
  accuracy?: EstimationAccuracy
  autoFocus?: boolean
  placeholder?: string
}

/**
 * One line in, one task out. The preview under the box shows what was
 * understood before anything is committed, so the shorthand is discoverable
 * instead of being something you have to remember.
 */
export function TaskComposer({ day, goals, accuracy, autoFocus, placeholder }: Props): React.JSX.Element {
  const [text, setText] = useState('')

  const parsed = useMemo(() => {
    if (!text.trim()) return null
    return parseQuickAdd(text, {
      now: Date.now(),
      goals: goals.map((goal) => ({ id: goal.id, title: goal.title }))
    })
  }, [text, goals])

  const suggestion =
    parsed?.estimateMinutes && accuracy ? adjustEstimate(parsed.estimateMinutes, accuracy) : null

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    if (!parsed || !parsed.title) return

    // A line with no date of its own belongs to the day being looked at, not to
    // whatever today happens to be.
    const targetDay = parsed.day === toDayString(Date.now()) && parsed.startAt == null ? day : parsed.day

    void api
      .invoke('tasks:create', {
        title: parsed.title,
        day: targetDay,
        startAt: parsed.startAt,
        estimateMinutes: parsed.estimateMinutes,
        isMit: parsed.isMit,
        goalId: parsed.goalId,
        tags: parsed.tags,
        remindMinutesBefore: parsed.remindMinutesBefore
      })
      .then(() => setText(''))
      .catch(report)
  }

  return (
    <form className="composer" onSubmit={submit}>
      <input
        className="composer__input"
        value={text}
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'Add a task…  Write report 2pm ~45m #work @exam !mit'}
        onChange={(event) => setText(event.target.value)}
      />
      {parsed && parsed.title && (
        <div className="composer__preview">
          <span className="chip chip--accent">{parsed.title}</span>
          {parsed.day !== toDayString(Date.now()) && <span className="chip">{parsed.day}</span>}
          {parsed.startAt && <span className="chip chip--time">{timeLabel(parsed.startAt)}</span>}
          {parsed.estimateMinutes && <span className="chip">{formatMinutes(parsed.estimateMinutes)} est</span>}
          {parsed.isMit && <span className="chip chip--focus">Focus</span>}
          {parsed.tags.map((tag) => (
            <span key={tag} className="chip">
              #{tag}
            </span>
          ))}
          {parsed.goalQuery && (
            <span className={parsed.goalId ? 'chip chip--accent' : 'chip chip--warn'}>
              {parsed.goalId ? goals.find((g) => g.id === parsed.goalId)?.title : `no goal “${parsed.goalQuery}”`}
            </span>
          )}
          {parsed.remindMinutesBefore && <span className="chip chip--warn">remind {parsed.remindMinutesBefore}m early</span>}
        </div>
      )}
      {suggestion && (
        <p className="composer__hint">
          Going by your last few weeks this is closer to <strong>{formatMinutes(suggestion)}</strong>.
        </p>
      )}
      {!text && (
        <p className="composer__hint">
          <code>2pm</code> time · <code>tomorrow</code> day · <code>~45m</code> estimate · <code>#tag</code> ·{' '}
          <code>@goal</code> · <code>!mit</code> focus · <code>!!</code> early reminder
        </p>
      )}
    </form>
  )
}
