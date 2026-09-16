import { useState } from 'react'
import type { DayString, NotificationRoute } from '@shared/types'
import { toDayString } from '@shared/time'
import { api, report, useCheckinStatus, useEvent, useLive, useSettings, useTimer, useToasts } from './api'
import { Goals } from './views/Goals'
import { Habits } from './views/Habits'
import { Inbox } from './views/Inbox'
import { Settings } from './views/Settings'
import { Stats } from './views/Stats'
import { Today } from './views/Today'
import { Week } from './views/Week'

type View = 'today' | 'week' | 'goals' | 'habits' | 'stats' | 'inbox' | 'settings'

const NAV: { view: View; label: string; glyph: string }[] = [
  { view: 'today', label: 'Today', glyph: '📅' },
  { view: 'week', label: 'Week', glyph: '🗓' },
  { view: 'goals', label: 'Goals', glyph: '🎯' },
  { view: 'habits', label: 'Habits', glyph: '🔁' },
  { view: 'stats', label: 'Stats', glyph: '📊' },
  { view: 'inbox', label: 'Inbox', glyph: '📥' },
  { view: 'settings', label: 'Settings', glyph: '⚙️' }
]

export function App(): React.JSX.Element {
  const [view, setView] = useState<View>('today')
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null)
  const [routedDay, setRoutedDay] = useState<DayString | null>(null)
  const [settings, updateSettings] = useSettings()
  const timer = useTimer()
  const checkin = useCheckinStatus()
  const toast = useToasts()

  const [inboxItems] = useLive(() => api.invoke('inbox:list'), [])
  const [goals] = useLive(() => api.invoke('goals:list'), [])

  // Clicking a notification lands on the thing it was about.
  useEvent('navigate', (route: NotificationRoute) => {
    setView(route.view as View)
    setHighlightTaskId(route.taskId ?? null)
    setRoutedDay(route.day ?? null)
  })

  const neglected = goals.filter((goal) => goal.status === 'active' && goal.progress.neglected).length

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar__drag" />
        <div className="sidebar__brand">
          TSchedule <small>{toDayString(Date.now())}</small>
        </div>

        {NAV.map((item) => (
          <button
            key={item.view}
            type="button"
            className="nav-item"
            aria-current={view === item.view}
            onClick={() => {
              setView(item.view)
              setHighlightTaskId(null)
              setRoutedDay(null)
            }}
          >
            <span className="nav-item__glyph">{item.glyph}</span>
            {item.label}
            {item.view === 'inbox' && inboxItems.length > 0 && (
              <span className="nav-item__badge">{inboxItems.length}</span>
            )}
            {item.view === 'goals' && neglected > 0 && (
              <span className="nav-item__badge nav-item__badge--warn">{neglected}</span>
            )}
          </button>
        ))}

        <div className="sidebar__spacer" />

        {checkin.pending && (
          <button
            type="button"
            className="sidebar__cta"
            onClick={() => void api.invoke('checkin:requestManual').catch(report)}
          >
            <strong>
              {checkin.pending.overdue
                ? `Close out ${checkin.pending.day}`
                : checkin.pending.kind === 'morning'
                  ? 'Plan today'
                  : 'Wrap up today'}
            </strong>
            <span>
              {checkin.pending.overdue
                ? 'You never closed that day out'
                : 'Takes about a minute'}
            </span>
          </button>
        )}
      </nav>

      {view === 'today' && (
        <Today
          settings={settings}
          timer={timer}
          highlightTaskId={highlightTaskId}
          initialDay={routedDay}
          onOpenGoals={() => setView('goals')}
        />
      )}
      {view === 'week' && <Week settings={settings} />}
      {view === 'goals' && <Goals />}
      {view === 'habits' && <Habits />}
      {view === 'stats' && <Stats />}
      {view === 'inbox' && <Inbox />}
      {view === 'settings' && <Settings settings={settings} onUpdate={updateSettings} />}

      {toast && <div className={`toast${toast.kind === 'error' ? ' toast--error' : ''}`}>{toast.message}</div>}
    </div>
  )
}
