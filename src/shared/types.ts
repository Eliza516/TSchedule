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
  /** the study material this task was generated from */
  materialId: string | null
  /** how much of that material this task covers, in the material's own unit */
  plannedUnits: number | null
  /** how much was actually got through; null until the task is ticked off */
  doneUnits: number | null
  /** the stretch this task covers: page 45 to page 68, lesson 13 to 15 */
  unitFrom: number | null
  unitTo: number | null
  /** something to open when the work starts - a course page, a book online */
  url: string | null
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
  materialId?: string | null
  plannedUnits?: number | null
  unitFrom?: number | null
  unitTo?: number | null
  url?: string | null
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
    | 'doneUnits'
    | 'url'
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

/* -------------------------------------------------------------- materials */

/** A course is worked through in lessons; a book in pages or in chapters. */
export type MaterialKind = 'course' | 'book'
export type UnitKind = 'lesson' | 'chapter' | 'page'

export const UNIT_LABELS: Record<UnitKind, { one: string; many: string }> = {
  lesson: { one: 'bài', many: 'bài' },
  chapter: { one: 'chương', many: 'chương' },
  page: { one: 'trang', many: 'trang' }
}

/**
 * Something to work through on a deadline: a Coursera course, a PDF on disk, a
 * paper book. The app never tracks it remotely - it holds the link, the table of
 * contents and the arithmetic, and the user says how far they got.
 */
export interface Material {
  id: string
  goalId: string | null
  kind: MaterialKind
  title: string
  /** an http(s) page to open, when the material lives on the web */
  url: string | null
  /** a file to open, when it lives on this machine */
  filePath: string | null
  unitKind: UnitKind
  totalUnits: number
  /** already behind you when the material was added, so pacing starts from there */
  unitsDoneBefore: number
  minutesPerUnit: number | null
  /** Monday-first weekday indices: Mon = 0 ... Sun = 6 */
  weekdays: number[]
  /** 'HH:mm' used as the start time of generated tasks */
  studyTime: string | null
  /** a ceiling on a day's share, so a tight deadline warns instead of piling up */
  maxUnitsPerDay: number | null
  /** null = fall back to the goal's target date */
  targetDate: DayString | null
  active: boolean
  createdAt: Instant
  updatedAt: Instant
}

/** A chapter, or a part of a course. Optional: pacing works without any. */
export interface MaterialSection {
  id: string
  materialId: string
  title: string
  startUnit: number
  endUnit: number
  sortOrder: number
}

export interface MaterialSectionDraft {
  title: string
  startUnit: number
  endUnit: number
}

export interface MaterialDraft {
  goalId?: string | null
  kind: MaterialKind
  title: string
  url?: string | null
  filePath?: string | null
  unitKind: UnitKind
  totalUnits: number
  unitsDoneBefore?: number
  minutesPerUnit?: number | null
  weekdays: number[]
  studyTime?: string | null
  maxUnitsPerDay?: number | null
  targetDate?: DayString | null
  sections?: MaterialSectionDraft[]
}

export type MaterialPatch = Partial<MaterialDraft> & { active?: boolean }

/** What the renderer gets: the material, its contents and today's share. */
export interface MaterialWithPace extends Material {
  sections: MaterialSection[]
  unitsDone: number
  pace: StudyPace
}

export interface StudyPace {
  /** units still ahead, counting neither what was done before nor what is logged */
  remainingUnits: number
  /** eligible days from today through the target date, inclusive */
  studyDaysLeft: number
  unitsToday: number
  /** the stretch today's share covers */
  unitFrom: number
  unitTo: number
  minutesToday: number | null
  /** true when the deadline needs more per day than maxUnitsPerDay allows */
  overloaded: boolean
  /** when overloaded, the earliest day the material can realistically be finished */
  projectedFinishDay: DayString | null
}

/** What the file picker hands back: the file, plus whatever the PDF told us. */
export interface PickedMaterialFile {
  filePath: string
  /** the file name, minus its extension - a reasonable first guess at the title */
  title: string
  /** 0 when the file is not a PDF, or could not be read */
  pageCount: number
  sections: MaterialSectionDraft[]
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
