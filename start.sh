#!/bin/bash
# EC2에서 Expo 개발 서버를 터널 모드로 기동.
cd "$(dirname "$0")"
export EXPO_NO_TELEMETRY=1
npx expo start --tunnel
