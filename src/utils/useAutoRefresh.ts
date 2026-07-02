import { useEffect, useRef } from 'react';

/**
 * 화면이 보이는 동안 일정 주기로 콜백을 재실행한다.
 * 구글시트가 외부에서 수정되어도 화면을 새로고침하지 않고 최신 데이터를 반영하기 위한 용도.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 30000) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        savedCallback.current();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
