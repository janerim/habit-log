// 월간 캘린더 그리드.
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DayCell from './DayCell';
import {
  monthGridDays, monthTitle, toDateKey, addMonths, subMonths,
} from '../../utils/dateHelper';
import { useHabitStore } from '../../store/habitStore';
import { useRecordStore } from '../../store/recordStore';
import { useMoodStore } from '../../store/moodStore';

interface Props {
  month: Date;
  onChangeMonth: (next: Date) => void;
  onPressDate: (date: Date) => void;
  onLongPressDate?: (date: Date) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView({ month, onChangeMonth, onPressDate, onLongPressDate }: Props) {
  const days = useMemo(() => monthGridDays(month), [month]);
  const habits = useHabitStore((s) => s.habits);
  const byDate = useRecordStore((s) => s.byDate);
  const moodByDate = useMoodStore((s) => s.byDate);

  const activeHabits = habits.filter((h) => h.is_active === 1);

  function computeRatio(date: Date): number {
    const dow = date.getDay();
    const dayHabits = activeHabits.filter(
      (h) => (h.active_days ?? '1111111')[dow] === '1'
    );
    const recs = byDate[toDateKey(date)] || {};
    if (dayHabits.length === 0) return 0;
    const done = dayHabits.filter((h) => recs[h.id]?.is_completed === 1).length;
    return done / dayHabits.length;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeMonth(subMonths(month, 1))} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#0A84FF" />
        </Pressable>
        <Text style={styles.title}>{monthTitle(month)}</Text>
        <Pressable onPress={() => onChangeMonth(addMonths(month, 1))} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-right" size={26} color="#0A84FF" />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text
            key={w}
            style={[
              styles.week,
              i === 0 && { color: '#FF3B30' },
              i === 6 && { color: '#0A84FF' },
            ]}
          >
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((d) => {
          const ratio = computeRatio(d);
          const mood = moodByDate[toDateKey(d)];
          return (
            <View key={d.toISOString()} style={styles.cellWrap}>
              <DayCell
                date={d}
                month={month}
                ratio={ratio}
                mood={mood}
                onPress={() => onPressDate(d)}
                onLongPress={() => onLongPressDate?.(d)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  weekRow: { flexDirection: 'row', paddingVertical: 4 },
  week: {
    flex: 1, textAlign: 'center', fontSize: 12, color: '#6B6B70',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, height: 76 },
});
