import { useEffect, useRef, useState } from 'react'
import type { AppSettings, GoalWithProgress, Task } from '@shared/types'
import { toDayString } from '@shared/time'
import { parseDuration } from '@shared/quickAdd'
import { api, report, showToast } from '../api'
import { TaskChips } from './Chips'

interface Props {
  task: Task
  goals: GoalWithProgress[]
  settings: AppSettings
  running: boolean
  highlighted?: boolean
}

export function TaskRow({ task, goals, settings, running, highlighted }: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const rowRef = useRef<HTMLDivElement>(null)
  const goal = goals.find((g) => g.id === task.goalId)

  useEffect(() => setTitle(task.title), [task.title])
  useEffect(() => {
    if (highlighted) rowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlighted])

  const done = task.status === 'done'

  function commitTitle(): void {
    const next = title.trim()
    if (!next || next === task.title) {
      setTitle(task.title)
      return
    }
    void api.invoke('tasks:update', task.id, { title: next }).catch(report)
  }

  function toggleDone(): void {
    void api.invoke('tasks:setStatus', task.id, done ? 'todo' : 'done', null).catch(report)
  }

  function toggleMit(): void {
    void api.invoke('tasks:setMit', task.id, !task.isMit).catch(report)
  }

  function startTimer(): void {
    void api.invoke('timer:start', task.id, 'pomodoro').catch(report)
  }

  return (
    <div
      ref={rowRef}
      className={[
        'task-row',
        done ? 'task-row--done' : '',
        running ? 'task-row--running' : '',
        highlighted ? 'task-row--highlight' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="task-row__check"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        onClick={toggleDone}
      />

      <div className="task-row__main">
        <input
          className="task-row__title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              setTitle(task.title)
              event.currentTarget.blur()
            }
          }}
        />
        <TaskChips task={task} goalTitle={goal?.title} goalColor={goal?.color} staleAfter={settings.staleAfterRollovers} />
        {editing && <TaskEditor task={task} goals={goals} onClose={() => setEditing(false)} />}
      </div>

      <div className="task-row__actions">
        <button
          type="button"
          className={`icon-btn${task.isMit ? ' icon-btn--on' : ''}`}
          title={task.isMit ? 'Remove from Focus' : 'Pin as one of today’s 3'}
          onClick={toggleMit}
        >
          {task.isMit ? '★' : '☆'}
        </button>
        {!done && (
          <button type="button" className="icon-btn" title="Start a focus session" onClick={startTimer}>
            ▶
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          title="Edit details"
          aria-expanded={editing}
          onClick={() => setEditing((value) => !value)}
        >
          ⋯
        </button>
      </div>
    </div>
  )
}

/** The inline detail editor: time, estimate, goal, tags, notes. */
function TaskEditor({
  task,
  goals,
  onClose
}: {
  task: Task
  goals: GoalWithProgress[]
  onClose: () => void
}): React.JSX.Element {
  const [time, setTime] = useState(
    task.startAt ? new Date(task.startAt).toTimeString().slice(0, 5) : ''
  )
  const [estimate, setEstimate] = useState(task.estimateMinutes ? String(task.estimateMinutes) : '')
  const [day, setDay] = useState(task.day)
  const [goalId, setGoalId] = useState(task.goalId ?? '')
  const [tags, setTags] = useState(task.tags.join(', '))
  const [notes, setNotes] = useState(task.notes ?? '')

  function save(): void {
    const [y, m, d] = day.split('-').map(Number)
    let startAt: number | null = null
    if (time) {
      const [hh, mm] = time.split(':').map(Number)
      startAt = new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
    }
    const parsedEstimate = estimate ? parseDuration(estimate) : null

    void api
      .invoke('tasks:update', task.id, {
        day,
        startAt,
        estimateMinutes: parsedEstimate,
        goalId: goalId || null,
        notes: notes.trim() || null,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
      .then(() => onClose())
      .catch(report)
  }

  function remove(): void {
    void api
      .invoke('tasks:delete', task.id)
      .then(() => showToast('Task deleted'))
      .catch(report)
  }

  return (
    <div className="stack" style={{ marginTop: 10 }}>
      <div className="field-grid">
        <label className="field">
          <span className="field__label">Day</span>
          <input className="input input--inline" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Start time</span>
          <input className="input input--inline" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Estimate</span>
          <input
            className="input input--inline"
            placeholder="45m, 1h30"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Goal</span>
          <select className="select input--inline" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">No goal</option>
            {goals
              .filter((goal) => goal.status === 'active')
              .map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Tags</span>
          <input
            className="input input--inline"
            placeholder="work, deep"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span className="field__label">Notes</span>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="row">
        <button type="button" className="btn btn--primary btn--sm" onClick={save}>
          Save
        </button>
        <button type="button" className="btn btn--sm" onClick={onClose}>
          Cancel
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn--danger btn--sm" onClick={remove}>
          Delete
        </button>
      </div>
      {task.originalDay && task.originalDay !== task.day && (
        <p className="small muted">First planned for {task.originalDay}. Today is {toDayString(Date.now())}.</p>
      )}
    </div>
  )
}
