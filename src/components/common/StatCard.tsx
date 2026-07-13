import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TONE_STYLES: Record<string, { bg: string; icon: string; accent: string }> = {
  default: { bg: 'bg-navy-50', icon: 'text-navy-700', accent: 'border-l-navy-600' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'border-l-amber-500' },
  danger: { bg: 'bg-rose-50', icon: 'text-rose-600', accent: 'border-l-rose-500' },
  success: { bg: 'bg-emerald-50', icon: 'text-emerald-600', accent: 'border-l-emerald-500' },
};

export function StatCard({ label, value, unit, icon: Icon, tone = 'default' }: StatCardProps) {
  const style = TONE_STYLES[tone];
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border border-l-4 border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${style.accent}`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
        <Icon className={`h-6 w-6 ${style.icon}`} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
