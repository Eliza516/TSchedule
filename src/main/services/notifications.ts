import { Notification } from 'electron'
import type { Milestone, NotificationRoute, Task } from '@shared/types'
import { formatMinutes } from '@shared/time'
import { showMainWindow } from '../windows'

export interface NotifyAction {
  label: string
  run: () => void
}

export interface NotifyOptions {
  title: string
  body: string
  route?: NotificationRoute
  /** macOS shows the first one as a button and the rest on hover. */
  actions?: NotifyAction[]
  silent?: boolean
}

/**
 * All notifications go through here so clicking one always lands the user in
 * the right place instead of just raising a blank window.
 */
export function notify(options: NotifyOptions): void {
  if (!Notification.isSupported()) return

  const actions = options.actions ?? []
  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: options.silent ?? true,
    actions: actions.map((action) => ({ type: 'button' as const, text: action.label }))
  })

  notification.on('click', () => showMainWindow(options.route ?? { view: 'today' }))
  if (actions.length > 0) {
    notification.on('action', (_event, index) => actions[index]?.run())
  }
  notification.show()
}

export function notifyTaskLead(task: Task, minutesBefore: number): void {
  const estimate = task.estimateMinutes ? ` · est. ${formatMinutes(task.estimateMinutes)}` : ''
  notify({
    title: `Starting in ${formatMinutes(minutesBefore)}`,
    body: `${task.title}${estimate}`,
    route: { view: 'today', taskId: task.id, day: task.day }
  })
}

/**
 * The moment a task is due. A task that carries something to open - a course
 * page, a book on disk - offers that first: the whole point is that starting
 * should be one click away from the notification.
 */
export function notifyTaskStart(
  task: Task,
  handlers: { onStartTimer: () => void; onOpen?: (() => void) | null }
): void {
  const estimate = task.estimateMinutes ? ` · est. ${formatMinutes(task.estimateMinutes)}` : ''
  const actions: NotifyAction[] = []
  if (handlers.onOpen) actions.push({ label: 'Open', run: handlers.onOpen })
  actions.push({ label: 'Start timer', run: handlers.onStartTimer })

  notify({
    title: 'Now',
    body: `${task.title}${estimate}`,
    route: { view: 'today', taskId: task.id, day: task.day },
    actions
  })
}

export function notifyNeglectedGoal(title: string, daysIdle: number, daysLeft: number | null): void {
  const deadline = daysLeft == null ? '' : ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
  notify({
    title: `No progress on "${title}" for ${daysIdle} days`,
    body: `Give it one small task today${deadline}`,
    route: { view: 'goals' }
  })
}

export function notifyMilestoneDue(milestone: Milestone & { goalTitle: string }): void {
  notify({
    title: `Milestone due: ${milestone.title}`,
    body: milestone.goalTitle,
    route: { view: 'goals', goalId: milestone.goalId }
  })
}

export function notifySessionEnd(title: string, body: string): void {
  notify({ title, body, silent: false, route: { view: 'today' } })
}
