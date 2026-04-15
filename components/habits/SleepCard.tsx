// Today 화면 상단에 표시되는 수면 기록 카드.
// 취침/기상 시간을 +/- 버튼으로 입력하고 저장.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSleepStore, computeSleepMinutes } from '../../store/sleepStore';
import { toDateKey, formatMinutes } from '../../utils/dateHelper';

interface Props {
  date: Date;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }
function parse(s: string): [number, number] {
  const [h, m] = s.split(':').map(Number);
  return [h, m];
}
function fmt(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }

export default function SleepCard({ date }: Props) {
  const byDate = useSleepStore((s) => s.byDate);
  const save = useSleepStore((s) => s.save);
  const clear = useSleepStore((s) => s.clear);
  const loadRange = useSleepStore((s) => s.loadRange);
  const record = byDate[toDateKey(date)];

  const [bed, setBed] = useState(record?.bed_time ?? '23:30');
  const [wake, setWake] = useState(record?.wake_time ?? '07:00');
  const [editing, setEditing] = useState(!record);

  useEffect(() => { loadRange(date, date); }, [date, loadRange]);
  useEffect(() => {
    if (record) {
      setBed(record.bed_time);
      setWake(record.wake_time);
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [record?.date]);

  function bumpBed(dh: number, dm: number) {
    const [h, m] = parse(bed);
    const total = (h * 60 + m + dh * 60 + dm + 24 * 60) % (24 * 60);
    setBed(fmt(Math.floor(total / 60), total % 60));
  }
  function bumpWake(dh: number, dm: number) {
    const [h, m] = parse(wake);
    const total = (h * 60 + m + dh * 60 + dm + 24 * 60) % (24 * 60);
    setWake(fmt(Math.floor(total / 60), total % 60));
  }

  const duration = computeSleepMinutes(bed, wake);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="moon-waning-crescent" size={18} color="#5E5CE6" />
          <Text style={styles.title}>수면</Text>
        </View>
        {record && !editing && (
          <Pressable onPress={() => setEditing(true)} hitSlop={8}>
            <MaterialCommunityIcons name="pencil" size={16} color="#6B6B70" />
          </Pressable>
        )}
      </View>

      {editing ? (
        <>
          <View style={styles.timesRow}>
            <TimeCol
              label="취침"
              icon="bed"
              value={bed}
              onMinus={() => bumpBed(0, -10)}
              onPlus={() => bumpBed(0, 10)}
              onHourMinus={() => bumpBed(-1, 0)}
              onHourPlus={() => bumpBed(1, 0)}
            />
            <View style={styles.arrow}>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#C7C7CC" />
            </View>
            <TimeCol
              label="기상"
              icon="weather-sunset-up"
              value={wake}
              onMinus={() => bumpWake(0, -10)}
              onPlus={() => bumpWake(0, 10)}
              onHourMinus={() => bumpWake(-1, 0)}
              onHourPlus={() => bumpWake(1, 0)}
            />
          </View>
          <Text style={styles.duration}>총 {formatMinutes(duration)}</Text>
          <View style={styles.actions}>
            {record && (
              <Pressable onPress={() => { clear(date); setEditing(true); }} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>삭제</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => { save(date, bed, wake); setEditing(false); }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>저장</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>취침</Text>
            <Text style={styles.summaryValue}>{bed}</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={16} color="#C7C7CC" />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>기상</Text>
            <Text style={styles.summaryValue}>{wake}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationBadgeText}>{formatMinutes(duration)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function TimeCol({
  label, icon, value, onMinus, onPlus, onHourMinus, onHourPlus,
}: {
  label: string; icon: string; value: string;
  onMinus: () => void; onPlus: () => void;
  onHourMinus: () => void; onHourPlus: () => void;
}) {
  return (
    <View style={styles.col}>
      <View style={styles.colLabelRow}>
        <MaterialCommunityIcons name={icon as any} size={14} color="#6B6B70" />
        <Text style={styles.colLabel}>{label}</Text>
      </View>
      <Text style={styles.colValue}>{value}</Text>
      <View style={styles.colButtons}>
        <Pressable onPress={onHourMinus} style={styles.stepBtn} hitSlop={4}>
          <Text style={styles.stepText}>-1h</Text>
        </Pressable>
        <Pressable onPress={onMinus} style={styles.stepBtn} hitSlop={4}>
          <Text style={styles.stepText}>-10</Text>
        </Pressable>
        <Pressable onPress={onPlus} style={styles.stepBtn} hitSlop={4}>
          <Text style={styles.stepText}>+10</Text>
        </Pressable>
        <Pressable onPress={onHourPlus} style={styles.stepBtn} hitSlop={4}>
          <Text style={styles.stepText}>+1h</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: '#111' },
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { paddingHorizontal: 4 },
  col: { flex: 1, alignItems: 'center' },
  colLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colLabel: { fontSize: 11, color: '#6B6B70', fontWeight: '600' },
  colValue: { fontSize: 22, fontWeight: '800', color: '#111', marginTop: 4 },
  colButtons: {
    flexDirection: 'row', gap: 4, marginTop: 6,
  },
  stepBtn: {
    paddingHorizontal: 6, paddingVertical: 4,
    borderRadius: 6, backgroundColor: '#F2F2F7',
  },
  stepText: { fontSize: 10, color: '#0A84FF', fontWeight: '700' },
  duration: {
    textAlign: 'center', marginTop: 10, fontSize: 13,
    color: '#5E5CE6', fontWeight: '700',
  },
  actions: {
    flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end',
  },
  btnGhost: { paddingHorizontal: 12, paddingVertical: 8 },
  btnGhostText: { color: '#FF3B30', fontWeight: '600', fontSize: 13 },
  btnPrimary: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#5E5CE6',
  },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 13 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#6B6B70' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#111', marginTop: 2 },
  durationBadge: {
    marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, backgroundColor: '#5E5CE622',
  },
  durationBadgeText: { color: '#5E5CE6', fontWeight: '800', fontSize: 13 },
});
