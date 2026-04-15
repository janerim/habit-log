// 주간 뷰: 습관(행) × 7일(열) 체크 그리드.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { startOfWeek, addDays, addWeeks, subWeeks, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toDateKey, isToday } from '../../utils/dateHelper';
import { useHabitStore } from '../../store/habitStore';
import { useRecordStore } from '../../store/recordStore';

interface Props {
  weekAnchor: Date;
  onChangeWeek: (next: Date) => void;
  onPressDate: (date: Date) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function WeekView({ weekAnchor, onChangeWeek, onPressDate }: Props) {
  const start = useMemo(
    () => startOfWeek(weekAnchor, { weekStartsOn: 0 }),
    [weekAnchor]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start]
  );

  const habits = useHabitStore((s) => s.habits);
  const groups = useHabitStore((s) => s.groups);
  const byDate = useRecordStore((s) => s.byDate);
  const active = habits.filter((h) => h.is_active === 1);

  const title = `${format(start, 'M월 d일', { locale: ko })} – ${format(
    addDays(start, 6), 'M월 d일', { locale: ko }
  )}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeWeek(subWeeks(weekAnchor, 1))} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#0A84FF" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => onChangeWeek(addWeeks(weekAnchor, 1))} hitSlop={10}>
          <MaterialCommunityIcons name="chevron-right" size={26} color="#0A84FF" />
        </Pressable>
      </View>

      <View style={styles.headRow}>
        <View style={styles.nameCol} />
        {days.map((d, i) => (
          <Pressable
            key={i}
            onPress={() => onPressDate(d)}
            style={styles.dayHead}
          >
            <Text style={[
              styles.weekday,
              i === 0 && { color: '#FF3B30' },
              i === 6 && { color: '#0A84FF' },
            ]}>{WEEKDAYS[i]}</Text>
            <Text style={[
              styles.dayNum,
              isToday(d) && styles.todayNum,
            ]}>{d.getDate()}</Text>
            <View style={[
              styles.todayUnderline,
              isToday(d) && styles.todayUnderlineOn,
            ]} />
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.body}>
        {groups.map((group) => {
          const list = active.filter((h) => h.group_id === group.id);
          if (list.length === 0) return null;
          return (
            <View key={group.id} style={styles.groupBlock}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>
                  {group.emoji} {group.name}
                </Text>
              </View>
              {list.map((h) => (
                <View key={h.id} style={styles.row}>
                  <View style={styles.nameCol}>
                    <View style={[styles.colorDot, { backgroundColor: group.color }]} />
                    <Text numberOfLines={1} style={styles.habitName}>{h.name}</Text>
                  </View>
                  {days.map((d, i) => {
                    const key = toDateKey(d);
                    const done = byDate[key]?.[h.id]?.is_completed === 1;
                    const activeDow = (h.active_days ?? '1111111')[d.getDay()] === '1';
                    if (!activeDow) {
                      return (
                        <View key={i} style={styles.cell}>
                          <View style={styles.checkDisabled} />
                        </View>
                      );
                    }
                    return (
                      <Pressable
                        key={i}
                        onPress={() => onPressDate(d)}
                        style={styles.cell}
                      >
                        <View style={[
                          styles.check,
                          done && { backgroundColor: group.color, borderColor: group.color },
                        ]}>
                          {done && <MaterialCommunityIcons name="check" size={14} color="white" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}
        {active.length === 0 && (
          <Text style={styles.empty}>활성 습관이 없어요.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  headRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  nameCol: {
    width: 100, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingRight: 6,
  },
  dayHead: { flex: 1, alignItems: 'center' },
  weekday: { fontSize: 11, color: '#6B6B70' },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#111', marginTop: 2 },
  todayNum: {
    color: 'white', backgroundColor: '#0A84FF',
    width: 22, height: 22, borderRadius: 11, textAlign: 'center',
    overflow: 'hidden', lineHeight: 22,
  },
  body: { flex: 1, marginTop: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  habitName: { fontSize: 13, color: '#111', flexShrink: 1 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  checkDisabled: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: '#F5F5F7',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA',
  },
  todayUnderline: {
    width: 20, height: 3, borderRadius: 2, marginTop: 3,
    backgroundColor: 'transparent',
  },
  todayUnderlineOn: { backgroundColor: '#0A84FF' },
  empty: { textAlign: 'center', color: '#6B6B70', padding: 24 },
  groupBlock: { marginTop: 8 },
  groupHeader: {
    paddingVertical: 6, paddingHorizontal: 4,
    backgroundColor: '#F2F2F7', borderRadius: 6, marginBottom: 2,
  },
  groupTitle: { fontSize: 12, fontWeight: '700', color: '#333' },
});
