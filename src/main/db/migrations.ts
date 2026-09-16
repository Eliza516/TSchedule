/**
 * Schema migrations, applied in order and tracked with PRAGMA user_version so
 * that later releases can add files here without touching existing data.
 *
 * Conventions: instants are INTEGER epoch milliseconds; days are TEXT
 * 'YYYY-MM-DD' in the user's local zone, so "today" always matches their clock.
 */
export const MIGRATIONS: string[] = [
  /* 001 - initial schema */ `
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE goals (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  notes_md    TEXT,
  target_date TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  color       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE milestones (
  id         TEXT PRIMARY KEY,
  goal_id    TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  due_date   TEXT,
  done_at    INTEGER,
  sort_order REAL NOT NULL
);
CREATE INDEX idx_milestones_goal ON milestones(goal_id, sort_order);

CREATE TABLE habits (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  schedule_json    TEXT NOT NULL,
  goal_id          TEXT REFERENCES goals(id) ON DELETE SET NULL,
  estimate_minutes INTEGER,
  default_time     TEXT,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       INTEGER NOT NULL
);

CREATE TABLE habit_logs (
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  done_at  INTEGER NOT NULL,
  PRIMARY KEY (habit_id, day)
);

CREATE TABLE tasks (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  notes                 TEXT,
  day                   TEXT NOT NULL,
  start_at              INTEGER,
  estimate_minutes      INTEGER,
  status                TEXT NOT NULL DEFAULT 'todo',
  not_done_reason       TEXT,
  is_mit                INTEGER NOT NULL DEFAULT 0,
  sort_order            REAL NOT NULL,
  goal_id               TEXT REFERENCES goals(id) ON DELETE SET NULL,
  milestone_id          TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  habit_id              TEXT REFERENCES habits(id) ON DELETE SET NULL,
  remind_minutes_before INTEGER,
  rolled_over_count     INTEGER NOT NULL DEFAULT 0,
  original_day          TEXT,
  completed_at          INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX idx_tasks_day ON tasks(day, sort_order);
CREATE INDEX idx_tasks_open ON tasks(status, day);
CREATE INDEX idx_tasks_goal ON tasks(goal_id);
CREATE UNIQUE INDEX idx_tasks_habit_day ON tasks(habit_id, day) WHERE habit_id IS NOT NULL;

CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (task_id, tag)
);
CREATE INDEX idx_task_tags_tag ON task_tags(tag);

CREATE TABLE reminders (
  id       TEXT PRIMARY KEY,
  task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind     TEXT NOT NULL,
  fire_at  INTEGER NOT NULL,
  fired_at INTEGER
);
CREATE INDEX idx_reminders_due ON reminders(fire_at) WHERE fired_at IS NULL;

CREATE TABLE time_entries (
  id               TEXT PRIMARY KEY,
  task_id          TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  kind             TEXT NOT NULL,
  started_at       INTEGER NOT NULL,
  ended_at         INTEGER,
  duration_seconds INTEGER,
  completed        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_entries_task ON time_entries(task_id);
CREATE INDEX idx_entries_started ON time_entries(started_at);

CREATE TABLE checkins (
  day            TEXT NOT NULL,
  kind           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  completed_at   INTEGER,
  snooze_count   INTEGER NOT NULL DEFAULT 0,
  snoozed_until  INTEGER,
  trigger_source TEXT,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (day, kind)
);

CREATE TABLE daily_notes (
  day               TEXT PRIMARY KEY,
  morning_plan_md   TEXT,
  went_well_md      TEXT,
  blocked_md        TEXT,
  tomorrow_priority TEXT,
  mood              INTEGER,
  energy            INTEGER,
  updated_at        INTEGER NOT NULL
);

CREATE TABLE inbox_items (
  id           TEXT PRIMARY KEY,
  text         TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  processed_at INTEGER
);
`,
  /* 002 - study materials: courses and books paced towards a deadline */ `
CREATE TABLE materials (
  id                TEXT PRIMARY KEY,
  goal_id           TEXT REFERENCES goals(id) ON DELETE SET NULL,
  kind              TEXT NOT NULL,
  title             TEXT NOT NULL,
  url               TEXT,
  file_path         TEXT,
  unit_kind         TEXT NOT NULL,
  total_units       INTEGER NOT NULL,
  units_done_before INTEGER NOT NULL DEFAULT 0,
  minutes_per_unit  INTEGER,
  weekdays_json     TEXT NOT NULL,
  study_time        TEXT,
  max_units_per_day INTEGER,
  target_date       TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX idx_materials_goal ON materials(goal_id);

-- The table of contents: chapters of a book, parts of a course. Optional.
CREATE TABLE material_sections (
  id          TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  start_unit  INTEGER NOT NULL,
  end_unit    INTEGER NOT NULL,
  sort_order  REAL NOT NULL
);
CREATE INDEX idx_sections_material ON material_sections(material_id, sort_order);

ALTER TABLE tasks ADD COLUMN url           TEXT;
ALTER TABLE tasks ADD COLUMN material_id   TEXT REFERENCES materials(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN planned_units INTEGER;
ALTER TABLE tasks ADD COLUMN done_units    INTEGER;
ALTER TABLE tasks ADD COLUMN unit_from     INTEGER;
ALTER TABLE tasks ADD COLUMN unit_to       INTEGER;

CREATE UNIQUE INDEX idx_tasks_material_day ON tasks(material_id, day) WHERE material_id IS NOT NULL;
`
]
