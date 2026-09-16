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
  // A material's file lives in main, so the row asks for it once and only when
  // the task actually came from one.
  const [materialFilePath, setMaterialFilePath] = useState<string | null>(null)
  useEffect(() => {
    if (!task.materialId) {
      setMaterialFilePath(null)
      return
    }
    let cancelled = false
    void api.invoke('materials:list').then((materials) => {
      if (cancelled) return
      setMaterialFilePath(materials.find((m) => m.id === task.materialId)?.filePath ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [task.materialId])

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

  /** Whatever this task is about: a course page, a book, a link on a note. */
  function openSource(): void {
    if (task.url) void api.invoke('app:openExternal', task.url).catch(report)
    else if (materialFilePath) void api.invoke('app:openPath', materialFilePath).catch(report)
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
        {(task.url || materialFilePath) && (
          <button type="button" className="icon-btn" title="Open the course, book or link" onClick={openSource}>
            ↗
          </button>
        )}
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
  const [url, setUrl] = useState(task.url ?? '')
  const [doneUnits, setDoneUnits] = useState(task.doneUnits != null ? String(task.doneUnits) : '')

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
        url: url.trim() || null,
        ...(task.materialId ? { doneUnits: doneUnits === '' ? null : Number(doneUnits) } : {}),
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
        {task.materialId && (
          <label className="field">
            <span className="field__label">Đã học được</span>
            <input
              className="input input--inline"
              inputMode="numeric"
              placeholder={task.plannedUnits != null ? String(task.plannedUnits) : ''}
              value={doneUnits}
              onChange={(e) => setDoneUnits(e.target.value)}
            />
            <span className="field__hint">
              Ít hơn kế hoạch thì phần còn lại tự chia sang những ngày sau
            </span>
          </label>
        )}
        <label className="field">
          <span className="field__label">Link</span>
          <input
            className="input input--inline"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
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
