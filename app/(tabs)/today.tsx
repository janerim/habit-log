// 오늘(또는 특정 날짜) 기록 화면.
// Query param `?date=YYYY-MM-DD` 가 있으면 그 날짜로 초기화, 없으면 오늘.
import React, { useEffect, useMemo } from 'react';
import {
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../../store/habitStore';
import { useRecordStore } from '../../store/recordStore';
import { parseISO, format, toDateKey, formatMinutes } from '../../utils/dateHelper';
import GroupSection from '../../components/habits/GroupSection';

export default function TodayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = useMemo(() => {
    if (typeof params.date === 'string') {
      try { return parseISO(params.date); } catch { return new Date(); }
    }
    return new Date();
  }, [params.date]);

  const dateKey = toDateKey(date);

  const habits = useHabitStore((s) => s.habits);
  const groups = useHabitStore((s) => s.groups);

  const loadDate = useRecordStore((s) => s.loadDate);
  const toggle = useRecordStore((s) => s.toggleCompleted);
  const setMinutes = useRecordStore((s) => s.setMinutes);
  const byDate = useRecordStore((s) => s.byDate);
  const records = byDate[dateKey] || {};

  useEffect(() => { loadDate(date); }, [date, loadDate]);

  const dow = date.getDay();
  const visibleHabits = habits.filter((h) => h.is_active === 1);
  const isDayActive = (h: typeof habits[number]) =>
    (h.active_days ?? '1111111')[dow] === '1';
  const todayHabits = visibleHabits.filter(isDayActive);

  const habitsByGroup = useMemo(() => {
    const m: Record<string, typeof visibleHabits> = {};
    for (const h of visibleHabits) {
      (m[h.group_id] ||= []).push(h);
    }
    return m;
  }, [visibleHabits]);

  const totalMinutes = todayHabits.reduce(
    (sum, h) => sum + (records[h.id]?.minutes ?? 0), 0
  );
  const doneCount = todayHabits.filter(
    (h) => records[h.id]?.is_completed === 1
  ).length;
  const ratio = todayHabits.length === 0 ? 0 : doneCount / todayHabits.length;
  const activeHabits = visibleHabits;

  if (activeHabits.length === 0) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 습관이 없어요</Text>
          <Text style={styles.emptySub}>설정 탭에서 습관을 추가해 보세요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateSmall}>{format(date, 'yyyy년')}</Text>
          <Text style={styles.date}>{format(date, 'M월 d일 (EEE)')}</Text>
          <Text style={styles.summary}>
            {doneCount}/{todayHabits.length} 완료
            {totalMinutes > 0 ? ` · ${formatMinutes(totalMinutes)}` : ''}
          </Text>
        </View>
        <RingProgress ratio={ratio} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {groups.map((g) => {
          const list = habitsByGroup[g.id] || [];
          if (list.length === 0) return null;
          // 오늘 활성 요일 습관을 위로, 비활성을 아래로 정렬
          const sorted = [...list].sort(
            (a, b) => Number(isDayActive(b)) - Number(isDayActive(a))
          );
          return (
            <GroupSection
              key={g.id}
              group={g}
              habits={sorted}
              records={records}
              isDisabled={(h) => !isDayActive(h)}
              onToggle={(habitId) => toggle(date, habitId)}
              onChangeMinutes={(habitId, m) => setMinutes(date, habitId, m)}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function RingProgress({ ratio }: { ratio: number }) {
  const SIZE = 70, STROKE = 7;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#E5E5EA" strokeWidth={STROKE} fill="none" />
        {pct > 0 && (
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            stroke="#0A84FF" strokeWidth={STROKE} fill="none"
            strokeDasharray={`${C * pct} ${C}`}
            strokeDashoffset={C / 4}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 16, fontWeight: '800', color: '#0A84FF' }}>
        {Math.round(pct * 100)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14,
    backgroundColor: '#F2F2F7', gap: 12,
  },
  dateSmall: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  date: { fontSize: 24, fontWeight: '800', color: '#111', marginTop: 2 },
  summary: { marginTop: 4, fontSize: 13, color: '#6B6B70' },
  list: { paddingVertical: 10, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  emptySub: { marginTop: 6, color: '#6B6B70' },
});
