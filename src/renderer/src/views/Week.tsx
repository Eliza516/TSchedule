import { useState } from 'react'
import type { AppSettings, DayString } from '@shared/types'
import { addDays, formatMinutes, startOfDay, startOfWeek, toDayString } from '@shared/time'
import { api, report, useLive } from '../api'

/**
 * A week at a glance. Deliberately a list per day rather than an hour grid -
 * the point is to see where the load sits and move things, not to draw a
 * calendar.
 */
export function Week({ settings }: { settings: AppSettings }): React.JSX.Element {
  const today = toDayString(Date.now())
  const [weekStart, setWeekStart] = useState<DayString>(startOfWeek(today))
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<DayString | null>(null)
  const weekEnd = addDays(weekStart, 6)

  const [tasks] = useLive(() => api.invoke('tasks:listRange', weekStart, weekEnd), [], [weekStart])
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  function drop(day: DayString): void {
    if (!dragging) return
    void api.invoke('tasks:move', dragging, day, null).catch(report)
    setDragging(null)
    setOver(null)
  }

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">Week of {startOfDay(weekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</h1>
          <p className="view__subtitle">Drag a task onto another day to move it</p>
        </div>
        <div className="view__bar-end">
          <button type="button" className="btn btn--sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ←
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setWeekStart(startOfWeek(today))}>
            This week
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            →
          </button>
        </div>
      </header>

      <div className="view__body">
        <div className="week-grid">
          {days.map((day) => {
            const ofDay = tasks.filter((task) => task.day === day && task.status !== 'dropped')
            const load = ofDay
              .filter((task) => task.status !== 'done')
              .reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0)
            const overloaded = load > settings.workdayHours * 60

            return (
              <div
                key={day}
                className={[
                  'week-col',
                  day === today ? 'week-col--today' : '',
                  over === day ? 'week-col--over' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(event) => {
                  event.preventDefault()
                  setOver(day)
                }}
                onDragLeave={() => setOver((value) => (value === day ? null : value))}
                onDrop={() => drop(day)}
              >
                <div className="week-col__head">
                  <span className="week-col__dow">
                    {startOfDay(day).toLocaleDateString(undefined, { weekday: 'short' })} {startOfDay(day).getDate()}
                  </span>
                  {load > 0 && (
                    <span className={`chip${overloaded ? ' chip--warn' : ''}`}>{formatMinutes(load)}</span>
                  )}
                </div>

                {ofDay.length === 0 && <p className="small muted">—</p>}
                {ofDay.map((task) => (
                  <div
                    key={task.id}
                    className={`week-card${task.status === 'done' ? ' week-card--done' : ''}`}
                    draggable
                    onDragStart={() => setDragging(task.id)}
                    onDragEnd={() => setDragging(null)}
                    title={task.title}
                  >
                    {task.isMit && '★ '}
                    {task.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
