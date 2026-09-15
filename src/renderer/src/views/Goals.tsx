import { useState } from 'react'
import type { GoalWithProgress } from '@shared/types'
import { formatMinutes, toDayString } from '@shared/time'
import { api, report, useLive } from '../api'
import { Countdown } from '../components/Chips'

export function Goals(): React.JSX.Element {
  const [goals] = useLive(() => api.invoke('goals:list'), [])
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const open = goals.find((goal) => goal.id === openId)
  if (open) return <GoalDetail goal={open} onBack={() => setOpenId(null)} />

  const active = goals.filter((goal) => goal.status === 'active')
  const finished = goals.filter((goal) => goal.status !== 'active')

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">Goals</h1>
          <p className="view__subtitle">The long things: exam dates, deadlines, anything worth counting down to</p>
        </div>
        <div className="view__bar-end">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            New goal
          </button>
        </div>
      </header>

      <div className="view__body stack" style={{ gap: 18 }}>
        {adding && <GoalForm onDone={() => setAdding(false)} />}

        {active.length === 0 && !adding && (
          <div className="empty">
            <strong>No goals yet</strong>
            Add the exam you are preparing for, and every day will show how long is left.
          </div>
        )}

        {active.length > 0 && (
          <div className="goal-grid">
            {active.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onOpen={() => setOpenId(goal.id)} />
            ))}
          </div>
        )}

        {finished.length > 0 && (
          <section>
            <h2 className="task-group__title">Finished &amp; archived</h2>
            <div className="goal-grid">
              {finished.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onOpen={() => setOpenId(goal.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function GoalCard({ goal, onOpen }: { goal: GoalWithProgress; onOpen: () => void }): React.JSX.Element {
  const { progress } = goal
  return (
    <button type="button" className="card goal-card" onClick={onOpen}>
      <div className="goal-card__head">
        <span className="dot" style={goal.color ? { background: goal.color } : undefined} />
        <span className="goal-card__title">{goal.title}</span>
        <Countdown days={progress.daysLeft} />
      </div>

      <div className="progress">
        <span style={{ width: `${Math.round(progress.progress * 100)}%` }} />
      </div>

      <div className="row row--wrap small muted">
        <span>{Math.round(progress.progress * 100)}%</span>
        {progress.milestonesTotal > 0 && (
          <span>· {progress.milestonesDone}/{progress.milestonesTotal} milestones</span>
        )}
        {progress.tasksTotal > 0 && <span>· {progress.tasksDone}/{progress.tasksTotal} tasks</span>}
        {progress.minutesLogged > 0 && <span>· {formatMinutes(progress.minutesLogged)} logged</span>}
      </div>

      {progress.neglected && (
        <span className="chip chip--warn">
          {progress.daysSinceProgress == null
            ? 'Never worked on'
            : `No progress for ${progress.daysSinceProgress} days`}
        </span>
      )}
    </button>
  )
}

function GoalDetail({ goal, onBack }: { goal: GoalWithProgress; onBack: () => void }): React.JSX.Element {
  const [tasks] = useLive(() => api.invoke('goals:tasks', goal.id), [], [goal.id])
  const [notes, setNotes] = useState(goal.notesMd ?? '')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDue, setMilestoneDue] = useState('')
  const [editing, setEditing] = useState(false)

  function saveNotes(): void {
    if (notes === (goal.notesMd ?? '')) return
    void api.invoke('goals:update', goal.id, { notesMd: notes }).catch(report)
  }

  function addMilestone(event: React.FormEvent): void {
    event.preventDefault()
    if (!milestoneTitle.trim()) return
    void api
      .invoke('milestones:create', {
        goalId: goal.id,
        title: milestoneTitle.trim(),
        dueDate: milestoneDue || null
      })
      .then(() => {
        setMilestoneTitle('')
        setMilestoneDue('')
      })
      .catch(report)
  }

  return (
    <div className="view">
      <header className="view__bar">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
          ← Goals
        </button>
        <div>
          <h1 className="view__title">{goal.title}</h1>
          <p className="view__subtitle">
            {goal.targetDate ? `Target ${goal.targetDate}` : 'No target date'} ·{' '}
            {Math.round(goal.progress.progress * 100)}% done
          </p>
        </div>
        <div className="view__bar-end">
          <Countdown days={goal.progress.daysLeft} />
          <button type="button" className="btn btn--sm" onClick={() => setEditing((value) => !value)}>
            Edit
          </button>
        </div>
      </header>

      <div className="view__body">
        {editing && <GoalForm goal={goal} onDone={() => setEditing(false)} />}

        <div className="view__split">
          <div className="stack" style={{ gap: 18 }}>
            <section className="card">
              <div className="card__title">Milestones</div>
              {goal.milestones.length === 0 && (
                <p className="small muted">Break the goal into checkpoints so progress is visible before the deadline.</p>
              )}
              <div className="milestone-list">
                {goal.milestones.map((milestone) => {
                  const overdue =
                    milestone.dueDate != null &&
                    milestone.doneAt == null &&
                    milestone.dueDate < toDayString(Date.now())
                  return (
                    <div key={milestone.id} className={`milestone${milestone.doneAt ? ' milestone--done' : ''}`}>
                      <button
                        type="button"
                        className="task-row__check"
                        role="checkbox"
                        aria-checked={milestone.doneAt != null}
                        aria-label={milestone.title}
                        onClick={() => void api.invoke('milestones:toggle', milestone.id).catch(report)}
                      />
                      <span className="milestone__title">{milestone.title}</span>
                      {milestone.dueDate && (
                        <span className={`chip${overdue ? ' chip--danger' : ''}`}>{milestone.dueDate}</span>
                      )}
                      <button
                        type="button"
                        className="icon-btn"
                        title="Delete milestone"
                        onClick={() => void api.invoke('milestones:delete', milestone.id).catch(report)}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>

              <form className="row" style={{ marginTop: 10 }} onSubmit={addMilestone}>
                <input
                  className="input input--inline"
                  placeholder="Add a milestone"
                  value={milestoneTitle}
                  onChange={(event) => setMilestoneTitle(event.target.value)}
                />
                <input
                  className="input input--inline"
                  style={{ width: 150 }}
                  type="date"
                  value={milestoneDue}
                  onChange={(event) => setMilestoneDue(event.target.value)}
                />
                <button type="submit" className="btn btn--sm">
                  Add
                </button>
              </form>
            </section>

            <section className="card">
              <div className="card__title">Notes</div>
              <textarea
                className="textarea"
                style={{ minHeight: 160 }}
                placeholder="What needs preparing, what the exam covers, where you left off…"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={saveNotes}
              />
            </section>
          </div>

          <aside className="stack">
            <section className="card">
              <div className="card__title">Linked work</div>
              {tasks.length === 0 ? (
                <p className="small muted">
                  Tag a daily task with <code>@{goal.title.split(' ')[0].toLowerCase()}</code> to tie it to this goal.
                </p>
              ) : (
                <div className="stack" style={{ gap: 5 }}>
                  {tasks.slice(0, 12).map((task) => (
                    <div key={task.id} className="row small">
                      <span className={task.status === 'done' ? 'muted' : ''} style={{ flex: 1 }}>
                        {task.status === 'done' ? '✓ ' : '· '}
                        {task.title}
                      </span>
                      <span className="muted tabular">{task.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <div className="card__title">Danger zone</div>
              <div className="stack" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn btn--sm btn--block"
                  onClick={() =>
                    void api
                      .invoke('goals:update', goal.id, { status: goal.status === 'done' ? 'active' : 'done' })
                      .catch(report)
                  }
                >
                  {goal.status === 'done' ? 'Reopen goal' : 'Mark as achieved'}
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm btn--block"
                  onClick={() => {
                    void api.invoke('goals:delete', goal.id).then(onBack).catch(report)
                  }}
                >
                  Delete goal
                </button>
                <p className="small muted">Deleting keeps the tasks; they simply stop being linked.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

const COLORS = ['#2f6f66', '#6a4fbf', '#b4690e', '#a32a20', '#2a6099', '#7a3f6d']

function GoalForm({ goal, onDone }: { goal?: GoalWithProgress; onDone: () => void }): React.JSX.Element {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [color, setColor] = useState(goal?.color ?? COLORS[0])

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    if (!title.trim()) return
    const payload = { title: title.trim(), targetDate: targetDate || null, color }
    const request = goal
      ? api.invoke('goals:update', goal.id, payload)
      : api.invoke('goals:create', payload)
    void request.then(() => onDone()).catch(report)
  }

  return (
    <form className="card stack" onSubmit={submit} style={{ marginBottom: 18 }}>
      <div className="card__title">{goal ? 'Edit goal' : 'New goal'}</div>
      <div className="field-grid">
        <label className="field">
          <span className="field__label">Title</span>
          <input
            className="input"
            autoFocus
            placeholder="Final exam"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Target date</span>
          <input className="input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          <span className="field__hint">The day it has to be ready by</span>
        </label>
      </div>
      <div className="field">
        <span className="field__label">Colour</span>
        <div className="row">
          {COLORS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Colour ${value}`}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: value,
                border: color === value ? '2px solid var(--ink)' : '1px solid var(--line-strong)',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
      </div>
      <div className="row">
        <button type="submit" className="btn btn--primary btn--sm">
          {goal ? 'Save' : 'Create goal'}
        </button>
        <button type="button" className="btn btn--sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
