import type { ChangeLog, Indicator, Target, User, UniversityResult } from '@/types';
import {
  sampleIndicators,
  sampleLogs,
  sampleTargets,
  sampleUniversityResults,
  sampleUsers,
} from './sampleData';

/**
 * 구글시트(GAS) API를 사용할 수 없을 때 사용하는 브라우저 메모리 내 저장소.
 * 샘플 데이터를 원본으로 복제해 두고, fallback 모드에서의 저장/수정 결과를
 * 세션 동안 유지하기 위한 용도로만 사용한다(새로고침 시 초기화됨).
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export const localStore = {
  indicators: clone(sampleIndicators) as Indicator[],
  targets: clone(sampleTargets) as Target[],
  universityResults: clone(sampleUniversityResults) as UniversityResult[],
  users: clone(sampleUsers) as User[],
  logs: clone(sampleLogs) as ChangeLog[],
  // 우선 관리 지표 화면의 "조치 필요사항" (지표ID → 텍스트)
  priorityActions: {} as Record<string, string>,
};

let logSeq = localStore.logs.length;

export function appendLog(entry: Omit<ChangeLog, 'log_id'>) {
  logSeq += 1;
  localStore.logs.unshift({
    log_id: `L${String(logSeq).padStart(3, '0')}`,
    ...entry,
  });
}
