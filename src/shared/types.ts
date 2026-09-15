import type { DayString, Instant } from './time'

export type { DayString, Instant }

/* ------------------------------------------------------------------ tasks */

export type TaskStatus = 'todo' | 'doing' | 'done' | 'dropped'

export const NOT_DONE_REASONS = [
  'ran_out_of_time',
  'blocked',
  'underestimated',
  'not_important',
  'other'
] as const
export type NotDoneReason = (typeof NOT_DONE_REASONS)[number]

export const NOT_DONE_REASON_LABELS: Record<NotDoneReason, string> = {
  ran_out_of_time: 'Ran out of time',
  blocked: 'Blocked',
  underestimated: 'Underestimated it',
  not_important: 'Not important',
  other: 'Other'
}

export interface Task {
  id: string
  title: string
  notes: string | null
  day: DayString
  /** null = no fixed start time ("anytime today") */
  startAt: Instant | null
  estimateMinutes: number | null
  status: TaskStatus
  notDoneReason: NotDoneReason | null
  isMit: boolean
  sortOrder: number
  goalId: string | null
  milestoneId: string | null
  habitId: string | null
  /** null = fall back to the global default */
  remindMinutesBefore: number | null
  rolledOverCount: number
  originalDay: DayString | null
  completedAt: Instant | null
  createdAt: Instant
  updatedAt: Instant
  tags: string[]
  /** derived from time_entries, never stored */
  actualMinutes: number
}

