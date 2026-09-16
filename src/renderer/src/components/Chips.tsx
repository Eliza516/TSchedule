import type { Task } from '@shared/types'
import { formatMinutes } from '@shared/time'

export function timeLabel(startAt: number | null): string | null {
  if (startAt == null) return null
  return new Date(startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * The line of small facts under a task: when it starts, how long it was meant
 * to take, how long it actually took, its tags, and whether it has been pushed
 * forward too many times.
 */
export function TaskChips({
  task,
  goalTitle,
  goalColor,
  staleAfter
}: {
  task: Task
  goalTitle?: string | null
  goalColor?: string | null
  staleAfter: number
}): React.JSX.Element | null {
  const time = timeLabel(task.startAt)
  const overrun =
    task.estimateMinutes != null &&
    task.actualMinutes > 0 &&
    Math.abs(task.actualMinutes - task.estimateMinutes) / task.estimateMinutes > 0.2

  const chips: React.JSX.Element[] = []
  if (time) chips.push(<span key="time" className="chip chip--time">{time}</span>)
  if (task.estimateMinutes != null) {
    chips.push(
      <span key="est" className="chip">
        {formatMinutes(task.estimateMinutes)} est
      </span>
    )
  }
  if (task.actualMinutes > 0) {
    chips.push(
      <span key="actual" className={overrun ? 'chip chip--warn' : 'chip'}>
        {formatMinutes(task.actualMinutes)} actual
      </span>
    )
  }
  if (goalTitle) {
    chips.push(
      <span key="goal" className="chip chip--accent">
        <span className="dot" style={goalColor ? { background: goalColor } : undefined} />
        {goalTitle}
      </span>
    )
  }
  for (const tag of task.tags) {
    chips.push(
      <span key={`tag-${tag}`} className="chip">
        #{tag}
      </span>
    )
  }
  if (task.plannedUnits != null && task.unitFrom != null && task.unitTo != null) {
    const covered = task.doneUnits != null ? ` · xong ${task.doneUnits}` : ''
    chips.push(
      <span key="units" className="chip chip--focus">
        {task.unitFrom === task.unitTo ? task.unitFrom : `${task.unitFrom}–${task.unitTo}`}
        {covered}
      </span>
    )
  }
  if (task.habitId) chips.push(<span key="habit" className="chip">habit</span>)
  if (task.rolledOverCount >= staleAfter) {
    chips.push(
      <span key="stale" className="chip chip--danger" title={`First planned for ${task.originalDay}`}>
        rolled over {task.rolledOverCount}× — reschedule, shrink or drop it
      </span>
    )
  } else if (task.rolledOverCount > 0) {
    chips.push(
      <span key="rolled" className="chip">
        rolled over {task.rolledOverCount}×
      </span>
    )
  }

  if (chips.length === 0) return null
  return <div className="task-row__meta">{chips}</div>
}

export function Countdown({ days }: { days: number | null }): React.JSX.Element | null {
  if (days == null) return null
  if (days < 0) {
    return <span className="countdown countdown--past">{Math.abs(days)}d ago</span>
  }
  if (days === 0) return <span className="countdown countdown--urgent">today</span>
  const tone = days <= 7 ? ' countdown--urgent' : days <= 14 ? ' countdown--soon' : ''
  return <span className={`countdown${tone}`}>{days} day{days === 1 ? '' : 's'} left</span>
}
