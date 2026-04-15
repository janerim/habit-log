// 일간 기록에서 그룹 단위 섹션(헤더 + 습관 리스트).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import HabitRow from './HabitRow';
import {
  HabitGroupRow,
  HabitRow as DBHabit,
  HabitRecordRow,
} from '../../db/database';
import { formatMinutes } from '../../utils/dateHelper';

interface Props {
  group: HabitGroupRow;
  habits: DBHabit[];
  records: Record<string, HabitRecordRow>;
  isDisabled?: (h: DBHabit) => boolean;
  onToggle: (habitId: string) => void;
  onChangeMinutes: (habitId: string, minutes: number) => void;
}

export default function GroupSection({
  group, habits, records, isDisabled, onToggle, onChangeMinutes,
}: Props) {
  const total = habits.reduce(
    (sum, h) => sum + (records[h.id]?.minutes ?? 0),
    0
  );
  const completed = habits.filter(
    (h) => records[h.id]?.is_completed === 1
  ).length;

  return (
    <View style={styles.section}>
      <View style={[styles.header, { borderLeftColor: group.color }]}>
        <Text style={styles.title}>
          {group.emoji} {group.name}
        </Text>
        <Text style={styles.meta}>
          {completed}/{habits.length}
          {total > 0 ? `  ·  ${formatMinutes(total)}` : ''}
        </Text>
      </View>
      <View style={styles.card}>
        {habits.map((h, idx) => (
          <View key={h.id}>
            <HabitRow
              habit={h}
              record={records[h.id]}
              disabled={isDisabled?.(h)}
              onToggle={() => onToggle(h.id)}
              onChangeMinutes={(m) => onChangeMinutes(h.id, m)}
            />
            {idx < habits.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 10, paddingVertical: 6, marginHorizontal: 14,
    marginBottom: 6, borderLeftWidth: 3,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111' },
  meta: { fontSize: 12, color: '#6B6B70' },
  card: {
    marginHorizontal: 14, borderRadius: 14, overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginLeft: 54 },
});
