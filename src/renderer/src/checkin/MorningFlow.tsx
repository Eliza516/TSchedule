import type { CheckinPayload, Task, TriageDecision } from '@shared/types'
import { formatMinutes } from '@shared/time'
import { Countdown } from '../components/Chips'
import { TaskComposer } from '../components/TaskComposer'
import { TriageRow } from './TriageRow'

interface Props {
  payload: CheckinPayload
  decisions: Map<string, TriageDecision>
  onDecide: (decision: TriageDecision) => void
  mitIds: string[]
  onToggleMit: (taskId: string) => void
  plan: string
  onPlanChange: (value: string) => void
  staleAfter: number
}

const MIT_LIMIT = 3

/**
 * The morning ritual: settle what did not get done, then decide what today is
 * actually for - before the day decides for you.
 */
export function MorningFlow({
  payload,
  decisions,
  onDecide,
  mitIds,
  onToggleMit,
  plan,
  onPlanChange,
  staleAfter
}: Props): React.JSX.Element {
  const open = payload.dayTasks.filter((task) => task.status !== 'done' && task.status !== 'dropped')
  const plannedMinutes = open.reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0)
  const capacity = payload.workdayHours * 60
  const missingEstimates = open.filter((task) => task.estimateMinutes == null)
  const neglected = payload.goals.filter((goal) => goal.status === 'active' && goal.progress.neglected)
  const urgent = payload.goals
    .filter((goal) => goal.status === 'active' && goal.progress.daysLeft != null)
    .sort((a, b) => (a.progress.daysLeft ?? 0) - (b.progress.daysLeft ?? 0))
    .slice(0, 3)

  return (
    <>
      {payload.previousPriority && (
        <div className="checkin__banner checkin__banner--accent">
          <span>◈</span>
          <div>
            <strong>Last night you said today’s priority is “{payload.previousPriority}”.</strong>
            <div className="small">Still true? Make it one of your three.</div>
          </div>
        </div>
      )}

      {payload.carryOver.length > 0 && (
        <section className="checkin__section">
          <div className="checkin__section-title">
            <h3>Unfinished from before</h3>
            <span className="chip">{payload.carryOver.length}</span>
            <span className="small muted">Every one needs a decision</span>
          </div>
          {payload.carryOver.map((task) => (
            <TriageRow
              key={task.id}
              task={task}
              decision={decisions.get(task.id)}
              actions={['move_today', 'move_tomorrow', 'pick_date', 'done', 'drop']}
              onChange={onDecide}
              staleAfter={staleAfter}
            />
          ))}
        </section>
      )}

      <section className="checkin__section">
        <div className="checkin__section-title">
          <h3>Today</h3>
          <span className="chip">{open.length} open</span>
          {plannedMinutes > 0 && (
            <span className={`chip${plannedMinutes > capacity ? ' chip--warn' : ''}`}>
              {formatMinutes(plannedMinutes)} planned
            </span>
          )}
        </div>

        {plannedMinutes > capacity && (
          <div className="checkin__banner">
            <span>▲</span>
            <div>
              <strong>That is more than your {payload.workdayHours}h day.</strong>
              <div className="small">Something here will slip. Better to choose now than to discover it tonight.</div>
            </div>
          </div>
        )}

        {open.length === 0 ? (
          <p className="small muted">Nothing planned yet. Add the first thing below.</p>
        ) : (
          <div className="stack" style={{ gap: 4 }}>
            {open.map((task) => (
              <PlanRow
                key={task.id}
                task={task}
                isMit={mitIds.includes(task.id)}
                mitFull={mitIds.length >= MIT_LIMIT}
                onToggleMit={() => onToggleMit(task.id)}
              />
            ))}
          </div>
        )}

        {payload.requireEstimates && missingEstimates.length > 0 && (
          <p className="small" style={{ marginTop: 8, color: 'var(--warn)' }}>
            {missingEstimates.length} task{missingEstimates.length === 1 ? ' has' : 's have'} no estimate. A guess beats
            nothing — it is how the app learns how far off you usually are.
          </p>
        )}

        <TaskComposer
          day={payload.today}
          goals={payload.goals}
          placeholder="Add something for today…  Draft outline 10am ~45m @exam"
        />

        <p className="small muted" style={{ marginTop: 10 }}>
          Starred tasks are your Focus: at most {MIT_LIMIT}. {mitIds.length}/{MIT_LIMIT} chosen.
        </p>
      </section>

      {urgent.length > 0 && (
        <section className="checkin__section">
          <div className="checkin__section-title">
            <h3>Counting down</h3>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {urgent.map((goal) => (
              <div key={goal.id} className="row">
                <span className="dot" style={goal.color ? { background: goal.color } : undefined} />
                <span style={{ flex: 1 }}>{goal.title}</span>
                <span className="small muted">{Math.round(goal.progress.progress * 100)}%</span>
                <Countdown days={goal.progress.daysLeft} />
              </div>
            ))}
          </div>
          {neglected.length > 0 && (
            <p className="small" style={{ marginTop: 8, color: 'var(--warn)' }}>
              No progress on {neglected.map((goal) => `“${goal.title}”`).join(', ')}. One small task today would fix
              that.
            </p>
          )}
        </section>
      )}

      <section className="checkin__section">
        <div className="checkin__section-title">
          <h3>Anything to note?</h3>
          <span className="small muted">Optional</span>
        </div>
        <textarea
          className="textarea"
          placeholder="How you want today to go, what to watch out for…"
          value={plan}
          onChange={(event) => onPlanChange(event.target.value)}
        />
      </section>
    </>
  )
}

function PlanRow({
  task,
  isMit,
  mitFull,
  onToggleMit
}: {
  task: Task
  isMit: boolean
  mitFull: boolean
  onToggleMit: () => void
}): React.JSX.Element {
  return (
    <div className="task-row">
      <button
        type="button"
        className={`icon-btn${isMit ? ' icon-btn--on' : ''}`}
        disabled={!isMit && mitFull}
        title={isMit ? 'Remove from Focus' : mitFull ? 'Three is the limit' : 'Make this one of today’s three'}
        onClick={onToggleMit}
      >
        {isMit ? '★' : '☆'}
      </button>
      <div className="task-row__main">
        <span>{task.title}</span>
        <div className="task-row__meta">
          {task.startAt && (
            <span className="chip chip--time">
              {new Date(task.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {task.estimateMinutes != null ? (
            <span className="chip">{formatMinutes(task.estimateMinutes)} est</span>
          ) : (
            <span className="chip chip--warn">no estimate</span>
          )}
          {task.habitId && <span className="chip">habit</span>}
        </div>
      </div>
    </div>
  )
}
