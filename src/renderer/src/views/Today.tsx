import { useMemo, useState } from 'react'
import type { AppSettings, DayString, Task, TimerState } from '@shared/types'
import { addDays, dayLabel, formatMinutes, startOfDay, toDayString } from '@shared/time'
import { estimationAccuracy } from '@shared/stats'
import { api, report, useCheckinStatus, useLive } from '../api'
import { Countdown } from '../components/Chips'
import { DayStrip } from '../components/DayStrip'
import { TaskComposer } from '../components/TaskComposer'
import { TaskRow } from '../components/TaskRow'
import { TimerWidget } from '../components/TimerWidget'

interface Props {
  settings: AppSettings
  timer: TimerState
  highlightTaskId: string | null
  initialDay: DayString | null
  onOpenGoals: () => void
}

export function Today({ settings, timer, highlightTaskId, initialDay, onOpenGoals }: Props): React.JSX.Element {
  const today = toDayString(Date.now())
  const [day, setDay] = useState<DayString>(initialDay ?? today)
  const checkin = useCheckinStatus()

  const [tasks] = useLive(() => api.invoke('tasks:listDay', day), [], [day])
  const [weekTasks] = useLive(
    () => api.invoke('tasks:listRange', addDays(day, -6), addDays(day, 6)),
    [],
    [day]
  )
  const [goals] = useLive(() => api.invoke('goals:list'), [])
  const [summary] = useLive(
    () => api.invoke('tasks:summary', day),
    { day, planned: 0, done: 0, dropped: 0, estimatedMinutes: 0, actualMinutes: 0, pomodoros: 0 },
    [day]
  )
  const [note] = useLive(() => api.invoke('notes:get', day), null, [day])
  const [recent] = useLive(
    () => api.invoke('tasks:listRange', addDays(today, -28), today),
    [],
    [today]
  )

  const accuracy = useMemo(() => estimationAccuracy(recent), [recent])

  const groups = useMemo(() => {
    const open = tasks.filter((task) => task.status !== 'done' && task.status !== 'dropped')
    return {
      focus: open.filter((task) => task.isMit),
      scheduled: open
        .filter((task) => !task.isMit && task.startAt != null)
        .sort((a, b) => (a.startAt ?? 0) - (b.startAt ?? 0)),
      anytime: open.filter((task) => !task.isMit && task.startAt == null),
      done: tasks.filter((task) => task.status === 'done'),
      dropped: tasks.filter((task) => task.status === 'dropped')
    }
  }, [tasks])

  const plannedMinutes = tasks
    .filter((task) => task.status !== 'done' && task.status !== 'dropped')
    .reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0)
  const overloaded = plannedMinutes > settings.workdayHours * 60

  const renderRow = (task: Task): React.JSX.Element => (
    <TaskRow
      key={task.id}
      task={task}
      goals={goals}
      settings={settings}
      running={timer.taskId === task.id && timer.phase !== 'idle'}
      highlighted={highlightTaskId === task.id}
    />
  )

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">{dayLabel(day, today)}</h1>
          <p className="view__subtitle">
            {startOfDay(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="view__bar-end">
          {day !== today && (
            <button type="button" className="btn btn--sm" onClick={() => setDay(today)}>
              Back to today
            </button>
          )}
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void api.invoke('checkin:requestManual').catch(report)}
          >
            Wrap up my day
          </button>
        </div>
      </header>

      <div className="view__body">
        <div className="view__split">
          <div>
            <DayStrip day={day} tasks={weekTasks} onSelect={setDay} />

            <div style={{ marginTop: 18 }}>
              <Group title="Focus" hint="At most three. Everything else is optional." tasks={groups.focus} render={renderRow}>
                Nothing pinned yet — star up to three tasks that would make today count.
              </Group>

              <Group title="Scheduled" tasks={groups.scheduled} render={renderRow}>
                No timed work today.
              </Group>

              <Group title="Anytime" tasks={groups.anytime} render={renderRow}>
                Nothing loose. Add a task below.
              </Group>

              {groups.done.length > 0 && (
                <section className="task-group">
                  <h2 className="task-group__title">
                    Done<span className="chip">{groups.done.length}</span>
                  </h2>
                  <div className="task-list">{groups.done.map(renderRow)}</div>
                </section>
              )}

              {groups.dropped.length > 0 && (
                <section className="task-group">
                  <h2 className="task-group__title">
                    Dropped<span className="chip">{groups.dropped.length}</span>
                  </h2>
                  <div className="task-list">{groups.dropped.map(renderRow)}</div>
                </section>
              )}
            </div>

            <TaskComposer day={day} goals={goals} accuracy={accuracy} />
          </div>

          <aside className="stack">
            <TimerWidget state={timer} />

            <section className="card">
              <div className="card__title">{day === today ? 'Today' : dayLabel(day, today)}</div>
              <div className="stack" style={{ gap: 6 }}>
                <Line label="Done" value={`${summary.done} of ${summary.planned}`} />
                <Line label="Planned" value={formatMinutes(plannedMinutes)} tone={overloaded ? 'warn' : undefined} />
                <Line label="Logged" value={formatMinutes(summary.actualMinutes)} />
                {summary.pomodoros > 0 && <Line label="Pomodoros" value={String(summary.pomodoros)} />}
              </div>
              {overloaded && (
                <p className="small" style={{ marginTop: 8, color: 'var(--warn)' }}>
                  That is more than your {settings.workdayHours}h day. Something here will slip.
                </p>
              )}
            </section>

            <section className="card">
              <div className="card__title">Wrap-up streak</div>
              <div className="row">
                <span className="stat-tile__value">{checkin.streak}</span>
                <span className="small muted">
                  {checkin.streak === 1 ? 'day closed out' : 'days closed out in a row'}
                </span>
              </div>
              {note?.tomorrowPriority && (
                <p className="small soft" style={{ marginTop: 8 }}>
                  Priority you set: <strong>{note.tomorrowPriority}</strong>
                </p>
              )}
            </section>

            {goals.filter((goal) => goal.status === 'active' && goal.targetDate).length > 0 && (
              <section className="card">
                <div className="card__title">Counting down</div>
                <div className="stack" style={{ gap: 8 }}>
                  {goals
                    .filter((goal) => goal.status === 'active' && goal.targetDate)
                    .slice(0, 4)
                    .map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        className="row"
                        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', width: '100%' }}
                        onClick={onOpenGoals}
                      >
                        <span className="dot" style={goal.color ? { background: goal.color } : undefined} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{goal.title}</span>
                        <Countdown days={goal.progress.daysLeft} />
                      </button>
                    ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function Group({
  title,
  hint,
  tasks,
  render,
  children
}: {
  title: string
  hint?: string
  tasks: Task[]
  render: (task: Task) => React.JSX.Element
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="task-group">
      <h2 className="task-group__title">
        {title}
        {tasks.length > 0 && <span className="chip">{tasks.length}</span>}
        {hint && tasks.length > 0 && <span className="small muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{hint}</span>}
      </h2>
      {tasks.length === 0 ? (
        <p className="small muted" style={{ padding: '2px 10px 6px' }}>{children}</p>
      ) : (
        <div className="task-list">{tasks.map(render)}</div>
      )}
    </section>
  )
}

function Line({ label, value, tone }: { label: string; value: string; tone?: 'warn' }): React.JSX.Element {
  return (
    <div className="row">
      <span className="small muted" style={{ flex: 1 }}>
        {label}
      </span>
      <span className="tabular" style={tone === 'warn' ? { color: 'var(--warn)' } : undefined}>
        {value}
      </span>
    </div>
  )
}
