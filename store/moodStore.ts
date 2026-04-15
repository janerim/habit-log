// 일별 기분(컨디션) 전역 상태. 1~5단계.
import { create } from 'zustand';
import {
  fetchMoodsInRange, upsertMood, deleteMood,
} from '../db/database';
import { toDateKey } from '../utils/dateHelper';

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😞', 2: '😕', 3: '🙂', 4: '😄', 5: '🤩',
};

export const MOOD_META: Record<number, { icon: string; color: string; label: string }> = {
  1: { icon: 'emoticon-cry-outline',    color: '#5E5CE6', label: '힘들었어요' },
  2: { icon: 'emoticon-sad-outline',    color: '#30B0C7', label: '별로' },
  3: { icon: 'emoticon-neutral-outline',color: '#8E8E93', label: '보통' },
  4: { icon: 'emoticon-happy-outline',  color: '#34C759', label: '좋았어요' },
  5: { icon: 'emoticon-excited-outline',color: '#FF9500', label: '최고!' },
};

interface MoodState {
  byDate: Record<string, number>;
  loadRange: (start: Date, end: Date) => Promise<void>;
  setMood: (date: Date, mood: number) => Promise<void>;
  clearMood: (date: Date) => Promise<void>;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  byDate: {},

  loadRange: async (start, end) => {
    const rows = await fetchMoodsInRange(toDateKey(start), toDateKey(end));
    const next = { ...get().byDate };
    for (const r of rows) next[r.date] = r.mood;
    set({ byDate: next });
  },

  setMood: async (date, mood) => {
    const key = toDateKey(date);
    await upsertMood(key, mood);
    set({ byDate: { ...get().byDate, [key]: mood } });
  },

  clearMood: async (date) => {
    const key = toDateKey(date);
    await deleteMood(key);
    const next = { ...get().byDate };
    delete next[key];
    set({ byDate: next });
  },
}));
