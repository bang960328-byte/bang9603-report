import { FileDown } from 'lucide-react';
import { downloadCsv } from '@/utils/format';

interface ExcelDownloadButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}

export function ExcelDownloadButton({ filename, headers, rows }: ExcelDownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, headers, rows)}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
    >
      <FileDown className="h-4 w-4" />
      엑셀 다운로드
    </button>
  );
}
