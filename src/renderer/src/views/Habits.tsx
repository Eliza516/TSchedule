import { useState } from 'react'
import type { HabitSchedule, HabitWithStreak } from '@shared/types'
import { toDayString } from '@shared/time'
import { describeSchedule } from '@shared/recurrence'
import { api, report, useLive } from '../api'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Habits(): React.JSX.Element {
  const [habits] = useLive(() => api.invoke('habits:list'), [])
  const [goals] = useLive(() => api.invoke('goals:list'), [])
  const [adding, setAdding] = useState(false)

  const active = habits.filter((habit) => habit.active)
  const paused = habits.filter((habit) => !habit.active)

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">Habits</h1>
          <p className="view__subtitle">Repeating work that turns into a task on the days it is due</p>
        </div>
        <div className="view__bar-end">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            New habit
          </button>
        </div>
      </header>

      <div className="view__body stack" style={{ gap: 14 }}>
        {adding && (
          <HabitForm
            goals={goals.map((goal) => ({ id: goal.id, title: goal.title }))}
            onDone={() => setAdding(false)}
          />
        )}

        {active.length === 0 && !adding && (
          <div className="empty">
            <strong>No habits yet</strong>
            Add something you want to do regularly — it will appear on your day automatically.
          </div>
        )}

        {active.map((habit) => (
          <HabitCard key={habit.id} habit={habit} />
        ))}

        {paused.length > 0 && (
          <>
            <h2 className="task-group__title">Paused</h2>
            {paused.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function HabitCard({ habit }: { habit: HabitWithStreak }): React.JSX.Element {
  const today = toDayString(Date.now())
  return (
    <section className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="row">
            <strong>{habit.title}</strong>
            {habit.doneToday && <span className="chip chip--accent">done today</span>}
            {!habit.doneToday && habit.dueToday && <span className="chip chip--warn">due today</span>}
          </div>
          <p className="small muted">
            {describeSchedule(habit.schedule)}
            {habit.schedule.type === 'timesPerWeek' && ` · ${habit.completedThisWeek}/${habit.schedule.n} this week`}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="stat-tile__value">{habit.streak.current}</div>
          <div className="stat-tile__label">day streak · best {habit.streak.longest}</div>
        </div>

        <div className="row" style={{ gap: 2 }}>
          <button
            type="button"
            className="icon-btn"
            title={habit.active ? 'Pause habit' : 'Resume habit'}
            onClick={() => void api.invoke('habits:update', habit.id, { active: !habit.active }).catch(report)}
          >
            {habit.active ? '❙❙' : '▶'}
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Delete habit"
            onClick={() => void api.invoke('habits:delete', habit.id).catch(report)}
          >
            ×
          </button>
        </div>
      </div>

      <div className="streak-grid" style={{ marginTop: 12 }}>
        {habit.streak.history.map((entry) => (
          <span
            key={entry.day}
            title={`${entry.day}${entry.done ? ' · done' : entry.due ? ' · missed' : ''}`}
            className={[
              'streak-grid__cell',
              entry.due ? 'streak-grid__cell--due' : '',
              entry.done ? 'streak-grid__cell--done' : '',
              entry.day === today ? 'streak-grid__cell--today' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>
    </section>
  )
}

function HabitForm({
  goals,
  onDone
}: {
  goals: { id: string; title: string }[]
  onDone: () => void
}): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<HabitSchedule['type']>('daily')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [times, setTimes] = useState(3)
  const [estimate, setEstimate] = useState('')
  const [time, setTime] = useState('')
  const [goalId, setGoalId] = useState('')

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    if (!title.trim()) return
    const schedule: HabitSchedule =
      kind === 'daily'
        ? { type: 'daily' }
        : kind === 'weekdays'
          ? { type: 'weekdays', days }
          : { type: 'timesPerWeek', n: times }

    void api
      .invoke('habits:create', {
        title: title.trim(),
        schedule,
        goalId: goalId || null,
        estimateMinutes: estimate ? Number(estimate) : null,
        defaultTime: time || null
      })
      .then(() => onDone())
      .catch(report)
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="card__title">New habit</div>
      <div className="field-grid">
        <label className="field">
          <span className="field__label">Title</span>
          <input
            className="input"
            autoFocus
            placeholder="Review vocabulary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Repeats</span>
          <select
            className="select"
            value={kind}
            onChange={(event) => setKind(event.target.value as HabitSchedule['type'])}
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Chosen days</option>
            <option value="timesPerWeek">A number of times per week</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Estimate (minutes)</span>
          <input
            className="input"
            type="number"
            min={5}
            step={5}
            placeholder="20"
            value={estimate}
            onChange={(event) => setEstimate(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Usual time</span>
          <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Towards a goal</span>
          <select className="select" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {kind === 'weekdays' && (
        <div className="field">
          <span className="field__label">Days</span>
          <div className="row">
            {DAY_NAMES.map((name, index) => (
              <button
                key={name}
                type="button"
                className="pick"
                aria-pressed={days.includes(index)}
                onClick={() =>
                  setDays((current) =>
                    current.includes(index) ? current.filter((d) => d !== index) : [...current, index]
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === 'timesPerWeek' && (
        <label className="field" style={{ maxWidth: 220 }}>
          <span className="field__label">Times per week</span>
          <input
            className="input"
            type="number"
            min={1}
            max={7}
            value={times}
            onChange={(event) => setTimes(Number(event.target.value))}
          />
          <span className="field__hint">Only nags once the days left just cover what is owed</span>
        </label>
      )}

      <div className="row">
        <button type="submit" className="btn btn--primary btn--sm">
          Create habit
        </button>
        <button type="button" className="btn btn--sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
