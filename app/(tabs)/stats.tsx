// 통계 화면: 주간/월간 탭, 습관별 달성률, 그룹별 시간, 스트릭.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval, subDays, differenceInCalendarDays,
} from 'date-fns';
import ChartCard from '../../components/stats/ChartCard';
import { useHabitStore } from '../../store/habitStore';
import { useRecordStore } from '../../store/recordStore';
import { useSleepStore } from '../../store/sleepStore';
import { toDateKey, formatMinutes } from '../../utils/dateHelper';

type Range = 'week' | 'month';

export default function StatsScreen() {
  const [range, setRange] = useState<Range>('week');
  const habits = useHabitStore((s) => s.habits);
  const groups = useHabitStore((s) => s.groups);
  const loadRange = useRecordStore((s) => s.loadRange);
  const byDate = useRecordStore((s) => s.byDate);
  const loadSleep = useSleepStore((s) => s.loadRange);
  const sleepByDate = useSleepStore((s) => s.byDate);

  const now = new Date();
  const { start, end } = useMemo(() => {
    if (range === 'week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 }),
      };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [range, now.toDateString()]);

  useEffect(() => {
    loadRange(start, end);
    loadSleep(start, end);
  }, [start, end, loadRange, loadSleep]);

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);
  const activeHabits = habits.filter((h) => h.is_active === 1);

  // 습관별 달성률
  const habitCompletion = activeHabits.map((h) => {
    let done = 0;
    for (const d of days) {
      if (byDate[toDateKey(d)]?.[h.id]?.is_completed === 1) done += 1;
    }
    return {
      habit: h,
      ratio: days.length === 0 ? 0 : done / days.length,
    };
  });

  // 그룹별 시간 합산
  const groupMinutes: Record<string, number> = {};
  for (const d of days) {
    const recs = byDate[toDateKey(d)] || {};
    for (const h of activeHabits) {
      const m = recs[h.id]?.minutes ?? 0;
      groupMinutes[h.group_id] = (groupMinutes[h.group_id] ?? 0) + m;
    }
  }
  const pieData = groups
    .map((g) => ({
      value: groupMinutes[g.id] ?? 0,
      color: g.color,
      text: g.emoji,
    }))
    .filter((d) => d.value > 0);

  const totalMinutes = Object.values(groupMinutes).reduce((s, v) => s + v, 0);

  // 연속 달성 스트릭 (오늘부터 역으로 '모든 습관 완료'인 날 수)
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = subDays(now, i);
    const recs = byDate[toDateKey(d)] || {};
    const doneAll =
      activeHabits.length > 0 &&
      activeHabits.every((h) => recs[h.id]?.is_completed === 1);
    if (doneAll) streak += 1;
    else break;
  }

  // 수면 통계
  const sleepEntries = days
    .map((d) => ({ date: d, rec: sleepByDate[toDateKey(d)] }))
    .filter((e) => !!e.rec);
  const sleepAvg = sleepEntries.length === 0
    ? 0
    : sleepEntries.reduce((s, e) => s + (e.rec!.duration_min), 0) / sleepEntries.length;
  const maxSleep = Math.max(1, ...sleepEntries.map((e) => e.rec!.duration_min));

  const completionList = habitCompletion
    .slice()
    .sort((a, b) => b.ratio - a.ratio);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.tabs}>
        <TabButton label="주간" active={range === 'week'} onPress={() => setRange('week')} />
        <TabButton label="월간" active={range === 'month'} onPress={() => setRange('month')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.rowCards}>
          <StatBox label="🔥 연속" value={`${streak}일`} />
          <StatBox
            label="총 기록"
            value={totalMinutes > 0 ? formatMinutes(totalMinutes) : '—'}
          />
        </View>

        <ChartCard
          title="습관별 달성률"
          subtitle={range === 'week' ? '이번 주' : '이번 달'}
        >
          {completionList.length > 0 ? (
            <View style={{ gap: 10 }}>
              {completionList.map(({ habit, ratio }) => (
                <View key={habit.id}>
                  <View style={styles.barHead}>
                    <Text numberOfLines={1} style={styles.barName}>{habit.name}</Text>
                    <Text style={styles.barPct}>{Math.round(ratio * 100)}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: habit.color },
                    ]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>데이터가 없어요</Text>
          )}
        </ChartCard>

        <ChartCard
          title="수면 시간"
          subtitle={sleepEntries.length > 0 ? `평균 ${formatMinutes(Math.round(sleepAvg))}` : '기록 없음'}
        >
          {sleepEntries.length > 0 ? (
            <View style={{ gap: 8 }}>
              {sleepEntries.map(({ date, rec }) => (
                <View key={toDateKey(date)}>
                  <View style={styles.barHead}>
                    <Text style={styles.barName}>
                      {date.getMonth() + 1}/{date.getDate()} · {rec!.bed_time} → {rec!.wake_time}
                    </Text>
                    <Text style={styles.barPct}>{(rec!.duration_min / 60).toFixed(1)}h</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      {
                        width: `${Math.max(2, (rec!.duration_min / maxSleep) * 100)}%`,
                        backgroundColor: '#5E5CE6',
                      },
                    ]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>수면 기록이 없어요</Text>
          )}
        </ChartCard>

        <ChartCard
          title="그룹별 시간 비율"
          subtitle={totalMinutes > 0 ? formatMinutes(totalMinutes) : '기록 없음'}
        >
          {pieData.length > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 13, fontWeight: '700' }}>
                    {formatMinutes(totalMinutes)}
                  </Text>
                )}
              />
              <View style={styles.legend}>
                {groups.map((g) => {
                  const m = groupMinutes[g.id] ?? 0;
                  if (m === 0) return null;
                  return (
                    <View key={g.id} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: g.color }]} />
                      <Text style={styles.legendText}>
                        {g.emoji} {g.name} · {formatMinutes(m)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>기록된 시간이 없어요</Text>
          )}
        </ChartCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F2F7' },
  tabs: {
    flexDirection: 'row', margin: 14, padding: 4,
    backgroundColor: '#E5E5EA', borderRadius: 10,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'white' },
  tabText: { color: '#6B6B70', fontWeight: '500' },
  tabTextActive: { color: '#111', fontWeight: '700' },
  rowCards: {
    flexDirection: 'row', gap: 10, marginHorizontal: 14, marginBottom: 8,
  },
  statBox: {
    flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 14,
  },
  statLabel: { fontSize: 12, color: '#6B6B70' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 4 },
  legend: { marginTop: 12, width: '100%', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: '#333' },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 20 },
  barHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  barName: { fontSize: 13, color: '#111', fontWeight: '500', flex: 1, marginRight: 8 },
  barPct: { fontSize: 12, color: '#6B6B70', fontWeight: '700' },
  barTrack: {
    height: 8, backgroundColor: '#F2F2F7',
    borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
});
