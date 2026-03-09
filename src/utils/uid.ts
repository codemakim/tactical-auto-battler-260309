let counter = 0;

/**
 * 간단한 고유 ID 생성. 결정론적 (카운터 기반).
 */
export function uid(prefix: string = 'evt'): string {
  return `${prefix}_${++counter}`;
}

/**
 * 카운터 리셋 (테스트/새 전투 시작 시)
 */
export function resetUid(): void {
  counter = 0;
}
