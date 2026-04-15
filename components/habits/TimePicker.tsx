// 5분 단위 시간 입력 컴포넌트: - / 표시 / + + 탭 시 모달 피커.
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatMinutes } from '../../utils/dateHelper';

interface Props {
  minutes: number;
  onChange: (minutes: number) => void;
  tint?: string;
}

export default function TimePicker({ minutes, onChange, tint = '#0A84FF' }: Props) {
  const [open, setOpen] = useState(false);

  const dec = () => {
    Haptics.selectionAsync();
    onChange(Math.max(0, minutes - 5));
  };
  const inc = () => {
    Haptics.selectionAsync();
    onChange(Math.min(480, minutes + 5));
  };

  const label = minutes > 0 ? formatMinutes(minutes) : '—';

  return (
    <View style={styles.row}>
      <Pressable onPress={dec} style={styles.btn} hitSlop={8}>
        <MaterialCommunityIcons name="minus" size={18} color="#333" />
      </Pressable>

      <Pressable onPress={() => setOpen(true)} style={styles.valueBox}>
        <Text style={[styles.value, { color: tint }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>

      <Pressable onPress={inc} style={styles.btn} hitSlop={8}>
        <MaterialCommunityIcons name="plus" size={18} color="#333" />
      </Pressable>

      <PickerModal
        visible={open}
        onClose={() => setOpen(false)}
        minutes={minutes}
        onChange={onChange}
        tint={tint}
      />
    </View>
  );
}

interface PickerProps {
  visible: boolean;
  onClose: () => void;
  minutes: number;
  onChange: (m: number) => void;
  tint: string;
}

function PickerModal({ visible, onClose, minutes, onChange, tint }: PickerProps) {
  const hours = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  const mins  = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);

  const selHour = Math.floor(minutes / 60);
  const selMin = minutes % 60;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>시간 선택</Text>
        <View style={styles.pickerRow}>
          <Column
            items={hours}
            selected={selHour}
            suffix="시간"
            tint={tint}
            onSelect={(h) => onChange(h * 60 + selMin)}
          />
          <Column
            items={mins}
            selected={selMin}
            suffix="분"
            tint={tint}
            onSelect={(m) => onChange(selHour * 60 + m)}
          />
        </View>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: tint }]}
          onPress={onClose}
        >
          <Text style={styles.doneText}>완료</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Column({
  items, selected, suffix, tint, onSelect,
}: {
  items: number[];
  selected: number;
  suffix: string;
  tint: string;
  onSelect: (v: number) => void;
}) {
  return (
    <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
      {items.map((n) => {
        const active = n === selected;
        return (
          <Pressable key={n} onPress={() => onSelect(n)} style={styles.colItem}>
            <Text
              style={[
                styles.colText,
                active && { color: tint, fontWeight: '700' },
              ]}
            >
              {n}{suffix}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EFEFF4',
  },
  valueBox: {
    minWidth: 84, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  value: { fontSize: 14, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '700', textAlign: 'center',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row', height: 200,
    justifyContent: 'center', gap: 16,
  },
  col: {
    width: 100, backgroundColor: '#F5F5F7', borderRadius: 12,
  },
  colItem: {
    paddingVertical: 10, alignItems: 'center',
  },
  colText: { fontSize: 16, color: '#333' },
  doneBtn: {
    marginTop: 16, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center',
  },
  doneText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
