import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TONE_STYLES: Record<string, { bg: string; icon: string }> = {
  default: { bg: 'bg-navy-50', icon: 'text-navy-700' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-600' },
  danger: { bg: 'bg-rose-50', icon: 'text-rose-600' },
  success: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
};

export function StatCard({ label, value, unit, icon: Icon, tone = 'default' }: StatCardProps) {
  const style = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
        <Icon className={`h-5 w-5 ${style.icon}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-gray-900">
          {value}
          {unit && <span className="ml-0.5 text-sm font-normal text-gray-500">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
