// 습관 및 그룹의 전역 상태 (Zustand).
import { create } from 'zustand';
import {
  fetchGroups,
  fetchHabits,
  insertHabit,
  updateHabit,
  deleteHabit,
  insertGroup,
  updateGroup,
  deleteGroup,
  HabitGroupRow,
  HabitRow,
} from '../db/database';

interface HabitState {
  groups: HabitGroupRow[];
  habits: HabitRow[];
  loaded: boolean;
  load: () => Promise<void>;
  addHabit: (habit: HabitRow) => Promise<void>;
  editHabit: (habit: HabitRow) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  addGroup: (group: HabitGroupRow) => Promise<void>;
  editGroup: (group: HabitGroupRow) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  groups: [],
  habits: [],
  loaded: false,

  load: async () => {
    const [groups, habits] = await Promise.all([
      fetchGroups(),
      fetchHabits(),
    ]);
    set({ groups, habits, loaded: true });
  },

  addHabit: async (habit) => {
    await insertHabit(habit);
    await get().load();
  },
  editHabit: async (habit) => {
    await updateHabit(habit);
    await get().load();
  },
  removeHabit: async (id) => {
    await deleteHabit(id);
    await get().load();
  },

  addGroup: async (group) => {
    await insertGroup(group);
    await get().load();
  },
  editGroup: async (group) => {
    await updateGroup(group);
    await get().load();
  },
  removeGroup: async (id) => {
    await deleteGroup(id);
    await get().load();
  },
}));
