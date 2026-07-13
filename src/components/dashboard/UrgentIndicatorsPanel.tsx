import { useEffect, useMemo, useRef, useState } from 'react';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { formatNumber, formatRate } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { updatePriorityAction } from '@/services/api';
import type { PriorityIndicator } from '@/types';

const SAVE_DEBOUNCE_MS = 700;

function IndicatorCard({
  item,
  index,
  tone,
}: {
  item: PriorityIndicator;
  index: number;
  tone: 'urgent' | 'warning';
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(item.action_needed);
  const timerRef = useRef<number | null>(null);
  const Icon = getCategoryIcon(item.category);

  useEffect(() => {
    setDraft(item.action_needed);
  }, [item.action_needed]);

  const save = (value: string) => {
    if (!user) return;
    updatePriorityAction({
      indicator_id: item.indicator_id,
      indicator_name: item.indicator_name,
      action_needed: value,
      updated_by: user.user_id,
      user_name: user.name,
    }).then((res) => {
      if (!res.success) showToast('error', res.message ?? '저장에 실패했습니다.');
    });
  };

  const handleChange = (value: string) => {
    setDraft(value);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => save(value), SAVE_DEBOUNCE_MS);
  };

  const badgeColor = tone === 'urgent' ? 'bg-rose-600' : 'bg-amber-500';
  const rateColor = tone === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${badgeColor}`}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.category}</span>
            </div>
            <p className="mt-0.5 font-semibold text-gray-800">{item.indicator_name}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${rateColor}`}>
          {formatRate(item.achievement_rate)}
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        목표 {formatNumber(item.total_target)} → 현재 {formatNumber(item.total_actual)}
      </p>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="추가달성계획, 담당자 연락, 조치사항..."
        rows={2}
        className="mt-2 w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:border-navy-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy-500"
      />
    </div>
  );
}

export function UrgentIndicatorsPanel({ items }: { items: PriorityIndicator[] }) {
  const { urgent, warning } = useMemo(() => {
    const urgentList = items.filter((i) => i.achievement_rate === null || i.achievement_rate < 50);
    const warningList = items.filter((i) => i.achievement_rate !== null && i.achievement_rate >= 50 && i.achievement_rate < 80);
    return { urgent: urgentList, warning: warningList };
  }, [items]);

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">미달·주의 대상 지표가 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-600" />
          긴급 (50% 미만)
        </p>
        <div className="space-y-3">
          {urgent.map((item, idx) => (
            <IndicatorCard key={item.indicator_id} item={item} index={idx} tone="urgent" />
          ))}
          {urgent.length === 0 && <p className="text-xs text-gray-400">해당 지표가 없습니다.</p>}
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          주의 (50~80%)
        </p>
        <div className="space-y-3">
          {warning.map((item, idx) => (
            <IndicatorCard key={item.indicator_id} item={item} index={idx} tone="warning" />
          ))}
          {warning.length === 0 && <p className="text-xs text-gray-400">해당 지표가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}
