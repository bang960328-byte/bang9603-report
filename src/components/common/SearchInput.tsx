import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = '검색어를 입력하세요' }: SearchInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">검색</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-56 rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
        />
      </div>
    </div>
  );
}
