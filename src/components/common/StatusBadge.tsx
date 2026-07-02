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

export function CategoryBadge({ category }: { category: '핵심' | '자율' }) {
  const style =
    category === '핵심'
      ? 'bg-navy-50 text-navy-700 border-navy-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {category}
    </span>
  );
}
