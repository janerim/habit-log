// 그룹 추가/수정 모달. ?id=<groupId> 있으면 수정, 없으면 신규.
import React, { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHabitStore } from '../store/habitStore';

const EMOJI_CHOICES = [
  '🌅', '💪', '💼', '📚', '🧘', '🎨', '🍎', '💧',
  '🎵', '🧠', '💻', '✍️', '🏃', '🌱', '⭐', '🔥',
];

const COLOR_CHOICES = [
  '#FF9500', '#0A84FF', '#34C759', '#AF52DE',
  '#5E5CE6', '#A2845E', '#30B0C7', '#00C7BE',
  '#FF2D55', '#FF3B30', '#FFCC00', '#8E8E93',
];

export default function GroupEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const groups = useHabitStore((s) => s.groups);
  const addGroup = useHabitStore((s) => s.addGroup);
  const editGroup = useHabitStore((s) => s.editGroup);

  const existing = useMemo(() => groups.find((g) => g.id === id), [groups, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '⭐');
  const [color, setColor] = useState(existing?.color ?? '#0A84FF');

  async function save() {
    if (!name.trim()) return;
    const row = {
      id: existing?.id ?? `g_${Date.now()}`,
      name: name.trim(),
      emoji, color,
      sort_order: existing?.sort_order ?? groups.length,
    };
    if (existing) await editGroup(row);
    else await addGroup(row);
    router.back();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <Section title="이름">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 자기계발"
          style={styles.input}
        />
      </Section>

      <Section title="이모지">
        <View style={styles.grid}>
          {EMOJI_CHOICES.map((e) => {
            const selected = e === emoji;
            return (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiBox, selected && { borderColor: color, backgroundColor: color + '22' }]}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="색상">
        <View style={styles.grid}>
          {COLOR_CHOICES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.colorBox, { backgroundColor: c }, c === color && styles.colorSelected]}
            />
          ))}
        </View>
      </Section>

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: color }]}>
        <Text style={styles.saveText}>{existing ? '저장' : '추가'}</Text>
      </Pressable>
    </ScrollView>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E5EA',
  },
  colorBox: { width: 36, height: 36, borderRadius: 18 },
  colorSelected: { borderWidth: 3, borderColor: '#111' },
  saveBtn: {
    marginTop: 24, marginHorizontal: 14, marginBottom: 40,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  saveText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
