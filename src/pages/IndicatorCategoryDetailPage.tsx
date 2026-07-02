import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterSelect } from '@/components/common/FilterSelect';
import { IndicatorCategoryList } from '@/components/indicators/IndicatorCategoryList';
import { getIndicators } from '@/services/api';

export function IndicatorCategoryDetailPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    getIndicators().then((data) => {
      const distinct = Array.from(new Set(data.map((d) => d.category)));
      setCategories(distinct);
      setSelected((prev) => prev || distinct[0] || '');
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="지표 대분류별 상세"
        description="대분류를 선택해 목표값·실적값·달성률과 대학별 배부값·달성값을 확인합니다. 달성률 80% 미만은 경고, 100% 이상은 완료로 표시됩니다."
      />
      <div className="mb-4">
        <FilterSelect
          label="지표 대분류"
          value={selected}
          onChange={setSelected}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
      </div>
      {selected && <IndicatorCategoryList category={selected} />}
    </div>
  );
}
