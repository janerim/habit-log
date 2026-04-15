// 월간 캘린더의 개별 날짜 셀.
// 진행률 링(완료 비율) + 기분 이모지만 표시.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isSameMonth, isToday } from '../../utils/dateHelper';
import { MOOD_META } from '../../store/moodStore';

interface Props {
  date: Date;
  month: Date;
  ratio: number; // 0~1
  mood?: number; // 1~5
  onPress: () => void;
  onLongPress?: () => void;
}

const RING_SIZE = 38;
const RING_STROKE = 3.5;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export default function DayCell({
  date, month, ratio, mood, onPress, onLongPress,
}: Props) {
  const inMonth = isSameMonth(date, month);
  const today = isToday(date);
  const pct = Math.max(0, Math.min(1, ratio));

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.cell}>
      <View style={[styles.inner, today && styles.today]}>
        <View style={styles.ringBox}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="#E5E5EA"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {pct > 0 && (
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="#0A84FF"
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={`${CIRC * pct} ${CIRC}`}
                strokeDashoffset={CIRC / 4}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            )}
          </Svg>
          <Text style={[
            styles.day,
            !inMonth && styles.dim,
            today && styles.todayText,
          ]}>
            {date.getDate()}
          </Text>
        </View>
        {mood && MOOD_META[mood] ? (
          <View style={[styles.moodBadge, { backgroundColor: MOOD_META[mood].color + '22' }]}>
            <MaterialCommunityIcons
              name={MOOD_META[mood].icon as any}
              size={13}
              color={MOOD_META[mood].color}
            />
          </View>
        ) : (
          <View style={{ height: 16 }} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { width: '100%', height: 76, padding: 3 },
  inner: {
    flex: 1, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', paddingTop: 2, paddingBottom: 2,
  },
  today: { borderWidth: 1.5, borderColor: '#0A84FF' },
  ringBox: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  day: {
    position: 'absolute', fontSize: 14, fontWeight: '600', color: '#111',
  },
  dim: { color: '#C7C7CC' },
  todayText: { color: '#0A84FF', fontWeight: '700' },
  mood: { fontSize: 12, marginTop: 2 },
  moodBadge: {
    width: 18, height: 18, borderRadius: 9, marginTop: 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
