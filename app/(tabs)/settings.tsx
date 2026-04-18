// 설정 화면: 습관 관리 + 알림 시간 + 데이터 초기화.
import React, { useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHabitStore } from '../../store/habitStore';
import {
  cancelHabitReminder,
  getStoredReminder,
  requestNotificationPermission,
  scheduleHabitReminder,
} from '../../utils/notificationManager';
import { resetDatabase } from '../../db/database';
import { exportBackup, importBackup } from '../../utils/backup';
import { insertDummyData } from '../../utils/dummyData';

export default function SettingsScreen() {
  const habits = useHabitStore((s) => s.habits);
  const groups = useHabitStore((s) => s.groups);
  const removeHabit = useHabitStore((s) => s.removeHabit);
  const removeGroup = useHabitStore((s) => s.removeGroup);
  const load = useHabitStore((s) => s.load);

  const [reminderOn, setReminderOn] = useState(false);
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    (async () => {
      const saved = await getStoredReminder();
      if (saved) {
        setReminderOn(true);
        setHour(saved.hour);
        setMinute(saved.minute);
      }
    })();
  }, []);

  async function toggleReminder(next: boolean) {
    if (next) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert('알림 권한이 필요합니다');
        return;
      }
      await scheduleHabitReminder(hour, minute);
    } else {
      await cancelHabitReminder();
    }
    setReminderOn(next);
  }

  function bumpHour(delta: number) {
    const next = (hour + delta + 24) % 24;
    setHour(next);
    if (reminderOn) scheduleHabitReminder(next, minute);
  }
  function bumpMinute(delta: number) {
    const next = (minute + delta + 60) % 60;
    setMinute(next);
    if (reminderOn) scheduleHabitReminder(hour, next);
  }

  function confirmReset() {
    Alert.alert(
      '데이터 초기화',
      '모든 습관·그룹·기록·기분·수면 데이터가 완전히 삭제됩니다. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화', style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            await load();
          },
        },
      ]
    );
  }

  function confirmDeleteGroup(id: string, name: string) {
    const count = habits.filter((h) => h.group_id === id).length;
    Alert.alert(
      `"${name}" 그룹 삭제`,
      count > 0
        ? `이 그룹의 습관 ${count}개와 기록이 모두 삭제됩니다.`
        : '이 그룹을 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => removeGroup(id) },
      ]
    );
  }

  function confirmDeleteHabit(id: string, name: string) {
    Alert.alert(`"${name}" 삭제`, '모든 기록이 함께 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => removeHabit(id),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section title="알림">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>저녁 리마인더</Text>
            <Switch value={reminderOn} onValueChange={toggleReminder} />
          </View>
          {reminderOn && (
            <View style={styles.timeRow}>
              <TimeStepper
                label="시"
                value={hour}
                onInc={() => bumpHour(1)}
                onDec={() => bumpHour(-1)}
              />
              <TimeStepper
                label="분"
                value={minute}
                onInc={() => bumpMinute(5)}
                onDec={() => bumpMinute(-5)}
              />
            </View>
          )}
        </Section>

        <Section
          title="그룹 관리"
          right={
            <Pressable onPress={() => router.push('/group-edit')} hitSlop={8}>
              <MaterialCommunityIcons name="plus" size={22} color="#0A84FF" />
            </Pressable>
          }
        >
          {groups.map((g) => (
            <View key={g.id} style={[styles.habitRow, { paddingHorizontal: 14 }]}>
              <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
              <View style={[styles.groupColorDot, { backgroundColor: g.color }]} />
              <Text style={styles.habitName}>{g.name}</Text>
              <Pressable
                onPress={() => router.push({ pathname: '/group-edit', params: { id: g.id } })}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#6B6B70" />
              </Pressable>
              <Pressable
                onPress={() => confirmDeleteGroup(g.id, g.name)}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF3B30" />
              </Pressable>
            </View>
          ))}
        </Section>

        <Section
          title="습관 관리"
          right={
            <Pressable
              onPress={() => router.push('/habit-edit')}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="plus" size={22} color="#0A84FF" />
            </Pressable>
          }
        >
          {groups.map((g) => {
            const list = habits
              .filter((h) => h.group_id === g.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            if (list.length === 0) return null;
            return (
              <View key={g.id} style={styles.groupBlock}>
                <Text style={styles.groupTitle}>
                  {g.emoji} {g.name}
                </Text>
                {list.map((h) => (
                  <View key={h.id} style={styles.habitRow}>
                    <View style={[styles.habitDot, { backgroundColor: h.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.habitName}>{h.name}</Text>
                      <Text style={styles.habitMeta}>
                        {formatActiveDays(h.active_days ?? '1111111')}
                        {h.target_minutes ? ` · 목표 ${h.target_minutes}분` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/habit-edit', params: { id: h.id } })
                      }
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#6B6B70" />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDeleteHabit(h.id, h.name)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color="#FF3B30"
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}
        </Section>

        <Section title="데이터 백업">
          <Pressable
            onPress={async () => {
              try {
                await exportBackup();
              } catch (e: any) {
                Alert.alert('내보내기 실패', e.message);
              }
            }}
            style={styles.actionBtn}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#0A84FF" />
            <Text style={styles.actionText}>백업 내보내기</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            onPress={async () => {
              try {
                const res = await importBackup();
                if (res.success) {
                  await load();
                  Alert.alert('복구 완료', res.message);
                } else if (res.message !== '취소됨') {
                  Alert.alert('복구 실패', res.message);
                }
              } catch (e: any) {
                Alert.alert('복구 실패', e.message);
              }
            }}
            style={styles.actionBtn}
          >
            <MaterialCommunityIcons name="cloud-download-outline" size={20} color="#0A84FF" />
            <Text style={styles.actionText}>백업 복구하기</Text>
          </Pressable>
        </Section>

        <Section title="데이터">
          <Pressable
            onPress={() => {
              Alert.alert(
                '더미 데이터 추가',
                '최근 30일치 습관 기록·기분·수면 데이터를 생성합니다.',
                [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '추가',
                    onPress: async () => {
                      await insertDummyData();
                      await load();
                      Alert.alert('완료', '30일치 더미 데이터가 추가되었어요.');
                    },
                  },
                ],
              );
            }}
            style={styles.actionBtn}
          >
            <MaterialCommunityIcons name="database-plus-outline" size={20} color="#FF9500" />
            <Text style={[styles.actionText, { color: '#FF9500' }]}>더미 데이터 추가 (심사용)</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable onPress={confirmReset} style={styles.dangerBtn}>
            <Text style={styles.dangerText}>데이터 초기화</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title, right, children,
}: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function formatActiveDays(mask: string): string {
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  if (mask === '1111111') return '매일';
  if (mask === '0111110') return '평일';
  if (mask === '1000001') return '주말';
  return names.filter((_, i) => mask[i] === '1').join('·');
}

function TimeStepper({
  label, value, onInc, onDec,
}: { label: string; value: number; onInc: () => void; onDec: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDec} style={styles.stepBtn}>
        <MaterialCommunityIcons name="minus" size={18} />
      </Pressable>
      <Text style={styles.stepValue}>
        {value.toString().padStart(2, '0')}{label}
      </Text>
      <Pressable onPress={onInc} style={styles.stepBtn}>
        <MaterialCommunityIcons name="plus" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F2F7' },
  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, marginBottom: 6,
  },
  sectionTitle: { fontSize: 13, color: '#6B6B70', fontWeight: '600' },
  sectionBody: {
    backgroundColor: 'white', marginHorizontal: 14,
    borderRadius: 14, paddingVertical: 6,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
  },
  rowLabel: { fontSize: 15, color: '#111' },
  timeRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F2F2F7', padding: 6, borderRadius: 10,
  },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white',
  },
  stepValue: { minWidth: 40, textAlign: 'center', fontWeight: '600' },
  groupColorDot: { width: 10, height: 10, borderRadius: 5 },
  groupBlock: { paddingHorizontal: 14, paddingVertical: 8 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 },
  habitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
  },
  habitName: { fontSize: 15, color: '#111' },
  habitMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  habitDot: { width: 10, height: 10, borderRadius: 5 },
  iconBtn: { padding: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  actionText: { fontSize: 15, color: '#0A84FF', fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginLeft: 46 },
  dangerBtn: {
    paddingVertical: 12, alignItems: 'center',
  },
  dangerText: { color: '#FF3B30', fontWeight: '600', fontSize: 15 },
});
