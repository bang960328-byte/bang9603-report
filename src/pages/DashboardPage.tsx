import { useCallback, useEffect, useState } from 'react';
import { ListChecks, Layers, Gauge, AlertTriangle, FileWarning } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Card } from '@/components/common/Card';
import { UniversityComparisonChart } from '@/components/charts/UniversityComparisonChart';
import { IndicatorAchievementChart } from '@/components/charts/IndicatorAchievementChart';
import { EvidenceStatusChart } from '@/components/charts/EvidenceStatusChart';
import { UrgentIndicatorsPanel } from '@/components/dashboard/UrgentIndicatorsPanel';
import { getDashboardData, getPriorityIndicators } from '@/services/api';
import type { DashboardData, PriorityIndicator } from '@/types';
import { formatNumber, formatRate } from '@/utils/format';
import { useAutoRefresh } from '@/utils/useAutoRefresh';
import { useAuth } from '@/context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [priorities, setPriorities] = useState<PriorityIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [dashboard, priority] = await Promise.all([getDashboardData(), getPriorityIndicators(user)]);
    setData(dashboard);
    setPriorities(priority);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load, 30000);

  if (isLoading || !data) {
    return <div className="py-20 text-center text-sm text-gray-400">데이터를 불러오는 중입니다...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="전체 성과지표" value={formatNumber(data.totalIndicators)} unit="개" icon={ListChecks} />
        <StatCard label="지표 대분류" value={formatNumber(data.categoryCount)} unit="개" icon={Layers} />
        <StatCard label="전체 평균 달성률" value={formatRate(data.averageAchievementRate)} icon={Gauge} tone="success" />
        <StatCard label="미달성 지표" value={formatNumber(data.underAchievedCount)} unit="개" icon={AlertTriangle} tone="danger" />
        <StatCard label="증빙 미제출(대학별)" value={formatNumber(data.evidenceMissingCount)} unit="건" icon={FileWarning} tone="warning" />
      </div>

      <Card title="핵심지표 달성현황" description="지수(대분류)별 평균 달성률 · 클릭 시 세부 지표 표시">
        <IndicatorAchievementChart data={data.indicatorRanking} />
      </Card>

      <Card title="대학별 달성률 비교" description="참여대학 평균 달성률(%)">
        <UniversityComparisonChart data={data.universityRates} />
      </Card>

      <Card title="증빙 제출 현황">
        <EvidenceStatusChart data={data.evidenceStatusCounts} />
      </Card>

      <Card title="미달·주의 관리" description="달성률 80% 미만 지표를 긴급/주의로 나눠 조치사항을 바로 기록할 수 있습니다.">
        <UrgentIndicatorsPanel items={priorities} />
      </Card>
    </div>
  );
}
