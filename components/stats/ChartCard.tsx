// 통계 화면용 카드 래퍼 컴포넌트.
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ChartCard({ title, subtitle, children, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderRadius: 14,
    marginHorizontal: 14, marginBottom: 14,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 12, color: '#6B6B70', marginTop: 2 },
  body: { marginTop: 12 },
});
