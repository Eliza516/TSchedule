import { basename, extname } from 'node:path'
import { app, dialog, ipcMain, shell } from 'electron'
import { IPC_CHANNELS, type IpcChannel, type IpcContract } from '@shared/ipc'
import type { AppSettings, CaptureResult, DayString } from '@shared/types'
import { toDayString } from '@shared/time'
import { parseQuickAdd } from '@shared/quickAdd'
import * as taskRepo from './db/repos/tasks'
import * as goalRepo from './db/repos/goals'
import * as habitRepo from './db/repos/habits'
import * as materialRepo from './db/repos/materials'
import * as checkinRepo from './db/repos/checkins'
import * as noteRepo from './db/repos/notes'
import * as inboxRepo from './db/repos/inbox'
import * as entryRepo from './db/repos/timeEntries'
import { getSettings, updateSettings } from './db/repos/settings'
import * as checkins from './services/checkins'
import * as timer from './services/timer'
import * as taskService from './services/taskService'
import * as backup from './services/backup'
import * as dailyRun from './services/dailyRun'
import { readPdfOutline } from './services/pdfOutline'
import { sectionsFromPages } from '@shared/studyPlan'
import { buildReport } from './services/stats'
import { registerShortcuts } from './shortcuts'
import { applyDockVisibility, broadcast, hideCaptureWindow, setStrictness, showMainWindow } from './windows'

type Handler<C extends IpcChannel> = (
  ...args: Parameters<IpcContract[C]>
) => ReturnType<IpcContract[C]> | Promise<ReturnType<IpcContract[C]>>

type Handlers = { [C in IpcChannel]: Handler<C> }

function today(): DayString {
  return toDayString(Date.now())
}

/** Settings that change how the app behaves outside the renderer take effect now. */
export function applySettingsSideEffects(settings: AppSettings): void {
  setStrictness(settings.strictness)
  applyDockVisibility(settings.hideDockIcon)
  registerShortcuts(settings)
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.openAtLogin })
}

function capture(text: string): CaptureResult {
  const trimmed = text.trim()
  if (!trimmed) return { kind: 'inbox', task: null, item: null }

  const settings = getSettings()
  const goals = goalRepo
    .listGoals(today(), settings.neglectedGoalDays)
    .map((goal) => ({ id: goal.id, title: goal.title }))
  const parsed = parseQuickAdd(trimmed, { now: Date.now(), goals })

  // Anything without a date or a time is an unsorted thought, not a plan: it
  // goes to the inbox to be triaged later rather than cluttering today.
  const scheduled = parsed.startAt != null || parsed.day !== today()
  if (!scheduled && !parsed.estimateMinutes && !parsed.isMit && parsed.tags.length === 0) {
    return { kind: 'inbox', task: null, item: inboxRepo.addInboxItem(trimmed) }
  }

  const task = taskService.createTask({
    title: parsed.title || trimmed,
    day: parsed.day,
    startAt: parsed.startAt,
    estimateMinutes: parsed.estimateMinutes,
    isMit: parsed.isMit,
    goalId: parsed.goalId,
    tags: parsed.tags,
    remindMinutesBefore: parsed.remindMinutesBefore
  })
  return { kind: 'task', task, item: null }
}

/** Only http(s) survives: a `file:` or `javascript:` link must never be opened. */
function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

