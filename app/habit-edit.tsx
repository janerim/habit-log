// 습관 추가/수정 모달.
// ?id=<habitId> 파라미터가 있으면 수정 모드, 없으면 신규.
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHabitStore } from '../store/habitStore';
import { HabitRow } from '../db/database';
import { shadeFromGroupColor } from '../utils/colorHelper';

const ICON_CHOICES = [
  // 학습/업무/개발
  'book-open-variant', 'bookshelf', 'newspaper', 'file-document',
  'pencil', 'notebook', 'school', 'lightbulb-on',
  'cpu-64-bit', 'code-braces', 'console-line', 'git',
  'api', 'laptop', 'chart-line', 'hammer-wrench',
  'calculator', 'translate', 'earth',
  // 운동/건강
  'run', 'dumbbell', 'yoga', 'meditation',
  'bike', 'swim', 'walk', 'shoe-print',
  'weight-lifter', 'heart-pulse', 'sleep', 'pill',
  'stethoscope', 'spa', 'hand-heart',
  // 식습관/요리/카페
  'food-apple', 'water', 'coffee', 'coffee-maker',
  'tea', 'cup', 'glass-wine', 'silverware-fork-knife',
  'chef-hat', 'pot-steam', 'food-variant', 'bread-slice',
  'noodles',
  // 휴식/마음/취미
  'sofa', 'power-sleep', 'beach', 'brain',
  'music', 'palette', 'guitar-acoustic', 'camera',
  'movie', 'gamepad-variant', 'controller', 'flower',
  'pine-tree', 'paw', 'bird',
  // 생활
  'broom', 'washing-machine', 'home', 'bed',
  'shower', 'tooth', 'hand-wash', 'trash-can',
  'piggy-bank', 'cash', 'credit-card', 'calendar-check',
  'phone', 'message-text', 'email', 'account-group',
  'star', 'heart', 'fire', 'lightning-bolt',
  'check-circle', 'target', 'trophy', 'medal',
];

export default function HabitEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const habits = useHabitStore((s) => s.habits);
  const groups = useHabitStore((s) => s.groups);
  const addHabit = useHabitStore((s) => s.addHabit);
  const editHabit = useHabitStore((s) => s.editHabit);

  const existing = useMemo(
    () => habits.find((h) => h.id === id),
    [habits, id]
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'book-open-variant');
  const [groupId, setGroupId] = useState(existing?.group_id ?? groups[0]?.id ?? '');

  // 그룹 색상 + 같은 그룹 내 순번으로 자동 색상 파생
  const selectedGroup = groups.find((g) => g.id === groupId);
  const sameGroupHabits = habits.filter((h) => h.group_id === groupId);
  const indexInGroup = existing
    ? Math.max(0, sameGroupHabits.findIndex((h) => h.id === existing.id))
    : sameGroupHabits.length;
  const color = selectedGroup
    ? shadeFromGroupColor(selectedGroup.color, indexInGroup)
    : '#0A84FF';
  const [timeTracked, setTimeTracked] = useState((existing?.is_time_tracked ?? 1) === 1);
  const [target, setTarget] = useState<string>(
    existing?.target_minutes ? String(existing.target_minutes) : ''
  );
  const [active, setActive] = useState((existing?.is_active ?? 1) === 1);
  const [activeDays, setActiveDays] = useState<string>(existing?.active_days ?? '1111111');

  function toggleDay(i: number) {
    const arr = activeDays.split('');
    arr[i] = arr[i] === '1' ? '0' : '1';
    setActiveDays(arr.join(''));
  }

  async function save() {
    if (!name.trim() || !groupId) return;
    const base: HabitRow = {
      id: existing?.id ?? `h_${Date.now()}`,
      name: name.trim(),
      icon, color, group_id: groupId,
      is_time_tracked: timeTracked ? 1 : 0,
      target_minutes: target ? Math.max(0, parseInt(target, 10)) : null,
      sort_order: existing?.sort_order ?? habits.filter(h => h.group_id === groupId).length,
      is_active: active ? 1 : 0,
      created_at: existing?.created_at ?? new Date().toISOString(),
      active_days: activeDays,
    };
    if (existing) await editHabit(base);
    else await addHabit(base);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F2F2F7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F2F2F7' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="이름">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 아침 스트레칭"
          style={styles.input}
        />
      </Section>

      <Section title="그룹">
        <View style={styles.chipRow}>
          {groups.map((g) => {
            const selected = g.id === groupId;
            return (
              <Pressable
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={[
                  styles.chip,
                  selected && { backgroundColor: g.color + '22', borderColor: g.color },
                ]}
              >
                <Text style={[styles.chipText, selected && { color: g.color, fontWeight: '700' }]}>
                  {g.emoji} {g.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="요일">
        <View style={styles.dayRow}>
          {[
            { label: '월', idx: 1 },
            { label: '화', idx: 2 },
            { label: '수', idx: 3 },
            { label: '목', idx: 4 },
            { label: '금', idx: 5 },
            { label: '토', idx: 6 },
            { label: '일', idx: 0 },
          ].map(({ label, idx }) => {
            const on = activeDays[idx] === '1';
            return (
              <Pressable
                key={idx}
                onPress={() => toggleDay(idx)}
                style={[
                  styles.dayChip,
                  on && { backgroundColor: color, borderColor: color },
                ]}
              >
                <Text style={[
                  styles.dayChipText,
                  on && { color: 'white', fontWeight: '700' },
                  !on && idx === 0 && { color: '#FF3B30' },
                  !on && idx === 6 && { color: '#0A84FF' },
                ]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="옵션">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>시간 트래킹</Text>
          <Switch value={timeTracked} onValueChange={setTimeTracked} />
        </View>
        {timeTracked && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>목표 시간 (분)</Text>
            <TextInput
              keyboardType="number-pad"
              value={target}
              onChangeText={setTarget}
              placeholder="선택"
              style={[styles.input, { width: 100 }]}
            />
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>활성화</Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
      </Section>

      <Pressable
        onPress={save}
        style={[styles.saveBtn, { backgroundColor: color }]}
      >
        <Text style={styles.saveText}>{existing ? '저장' : '추가'}</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#6B6B70',
    marginHorizontal: 18, marginBottom: 6,
  },
  sectionBody: {
    backgroundColor: 'white', marginHorizontal: 14,
    borderRadius: 14, padding: 12,
  },
  input: {
    backgroundColor: '#F2F2F7', paddingHorizontal: 12,
    paddingVertical: 10, borderRadius: 10, fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#E5E5EA',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  chipText: { color: '#333', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E5EA',
  },
  colorBox: {
    width: 36, height: 36, borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3, borderColor: '#111',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 15, color: '#111' },
  saveBtn: {
    marginTop: 24, marginHorizontal: 14, marginBottom: 40,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  saveText: { color: 'white', fontWeight: '700', fontSize: 16 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayChip: {
    flex: 1, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { fontSize: 13, color: '#333', fontWeight: '600' },
});
