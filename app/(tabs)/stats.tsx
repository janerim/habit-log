// 통계 화면: 주간/월간 탭, 습관별 달성률, 그룹별 시간, 스트릭.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [sleepExpanded, setSleepExpanded] = useState(false);
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
  const sleepDurs = sleepEntries.map((e) => e.rec!.duration_min);
  const sleepAvg = sleepDurs.length === 0
    ? 0
    : sleepDurs.reduce((s, v) => s + v, 0) / sleepDurs.length;
  const sleepMin = sleepDurs.length === 0 ? 0 : Math.min(...sleepDurs);
  const sleepMax = sleepDurs.length === 0 ? 0 : Math.max(...sleepDurs);
  const maxSleep = Math.max(1, sleepMax);

  // 그룹별 달성률 (소속 습관들의 평균)
  const groupedCompletion = groups
    .map((g) => {
      const items = habitCompletion
        .filter((c) => c.habit.group_id === g.id)
        .sort((a, b) => b.ratio - a.ratio);
      const avg = items.length === 0
        ? 0
        : items.reduce((s, c) => s + c.ratio, 0) / items.length;
      return { group: g, items, avg };
    })
    .filter((g) => g.items.length > 0);

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
          {groupedCompletion.length > 0 ? (
            <View style={{ gap: 14 }}>
              {groupedCompletion.map(({ group, items, avg }) => (
                <View key={group.id}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupHeaderText}>
                      {group.emoji} {group.name}
                    </Text>
                    <View style={[styles.groupAvgBadge, { backgroundColor: group.color + '22' }]}>
                      <Text style={[styles.groupAvgText, { color: group.color }]}>
                        평균 {Math.round(avg * 100)}%
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 8 }}>
                    {items.map(({ habit, ratio }) => (
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
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>데이터가 없어요</Text>
          )}
        </ChartCard>

        <ChartCard
          title="수면 시간"
          subtitle={sleepEntries.length > 0 ? `${sleepEntries.length}일 기록됨` : '기록 없음'}
        >
          {sleepEntries.length > 0 ? (
            <>
              <View style={styles.sleepSummary}>
                <SleepStat label="평균" value={sleepAvg} />
                <View style={styles.sleepDivider} />
                <SleepStat label="최단" value={sleepMin} />
                <View style={styles.sleepDivider} />
                <SleepStat label="최장" value={sleepMax} />
              </View>
              <Pressable
                onPress={() => setSleepExpanded((v) => !v)}
                style={styles.expandBtn}
                hitSlop={8}
              >
                <Text style={styles.expandText}>
                  {sleepExpanded ? '접기' : '일자별 자세히 보기'}
                </Text>
                <MaterialCommunityIcons
                  name={sleepExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#5E5CE6"
                />
              </Pressable>
              {sleepExpanded && (
                <View style={{ gap: 8, marginTop: 8 }}>
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
              )}
            </>
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

function SleepStat({ label, value }: { label: string; value: number }) {
  const total = Math.round(value);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return (
    <View style={styles.sleepStatItem}>
      <Text style={styles.sleepStatLabel}>{label}</Text>
      <Text style={styles.sleepStatValue}>
        {h}
        <Text style={styles.sleepStatUnit}>h </Text>
        {m > 0 ? (
          <>
            {m}
            <Text style={styles.sleepStatUnit}>m</Text>
          </>
        ) : null}
      </Text>
    </View>
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
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupHeaderText: { fontSize: 13, fontWeight: '700', color: '#333' },
  groupAvgBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  groupAvgText: { fontSize: 11, fontWeight: '700' },
  sleepSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F6F5FF', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  sleepStatItem: { flex: 1, alignItems: 'center' },
  sleepStatLabel: { fontSize: 11, color: '#6B6B70', fontWeight: '600', marginBottom: 4 },
  sleepStatValue: { fontSize: 18, fontWeight: '800', color: '#5E5CE6' },
  sleepStatUnit: { fontSize: 11, fontWeight: '600', color: '#5E5CE6' },
  sleepDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#D1D1D6' },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, marginTop: 6,
  },
  expandText: { fontSize: 13, color: '#5E5CE6', fontWeight: '600' },
});
