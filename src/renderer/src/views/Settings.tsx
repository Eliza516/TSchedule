import { useState } from 'react'
import type { AppSettings, Strictness } from '@shared/types'
import { toDayString } from '@shared/time'
import { api, report, showToast } from '../api'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => Promise<void>
}

export function Settings({ settings, onUpdate }: Props): React.JSX.Element {
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void => {
    void onUpdate({ [key]: value } as Partial<AppSettings>).catch(report)
  }

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">Settings</h1>
          <p className="view__subtitle">Stored locally in ~/Library/Application Support/TSchedule</p>
        </div>
      </header>

      <div className="view__body stack" style={{ gap: 18, maxWidth: 760 }}>
        <section className="card stack">
          <div className="card__title">Daily check-ins</div>
          <div className="field-grid">
            <Time
              label="Evening wrap-up at"
              hint="When the wrap-up opens on its own"
              value={settings.eveningCheckinTime}
              onChange={(value) => set('eveningCheckinTime', value)}
            />
            <Time
              label="Morning window opens"
              hint="The planning prompt waits until after this"
              value={settings.morningWindowStart}
              onChange={(value) => set('morningWindowStart', value)}
            />
            <Time
              label="Evening window opens"
              hint="After this, quitting or locking counts as ending the day"
              value={settings.eveningWindowStart}
              onChange={(value) => set('eveningWindowStart', value)}
            />
            <label className="field">
              <span className="field__label">How insistent</span>
              <select
                className="select"
                value={settings.strictness}
                onChange={(event) => set('strictness', event.target.value as Strictness)}
              >
                <option value="soft">Gentle — the window can be left alone</option>
                <option value="medium">Firm — no close button, limited snoozes</option>
                <option value="strict">Strict — no snooze at all</option>
              </select>
              <span className="field__hint">
                Firm and strict also pull focus back if you click away.
              </span>
            </label>
            <Number
              label="Snooze length (minutes)"
              value={settings.snoozeMinutes}
              min={1}
              max={120}
              onChange={(value) => set('snoozeMinutes', value)}
            />
            <Number
              label="Snoozes allowed per check-in"
              value={settings.maxSnoozes}
              min={0}
              max={10}
              onChange={(value) => set('maxSnoozes', value)}
            />
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={settings.requireEstimates}
              onChange={(event) => set('requireEstimates', event.target.checked)}
            />
            <span>Warn when a planned task has no estimate</span>
          </label>

          <p className="small muted">
            macOS gives an app only a few hundred milliseconds when the lid closes — not enough to show a form. So a day
            you never closed out is remembered, and the wrap-up for it opens the next time you use the machine, before
            anything else.
          </p>

          <div className="row">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void api.invoke('checkin:requestManual').catch(report)}
            >
              Open the wrap-up now
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() =>
                void api
                  .invoke('settings:resetCheckins', toDayString(Date.now()))
                  .then(() => showToast('Today’s check-ins reset — lock the screen to see the morning one'))
                  .catch(report)
              }
            >
              Reset today’s check-ins
            </button>
          </div>
        </section>

        <section className="card stack">
          <div className="card__title">Reminders &amp; timer</div>
          <div className="field-grid">
            <Number
              label="Remind me this early (minutes)"
              value={settings.defaultRemindMinutesBefore}
              min={0}
              max={120}
              onChange={(value) => set('defaultRemindMinutesBefore', value)}
            />
            <Number
              label="Pomodoro length"
              value={settings.pomodoroMinutes}
              min={5}
              max={120}
              onChange={(value) => set('pomodoroMinutes', value)}
            />
            <Number
              label="Short break"
              value={settings.shortBreakMinutes}
              min={0}
              max={60}
              onChange={(value) => set('shortBreakMinutes', value)}
            />
            <Number
              label="Long break"
              value={settings.longBreakMinutes}
              min={0}
              max={120}
              onChange={(value) => set('longBreakMinutes', value)}
            />
            <Number
              label="Long break every N sessions"
              value={settings.longBreakEvery}
              min={1}
              max={12}
              onChange={(value) => set('longBreakEvery', value)}
            />
          </div>
        </section>

        <section className="card stack">
          <div className="card__title">Planning</div>
          <div className="field-grid">
            <Number
              label="Hours in your working day"
              value={settings.workdayHours}
              min={1}
              max={16}
              onChange={(value) => set('workdayHours', value)}
            />
            <Number
              label="Flag a goal after N idle days"
              value={settings.neglectedGoalDays}
              min={1}
              max={60}
              onChange={(value) => set('neglectedGoalDays', value)}
            />
            <Number
              label="Call a task stale after N rollovers"
              value={settings.staleAfterRollovers}
              min={1}
              max={20}
              onChange={(value) => set('staleAfterRollovers', value)}
            />
          </div>
        </section>

        <section className="card stack">
          <div className="card__title">Shortcuts &amp; system</div>
          <div className="field-grid">
            <Text
              label="Quick capture"
              hint="Electron accelerator, e.g. CommandOrControl+Shift+Space"
              value={settings.captureShortcut}
              onChange={(value) => set('captureShortcut', value)}
            />
            <Text
              label="Wrap up my day"
              hint="Opens the evening check-in from anywhere"
              value={settings.wrapUpShortcut}
              onChange={(value) => set('wrapUpShortcut', value)}
            />
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.openAtLogin}
              onChange={(event) => set('openAtLogin', event.target.checked)}
            />
            <span>
              Open at login <span className="muted">— required for the morning check-in to catch you</span>
            </span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.hideDockIcon}
              onChange={(event) => set('hideDockIcon', event.target.checked)}
            />
            <span>Hide the Dock icon and live in the menu bar only</span>
          </label>
          <p className="small muted">
            If a shortcut is already taken by another app, macOS refuses it silently and the key simply does nothing —
            pick a different combination.
          </p>
        </section>

        <section className="card stack">
          <div className="card__title">Your data</div>
          <div className="row row--wrap">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() =>
                void api
                  .invoke('app:export')
                  .then((path) => path && showToast(`Exported to ${path}`))
                  .catch(report)
              }
            >
              Export backup (JSON)
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() =>
                void api
                  .invoke('app:exportMarkdown')
                  .then((path) => path && showToast(`Exported to ${path}`))
                  .catch(report)
              }
            >
              Export journal (Markdown)
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() =>
                void api
                  .invoke('app:import')
                  .then((done) => done && showToast('Backup restored'))
                  .catch(report)
              }
            >
              Restore from backup
            </button>
          </div>
          <p className="small muted">Everything stays on this machine. Nothing is uploaded anywhere.</p>
        </section>
      </div>
    </div>
  )
}

function Time({
  label,
  hint,
  value,
  onChange
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="input" type="time" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

function Number({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = globalThis.Number(event.target.value)
          if (!globalThis.isNaN(next) && next >= min && next <= max) onChange(next)
        }}
      />
    </label>
  )
}

function Text({
  label,
  hint,
  value,
  onChange
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(value)
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== value && onChange(draft)}
      />
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}
