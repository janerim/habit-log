// 일간 기록 화면에서 한 습관을 표시하는 행.
// 아이콘 대신 동그란 체크박스(그룹 색상)로 통일.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import TimePicker from './TimePicker';
import { HabitRow as DBHabit, HabitRecordRow } from '../../db/database';

interface Props {
  habit: DBHabit;
  record?: HabitRecordRow;
  disabled?: boolean;
  onToggle: () => void;
  onChangeMinutes: (m: number) => void;
}

export default function HabitRow({
  habit, record, disabled, onToggle, onChangeMinutes,
}: Props) {
  const completed = record?.is_completed === 1;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(1.25, { damping: 6 }, () => {
      scale.value = withSpring(1);
    });
    onToggle();
  };

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={[
        styles.accent,
        { backgroundColor: disabled ? '#D1D1D6' : habit.color },
      ]} />
      <Pressable
        onPress={handleToggle}
        style={styles.checkArea}
        hitSlop={8}
        disabled={disabled}
      >
        <Animated.View
          style={[
            styles.checkbox,
            { borderColor: disabled ? '#D1D1D6' : habit.color },
            completed && !disabled && { backgroundColor: habit.color },
            animatedStyle,
          ]}
        >
          {completed && !disabled && (
            <MaterialCommunityIcons name="check" size={18} color="white" />
          )}
        </Animated.View>
      </Pressable>

      <View style={styles.center}>
        <Text
          style={[
            styles.name,
            completed && !disabled && styles.nameDone,
            disabled && styles.nameDisabled,
          ]}
          numberOfLines={1}
        >
          {habit.name}
        </Text>
        {disabled ? (
          <Text style={styles.target}>오늘은 쉬는 날</Text>
        ) : habit.target_minutes ? (
          <Text style={styles.target}>목표 {habit.target_minutes}분</Text>
        ) : null}
      </View>

      {habit.is_time_tracked === 1 && !disabled && (
        <TimePicker
          minutes={record?.minutes ?? 0}
          onChange={onChangeMinutes}
          tint={habit.color}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingLeft: 14, paddingRight: 14, gap: 12,
    backgroundColor: 'white',
  },
  accent: {
    position: 'absolute', left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2,
  },
  checkArea: { padding: 2 },
  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white',
  },
  center: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111' },
  nameDone: { color: '#8E8E93', textDecorationLine: 'line-through' },
  nameDisabled: { color: '#C7C7CC' },
  rowDisabled: { backgroundColor: '#FAFAFC' },
  target: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
});
