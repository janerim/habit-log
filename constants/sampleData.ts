// 앱 최초 실행 시 SQLite에 삽입될 기본 그룹/습관 데이터.

export interface SampleGroup {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
}

export interface SampleHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  group_id: string;
  sort_order: number;
  is_time_tracked?: number;
  target_minutes?: number | null;
}

export const SAMPLE_GROUPS: SampleGroup[] = [
  { id: 'g1', name: '하루 루틴', emoji: '🌅', color: '#FF9500', sort_order: 0 },
  { id: 'g2', name: '건강',     emoji: '💪', color: '#34C759', sort_order: 1 },
  { id: 'g3', name: '취업 준비', emoji: '💼', color: '#AF52DE', sort_order: 2 },
  { id: 'g4', name: '자기계발', emoji: '📚', color: '#007AFF', sort_order: 3 },
];

export const SAMPLE_HABITS: SampleHabit[] = [
  // 하루 루틴
  { id: 'h1', name: '하루 시작 일기', icon: 'book-open-variant', color: '#FF9500', group_id: 'g1', sort_order: 0, is_time_tracked: 1 },
  { id: 'h2', name: '신문 읽기',      icon: 'newspaper',          color: '#0A84FF', group_id: 'g1', sort_order: 1, is_time_tracked: 1 },
  // 건강
  { id: 'h3', name: '운동하기',       icon: 'run',                color: '#34C759', group_id: 'g2', sort_order: 0, is_time_tracked: 1, target_minutes: 60 },
  // 취업 준비
  { id: 'h4', name: '이력서 제출',    icon: 'file-document',      color: '#AF52DE', group_id: 'g3', sort_order: 0, is_time_tracked: 0 },
  { id: 'h5', name: 'CS 공부',        icon: 'cpu-64-bit',         color: '#5E5CE6', group_id: 'g3', sort_order: 1, is_time_tracked: 1, target_minutes: 60 },
  { id: 'h6', name: '코딩테스트 공부', icon: 'code-braces',        color: '#5E5CE6', group_id: 'g3', sort_order: 2, is_time_tracked: 1, target_minutes: 60 },
  { id: 'h7', name: '이력서 수정',    icon: 'pencil',             color: '#AF52DE', group_id: 'g3', sort_order: 3, is_time_tracked: 1 },
  // 자기계발
  { id: 'h8',  name: '독서',           icon: 'bookshelf',         color: '#A2845E', group_id: 'g4', sort_order: 0, is_time_tracked: 1, target_minutes: 30 },
  { id: 'h9',  name: '토이프로젝트',   icon: 'hammer-wrench',     color: '#30B0C7', group_id: 'g4', sort_order: 1, is_time_tracked: 1, target_minutes: 60 },
  { id: 'h10', name: '퀀트 공부',      icon: 'chart-line',        color: '#00C7BE', group_id: 'g4', sort_order: 2, is_time_tracked: 1, target_minutes: 45 },
];
