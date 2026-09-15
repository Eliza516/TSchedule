import { useState } from 'react'
import { toDayString } from '@shared/time'
import { parseQuickAdd } from '@shared/quickAdd'
import { api, report, useLive } from '../api'

/**
 * Whatever the capture hotkey could not turn into a dated task lands here, so
 * a thought can be dumped mid-work and sorted out later.
 */
export function Inbox(): React.JSX.Element {
  const [items] = useLive(() => api.invoke('inbox:list'), [])
  const [goals] = useLive(() => api.invoke('goals:list'), [])
  const [text, setText] = useState('')

  function add(event: React.FormEvent): void {
    event.preventDefault()
    if (!text.trim()) return
    void api
      .invoke('inbox:add', text.trim())
      .then(() => setText(''))
      .catch(report)
  }

  function convert(id: string, itemText: string, day: string): void {
    const parsed = parseQuickAdd(itemText, {
      now: Date.now(),
      goals: goals.map((goal) => ({ id: goal.id, title: goal.title }))
    })
    void api
      .invoke('inbox:convert', id, {
        title: parsed.title || itemText,
        day,
        startAt: parsed.startAt,
        estimateMinutes: parsed.estimateMinutes,
        goalId: parsed.goalId,
        tags: parsed.tags
      })
      .catch(report)
  }

  const today = toDayString(Date.now())
  const tomorrow = toDayString(Date.now() + 86_400_000)

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">Inbox</h1>
          <p className="view__subtitle">Caught mid-work, sorted out later</p>
        </div>
      </header>

      <div className="view__body">
        <form className="composer" onSubmit={add}>
          <input
            className="composer__input"
            placeholder="Something to deal with later…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </form>

        <div className="stack" style={{ marginTop: 18 }}>
          {items.length === 0 && (
            <div className="empty">
              <strong>Inbox zero</strong>
              Press your capture shortcut from any app to throw something in here.
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="task-row">
              <div className="task-row__main">
                <span>{item.text}</span>
                <div className="task-row__meta">
                  <span className="chip">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button type="button" className="btn btn--sm" onClick={() => convert(item.id, item.text, today)}>
                  Today
                </button>
                <button type="button" className="btn btn--sm" onClick={() => convert(item.id, item.text, tomorrow)}>
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Discard"
                  onClick={() => void api.invoke('inbox:delete', item.id).catch(report)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
