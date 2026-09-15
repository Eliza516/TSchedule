import type { CheckinPayload, TriageDecision } from '@shared/types'
import { formatMinutes } from '@shared/time'
import { describeAccuracy, estimationAccuracy } from '@shared/stats'
import { TriageRow } from './TriageRow'

export interface EveningNotes {
  wentWell: string
  blocked: string
  tomorrowPriority: string
  mood: number | null
  energy: number | null
}

interface Props {
  payload: CheckinPayload
  decisions: Map<string, TriageDecision>
  onDecide: (decision: TriageDecision) => void
  notes: EveningNotes
  onNotesChange: (patch: Partial<EveningNotes>) => void
  staleAfter: number
}

/**
 * The evening wrap-up: account for every task, say how long things really took,
 * and name tomorrow's priority - which becomes a real pinned task, not a note
 * to be forgotten.
 */
export function EveningFlow({
  payload,
  decisions,
  onDecide,
  notes,
  onNotesChange,
  staleAfter
}: Props): React.JSX.Element {
  const open = payload.dayTasks.filter((task) => task.status !== 'done' && task.status !== 'dropped')
  const done = payload.dayTasks.filter((task) => task.status === 'done')
  const accuracy = estimationAccuracy(payload.dayTasks)
  const accuracyNote = describeAccuracy(accuracy)

  return (
    <>
      {payload.overdue && (
        <div className="checkin__banner">
          <span>◷</span>
          <div>
            <strong>You closed the machine without wrapping up {payload.day}.</strong>
            <div className="small">
              Settling it now keeps the record honest — and it is the last thing standing between you and today.
            </div>
          </div>
        </div>
      )}

      <section className="checkin__section">
        <div className="checkin__section-title">
          <h3>What happened today</h3>
          <span className="chip chip--accent">{done.length} done</span>
          {open.length > 0 && <span className="chip">{open.length} still open</span>}
        </div>

        {open.length === 0 && done.length === 0 && (
          <p className="small muted">Nothing was planned for this day. Nothing to account for.</p>
        )}

        {open.map((task) => (
          <TriageRow
            key={task.id}
            task={task}
            decision={decisions.get(task.id)}
            actions={['done', 'move_tomorrow', 'pick_date', 'drop']}
            onChange={onDecide}
            askActualMinutes
            staleAfter={staleAfter}
          />
        ))}

        {done.length > 0 && (
          <div className="stack" style={{ gap: 4, marginTop: open.length > 0 ? 14 : 0 }}>
            {done.map((task) => (
              <div key={task.id} className="task-row task-row--done">
                <span style={{ color: 'var(--accent)' }}>✓</span>
                <div className="task-row__main">
                  <span>{task.title}</span>
                  <div className="task-row__meta">
                    {task.estimateMinutes != null && <span className="chip">{formatMinutes(task.estimateMinutes)} est</span>}
                    {task.actualMinutes > 0 && (
                      <span className="chip chip--accent">{formatMinutes(task.actualMinutes)} actual</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="checkin__section">
        <div className="checkin__section-title">
          <h3>The numbers</h3>
        </div>
        <div className="stat-tiles">
          <Tile value={`${payload.summary.done}/${payload.summary.planned}`} label="Finished" />
          <Tile value={formatMinutes(payload.summary.actualMinutes)} label="Time logged" />
          <Tile value={formatMinutes(payload.summary.estimatedMinutes)} label="Time estimated" />
          <Tile value={String(payload.summary.pomodoros)} label="Pomodoros" />
        </div>
        {accuracyNote && (
          <p className="small muted" style={{ marginTop: 8 }}>
            Today: {accuracyNote.toLowerCase()}.
          </p>
        )}
      </section>

      <section className="checkin__section">
        <div className="checkin__section-title">
          <h3>Looking back</h3>
          <span className="small muted">Optional, but this is where the pattern shows up</span>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <label className="field">
            <span className="field__label">What went well</span>
            <textarea
              className="textarea"
              value={notes.wentWell}
              onChange={(event) => onNotesChange({ wentWell: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">What got in the way</span>
            <textarea
              className="textarea"
              value={notes.blocked}
              onChange={(event) => onNotesChange({ blocked: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Tomorrow’s top priority</span>
            <input
              className="input"
              placeholder="The one thing that has to happen"
              value={notes.tomorrowPriority}
              onChange={(event) => onNotesChange({ tomorrowPriority: event.target.value })}
            />
            <span className="field__hint">
              This becomes a pinned task on tomorrow’s list, and you will see it again in the morning.
            </span>
          </label>

          <div className="row row--wrap" style={{ gap: 24 }}>
            <Scale label="Mood" value={notes.mood} onChange={(value) => onNotesChange({ mood: value })} />
            <Scale label="Energy" value={notes.energy} onChange={(value) => onNotesChange({ energy: value })} />
          </div>
        </div>
      </section>
    </>
  )
}

function Tile({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <div className="stat-tile">
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
    </div>
  )
}

function Scale({
  label,
  value,
  onChange
}: {
  label: string
  value: number | null
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="scale">
        {[1, 2, 3, 4, 5].map((step) => (
          <button
            key={step}
            type="button"
            aria-pressed={value === step}
            aria-label={`${label} ${step} of 5`}
            onClick={() => onChange(step)}
          >
            {step}
          </button>
        ))}
      </div>
    </div>
  )
}
