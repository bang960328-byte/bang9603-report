import type { AchievementStatus, EvidenceStatus, RiskLevel } from '@/types';
import { EVIDENCE_COLOR_MAP, RISK_COLOR_MAP, STATUS_COLOR_MAP } from '@/utils/calculations';

export function StatusBadge({ status }: { status: AchievementStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR_MAP[status]}`}
    >
      {status}
    </span>
  );
}

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${EVIDENCE_COLOR_MAP[status]}`}
    >
      {status}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${RISK_COLOR_MAP[level]}`}
    >
      {level}
    </span>
  );
}

// 대분류명이 늘어나거나 순서가 바뀌어도 같은 카테고리는 항상 같은 색을 갖도록 문자열 해시로 색을 고정 배정
const CATEGORY_COLOR_STYLES = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-green-50 text-green-700 border-green-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-orange-50 text-orange-700 border-orange-200',
];

function categoryStyle(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) % CATEGORY_COLOR_STYLES.length;
  }
  return CATEGORY_COLOR_STYLES[hash];
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryStyle(category)}`}
    >
      {category}
    </span>
  );
}
