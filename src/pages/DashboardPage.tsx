import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Star, Sparkles, Gauge, AlertTriangle, FileWarning } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { RiskBadge } from '@/components/common/StatusBadge';
import { UniversityComparisonChart } from '@/components/charts/UniversityComparisonChart';
import { IndicatorRankingChart } from '@/components/charts/IndicatorRankingChart';
import { EvidenceStatusChart } from '@/components/charts/EvidenceStatusChart';
import { getDashboardData, getPriorityIndicators } from '@/services/api';
import type { DashboardData, PriorityIndicator } from '@/types';
import { formatNumber, formatRate } from '@/utils/format';
import { useAutoRefresh } from '@/utils/useAutoRefresh';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [priorities, setPriorities] = useState<PriorityIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const [dashboard, priority] = await Promise.all([getDashboardData(), getPriorityIndicators()]);
    setData(dashboard);
    setPriorities(priority.slice(0, 5));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load, 30000);

  if (isLoading || !data) {
    return <div className="py-20 text-center text-sm text-gray-400">데이터를 불러오는 중입니다...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="전체 성과지표" value={formatNumber(data.totalIndicators)} unit="개" icon={ListChecks} />
        <StatCard label="핵심 성과지표" value={formatNumber(data.coreIndicators)} unit="개" icon={Star} />
        <StatCard label="자율 성과지표" value={formatNumber(data.autonomousIndicators)} unit="개" icon={Sparkles} />
        <StatCard label="전체 평균 달성률" value={formatRate(data.averageAchievementRate)} icon={Gauge} tone="success" />
        <StatCard label="미달성 지표" value={formatNumber(data.underAchievedCount)} unit="개" icon={AlertTriangle} tone="danger" />
        <StatCard label="증빙 미제출" value={formatNumber(data.evidenceMissingCount)} unit="건" icon={FileWarning} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="전체 평균 달성률">
          <ProgressBar rate={data.averageAchievementRate} size="md" />
          <p className="mt-3 text-xs text-gray-500">전체 24개 지표 기준 종합 달성 현황</p>
        </Card>
        <Card title="핵심 성과지표 평균 달성률">
          <ProgressBar rate={data.coreAverageRate} size="md" />
          <p className="mt-3 text-xs text-gray-500">핵심 지표 {data.coreIndicators}개 평균</p>
        </Card>
        <Card title="자율 성과지표 평균 달성률">
          <ProgressBar rate={data.autonomousAverageRate} size="md" />
          <p className="mt-3 text-xs text-gray-500">자율 지표 {data.autonomousIndicators}개 평균</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="대학별 달성률 비교" description="참여대학 평균 달성률(%)">
          <UniversityComparisonChart data={data.universityRates} />
        </Card>
        <Card title="지표별 달성률 순위" description="상위 8개 지표 기준">
          <IndicatorRankingChart data={data.indicatorRanking} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="증빙 제출 현황" className="lg:col-span-1">
          <EvidenceStatusChart data={data.evidenceStatusCounts} />
        </Card>

        <Card title="우선 관리 필요 지표" description="위험도 높은 순 5건" className="lg:col-span-2">
          <div className="divide-y divide-gray-100">
            {priorities.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">우선 관리가 필요한 지표가 없습니다.</p>
            )}
            {priorities.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={p.risk_level} />
                    <p className="truncate text-sm font-medium text-gray-800">{p.indicator_name}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {p.university_name} · {p.reason}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-700">{formatRate(p.achievement_rate)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
