import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { SearchInput } from '@/components/common/SearchInput';
import { getChangeLogs } from '@/services/api';
import type { ChangeLog } from '@/types';

const SHEET_LABELS: Record<string, string> = {
  university_results: '대학별 배부·달성 관리',
  targets: '목표값 설정',
  users: '사용자 관리',
};

const ACTION_LABELS: Record<string, string> = {
  update: '수정',
  create: '생성',
  delete: '삭제',
};

export function ChangeLogPage() {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [sheetFilter, setSheetFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getChangeLogs().then((data) => {
      setLogs(data);
      setIsLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = logs;
    if (sheetFilter !== '전체') list = list.filter((l) => l.sheet_name === sheetFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.user_name.toLowerCase().includes(q) ||
          l.university_name.toLowerCase().includes(q) ||
          l.field_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, sheetFilter, search]);

  return (
    <div>
      <PageHeader title="수정 이력" description="성과지표·목표값·실적·사용자 정보의 변경 이력을 확인합니다." />
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <FilterSelect
            label="수정 화면"
            value={sheetFilter}
            onChange={setSheetFilter}
            options={[
              { value: '전체', label: '전체' },
              { value: 'university_results', label: '대학별 배부·달성 관리' },
              { value: 'targets', label: '목표값 설정' },
              { value: 'users', label: '사용자 관리' },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="수정자, 대학명, 항목 검색" />
          <span className="ml-auto text-xs text-gray-400">총 {filtered.length}건</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-3 py-2">수정일시</th>
                <th className="whitespace-nowrap px-3 py-2">수정자</th>
                <th className="whitespace-nowrap px-3 py-2">소속대학</th>
                <th className="whitespace-nowrap px-3 py-2">수정 화면</th>
                <th className="whitespace-nowrap px-3 py-2">수정 항목</th>
                <th className="whitespace-nowrap px-3 py-2">기존 값</th>
                <th className="whitespace-nowrap px-3 py-2">변경 값</th>
                <th className="whitespace-nowrap px-3 py-2">작업 유형</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && filtered.map((l) => (
                <tr key={l.log_id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">{l.timestamp}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-700">{l.user_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{l.university_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{SHEET_LABELS[l.sheet_name] ?? l.sheet_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{l.field_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">{l.old_value || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">{l.new_value || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">조회된 수정 이력이 없습니다.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