const handlers: Handlers = {
  'settings:get': () => getSettings(),
  'settings:update': (patch) => {
    const settings = updateSettings(patch)
    applySettingsSideEffects(settings)
    broadcast('settings:changed', settings)
    return settings
  },
  'settings:resetCheckins': (day) => {
    checkinRepo.resetDay(day)
    checkins.publishStatus()
  },

  'tasks:listDay': (day) => taskRepo.listDay(day),
  'tasks:listRange': (from, to) => taskRepo.listRange(from, to),
  'tasks:listOpenBefore': (day) => taskRepo.listOpenBefore(day),
  'tasks:get': (id) => taskRepo.getTask(id),
  'tasks:create': (draft) => taskService.createTask(draft),
  'tasks:update': (id, patch) => taskService.updateTask(id, patch),
  'tasks:setStatus': (id, status, reason) => taskService.setStatus(id, status, reason),
  'tasks:setMit': (id, isMit) => taskService.setMit(id, isMit),
  'tasks:move': (id, day, beforeTaskId) => taskService.moveTask(id, day, beforeTaskId),
  'tasks:delete': (id) => taskService.deleteTask(id),
  'tasks:summary': (day) => taskRepo.daySummary(day),

  'goals:list': () => goalRepo.listGoals(today(), getSettings().neglectedGoalDays),
  'goals:get': (id) => goalRepo.getGoal(id, today(), getSettings().neglectedGoalDays),
  'goals:create': (draft) => {
    const goal = goalRepo.createGoal(draft)
    broadcast('data:changed', { scope: 'goals' })
    return goal
  },
  'goals:update': (id, patch) => {
    const goal = goalRepo.updateGoal(id, patch)
    broadcast('data:changed', { scope: 'goals' })
    return goal
  },
  'goals:delete': (id) => {
    goalRepo.deleteGoal(id)
    broadcast('data:changed', { scope: 'all' })
  },
  'goals:tasks': (id) => taskRepo.tasksForGoal(id),
  'milestones:create': (draft) => {
    const milestone = goalRepo.createMilestone(draft)
    broadcast('data:changed', { scope: 'goals' })
    return milestone
  },
  'milestones:update': (id, patch) => {
    const milestone = goalRepo.updateMilestone(id, patch)
    broadcast('data:changed', { scope: 'goals' })
    return milestone
  },
  'milestones:toggle': (id) => {
    const milestone = goalRepo.toggleMilestone(id)
    broadcast('data:changed', { scope: 'goals' })
    return milestone
  },
  'milestones:delete': (id) => {
    goalRepo.deleteMilestone(id)
    broadcast('data:changed', { scope: 'goals' })
  },

  'materials:list': () => materialRepo.listWithPace(today()),
  'materials:forGoal': (goalId) => materialRepo.materialsForGoal(goalId, today()),
  'materials:create': (draft) => {
    const material = materialRepo.createMaterial({ ...draft, url: safeUrl(draft.url) })
    // Added at noon, it should still show up in today rather than tomorrow.
    dailyRun.generateMaterialTasks(today())
    broadcast('data:changed', { scope: 'all' })
    return material
  },
  'materials:update': (id, patch) => {
    const material = materialRepo.updateMaterial(id, {
      ...patch,
      ...(patch.url !== undefined ? { url: safeUrl(patch.url) } : {})
    })
    broadcast('data:changed', { scope: 'all' })
    return material
  },
  'materials:delete': (id) => {
    materialRepo.deleteMaterial(id)
    broadcast('data:changed', { scope: 'all' })
  },
  'materials:sections': (id) => materialRepo.listSections(id),
  'materials:saveSections': (id, sections) => {
    const saved = materialRepo.replaceSections(id, sections)
    broadcast('data:changed', { scope: 'goals' })
    return saved
  },
  'materials:pickFile': async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Choose a book or a document',
      properties: ['openFile'],
      filters: [{ name: 'Books', extensions: ['pdf', 'epub'] }]
    })
    if (canceled || filePaths.length === 0) return null

    const filePath = filePaths[0]
    const extension = extname(filePath)
    const title = basename(filePath, extension)
    // Only PDFs carry a table of contents we can read; everything else is typed
    // in by hand, which the form is built to expect anyway.
    if (extension.toLowerCase() !== '.pdf') {
      return { filePath, title, pageCount: 0, sections: [] }
    }
    try {
      const outline = await readPdfOutline(filePath)
      return {
        filePath,
        title,
        pageCount: outline.pageCount,
        sections: sectionsFromPages(outline.sections, outline.pageCount)
      }
    } catch {
      // A scan, an encrypted file, a broken export: still usable, just manual.
      return { filePath, title, pageCount: 0, sections: [] }
    }
  },

  'habits:list': () => habitRepo.listHabits(today()),
  'habits:create': (draft) => {
    const habit = habitRepo.createHabit(draft)
    broadcast('data:changed', { scope: 'habits' })
    return habit
  },
  'habits:update': (id, patch) => {
    const habit = habitRepo.updateHabit(id, patch)
    broadcast('data:changed', { scope: 'habits' })
    return habit
  },
  'habits:delete': (id) => {
    habitRepo.deleteHabit(id)
    broadcast('data:changed', { scope: 'all' })
  },

  'timer:state': () => timer.getState(),
  'timer:start': (taskId, mode) => timer.start(taskId, mode),
  'timer:pause': () => timer.pause(),
  'timer:resume': () => timer.resume(),
  'timer:stop': () => timer.stop(),
  'timer:skipBreak': () => timer.skipBreak(),
  'timeEntries:listDay': (day) => entryRepo.listForDay(day),

  'checkin:payload': () => checkins.buildPayload(),
  'checkin:status': () => checkins.status(),
  'checkin:submitMorning': (submission) => checkins.submitMorning(submission),
  'checkin:submitEvening': (submission) => checkins.submitEvening(submission),
  'checkin:snooze': () => checkins.snooze(),
  'checkin:requestManual': () => checkins.openManual(),

  'notes:get': (day) => noteRepo.getNote(day),
  'notes:save': (day, patch) => {
    const note = noteRepo.saveNote(day, patch)
    broadcast('data:changed', { scope: 'notes' })
    return note
  },

  'inbox:list': () => inboxRepo.listInbox(),
  'inbox:add': (text) => {
    const item = inboxRepo.addInboxItem(text)
    broadcast('data:changed', { scope: 'inbox' })
    return item
  },
  'inbox:convert': (id, draft) => {
    const task = taskService.createTask(draft)
    inboxRepo.markProcessed(id)
    broadcast('data:changed', { scope: 'all' })
    return task
  },
  'inbox:delete': (id) => {
    inboxRepo.deleteInboxItem(id)
    broadcast('data:changed', { scope: 'inbox' })
  },

  'capture:submit': (text) => {
    const result = capture(text)
    broadcast('data:changed', { scope: 'all' })
    return result
  },
  'capture:close': () => hideCaptureWindow(),

  'stats:report': (from, to) => buildReport(from, to),

  'app:export': () => backup.exportBackup(),
  'app:exportMarkdown': () => backup.exportMarkdown(),
  'app:import': async () => {
    const imported = await backup.importBackup()
    if (imported) {
      broadcast('data:changed', { scope: 'all' })
      broadcast('settings:changed', getSettings())
      applySettingsSideEffects(getSettings())
    }
    return imported
  },
  'app:showMain': (route) => showMainWindow(route),
  'app:openExternal': (url) => {
    const safe = safeUrl(url)
    if (safe) void shell.openExternal(safe)
  },
  'app:openPath': (filePath) => {
    // The renderer may ask for a file the app is already holding, and no other:
    // the bridge is an allow-list, not a way to reach the rest of the disk.
    if (materialRepo.hasFilePath(filePath)) void shell.openPath(filePath)
  },
  'app:quit': () => app.quit()
}

export function registerIpc(): void {
  for (const channel of IPC_CHANNELS) {
    const handler = handlers[channel] as (...args: unknown[]) => unknown
    ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args))
  }
}
