import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Layers,
  Building2,
  AlertTriangle,
  Target,
  Users,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MenuItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/indicators', label: '성과지표 총괄 현황', icon: ListChecks },
  { to: '/indicators/detail', label: '지표 대분류별 상세', icon: Layers },
  { to: '/university-results', label: '대학별 배부·달성 관리', icon: Building2 },
  { to: '/priority', label: '우선 관리 지표', icon: AlertTriangle },
  { to: '/targets', label: '목표값 설정', icon: Target, adminOnly: true },
  { to: '/users', label: '사용자 관리', icon: Users, adminOnly: true },
  { to: '/logs', label: '수정 이력', icon: History, adminOnly: true },
];

export function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-navy-900 text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <ShieldCheck className="h-6 w-6 text-navy-200" />
        <div>
          <p className="text-sm font-bold leading-tight">COSS 대시보드</p>
          <p className="text-[11px] leading-tight text-navy-200">성과지표 총괄관리</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-navy-100 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-navy-200">
        강원대학교 데이터보안·활용
        <br />
        혁신융합대학사업단
      </div>
    </aside>
  );
}
