import type { AchievementStatus } from '@/types';

/**
 * 달성률 계산: actual_result / allocated_target * 100
 * allocated_target이 0이거나 없으면 계산 불가(N/A) 처리
 */
export function calculateAchievementRate(
  actual: number | null | undefined,
  target: number | null | undefined
): number | null {
  if (actual === null || actual === undefined) return null;
  if (!target || target <= 0) return null;
  const rate = (actual / target) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * 달성률/실적 입력 여부에 따른 상태 판정
 * 정상: 100 이상 / 주의: 80~99.9 / 미달: 80 미만 / 미제출: 실적 자체가 없음
 */
export function getAchievementStatus(
  rate: number | null,
  hasAnyActual: boolean
): AchievementStatus {
  if (!hasAnyActual || rate === null) return '미제출';
  if (rate >= 100) return '정상';
  if (rate >= 80) return '주의';
  return '미달';
}

export const STATUS_COLOR_MAP: Record<AchievementStatus, string> = {
  정상: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  주의: 'bg-amber-50 text-amber-700 border-amber-200',
  미달: 'bg-rose-50 text-rose-700 border-rose-200',
  미제출: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const EVIDENCE_COLOR_MAP: Record<string, string> = {
  예: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  아니오: 'bg-rose-50 text-rose-700 border-rose-200',
  해당없음: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const RISK_COLOR_MAP: Record<string, string> = {
  높음: 'bg-rose-50 text-rose-700 border-rose-200',
  보통: 'bg-amber-50 text-amber-700 border-amber-200',
  낮음: 'bg-gray-100 text-gray-600 border-gray-200',
};

/** 진행률 바 색상: 달성률 구간에 따라 톤 변경 */
export function getProgressColor(rate: number | null): string {
  if (rate === null) return 'bg-gray-300';
  if (rate >= 100) return 'bg-emerald-500';
  if (rate >= 80) return 'bg-amber-500';
  return 'bg-rose-500';
}

/** 음수 입력 방지 등 목표/실적 입력값 검증 */
export function validateNumberInput(value: number | string): { valid: boolean; message?: string } {
  const num = typeof value === 'string' ? Number(value) : value;
  if (value === '' || value === null || Number.isNaN(num)) {
    return { valid: false, message: '숫자를 입력해 주세요.' };
  }
  if (num < 0) {
    return { valid: false, message: '음수는 입력할 수 없습니다.' };
  }
  return { valid: true };
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}
