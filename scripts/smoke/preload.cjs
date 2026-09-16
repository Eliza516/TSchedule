/**
 * Stand-in for the real preload: the same `window.api` shape, canned data.
 * Lets the whole renderer be exercised without the native SQLite module, and
 * gives every view a realistic, populated state to render.
 */
const { contextBridge } = require('electron')

const day = new Date().toISOString().slice(0, 10)
const settings = {
  morningWindowStart: '06:00', eveningWindowStart: '18:00', eveningCheckinTime: '23:30',
  strictness: 'medium', snoozeMinutes: 10, maxSnoozes: 2, requireEstimates: true,
  defaultRemindMinutesBefore: 10, pomodoroMinutes: 25, shortBreakMinutes: 5,
  longBreakMinutes: 15, longBreakEvery: 4, workdayHours: 8, neglectedGoalDays: 7,
  staleAfterRollovers: 3, captureShortcut: 'CommandOrControl+Shift+Space',
  wrapUpShortcut: 'CommandOrControl+Alt+W', openAtLogin: true, hideDockIcon: false
}

const goal = {
  id: 'g1', title: 'Final exam', notesMd: 'Chapters 1-9', targetDate: '2026-04-26',
  status: 'active', color: '#2f6f66', createdAt: Date.now(), updatedAt: Date.now(),
  milestones: [
    { id: 'm1', goalId: 'g1', title: 'Finish chapter 1', dueDate: '2026-03-20', doneAt: Date.now(), sortOrder: 1 },
    { id: 'm2', goalId: 'g1', title: 'Past paper 2024', dueDate: null, doneAt: null, sortOrder: 2 }
  ],
  progress: {
    goalId: 'g1', progress: 0.42, milestonesDone: 1, milestonesTotal: 2, tasksDone: 3,
    tasksTotal: 8, minutesLogged: 420, daysLeft: 47, lastProgressDay: day,
    daysSinceProgress: 0, neglected: false
  }
}

function task(id, title, extra) {
  return Object.assign({
    id, title, notes: null, day, startAt: null, estimateMinutes: 45, status: 'todo',
    notDoneReason: null, isMit: false, sortOrder: 1, goalId: null, milestoneId: null,
    habitId: null, materialId: null, plannedUnits: null, doneUnits: null, unitFrom: null,
    unitTo: null, url: null, remindMinutesBefore: null, rolledOverCount: 0, originalDay: day,
    completedAt: null, createdAt: Date.now(), updatedAt: Date.now(), tags: [], actualMinutes: 0
  }, extra)
}

const tasks = [
  task('t1', 'Write the progress report', { isMit: true, startAt: Date.now() + 3600000, estimateMinutes: 45, tags: ['work'], goalId: 'g1' }),
  task('t2', 'Revise chapter 4', { isMit: true, estimateMinutes: 90, goalId: 'g1', actualMinutes: 112 }),
  task('t3', 'Email the supervisor', { estimateMinutes: 15, startAt: Date.now() + 7200000 }),
  task('t4', 'Tidy reading notes', { estimateMinutes: 30, rolledOverCount: 4, originalDay: '2026-03-01', tags: ['admin'] }),
  task('t5', 'Morning stretch', { habitId: 'h1', estimateMinutes: 10, status: 'done', completedAt: Date.now(), actualMinutes: 12 }),
  task('t6', 'Machine Learning — 6 bài (bài 13–18)', {
    goalId: 'g1', materialId: 'mat1', plannedUnits: 6, unitFrom: 13, unitTo: 18,
    url: 'https://coursera.org/learn/machine-learning', estimateMinutes: 90,
    startAt: Date.now() + 10800000
  }),
  task('t7', 'Clean Code — trang 45–68 · Ch.3 Functions', {
    goalId: 'g1', materialId: 'mat2', plannedUnits: 24, unitFrom: 45, unitTo: 68,
    estimateMinutes: 48
  })
]

