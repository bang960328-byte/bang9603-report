import { getProgressColor } from '@/utils/calculations';
import { formatRate } from '@/utils/format';

interface ProgressBarProps {
  rate: number | null;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({ rate, label, showLabel = true, size = 'md' }: ProgressBarProps) {
  const clamped = rate === null ? 0 : Math.min(rate, 100);
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          {label && <span className="text-gray-500">{label}</span>}
          {showLabel && <span className="font-semibold text-gray-700">{formatRate(rate)}</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${height}`}>
        <div
          className={`${height} rounded-full transition-all ${getProgressColor(rate)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
