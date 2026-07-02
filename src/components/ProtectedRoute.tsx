import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-sm text-gray-400">로딩 중...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