export interface TaskDraft {
  title: string
  day: DayString
  notes?: string | null
  startAt?: Instant | null
  estimateMinutes?: number | null
  isMit?: boolean
  goalId?: string | null
  milestoneId?: string | null
  habitId?: string | null
  remindMinutesBefore?: number | null
  tags?: string[]
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | 'title'
    | 'notes'
    | 'day'
    | 'startAt'
    | 'estimateMinutes'
    | 'status'
    | 'notDoneReason'
    | 'isMit'
    | 'sortOrder'
    | 'goalId'
    | 'milestoneId'
    | 'remindMinutesBefore'
    | 'tags'
  >
>

/* ------------------------------------------------------------------ goals */

export type GoalStatus = 'active' | 'done' | 'archived'

export interface Goal {
  id: string
  title: string
  notesMd: string | null
  /** 'YYYY-MM-DD' — the exam date, the deadline, the thing being counted down to */
  targetDate: DayString | null
  status: GoalStatus
  color: string | null
  createdAt: Instant
  updatedAt: Instant
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  dueDate: DayString | null
  doneAt: Instant | null
  sortOrder: number
}

export interface GoalProgress {
  goalId: string
  /** 0..1, blended from milestones and linked tasks */
  progress: number
  milestonesDone: number
  milestonesTotal: number
  tasksDone: number
  tasksTotal: number
  minutesLogged: number
  /** whole days until targetDate; negative once it is past */
  daysLeft: number | null
  lastProgressDay: DayString | null
  /** days since a linked task was last completed; null when nothing was ever done */
  daysSinceProgress: number | null
  neglected: boolean
}

export interface GoalWithProgress extends Goal {
  milestones: Milestone[]
  progress: GoalProgress
}

/* ----------------------------------------------------------------- habits */

export type HabitSchedule =
  | { type: 'daily' }
  /** Monday-first weekday indices: Mon = 0 ... Sun = 6 */
  | { type: 'weekdays'; days: number[] }
  | { type: 'timesPerWeek'; n: number }

export interface Habit {
  id: string
  title: string
  schedule: HabitSchedule
  goalId: string | null
  estimateMinutes: number | null
  /** 'HH:mm' used as the start time of generated tasks */
  defaultTime: string | null
  active: boolean
  createdAt: Instant
}

export interface HabitStreak {
  habitId: string
  current: number
  longest: number
  /** last 84 days, oldest first */
  history: { day: DayString; due: boolean; done: boolean }[]
}

/* ------------------------------------------------------------ time & timer */

export type TimeEntryKind = 'pomodoro' | 'free' | 'break'

export interface TimeEntry {
  id: string
  taskId: string | null
  kind: TimeEntryKind
  startedAt: Instant
  endedAt: Instant | null
  durationSeconds: number | null
  completed: boolean
}

export type TimerMode = 'pomodoro' | 'free'
export type TimerPhase = 'idle' | 'running' | 'paused' | 'break'

export interface TimerState {
  phase: TimerPhase
  mode: TimerMode
  taskId: string | null
  taskTitle: string | null
  /** seconds counted so far in the current session */
  elapsedSeconds: number
  /** seconds left for pomodoro/break sessions, null while counting up */
  remainingSeconds: number | null
  /** completed pomodoro sessions since the last long break */
  completedSessions: number
}

/* -------------------------------------------------------------- check-ins */

export type CheckinKind = 'morning' | 'evening'
export type CheckinStatus = 'pending' | 'completed'

export const CHECKIN_TRIGGERS = [
  'launch',
  'resume',
  'unlock',
  'activate',
  'tick',
  'schedule',
  'quit',
  'manual'
] as const
export type CheckinTrigger = (typeof CHECKIN_TRIGGERS)[number]

export interface CheckinRow {
  day: DayString
  kind: CheckinKind
  status: CheckinStatus
  completedAt: Instant | null
  snoozeCount: number
  snoozedUntil: Instant | null
  triggerSource: CheckinTrigger | null
}

export interface CheckinDecision {
  kind: CheckinKind
  day: DayString
  trigger: CheckinTrigger
  /** true when closing out a day that is already over */
  overdue: boolean
}

/** What the check-in window renders. Assembled in main, sent to the renderer. */
export interface CheckinPayload {
  kind: CheckinKind
  day: DayString
  overdue: boolean
  today: DayString
  snoozeCount: number
  maxSnoozes: number
  snoozeMinutes: number
  strictness: Strictness
  requireEstimates: boolean
  workdayHours: number
  /** unfinished tasks from earlier days, oldest first (morning) */
  carryOver: Task[]
  /** the tasks belonging to `day` (evening) or to `today` (morning) */
  dayTasks: Task[]
  note: DailyNote | null
  /** yesterday's "tomorrow's top priority", echoed back in the morning */
  previousPriority: string | null
  goals: GoalWithProgress[]
  streak: number
  summary: DaySummary
}

export type TriageAction = 'move_today' | 'move_tomorrow' | 'pick_date' | 'drop' | 'done' | 'keep'

export interface TriageDecision {
  taskId: string
  action: TriageAction
  /** required when action is 'pick_date' */
  day?: DayString
  reason?: NotDoneReason | null
  /** minutes the user says it actually took, used when no timer ran */
  actualMinutes?: number | null
}

export interface MorningSubmission {
  day: DayString
  triage: TriageDecision[]
  mitTaskIds: string[]
  planMd: string | null
}

export interface EveningSubmission {
  day: DayString
  triage: TriageDecision[]
  wentWellMd: string | null
  blockedMd: string | null
  tomorrowPriority: string | null
  mood: number | null
  energy: number | null
}

/* ----------------------------------------------------------- notes & inbox */

export interface DailyNote {
  day: DayString
  morningPlanMd: string | null
  wentWellMd: string | null
  blockedMd: string | null
  tomorrowPriority: string | null
  mood: number | null
  energy: number | null
  updatedAt: Instant
}

export interface InboxItem {
  id: string
  text: string
  createdAt: Instant
  processedAt: Instant | null
}

/* --------------------------------------------------------------- settings */

export type Strictness = 'soft' | 'medium' | 'strict'

export interface AppSettings {
  /** earliest 'HH:mm' the morning check-in may appear */
  morningWindowStart: string
  /** after this 'HH:mm', quitting or locking counts as ending the day */
  eveningWindowStart: string
  /** 'HH:mm' the evening check-in fires on its own */
  eveningCheckinTime: string
  strictness: Strictness
  snoozeMinutes: number
  maxSnoozes: number
  requireEstimates: boolean
  defaultRemindMinutesBefore: number
  pomodoroMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakEvery: number
  workdayHours: number
  neglectedGoalDays: number
  staleAfterRollovers: number
  captureShortcut: string
  wrapUpShortcut: string
  openAtLogin: boolean
  hideDockIcon: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  morningWindowStart: '06:00',
  eveningWindowStart: '18:00',
  eveningCheckinTime: '23:30',
  strictness: 'medium',
  snoozeMinutes: 10,
  maxSnoozes: 2,
  requireEstimates: true,
  defaultRemindMinutesBefore: 10,
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  workdayHours: 8,
  neglectedGoalDays: 7,
  staleAfterRollovers: 3,
  captureShortcut: 'CommandOrControl+Shift+Space',
  wrapUpShortcut: 'CommandOrControl+Alt+W',
  openAtLogin: true,
  hideDockIcon: false
}

/* ------------------------------------------------------------ stats types */

export interface DaySummary {
  day: DayString
  planned: number
  done: number
  dropped: number
  estimatedMinutes: number
  actualMinutes: number
  pomodoros: number
}

export interface EstimationAccuracy {
  /** actual / estimated across tasks that had both */
  ratio: number | null
  sampleSize: number
  estimatedMinutes: number
  actualMinutes: number
}

export interface StatsBucket {
  key: string
  label: string
  minutes: number
  color?: string | null
}

export interface StatsReport {
  from: DayString
  to: DayString
  totalMinutes: number
  completionRate: number | null
  tasksDone: number
  tasksPlanned: number
  pomodoros: number
  accuracy: EstimationAccuracy
  byTag: StatsBucket[]
  byGoal: StatsBucket[]
  byDay: { day: DayString; minutes: number; done: number }[]
  notDoneReasons: { reason: NotDoneReason; count: number }[]
  checkinStreak: number
  checkinRate: number | null
}

/* --------------------------------------------------------- notifications */

export interface NotificationRoute {
  view: 'today' | 'goals' | 'inbox' | 'habits'
  taskId?: string
  goalId?: string
  day?: DayString
}

/* ---------------------------------------------------------------- drafts */

export interface GoalDraft {
  title: string
  notesMd?: string | null
  targetDate?: DayString | null
  color?: string | null
}

export interface MilestoneDraft {
  goalId: string
  title: string
  dueDate?: DayString | null
}

export interface HabitDraft {
  title: string
  schedule: HabitSchedule
  goalId?: string | null
  estimateMinutes?: number | null
  defaultTime?: string | null
}

export interface HabitWithStreak extends Habit {
  streak: HabitStreak
  completedThisWeek: number
  dueToday: boolean
  doneToday: boolean
}

export interface CheckinStatusSummary {
  pending: CheckinDecision | null
  open: boolean
  streak: number
  snoozesLeft: number
}

export interface CaptureResult {
  kind: 'task' | 'inbox'
  task: Task | null
  item: InboxItem | null
}
