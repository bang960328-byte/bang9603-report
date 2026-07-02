import { PageHeader } from '@/components/common/PageHeader';
import { IndicatorCategoryList } from '@/components/indicators/IndicatorCategoryList';

export function AutonomousIndicatorsPage() {
  return (
    <div>
      <PageHeader
        title="자율 성과지표 관리"
        description="사업단 자율 성과지표의 목표값·실적값·달성률과 대학별 배부·달성 현황을 확인합니다. 달성률 80% 미만은 경고, 100% 이상은 완료로 표시됩니다."
      />
      <IndicatorCategoryList category="자율" />
    </div>
  );
}
