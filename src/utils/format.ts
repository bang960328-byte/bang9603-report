export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

export function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return 'N/A';
  return `${rate.toFixed(1)}%`;
}

/**
 * 배부값(목표)이 0/미배정인데 실적만 입력된 경우, 계산 불가능한 N/A 대신
 * "달성"으로 표시한다 (배부 없이도 실적을 냈다는 의미).
 */
export function formatRateOrAchieved(
  rate: number | null | undefined,
  target: number | null | undefined,
  actual: number | null | undefined
): string {
  const hasActual = actual !== null && actual !== undefined;
  const hasNoTarget = target === null || target === undefined || target <= 0;
  if (hasNoTarget && hasActual) return '달성';
  return formatRate(rate);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return dateStr;
}

export function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function todayDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 표 데이터를 CSV로 변환해 다운로드 (엑셀에서 바로 열람 가능)
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const str = String(v ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\n');
  // 엑셀 한글 깨짐 방지를 위한 BOM 추가
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
