// 날짜 관련 공용 유틸리티.
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';

/** YYYY-MM-DD 형식으로 포맷 (DB 저장 key). */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** "2026년 4월" 형식. */
export function monthTitle(date: Date): string {
  return format(date, 'yyyy년 M월', { locale: ko });
}

/** 월 그리드용 6주치(42일) 날짜 배열. */
export function monthGridDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  // 6주 고정 (셀 크기 일관성)
  while (days.length < 42) {
    const last = days[days.length - 1];
    days.push(new Date(last.getTime() + 24 * 3600 * 1000));
  }
  return days.slice(0, 42);
}

/** 분(int)을 "1시간 30분" 형식으로. 0이면 빈 문자열. */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

export {
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  format,
};
