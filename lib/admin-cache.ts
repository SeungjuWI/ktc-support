// 관리자 페이지 인메모리 캐시 (stale-while-revalidate)
// 화면 이동 시 캐시된 데이터를 즉시 보여주고, 백그라운드 재조회로 갱신한다.
// 새로고침(하드 로드) 시에는 모듈이 초기화되므로 자연스럽게 풀 로딩.

const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | null {
  return (cache.get(key) as T) ?? null;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}
