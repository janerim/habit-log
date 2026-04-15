// 일별 기록의 전역 상태.
// 날짜 키(YYYY-MM-DD)를 축으로 메모리 캐시를 유지하며,
// 변경 시 즉시 SQLite에 저장.

import { create } from 'zustand';
import {
  fetchRecordsForDate,
  fetchRecordsInRange,
  upsertRecord,
  HabitRecordRow,
} from '../db/database';
import { toDateKey } from '../utils/dateHelper';

interface RecordState {
  /** dateKey -> habit_id -> record */
  byDate: Record<string, Record<string, HabitRecordRow>>;
  /** 강제 리렌더 트리거용 revision 번호 */
  revision: number;
  loadDate: (date: Date) => Promise<void>;
  loadRange: (start: Date, end: Date) => Promise<void>;
  getRecord: (
    dateKey: string,
    habitId: string
  ) => HabitRecordRow | undefined;
  toggleCompleted: (
    date: Date,
    habitId: string
  ) => Promise<void>;
  adjustMinutes: (
    date: Date,
    habitId: string,
    delta: number
  ) => Promise<void>;
  setMinutes: (
    date: Date,
    habitId: string,
    minutes: number
  ) => Promise<void>;
  setMemo: (
    date: Date,
    habitId: string,
    memo: string
  ) => Promise<void>;
}

function genId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useRecordStore = create<RecordState>((set, get) => ({
  byDate: {},
  revision: 0,

  loadDate: async (date) => {
    const key = toDateKey(date);
    const rows = await fetchRecordsForDate(key);
    const map: Record<string, HabitRecordRow> = {};
    for (const r of rows) map[r.habit_id] = r;
    set((s) => ({
      byDate: { ...s.byDate, [key]: map },
      revision: s.revision + 1,
    }));
  },

  loadRange: async (start, end) => {
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    const rows = await fetchRecordsInRange(startKey, endKey);
    const grouped: Record<string, Record<string, HabitRecordRow>> = {};
    for (const r of rows) {
      (grouped[r.date] ||= {})[r.habit_id] = r;
    }
    set((s) => ({
      byDate: { ...s.byDate, ...grouped },
      revision: s.revision + 1,
    }));
  },

  getRecord: (dateKey, habitId) => {
    return get().byDate[dateKey]?.[habitId];
  },

  toggleCompleted: async (date, habitId) => {
    const key = toDateKey(date);
    const existing = get().byDate[key]?.[habitId];
    const next: HabitRecordRow = existing
      ? { ...existing, is_completed: existing.is_completed ? 0 : 1 }
      : {
          id: genId(),
          habit_id: habitId,
          date: key,
          is_completed: 1,
          minutes: 0,
          memo: null,
          logged_at: new Date().toISOString(),
        };
    await upsertRecord(next);
    set((s) => ({
      byDate: {
        ...s.byDate,
        [key]: { ...(s.byDate[key] || {}), [habitId]: next },
      },
      revision: s.revision + 1,
    }));
  },

  adjustMinutes: async (date, habitId, delta) => {
    const key = toDateKey(date);
    const existing = get().byDate[key]?.[habitId];
    const base = existing?.minutes ?? 0;
    const minutes = Math.max(0, Math.min(480, base + delta));
    const next: HabitRecordRow = existing
      ? { ...existing, minutes }
      : {
          id: genId(),
          habit_id: habitId,
          date: key,
          is_completed: 0,
          minutes,
          memo: null,
          logged_at: new Date().toISOString(),
        };
    await upsertRecord(next);
    set((s) => ({
      byDate: {
        ...s.byDate,
        [key]: { ...(s.byDate[key] || {}), [habitId]: next },
      },
      revision: s.revision + 1,
    }));
  },

  setMinutes: async (date, habitId, minutes) => {
    const key = toDateKey(date);
    const existing = get().byDate[key]?.[habitId];
    const clamped = Math.max(0, Math.min(480, minutes));
    const next: HabitRecordRow = existing
      ? { ...existing, minutes: clamped }
      : {
          id: genId(),
          habit_id: habitId,
          date: key,
          is_completed: 0,
          minutes: clamped,
          memo: null,
          logged_at: new Date().toISOString(),
        };
    await upsertRecord(next);
    set((s) => ({
      byDate: {
        ...s.byDate,
        [key]: { ...(s.byDate[key] || {}), [habitId]: next },
      },
      revision: s.revision + 1,
    }));
  },

  setMemo: async (date, habitId, memo) => {
    const key = toDateKey(date);
    const existing = get().byDate[key]?.[habitId];
    const next: HabitRecordRow = existing
      ? { ...existing, memo }
      : {
          id: genId(),
          habit_id: habitId,
          date: key,
          is_completed: 0,
          minutes: 0,
          memo,
          logged_at: new Date().toISOString(),
        };
    await upsertRecord(next);
    set((s) => ({
      byDate: {
        ...s.byDate,
        [key]: { ...(s.byDate[key] || {}), [habitId]: next },
      },
      revision: s.revision + 1,
    }));
  },
}));
