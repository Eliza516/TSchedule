import type { NotDoneReason, Task, TriageAction, TriageDecision } from '@shared/types'
import { NOT_DONE_REASONS, NOT_DONE_REASON_LABELS } from '@shared/types'
import { addDays, dayLabel, formatMinutes, toDayString } from '@shared/time'

const ACTION_LABELS: Record<TriageAction, string> = {
  done: 'Actually done',
  move_today: 'Move to today',
  move_tomorrow: 'Move to tomorrow',
  pick_date: 'Pick a date',
  drop: 'Drop it',
  keep: 'Leave it there'
}

const QUICK_MINUTES = [15, 30, 60, 120]

interface Props {
  task: Task
  decision: TriageDecision | undefined
  actions: TriageAction[]
  onChange: (decision: TriageDecision) => void
  /** offer a rough time for work that was done without the timer running */
  askActualMinutes?: boolean
  staleAfter: number
}

/**
 * One unfinished task, and the decision the user is not allowed to skip.
 *
 * Forcing a choice per task - with a reason attached - is what keeps work from
 * silently sliding forward week after week, and what makes the "why didn't this
 * get done" breakdown in Stats worth reading.
 */
export function TriageRow({
  task,
  decision,
  actions,
  onChange,
  askActualMinutes,
  staleAfter
}: Props): React.JSX.Element {
  const today = toDayString(Date.now())
  const needsReason = decision != null && decision.action !== 'done'
  const resolved = decision != null && (decision.action === 'done' || decision.reason != null)
  const stale = task.rolledOverCount >= staleAfter

  function set(patch: Partial<TriageDecision>): void {
    onChange({ taskId: task.id, action: decision?.action ?? 'keep', ...decision, ...patch })
  }

  return (
    <div className={`triage${resolved ? ' triage--resolved' : ''}`}>
      <div className="triage__head">
        <span className="triage__title">{task.title}</span>
        {task.day !== today && <span className="chip">{dayLabel(task.day, today)}</span>}
        {task.estimateMinutes != null && <span className="chip">{formatMinutes(task.estimateMinutes)} est</span>}
        {task.actualMinutes > 0 && <span className="chip chip--accent">{formatMinutes(task.actualMinutes)} logged</span>}
        {stale && <span className="chip chip--danger">rolled over {task.rolledOverCount}×</span>}
      </div>

      {stale && (
        <p className="small" style={{ color: 'var(--danger)' }}>
          This has moved {task.rolledOverCount} times since {task.originalDay}. Make it smaller, book a real slot for
          it, or drop it.
        </p>
      )}

      <div className="triage__actions">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={`pick${action === 'drop' ? ' pick--danger' : ''}`}
            aria-pressed={decision?.action === action}
            onClick={() =>
              set({
                action,
                // "Actually done" needs no excuse.
                reason: action === 'done' ? null : decision?.reason ?? null,
                day: action === 'pick_date' ? decision?.day ?? addDays(today, 7) : undefined
              })
            }
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {decision?.action === 'pick_date' && (
        <input
          className="input input--inline"
          style={{ maxWidth: 190 }}
          type="date"
          value={decision.day ?? ''}
          min={today}
          onChange={(event) => set({ day: event.target.value })}
        />
      )}

      {needsReason && (
        <div className="triage__actions">
          <span className="small muted" style={{ alignSelf: 'center', marginRight: 2 }}>
            Why?
          </span>
          {NOT_DONE_REASONS.map((reason: NotDoneReason) => (
            <button
              key={reason}
              type="button"
              className="pick pick--reason"
              aria-pressed={decision?.reason === reason}
              onClick={() => set({ reason })}
            >
              {NOT_DONE_REASON_LABELS[reason]}
            </button>
          ))}
        </div>
      )}

      {askActualMinutes && decision?.action === 'done' && task.actualMinutes === 0 && (
        <div className="triage__actions">
          <span className="small muted" style={{ alignSelf: 'center', marginRight: 2 }}>
            Roughly how long?
          </span>
          {QUICK_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className="pick"
              aria-pressed={decision?.actualMinutes === minutes}
              onClick={() => set({ actualMinutes: minutes })}
            >
              {formatMinutes(minutes)}
            </button>
          ))}
          <button
            type="button"
            className="pick"
            aria-pressed={decision?.actualMinutes === null}
            onClick={() => set({ actualMinutes: null })}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

export { ACTION_LABELS }
