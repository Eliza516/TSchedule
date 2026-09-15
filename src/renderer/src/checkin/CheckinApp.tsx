import { useEffect, useMemo, useState } from 'react'
import type { CheckinPayload, TriageDecision } from '@shared/types'
import { dayLabel, startOfDay } from '@shared/time'
import { api, report, useToasts } from '../api'
import { EveningFlow, type EveningNotes } from './EveningFlow'
import { MorningFlow } from './MorningFlow'

const EMPTY_NOTES: EveningNotes = {
  wentWell: '',
  blocked: '',
  tomorrowPriority: '',
  mood: null,
  energy: null
}

/**
 * The check-in window. It has no close button and ignores Escape by design -
 * the only ways out are finishing it or spending one of a limited number of
 * snoozes.
 */
export function CheckinApp(): React.JSX.Element {
  const [payload, setPayload] = useState<CheckinPayload | null>(null)
  const [decisions, setDecisions] = useState<Map<string, TriageDecision>>(new Map())
  const [mitIds, setMitIds] = useState<string[]>([])
  const [plan, setPlan] = useState('')
  const [notes, setNotes] = useState<EveningNotes>(EMPTY_NOTES)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToasts()

  function load(): void {
    void api.invoke('checkin:payload').then((next) => {
      setPayload(next)
      if (!next) return
      setMitIds(next.dayTasks.filter((task) => task.isMit).map((task) => task.id))
      setPlan(next.note?.morningPlanMd ?? '')
      setNotes({
        wentWell: next.note?.wentWellMd ?? '',
        blocked: next.note?.blockedMd ?? '',
        tomorrowPriority: next.note?.tomorrowPriority ?? '',
        mood: next.note?.mood ?? null,
        energy: next.note?.energy ?? null
      })
    })
  }

  useEffect(load, [])
  // Adding a task from inside the check-in has to show up in the list below it.
  useEffect(() => api.on('data:changed', () => load()), [])

  const required = useMemo(() => {
    if (!payload) return []
    return payload.kind === 'morning'
      ? payload.carryOver
      : payload.dayTasks.filter((task) => task.status !== 'done' && task.status !== 'dropped')
  }, [payload])

  const outstanding = required.filter((task) => {
    const decision = decisions.get(task.id)
    if (!decision) return true
    if (decision.action === 'done') return false
    if (decision.action === 'pick_date' && !decision.day) return true
    return decision.reason == null
  })

  function decide(decision: TriageDecision): void {
    setDecisions((current) => new Map(current).set(decision.taskId, decision))
  }

  function toggleMit(taskId: string): void {
    setMitIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : current.length >= 3
          ? current
          : [...current, taskId]
    )
  }

  function submit(): void {
    if (!payload || outstanding.length > 0 || submitting) return
    setSubmitting(true)
    const triage = [...decisions.values()]

    const request =
      payload.kind === 'morning'
        ? api.invoke('checkin:submitMorning', {
            day: payload.day,
            triage,
            mitTaskIds: mitIds,
            planMd: plan.trim() || null
          })
        : api.invoke('checkin:submitEvening', {
            day: payload.day,
            triage,
            wentWellMd: notes.wentWell.trim() || null,
            blockedMd: notes.blocked.trim() || null,
            tomorrowPriority: notes.tomorrowPriority.trim() || null,
            mood: notes.mood,
            energy: notes.energy
          })

    void request.catch((error) => {
      setSubmitting(false)
      report(error)
    })
  }

  if (!payload) {
    return (
      <div className="checkin">
        <div className="checkin__body">
          <div className="empty">
            <strong>Nothing to check in on</strong>
            This window can be closed.
          </div>
        </div>
        <footer className="checkin__foot">
          <span className="spacer" />
          <button type="button" className="btn" onClick={() => void api.invoke('checkin:snooze').catch(report)}>
            Close
          </button>
        </footer>
      </div>
    )
  }

  const morning = payload.kind === 'morning'
  const snoozesLeft = Math.max(0, payload.maxSnoozes - payload.snoozeCount)
  const canSnooze = payload.strictness !== 'strict' && snoozesLeft > 0

  return (
    <div className="checkin">
      <header className="checkin__bar">
        <div style={{ flex: 1 }}>
          <div className="checkin__eyebrow">
            {payload.overdue ? 'Unfinished business' : morning ? 'Good morning' : 'End of day'}
          </div>
          <h1 className="checkin__title">
            {morning ? 'Plan today' : `Wrap up ${dayLabel(payload.day, payload.today)}`}
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="small muted">
            {startOfDay(payload.day).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </div>
          {payload.streak > 0 && (
            <div className="chip chip--accent">{payload.streak} day streak</div>
          )}
        </div>
      </header>

      <div className="checkin__body">
        {morning ? (
          <MorningFlow
            payload={payload}
            decisions={decisions}
            onDecide={decide}
            mitIds={mitIds}
            onToggleMit={toggleMit}
            plan={plan}
            onPlanChange={setPlan}
            staleAfter={3}
          />
        ) : (
          <EveningFlow
            payload={payload}
            decisions={decisions}
            onDecide={decide}
            notes={notes}
            onNotesChange={(patch) => setNotes((current) => ({ ...current, ...patch }))}
            staleAfter={3}
          />
        )}
      </div>

      <footer className="checkin__foot">
        <span className="small muted" style={{ flex: 1 }}>
          {outstanding.length > 0
            ? `${outstanding.length} task${outstanding.length === 1 ? '' : 's'} still need${
                outstanding.length === 1 ? 's' : ''
              } a decision`
            : morning
              ? 'Ready. Go and have the day you just planned.'
              : 'Ready. That is the day closed out.'}
        </span>

        {canSnooze && (
          <button
            type="button"
            className="btn"
            onClick={() => void api.invoke('checkin:snooze').catch(report)}
          >
            Snooze {payload.snoozeMinutes} min
            <span className="muted"> ({snoozesLeft} left)</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn--primary"
          disabled={outstanding.length > 0 || submitting}
          onClick={submit}
        >
          {morning ? 'Start the day' : 'Close out the day'}
        </button>
      </footer>

      {toast && <div className={`toast${toast.kind === 'error' ? ' toast--error' : ''}`}>{toast.message}</div>}
    </div>
  )
}
