import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, description, actions, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
