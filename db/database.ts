// SQLite 초기화 및 CRUD 쿼리 계층.
// expo-sqlite 의 sync/async 새 API(openDatabaseAsync) 기준.

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_GROUPS, SAMPLE_HABITS } from '../constants/sampleData';

const RESET_FLAG_KEY = 'habitlog.user_reset';

export interface HabitGroupRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
}

export interface HabitRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  group_id: string;
  is_time_tracked: number;
  target_minutes: number | null;
  sort_order: number;
  is_active: number;
  created_at: string;
  active_days: string; // '1111111' 일~토 (각 자리 0/1)
}

export interface HabitRecordRow {
  id: string;
  habit_id: string;
  date: string;         // YYYY-MM-DD
  is_completed: number; // 0/1
  minutes: number;
  memo: string | null;
  logged_at: string;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** DB 핸들을 싱글톤으로 얻음. */
export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('habitlog.db');
  }
  return dbPromise;
}

/** 스키마 생성 + 최초 샘플 데이터 삽입. */
export async function initDatabase(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS habit_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      group_id TEXT NOT NULL,
      is_time_tracked INTEGER DEFAULT 1,
      target_minutes INTEGER,
      sort_order INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      active_days TEXT NOT NULL DEFAULT '1111111',
      FOREIGN KEY (group_id) REFERENCES habit_groups(id)
    );
    CREATE TABLE IF NOT EXISTS habit_records (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      minutes INTEGER DEFAULT 0,
      memo TEXT,
      logged_at TEXT NOT NULL,
      UNIQUE(habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_date ON habit_records(date);
    CREATE TABLE IF NOT EXISTS daily_moods (
      date TEXT PRIMARY KEY,
      mood INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sleep_records (
      date TEXT PRIMARY KEY,
      bed_time TEXT NOT NULL,
      wake_time TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // --- 마이그레이션: habits.active_days 컬럼 (기존 설치 대비) ---
  try {
    await db.execAsync(
      `ALTER TABLE habits ADD COLUMN active_days TEXT NOT NULL DEFAULT '1111111'`
    );
  } catch {
    // 이미 컬럼이 있으면 무시
  }

  const userReset = await AsyncStorage.getItem(RESET_FLAG_KEY);
  const existing = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM habit_groups'
  );
  if ((existing?.c ?? 0) === 0 && userReset !== '1') {
    await seedSampleData();
  }
}

/** 샘플 데이터 주입. */
export async function seedSampleData(): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const g of SAMPLE_GROUPS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO habit_groups
          (id, name, emoji, color, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [g.id, g.name, g.emoji, g.color, g.sort_order]
      );
    }
    for (const h of SAMPLE_HABITS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO habits
          (id, name, icon, color, group_id,
           is_time_tracked, target_minutes, sort_order,
           is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          h.id, h.name, h.icon, h.color, h.group_id,
          h.is_time_tracked ?? 1,
          h.target_minutes ?? null,
          h.sort_order,
          now,
        ]
      );
    }
  });
}

/** 모든 데이터 삭제 (샘플 포함, 재주입 안 함). */
export async function resetDatabase(): Promise<void> {
  const db = await getDB();
  await db.execAsync(`
    DELETE FROM habit_records;
    DELETE FROM habits;
    DELETE FROM habit_groups;
    DELETE FROM daily_moods;
    DELETE FROM sleep_records;
  `);
  await AsyncStorage.setItem(RESET_FLAG_KEY, '1');
}

// --- Queries ---------------------------------------------------------------

export async function fetchGroups(): Promise<HabitGroupRow[]> {
  const db = await getDB();
  return db.getAllAsync<HabitGroupRow>(
    'SELECT * FROM habit_groups ORDER BY sort_order ASC'
  );
}

export async function fetchHabits(): Promise<HabitRow[]> {
  const db = await getDB();
  return db.getAllAsync<HabitRow>(
    'SELECT * FROM habits ORDER BY sort_order ASC'
  );
}

export async function fetchRecordsForDate(
  dateKey: string
): Promise<HabitRecordRow[]> {
  const db = await getDB();
  return db.getAllAsync<HabitRecordRow>(
    'SELECT * FROM habit_records WHERE date = ?',
    [dateKey]
  );
}

