import type { DayString, Task } from '@shared/types'
import { addDays, startOfDay, toDayString } from '@shared/time'

interface Props {
  day: DayString
  tasks: Task[]
  onSelect: (day: DayString) => void
  span?: number
}

/**
 * A week of days with a load bar under each. Enough calendar to see the shape
 * of the week, without becoming a calendar.
 */
export function DayStrip({ day, tasks, onSelect, span = 7 }: Props): React.JSX.Element {
  const today = toDayString(Date.now())
  const start = addDays(day, -Math.floor(span / 2))
  const days = Array.from({ length: span }, (_, index) => addDays(start, index))

  const loads = new Map<DayString, number>()
  for (const task of tasks) {
    if (task.status === 'dropped') continue
    loads.set(task.day, (loads.get(task.day) ?? 0) + (task.estimateMinutes ?? 20))
  }
  const heaviest = Math.max(60, ...loads.values())

  return (
    <div className="day-strip">
      {days.map((value) => {
        const date = startOfDay(value)
        const load = loads.get(value) ?? 0
        return (
          <button
            key={value}
            type="button"
            className={`day-strip__day${value === today ? ' day-strip__day--today' : ''}`}
            aria-current={value === day}
            onClick={() => onSelect(value)}
          >
            <span className="day-strip__dow">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            <span className="day-strip__num">{date.getDate()}</span>
            <span
              className="day-strip__load"
              style={{
                width: `${Math.round((load / heaviest) * 76) + (load > 0 ? 8 : 0)}%`,
                opacity: load > 0 ? 1 : 0.25
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
