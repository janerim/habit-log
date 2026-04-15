// 로컬 알림 스케줄 관리.
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'habitlog.reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 알림 권한 요청. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** 매일 특정 시각 반복 알림 예약. */
export async function scheduleHabitReminder(
  hour: number,
  minute: number
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📝 오늘 습관 기록하셨나요?',
      body: '오늘의 습관을 기록하고 스트릭을 이어가세요!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ hour, minute })
  );
}

/** 모든 예약 취소. */
export async function cancelHabitReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** 저장된 알림 시각 조회. */
export async function getStoredReminder(): Promise<{
  hour: number;
  minute: number;
} | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