const materials = [
  {
    id: 'mat1', goalId: 'g1', kind: 'course', title: 'Machine Learning',
    url: 'https://coursera.org/learn/machine-learning', filePath: null, unitKind: 'lesson',
    totalUnits: 60, unitsDoneBefore: 0, minutesPerUnit: 15, weekdays: [0, 1, 2, 3, 4],
    studyTime: '20:00', maxUnitsPerDay: null, targetDate: '2026-04-26', active: true,
    createdAt: Date.now(), updatedAt: Date.now(), sections: [], unitsDone: 12,
    pace: {
      remainingUnits: 48, studyDaysLeft: 8, unitsToday: 6, unitFrom: 13, unitTo: 18,
      minutesToday: 90, overloaded: false, projectedFinishDay: null
    }
  },
  {
    id: 'mat2', goalId: 'g1', kind: 'book', title: 'Clean Code',
    url: null, filePath: '/Users/me/Books/clean-code.pdf', unitKind: 'page',
    totalUnits: 320, unitsDoneBefore: 0, minutesPerUnit: 2, weekdays: [0, 2, 4, 6],
    studyTime: '21:30', maxUnitsPerDay: 20, targetDate: '2026-04-10', active: true,
    createdAt: Date.now(), updatedAt: Date.now(),
    sections: [
      { id: 's1', materialId: 'mat2', title: 'Ch.1 Clean Code', startUnit: 1, endUnit: 44, sortOrder: 1 },
      { id: 's2', materialId: 'mat2', title: 'Ch.3 Functions', startUnit: 45, endUnit: 120, sortOrder: 2 }
    ],
    unitsDone: 44,
    pace: {
      remainingUnits: 276, studyDaysLeft: 12, unitsToday: 20, unitFrom: 45, unitTo: 68,
      minutesToday: 40, overloaded: true, projectedFinishDay: '2026-05-04'
    }
  }
]

const responses = {
  'settings:get': settings,
  'settings:update': settings,
  'tasks:listDay': tasks,
  'tasks:listRange': tasks,
  'tasks:listOpenBefore': [tasks[3]],
  'tasks:summary': { day, planned: 4, done: 1, dropped: 0, estimatedMinutes: 190, actualMinutes: 124, pomodoros: 3 },
  'goals:list': [goal],
  'goals:tasks': tasks.slice(0, 3),
  'materials:list': materials,
  'materials:forGoal': materials,
  'materials:sections': materials[1].sections,
  'habits:list': [{
    id: 'h1', title: 'Morning stretch', schedule: { type: 'daily' }, goalId: null,
    estimateMinutes: 10, defaultTime: '07:30', active: true, createdAt: Date.now(),
    completedThisWeek: 4, dueToday: true, doneToday: true,
    streak: {
      habitId: 'h1', current: 6, longest: 14,
      history: Array.from({ length: 84 }, (_, i) => ({
        day: new Date(Date.now() - (83 - i) * 86400000).toISOString().slice(0, 10),
        due: true, done: i % 3 !== 0
      }))
    }
  }],
  'inbox:list': [{ id: 'i1', text: 'Ask about the exam format', createdAt: Date.now(), processedAt: null }],
  'notes:get': { day, morningPlanMd: null, wentWellMd: null, blockedMd: null, tomorrowPriority: 'Finish the report', mood: 4, energy: 3, updatedAt: Date.now() },
  'timer:state': { phase: 'running', mode: 'pomodoro', taskId: 't2', taskTitle: 'Revise chapter 4', elapsedSeconds: 420, remainingSeconds: 1080, completedSessions: 2 },
  'timeEntries:listDay': [],
  'checkin:status': { pending: { kind: 'evening', day, trigger: 'tick', overdue: true }, open: false, streak: 12, snoozesLeft: 2 },
  'stats:report': {
    from: '2026-02-11', to: day, totalMinutes: 2480, completionRate: 0.72, tasksDone: 41,
    tasksPlanned: 57, pomodoros: 63,
    accuracy: { ratio: 1.38, sampleSize: 24, estimatedMinutes: 1800, actualMinutes: 2480 },
    byTag: [{ key: 'work', label: 'work', minutes: 1320, color: null }, { key: 'study', label: 'study', minutes: 860, color: null }],
    byGoal: [{ key: 'g1', label: 'Final exam', minutes: 980, color: '#2f6f66' }],
    byDay: Array.from({ length: 28 }, (_, i) => ({
      day: new Date(Date.now() - (27 - i) * 86400000).toISOString().slice(0, 10),
      minutes: [0, 45, 120, 200, 90, 160, 30][i % 7], done: i % 4
    })),
    notDoneReasons: [
      { reason: 'ran_out_of_time', count: 9 }, { reason: 'underestimated', count: 5 },
      { reason: 'blocked', count: 3 }, { reason: 'not_important', count: 2 }
    ],
    checkinStreak: 12, checkinRate: 0.86
  },
  'checkin:payload': {
    kind: 'evening', day, overdue: true, today: day, snoozeCount: 0, maxSnoozes: 2,
    snoozeMinutes: 10, strictness: 'medium', requireEstimates: true, workdayHours: 8,
    carryOver: [tasks[3]], dayTasks: tasks, note: null,
    previousPriority: 'Finish the report', goals: [goal], streak: 12,
    summary: { day, planned: 4, done: 1, dropped: 0, estimatedMinutes: 190, actualMinutes: 124, pomodoros: 3 }
  }
}

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => Promise.resolve(responses[channel] ?? null),
  on: () => () => {},
  platform: 'darwin'
})
