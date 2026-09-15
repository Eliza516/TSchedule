import type {
  AppSettings,
  CaptureResult,
  CheckinPayload,
  CheckinStatusSummary,
  DailyNote,
  DayString,
  DaySummary,
  EveningSubmission,
  Goal,
  GoalDraft,
  GoalWithProgress,
  Habit,
  HabitDraft,
  HabitWithStreak,
  InboxItem,
  Milestone,
  MilestoneDraft,
  MorningSubmission,
  NotDoneReason,
  NotificationRoute,
  StatsReport,
  Task,
  TaskDraft,
  TaskPatch,
  TaskStatus,
  TimeEntry,
  TimerMode,
  TimerState
} from './types'

/**
 * The full surface the renderer may call. Each entry is written as a plain
 * function signature; the preload bridge wraps the return value in a Promise,
 * so main and renderer cannot drift apart without the typechecker noticing.
 */
export interface IpcContract {
  'settings:get': () => AppSettings
  'settings:update': (patch: Partial<AppSettings>) => AppSettings
  'settings:resetCheckins': (day: DayString) => void

  'tasks:listDay': (day: DayString) => Task[]
  'tasks:listRange': (from: DayString, to: DayString) => Task[]
  'tasks:listOpenBefore': (day: DayString) => Task[]
  'tasks:get': (id: string) => Task | null
  'tasks:create': (draft: TaskDraft) => Task
  'tasks:update': (id: string, patch: TaskPatch) => Task
  'tasks:setStatus': (id: string, status: TaskStatus, reason: NotDoneReason | null) => Task
  'tasks:setMit': (id: string, isMit: boolean) => Task[]
  'tasks:move': (id: string, day: DayString, beforeTaskId: string | null) => Task
  'tasks:delete': (id: string) => void
  'tasks:summary': (day: DayString) => DaySummary

  'goals:list': () => GoalWithProgress[]
  'goals:get': (id: string) => GoalWithProgress | null
  'goals:create': (draft: GoalDraft) => Goal
  'goals:update': (id: string, patch: Partial<GoalDraft> & { status?: Goal['status'] }) => Goal
  'goals:delete': (id: string) => void
  'goals:tasks': (id: string) => Task[]
  'milestones:create': (draft: MilestoneDraft) => Milestone
  'milestones:update': (id: string, patch: Partial<Omit<Milestone, 'id' | 'goalId'>>) => Milestone
  'milestones:toggle': (id: string) => Milestone
  'milestones:delete': (id: string) => void

  'habits:list': () => HabitWithStreak[]
  'habits:create': (draft: HabitDraft) => Habit
  'habits:update': (id: string, patch: Partial<HabitDraft> & { active?: boolean }) => Habit
  'habits:delete': (id: string) => void

  'timer:state': () => TimerState
  'timer:start': (taskId: string | null, mode: TimerMode) => TimerState
  'timer:pause': () => TimerState
  'timer:resume': () => TimerState
  'timer:stop': () => TimerState
  'timer:skipBreak': () => TimerState
  'timeEntries:listDay': (day: DayString) => TimeEntry[]

  'checkin:payload': () => CheckinPayload | null
  'checkin:status': () => CheckinStatusSummary
  'checkin:submitMorning': (submission: MorningSubmission) => void
  'checkin:submitEvening': (submission: EveningSubmission) => void
  'checkin:snooze': () => void
  'checkin:requestManual': () => void

  'notes:get': (day: DayString) => DailyNote | null
  'notes:save': (day: DayString, patch: Partial<Omit<DailyNote, 'day' | 'updatedAt'>>) => DailyNote

  'inbox:list': () => InboxItem[]
  'inbox:add': (text: string) => InboxItem
  'inbox:convert': (id: string, draft: TaskDraft) => Task
  'inbox:delete': (id: string) => void

  'capture:submit': (text: string) => CaptureResult
  'capture:close': () => void

  'stats:report': (from: DayString, to: DayString) => StatsReport

  'app:export': () => string | null
  'app:import': () => boolean
  'app:showMain': (route: NotificationRoute | null) => void
  'app:quit': () => void
}

export type IpcChannel = keyof IpcContract

/** Events pushed from main to every open window. */
export interface EventContract {
  'data:changed': { scope: 'tasks' | 'goals' | 'habits' | 'inbox' | 'notes' | 'all' }
  'timer:state': TimerState
  'checkin:state': CheckinStatusSummary
  'settings:changed': AppSettings
  navigate: NotificationRoute
}

export type EventChannel = keyof EventContract

export const IPC_CHANNELS: IpcChannel[] = [
  'settings:get',
  'settings:update',
  'settings:resetCheckins',
  'tasks:listDay',
  'tasks:listRange',
  'tasks:listOpenBefore',
  'tasks:get',
  'tasks:create',
  'tasks:update',
  'tasks:setStatus',
  'tasks:setMit',
  'tasks:move',
  'tasks:delete',
  'tasks:summary',
  'goals:list',
  'goals:get',
  'goals:create',
  'goals:update',
  'goals:delete',
  'goals:tasks',
  'milestones:create',
  'milestones:update',
  'milestones:toggle',
  'milestones:delete',
  'habits:list',
  'habits:create',
  'habits:update',
  'habits:delete',
  'timer:state',
  'timer:start',
  'timer:pause',
  'timer:resume',
  'timer:stop',
  'timer:skipBreak',
  'timeEntries:listDay',
  'checkin:payload',
  'checkin:status',
  'checkin:submitMorning',
  'checkin:submitEvening',
  'checkin:snooze',
  'checkin:requestManual',
  'notes:get',
  'notes:save',
  'inbox:list',
  'inbox:add',
  'inbox:convert',
  'inbox:delete',
  'capture:submit',
  'capture:close',
  'stats:report',
  'app:export',
  'app:import',
  'app:showMain',
  'app:quit'
]

export const EVENT_CHANNELS: EventChannel[] = [
  'data:changed',
  'timer:state',
  'checkin:state',
  'settings:changed',
  'navigate'
]
