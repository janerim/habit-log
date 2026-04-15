# HabitLog

React Native + Expo(Expo Router) 기반 습관 트래킹 앱. Expo Go에서 바로 실행 가능.

## 기술 스택

- Expo SDK 51, Expo Router (파일 기반)
- TypeScript strict
- SQLite (expo-sqlite) + AsyncStorage
- Zustand (상태 관리)
- react-native-paper, @expo/vector-icons (MaterialCommunityIcons)
- react-native-gifted-charts (차트), react-native-reanimated (애니메이션)
- date-fns

## 설치 & 실행

```bash
npm install
npx expo start
# 또는 터널 모드 (EC2 등 외부 네트워크)
npx expo start --tunnel
```

iPhone에서 App Store의 Expo Go를 설치하고 QR 코드를 스캔하세요.

## 구조

```
app/
├── _layout.tsx                루트(스택): DB init, Provider
├── (tabs)/
│   ├── _layout.tsx            탭바
│   ├── index.tsx              캘린더
│   ├── today.tsx              오늘 기록
│   ├── stats.tsx              통계
│   └── settings.tsx           설정
└── habit-edit.tsx             습관 추가/수정 모달
components/
├── calendar/{CalendarView,DayCell}.tsx
├── habits/{HabitRow,TimePicker,GroupSection}.tsx
└── stats/ChartCard.tsx
store/{habitStore,recordStore}.ts
db/database.ts                  SQLite 스키마 + CRUD
utils/{dateHelper,notificationManager}.ts
constants/sampleData.ts         최초 샘플 데이터
```

## EC2 배포 (Expo Go 터널)

1. Ubuntu 22.04, t2.micro, Node 20 설치
2. `git clone ... && cd habit-log && npm install`
3. `start.sh`:

```bash
#!/bin/bash
cd /home/ubuntu/habit-log
npx expo start --tunnel
```

4. 터미널에 출력되는 QR을 iPhone Expo Go로 스캔.

## 개발 메모

- 최초 실행 시 `initDatabase()`가 스키마를 만들고, 그룹이 하나도 없으면 샘플 10개 습관을 자동 주입.
- `habit_records`는 `(habit_id, date)` 유니크. `upsertRecord`로 자동 저장.
- 시간 입력은 5분 단위, 0~480분(8시간) 범위.
- 다크모드: `useColorScheme` 기반 PaperProvider 테마 전환.
