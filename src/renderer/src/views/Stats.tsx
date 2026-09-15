import { useState } from 'react'
import type { StatsBucket, StatsReport } from '@shared/types'
import { NOT_DONE_REASON_LABELS } from '@shared/types'
import { addDays, formatMinutes, startOfDay, startOfWeek, toDayString } from '@shared/time'
import { describeAccuracy } from '@shared/stats'
import { api, useLive } from '../api'

const EMPTY: StatsReport = {
  from: '',
  to: '',
  totalMinutes: 0,
  completionRate: null,
  tasksDone: 0,
  tasksPlanned: 0,
  pomodoros: 0,
  accuracy: { ratio: null, sampleSize: 0, estimatedMinutes: 0, actualMinutes: 0 },
  byTag: [],
  byGoal: [],
  byDay: [],
  notDoneReasons: [],
  checkinStreak: 0,
  checkinRate: null
}

type Range = 'week' | 'month' | 'quarter'

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: 'week', label: 'This week', days: 7 },
  { key: 'month', label: 'Last 4 weeks', days: 28 },
  { key: 'quarter', label: 'Last 12 weeks', days: 84 }
]

export function Stats(): React.JSX.Element {
  const today = toDayString(Date.now())
  const [range, setRange] = useState<Range>('month')

  const from = range === 'week' ? startOfWeek(today) : addDays(today, -(RANGES.find((r) => r.key === range)!.days - 1))
  const [report] = useLive(() => api.invoke('stats:report', from, today), EMPTY, [from, today])

  const accuracyNote = describeAccuracy(report.accuracy)
  const totalReasons = report.notDoneReasons.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <div className="view">
      <header className="view__bar">
        <div>
          <h1 className="view__title">Stats</h1>
          <p className="view__subtitle">
            {startOfDay(from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} —{' '}
            {startOfDay(today).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="view__bar-end">
          {RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              className="pick"
              aria-pressed={range === option.key}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="view__body stack" style={{ gap: 20 }}>
        <div className="stat-tiles">
          <Tile value={formatMinutes(report.totalMinutes)} label="Time logged" />
          <Tile value={`${report.tasksDone}/${report.tasksPlanned}`} label="Tasks finished" />
          <Tile
            value={report.completionRate == null ? '—' : `${Math.round(report.completionRate * 100)}%`}
            label="Completion rate"
          />
          <Tile value={String(report.pomodoros)} label="Pomodoros" />
          <Tile value={String(report.checkinStreak)} label="Wrap-up streak" />
          <Tile
            value={report.checkinRate == null ? '—' : `${Math.round(report.checkinRate * 100)}%`}
            label="Days closed out"
          />
        </div>

        <section className="card">
          <div className="card__title">Estimates vs reality</div>
          {accuracyNote ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 600 }}>{accuracyNote}</p>
              <p className="small muted">
                Across {report.accuracy.sampleSize} finished tasks: {formatMinutes(report.accuracy.estimatedMinutes)}{' '}
                estimated, {formatMinutes(report.accuracy.actualMinutes)} actually spent.
              </p>
            </>
          ) : (
            <p className="small muted">
              Finish a few more tasks with both an estimate and a timer run, and this will tell you how far off your
              guesses usually are.
            </p>
          )}
        </section>

        <section className="card">
          <div className="card__title">Time per day</div>
          {report.byDay.every((entry) => entry.minutes === 0) ? (
            <p className="small muted">Nothing logged in this range yet.</p>
          ) : (
            <DayBars byDay={report.byDay} />
          )}
        </section>

        <div className="view__split" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <BucketCard title="By goal" buckets={report.byGoal} empty="No work linked to a goal yet." />
          <BucketCard title="By tag" buckets={report.byTag} empty="No tagged work yet." />
        </div>

        <section className="card">
          <div className="card__title">Why things did not get done</div>
          {totalReasons === 0 ? (
            <p className="small muted">Nothing has been marked as unfinished with a reason yet.</p>
          ) : (
            <div className="bars">
              {report.notDoneReasons.map((entry) => (
                <div key={entry.reason}>
                  <div className="bar__head">
                    <span>{NOT_DONE_REASON_LABELS[entry.reason]}</span>
                    <span className="tabular muted">{entry.count}</span>
                  </div>
                  <div className="bar__track">
                    <span className="bar__fill" style={{ width: `${(entry.count / totalReasons) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
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

function BucketCard({
  title,
  buckets,
  empty
}: {
  title: string
  buckets: StatsBucket[]
  empty: string
}): React.JSX.Element {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.minutes))
  return (
    <section className="card">
      <div className="card__title">{title}</div>
      {buckets.length === 0 ? (
        <p className="small muted">{empty}</p>
      ) : (
        <div className="bars">
          {buckets.slice(0, 8).map((bucket) => (
            <div key={bucket.key}>
              <div className="bar__head">
                <span>{bucket.label}</span>
                <span className="tabular muted">{formatMinutes(bucket.minutes)}</span>
              </div>
              <div className="bar__track">
                <span
                  className="bar__fill"
                  style={{
                    width: `${(bucket.minutes / max) * 100}%`,
                    background: bucket.color ?? undefined
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function DayBars({ byDay }: { byDay: StatsReport['byDay'] }): React.JSX.Element {
  const max = Math.max(1, ...byDay.map((entry) => entry.minutes))
  // Long ranges get too crowded to label every column.
  const labelEvery = byDay.length > 31 ? 7 : byDay.length > 14 ? 2 : 1

  return (
    <div className="day-bars">
      {byDay.map((entry, index) => (
        <div key={entry.day} className="day-bars__col" title={`${entry.day} · ${formatMinutes(entry.minutes)}`}>
          <span
            className="day-bars__bar"
            style={{ height: `${Math.max(2, (entry.minutes / max) * 76)}px`, opacity: entry.minutes ? 1 : 0.25 }}
          />
          <span className="day-bars__label">
            {index % labelEvery === 0 ? startOfDay(entry.day).getDate() : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
