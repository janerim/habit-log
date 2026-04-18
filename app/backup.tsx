// 백업 / 복원 전용 화면.
import React, { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  buildBackupJson, exportBackup, importBackupFromJson, BackupCounts,
} from '../utils/backup';
import { useHabitStore } from '../store/habitStore';
import { resetDatabase } from '../db/database';

export default function BackupScreen() {
  const load = useHabitStore((s) => s.load);
  const [counts, setCounts] = useState<BackupCounts | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { counts } = await buildBackupJson();
      setCounts(counts);
    })();
  }, []);

  async function handleExport() {
    try {
      setBusy(true);
      await exportBackup();
    } catch (e: any) {
      Alert.alert('내보내기 실패', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      Alert.alert('클립보드 비어있음', '복사한 백업 JSON이 없어요.');
      return;
    }
    setInput(text);
  }

  async function handleImport() {
    if (!input.trim()) {
      Alert.alert('JSON을 먼저 붙여넣어 주세요.');
      return;
    }
    setBusy(true);
    const res = await importBackupFromJson(input);
    setBusy(false);

    if (res.success) {
      await load();
      Alert.alert('복구 완료', res.message, [
        { text: '확인', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('복구 실패', res.message);
    }
  }

  function handleReset() {
    Alert.alert(
      '전체 데이터 삭제',
      '모든 습관·그룹·기록·기분·수면 데이터가 완전히 삭제됩니다. 되돌릴 수 없으니 먼저 백업을 권장해요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await resetDatabase();
            await load();
            const { counts } = await buildBackupJson();
            setCounts(counts);
            setBusy(false);
            Alert.alert('삭제 완료', '모든 데이터가 초기화되었어요.');
          },
        },
      ]
    );
  }

  const summary = counts
    ? `습관 ${counts.habits}개 · 그룹 ${counts.groups}개 · 기록 ${counts.records}건 · 기분 ${counts.moods}건 · 수면 ${counts.sleep}건`
    : '불러오는 중...';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="내보내기">
          <Text style={styles.desc}>
            현재 데이터({summary})를 JSON으로 저장합니다. 공유 시트에서 파일/메일/메모 등으로 보관할 수 있고, 같은 내용이 클립보드에도 복사돼요.
          </Text>
          <Pressable
            onPress={handleExport}
            disabled={busy}
            style={[styles.primaryBtn, busy && styles.disabled]}
          >
            <Text style={styles.primaryText}>백업 파일 내보내기</Text>
          </Pressable>
        </Section>

        <Section title="불러오기">
          <Text style={styles.desc}>
            백업해 둔 JSON을 붙여넣어 복원합니다. 기존 데이터는 덮어쓰기 됩니다.
          </Text>
          <Pressable onPress={handlePasteFromClipboard} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>클립보드에서 붙여넣기</Text>
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="또는 여기에 직접 붙여넣기"
            placeholderTextColor="#A8A8AE"
            multiline
            textAlignVertical="top"
            style={styles.textarea}
          />
          <Pressable
            onPress={handleImport}
            disabled={busy || !input.trim()}
            style={[
              styles.importBtn,
              (busy || !input.trim()) && styles.disabled,
            ]}
          >
            <Text style={styles.importText}>불러오기 실행</Text>
          </Pressable>
        </Section>

        <Section title="전체 삭제">
          <Text style={styles.desc}>
            모든 기록과 그룹·습관·기분·수면 데이터를 영구 삭제합니다. 되돌릴 수 없으니 먼저 백업을 권장해요.
          </Text>
          <Pressable
            onPress={handleReset}
            disabled={busy}
            style={[styles.dangerBtn, busy && styles.disabled]}
          >
            <Text style={styles.dangerText}>전체 데이터 삭제</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F2F7' },
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 10 },
  desc: { fontSize: 13, color: '#6B6B70', lineHeight: 19, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
  },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1, borderColor: '#D1D1D6',
    paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', marginBottom: 10, backgroundColor: 'white',
  },
  secondaryText: { color: '#111', fontWeight: '600', fontSize: 14 },
  textarea: {
    borderWidth: 1, borderColor: '#E5E5EA',
    borderRadius: 10, padding: 12, minHeight: 140,
    fontSize: 12, color: '#111', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12, backgroundColor: '#FAFAFC',
  },
  importBtn: {
    backgroundColor: '#A8C472',
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
  },
  importText: { color: 'white', fontWeight: '700', fontSize: 15 },
  dangerBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
  },
  dangerText: { color: 'white', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
