import { Notification } from 'electron'
import type { Milestone, NotificationRoute, Task } from '@shared/types'
import { formatMinutes } from '@shared/time'
import { showMainWindow } from '../windows'

export interface NotifyOptions {
  title: string
  body: string
  route?: NotificationRoute
  actionLabel?: string
  onAction?: () => void
  silent?: boolean
}

/**
 * All notifications go through here so clicking one always lands the user in
 * the right place instead of just raising a blank window.
 */
export function notify(options: NotifyOptions): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: options.silent ?? true,
    actions: options.actionLabel ? [{ type: 'button', text: options.actionLabel }] : undefined
  })

  notification.on('click', () => showMainWindow(options.route ?? { view: 'today' }))
  if (options.onAction) {
    notification.on('action', () => options.onAction?.())
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

export function notifyTaskStart(task: Task, onStartTimer: () => void): void {
  const estimate = task.estimateMinutes ? ` · est. ${formatMinutes(task.estimateMinutes)}` : ''
  notify({
    title: 'Now',
    body: `${task.title}${estimate}`,
    route: { view: 'today', taskId: task.id, day: task.day },
    actionLabel: 'Start timer',
    onAction: onStartTimer
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
