import type { TimerState } from '@shared/types'
import { formatClock } from '@shared/time'
import { api, report } from '../api'

/**
 * The timer runs in the main process, so this is purely a readout with
 * controls - closing the window does not stop the clock.
 */
export function TimerWidget({ state }: { state: TimerState }): React.JSX.Element {
  const idle = state.phase === 'idle'
  const seconds = state.remainingSeconds ?? state.elapsedSeconds
  const progress =
    state.remainingSeconds != null && state.elapsedSeconds + state.remainingSeconds > 0
      ? state.elapsedSeconds / (state.elapsedSeconds + state.remainingSeconds)
      : 0

  return (
    <section className="card timer">
      <div className="card__title">
        {state.phase === 'break' ? 'Break' : 'Focus'}
        {state.completedSessions > 0 && (
          <span className="chip" style={{ marginLeft: 'auto' }}>
            {state.completedSessions} done
          </span>
        )}
      </div>

      <div className={`timer__clock${state.phase === 'break' ? ' timer__clock--break' : ''}`}>
        {idle ? '—' : formatClock(seconds)}
      </div>
      <p className="timer__task">
        {idle ? 'Press ▶ on a task to start' : (state.taskTitle ?? 'Focus session')}
      </p>

      {!idle && state.remainingSeconds != null && (
        <div className="timer__ring">
          <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}

      <div className="timer__actions">
        {idle ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void api.invoke('timer:start', null, 'pomodoro').catch(report)}
            >
              Pomodoro
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void api.invoke('timer:start', null, 'free').catch(report)}
            >
              Stopwatch
            </button>
          </>
        ) : (
          <>
            {state.phase === 'paused' ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => void api.invoke('timer:resume').catch(report)}
              >
                Resume
              </button>
            ) : (
              <button type="button" className="btn btn--sm" onClick={() => void api.invoke('timer:pause').catch(report)}>
                Pause
              </button>
            )}
            {state.phase === 'break' ? (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => void api.invoke('timer:skipBreak').catch(report)}
              >
                Skip break
              </button>
            ) : (
              <button type="button" className="btn btn--sm" onClick={() => void api.invoke('timer:stop').catch(report)}>
                Stop
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