export async function fetchRecordsInRange(
  start: string,
  end: string
): Promise<HabitRecordRow[]> {
  const db = await getDB();
  return db.getAllAsync<HabitRecordRow>(
    'SELECT * FROM habit_records WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [start, end]
  );
}

/** 업서트: 해당 habit_id+date 기록이 있으면 업데이트, 없으면 삽입. */
export async function upsertRecord(params: {
  id: string;
  habit_id: string;
  date: string;
  is_completed: number;
  minutes: number;
  memo?: string | null;
}): Promise<void> {
  const db = await getDB();
  const loggedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO habit_records
      (id, habit_id, date, is_completed, minutes, memo, logged_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET
       is_completed = excluded.is_completed,
       minutes = excluded.minutes,
       memo = excluded.memo,
       logged_at = excluded.logged_at`,
    [
      params.id,
      params.habit_id,
      params.date,
      params.is_completed,
      params.minutes,
      params.memo ?? null,
      loggedAt,
    ]
  );
}

// --- Habit CRUD ------------------------------------------------------------

export async function insertHabit(h: HabitRow): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO habits
      (id, name, icon, color, group_id,
       is_time_tracked, target_minutes, sort_order,
       is_active, created_at, active_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      h.id, h.name, h.icon, h.color, h.group_id,
      h.is_time_tracked, h.target_minutes, h.sort_order,
      h.is_active, h.created_at, h.active_days ?? '1111111',
    ]
  );
}

export async function updateHabit(h: HabitRow): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE habits SET
       name = ?, icon = ?, color = ?, group_id = ?,
       is_time_tracked = ?, target_minutes = ?,
       sort_order = ?, is_active = ?, active_days = ?
     WHERE id = ?`,
    [
      h.name, h.icon, h.color, h.group_id,
      h.is_time_tracked, h.target_minutes,
      h.sort_order, h.is_active, h.active_days ?? '1111111', h.id,
    ]
  );
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM habit_records WHERE habit_id = ?', [id]);
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

export async function insertGroup(g: HabitGroupRow): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO habit_groups (id, name, emoji, color, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [g.id, g.name, g.emoji, g.color, g.sort_order]
  );
}

export async function updateGroup(g: HabitGroupRow): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE habit_groups SET name = ?, emoji = ?, color = ?, sort_order = ?
     WHERE id = ?`,
    [g.name, g.emoji, g.color, g.sort_order, g.id]
  );
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await getDB();
  // 해당 그룹의 습관까지 함께 제거
  const habits = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM habits WHERE group_id = ?',
    [id]
  );
  for (const h of habits) {
    await deleteHabit(h.id);
  }
  await db.runAsync('DELETE FROM habit_groups WHERE id = ?', [id]);
}

// --- Daily moods -----------------------------------------------------------

export interface DailyMoodRow {
  date: string;
  mood: number; // 1~5
  updated_at: string;
}

export async function fetchMoodsInRange(
  start: string,
  end: string
): Promise<DailyMoodRow[]> {
  const db = await getDB();
  return db.getAllAsync<DailyMoodRow>(
    'SELECT * FROM daily_moods WHERE date BETWEEN ? AND ?',
    [start, end]
  );
}

export async function upsertMood(date: string, mood: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO daily_moods (date, mood, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET mood = excluded.mood, updated_at = excluded.updated_at`,
    [date, mood, new Date().toISOString()]
  );
}

export async function deleteMood(date: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM daily_moods WHERE date = ?', [date]);
}

// --- Sleep records ---------------------------------------------------------

export interface SleepRecordRow {
  date: string;
  bed_time: string;   // 'HH:mm'
  wake_time: string;  // 'HH:mm'
  duration_min: number;
  updated_at: string;
}

export async function fetchSleepInRange(
  start: string, end: string
): Promise<SleepRecordRow[]> {
  const db = await getDB();
  return db.getAllAsync<SleepRecordRow>(
    'SELECT * FROM sleep_records WHERE date BETWEEN ? AND ?',
    [start, end]
  );
}

export async function upsertSleep(
  date: string, bed: string, wake: string, durationMin: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO sleep_records (date, bed_time, wake_time, duration_min, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       bed_time = excluded.bed_time,
       wake_time = excluded.wake_time,
       duration_min = excluded.duration_min,
       updated_at = excluded.updated_at`,
    [date, bed, wake, durationMin, new Date().toISOString()]
  );
}

export async function deleteSleep(date: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM sleep_records WHERE date = ?', [date]);
}
