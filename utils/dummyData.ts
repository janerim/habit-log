import { getDB } from '../db/database';
import { toDateKey } from './dateHelper';
import { subDays } from 'date-fns';

export async function insertDummyData(): Promise<void> {
  const db = await getDB();
  const now = new Date();

  const habits = await db.getAllAsync<{ id: string; group_id: string; active_days: string }>(
    'SELECT id, group_id, active_days FROM habits WHERE is_active = 1',
  );

  if (habits.length === 0) return;

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < 30; i++) {
      const d = subDays(now, i);
      const key = toDateKey(d);
      const dow = d.getDay();

      for (const h of habits) {
        const activeDays = h.active_days ?? '1111111';
        if (activeDays[dow] !== '1') continue;

        const completed = Math.random() > 0.25 ? 1 : 0;
        const minutes = completed ? Math.floor(Math.random() * 50 + 10) : 0;
        const id = `demo_${h.id}_${key}`;

        await db.runAsync(
          `INSERT OR IGNORE INTO habit_records (id, habit_id, date, is_completed, minutes, memo, logged_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?)`,
          [id, h.id, key, completed, minutes, now.toISOString()],
        );
      }

      const mood = Math.floor(Math.random() * 5) + 1;
      await db.runAsync(
        `INSERT OR IGNORE INTO daily_moods (date, mood, updated_at) VALUES (?, ?, ?)`,
        [key, mood, now.toISOString()],
      );

      const bedH = 22 + Math.floor(Math.random() * 3);
      const bedM = Math.floor(Math.random() * 6) * 10;
      const wakeH = 6 + Math.floor(Math.random() * 2);
      const wakeM = Math.floor(Math.random() * 6) * 10;
      const bed = `${bedH.toString().padStart(2, '0')}:${bedM.toString().padStart(2, '0')}`;
      const wake = `${wakeH.toString().padStart(2, '0')}:${wakeM.toString().padStart(2, '0')}`;
      let dur = (wakeH * 60 + wakeM) - (bedH * 60 + bedM);
      if (dur <= 0) dur += 24 * 60;

      await db.runAsync(
        `INSERT OR IGNORE INTO sleep_records (date, bed_time, wake_time, duration_min, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [key, bed, wake, dur, now.toISOString()],
      );
    }
  });
}
