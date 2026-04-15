// 수면 기록 전역 상태.
import { create } from 'zustand';
import {
  fetchSleepInRange, upsertSleep, deleteSleep, SleepRecordRow,
} from '../db/database';
import { toDateKey } from '../utils/dateHelper';

/** bed/wake 'HH:mm' 문자열에서 총 수면시간(분) 계산. wake < bed면 익일로 간주. */
export function computeSleepMinutes(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

interface SleepState {
  byDate: Record<string, SleepRecordRow>;
  loadRange: (start: Date, end: Date) => Promise<void>;
  save: (date: Date, bed: string, wake: string) => Promise<void>;
  clear: (date: Date) => Promise<void>;
}

export const useSleepStore = create<SleepState>((set, get) => ({
  byDate: {},

  loadRange: async (start, end) => {
    const rows = await fetchSleepInRange(toDateKey(start), toDateKey(end));
    const next = { ...get().byDate };
    for (const r of rows) next[r.date] = r;
    set({ byDate: next });
  },

  save: async (date, bed, wake) => {
    const key = toDateKey(date);
    const duration = computeSleepMinutes(bed, wake);
    await upsertSleep(key, bed, wake, duration);
    set({
      byDate: {
        ...get().byDate,
        [key]: {
          date: key, bed_time: bed, wake_time: wake,
          duration_min: duration, updated_at: new Date().toISOString(),
        },
      },
    });
  },

  clear: async (date) => {
    const key = toDateKey(date);
    await deleteSleep(key);
    const next = { ...get().byDate };
    delete next[key];
    set({ byDate: next });
  },
}));
