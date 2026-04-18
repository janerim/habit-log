import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB } from '../db/database';

interface BackupData {
  version: 1;
  exported_at: string;
  habit_groups: any[];
  habits: any[];
  habit_records: any[];
  daily_moods: any[];
  sleep_records: any[];
}

export async function exportBackup(): Promise<void> {
  const db = await getDB();

  const [groups, habits, records, moods, sleep] = await Promise.all([
    db.getAllAsync('SELECT * FROM habit_groups'),
    db.getAllAsync('SELECT * FROM habits'),
    db.getAllAsync('SELECT * FROM habit_records'),
    db.getAllAsync('SELECT * FROM daily_moods'),
    db.getAllAsync('SELECT * FROM sleep_records'),
  ]);

  const data: BackupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    habit_groups: groups,
    habits,
    habit_records: records,
    daily_moods: moods,
    sleep_records: sleep,
  };

  const json = JSON.stringify(data, null, 2);
  const file = new File(Paths.cache, 'habitlog_backup.json');
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'HabitLog 백업 내보내기',
    UTI: 'public.json',
  });
}

export async function importBackup(): Promise<{ success: boolean; message: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, message: '취소됨' };
  }

  const pickedFile = new File(result.assets[0].uri);
  const json = await pickedFile.text();

  let data: BackupData;
  try {
    data = JSON.parse(json);
  } catch {
    return { success: false, message: '잘못된 파일 형식이에요.' };
  }

  if (data.version !== 1 || !data.habit_groups || !data.habits) {
    return { success: false, message: '호환되지 않는 백업 파일이에요.' };
  }

  const db = await getDB();

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM habit_records;
      DELETE FROM habits;
      DELETE FROM habit_groups;
      DELETE FROM daily_moods;
      DELETE FROM sleep_records;
    `);

    for (const g of data.habit_groups) {
      await db.runAsync(
        `INSERT INTO habit_groups (id, name, emoji, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
        [g.id, g.name, g.emoji, g.color, g.sort_order],
      );
    }

    for (const h of data.habits) {
      await db.runAsync(
        `INSERT INTO habits (id, name, icon, color, group_id, is_time_tracked, target_minutes, sort_order, is_active, created_at, active_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [h.id, h.name, h.icon, h.color, h.group_id, h.is_time_tracked ?? 1, h.target_minutes ?? null, h.sort_order, h.is_active ?? 1, h.created_at, h.active_days ?? '1111111'],
      );
    }

    for (const r of data.habit_records) {
      await db.runAsync(
        `INSERT INTO habit_records (id, habit_id, date, is_completed, minutes, memo, logged_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.habit_id, r.date, r.is_completed, r.minutes, r.memo ?? null, r.logged_at],
      );
    }

    for (const m of data.daily_moods ?? []) {
      await db.runAsync(
        `INSERT INTO daily_moods (date, mood, updated_at) VALUES (?, ?, ?)`,
        [m.date, m.mood, m.updated_at],
      );
    }

    for (const s of data.sleep_records ?? []) {
      await db.runAsync(
        `INSERT INTO sleep_records (date, bed_time, wake_time, duration_min, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [s.date, s.bed_time, s.wake_time, s.duration_min, s.updated_at],
      );
    }
  });

  return { success: true, message: `복구 완료! (${data.exported_at.slice(0, 10)} 백업)` };
}
