// 메인 캘린더 화면.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import CalendarView from '../../components/calendar/CalendarView';
import WeekView from '../../components/calendar/WeekView';
import { useHabitStore } from '../../store/habitStore';
import { useRecordStore } from '../../store/recordStore';
import { useMoodStore, MOOD_EMOJIS } from '../../store/moodStore';
import { useSleepStore } from '../../store/sleepStore';
import { toDateKey, formatMinutes, format as fmtDate } from '../../utils/dateHelper';
import {
  startOfMonth as sMonth, endOfMonth as eMonth,
  startOfWeek as sWeek, endOfWeek as eWeek,
  addWeeks, subWeeks,
} from 'date-fns';

function moodLabel(m: number) {
  return ({ 1: '힘들었어요', 2: '별로', 3: '보통', 4: '좋았어요', 5: '최고!' } as Record<number, string>)[m];
}

export default function CalendarScreen() {
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [month, setMonth] = useState<Date>(new Date());
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const habits = useHabitStore((s) => s.habits);
  const loadRange = useRecordStore((s) => s.loadRange);
  const byDate = useRecordStore((s) => s.byDate);
  const loadMoods = useMoodStore((s) => s.loadRange);
  const setMood = useMoodStore((s) => s.setMood);
  const clearMood = useMoodStore((s) => s.clearMood);
  const loadSleep = useSleepStore((s) => s.loadRange);

  useEffect(() => {
    if (mode === 'month') {
      loadRange(sMonth(month), eMonth(month));
      loadMoods(sMonth(month), eMonth(month));
      loadSleep(sMonth(month), eMonth(month));
    } else {
      const ws = sWeek(weekAnchor, { weekStartsOn: 1 });
      const we = eWeek(weekAnchor, { weekStartsOn: 1 });
      loadRange(ws, we);
      loadMoods(ws, we);
      loadSleep(ws, we);
    }
  }, [mode, month, weekAnchor, loadRange, loadMoods, loadSleep]);

  const today = new Date();
  const todayKey = toDateKey(today);
  const todayDow = today.getDay();
  const activeHabits = habits.filter(
    (h) => h.is_active === 1 && (h.active_days ?? '1111111')[todayDow] === '1'
  );
  const todayRecs = byDate[todayKey] || {};
  const doneCount = activeHabits.filter(
    (h) => todayRecs[h.id]?.is_completed === 1
  ).length;
  const totalMin = activeHabits.reduce(
    (s, h) => s + (todayRecs[h.id]?.minutes ?? 0), 0
  );

  function handleChangeMonth(next: Date) {
    setDirection(next > month ? 'right' : 'left');
    setMonth(next);
  }

  function handlePressDate(date: Date) {
    router.push({
      pathname: '/(tabs)/today',
      params: { date: toDateKey(date) },
    });
  }

  function handleLongPressDate(date: Date) {
    const title = `${fmtDate(date, 'M월 d일')} 기분`;
    Alert.alert(title, '오늘 컨디션은 어땠나요?', [
      ...[5, 4, 3, 2, 1].map((m) => ({
        text: `${MOOD_EMOJIS[m]}  ${moodLabel(m)}`,
        onPress: () => setMood(date, m),
      })),
      { text: '지우기', style: 'destructive' as const, onPress: () => clearMood(date) },
      { text: '취소', style: 'cancel' as const },
    ]);
  }

  const Entering = direction === 'right' ? SlideInRight : SlideInLeft;

  function handleChangeWeek(next: Date) {
    setDirection(next > weekAnchor ? 'right' : 'left');
    setWeekAnchor(next);
  }

  function goNext() {
    if (mode === 'month') {
      handleChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    } else {
      handleChangeWeek(addWeeks(weekAnchor, 1));
    }
  }
  function goPrev() {
    if (mode === 'month') {
      handleChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    } else {
      handleChangeWeek(subWeeks(weekAnchor, 1));
    }
  }

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      'worklet';
      if (e.translationX < -50) {
        runOnJS(goNext)();
      } else if (e.translationX > 50) {
        runOnJS(goPrev)();
      }
    });

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setMode('month')}
            style={[styles.toggleBtn, mode === 'month' && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, mode === 'month' && styles.toggleTextOn]}>월간</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('week')}
            style={[styles.toggleBtn, mode === 'week' && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, mode === 'week' && styles.toggleTextOn]}>주간</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            const now = new Date();
            setDirection('right');
            setMonth(now);
            setWeekAnchor(now);
          }}
          style={styles.todayBtn}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="calendar-today" size={16} color="#0A84FF" />
          <Text style={styles.todayBtnText}>오늘</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={swipe}>
        <Animated.View
          key={mode + (mode === 'month' ? month.toISOString() : weekAnchor.toISOString())}
          entering={Entering.duration(220)}
          style={mode === 'week' ? { flex: 1 } : undefined}
        >
          {mode === 'month' ? (
            <CalendarView
              month={month}
              onChangeMonth={handleChangeMonth}
              onPressDate={handlePressDate}
              onLongPressDate={handleLongPressDate}
            />
          ) : (
            <WeekView
              weekAnchor={weekAnchor}
              onChangeWeek={handleChangeWeek}
              onPressDate={handlePressDate}
            />
          )}
        </Animated.View>
      </GestureDetector>

      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/today', params: { date: todayKey } })}
        style={styles.summaryWrap}
      >
        <LinearGradient
          colors={['#0A84FF', '#5E5CE6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>오늘</Text>
            <Text style={styles.summaryBig}>
              {doneCount}
              <Text style={styles.summarySmall}> / {activeHabits.length} 완료</Text>
            </Text>
            {totalMin > 0 && (
              <Text style={styles.summaryMeta}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="rgba(255,255,255,0.85)" />
                {' '}{formatMinutes(totalMin)}
              </Text>
            )}
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${activeHabits.length === 0 ? 0 : (doneCount / activeHabits.length) * 100}%` },
              ]} />
            </View>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.ctaLabel}>기록하기</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="white" />
          </View>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F2F7' },
  summaryWrap: {
    marginTop: 'auto', marginHorizontal: 14, marginBottom: 14,
    shadowColor: '#0A84FF', shadowOpacity: 0.25,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  summaryCard: {
    borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center',
  },
  summaryLeft: { flex: 1 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12,
    fontWeight: '600', letterSpacing: 0.5,
  },
  summaryBig: {
    color: 'white', fontSize: 28, fontWeight: '800', marginTop: 2,
  },
  summarySmall: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600',
  },
  summaryMeta: {
    color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2,
  },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3, overflow: 'hidden', marginTop: 10,
  },
  progressFill: {
    height: '100%', backgroundColor: 'white', borderRadius: 3,
  },
  summaryRight: {
    alignItems: 'center', marginLeft: 14,
    paddingLeft: 14, borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.35)',
  },
  ctaLabel: { color: 'white', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA', borderRadius: 8, padding: 2,
  },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, backgroundColor: '#E8F1FF',
  },
  todayBtnText: { color: '#0A84FF', fontSize: 13, fontWeight: '700' },
  toggleBtn: {
    paddingHorizontal: 18, paddingVertical: 6, borderRadius: 6,
  },
  toggleOn: { backgroundColor: 'white' },
  toggleText: { fontSize: 13, color: '#6B6B70', fontWeight: '500' },
  toggleTextOn: { color: '#111', fontWeight: '700' },
});
