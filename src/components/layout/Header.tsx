import { LogOut, Database, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { dataSourceState } from '@/services/api';

export function Header() {
  const { user, logout } = useAuth();
  const isLive = dataSourceState.mode === 'live';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-base font-bold text-gray-900">COSS 성과지표 총괄관리 시스템</h1>
        <p className="text-xs text-gray-500">
          2026년도 3차년도 &middot; 주관대학 강원대학교
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
            isLive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
          title={isLive ? '구글시트 실시간 데이터' : '샘플 데이터 표시 중 (구글시트 API 미연동)'}
        >
          {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isLive ? '구글시트 연동' : '샘플 데이터'}
          <Database className="h-3 w-3" />
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
          <p className="text-[11px] text-gray-500">
            {user?.role === 'admin' ? '관리자' : `${user?.university_name} 담당자`}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </header>
  );
}
