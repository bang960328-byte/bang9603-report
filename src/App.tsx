import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { IndicatorsOverviewPage } from '@/pages/IndicatorsOverviewPage';
import { CoreIndicatorsPage } from '@/pages/CoreIndicatorsPage';
import { AutonomousIndicatorsPage } from '@/pages/AutonomousIndicatorsPage';
import { UniversityManagementPage } from '@/pages/UniversityManagementPage';
import { PriorityIndicatorsPage } from '@/pages/PriorityIndicatorsPage';
import { TargetSettingPage } from '@/pages/TargetSettingPage';
import { UserManagementPage } from '@/pages/UserManagementPage';
import { ChangeLogPage } from '@/pages/ChangeLogPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/indicators" element={<IndicatorsOverviewPage />} />
              <Route path="/indicators/core" element={<CoreIndicatorsPage />} />
              <Route path="/indicators/autonomous" element={<AutonomousIndicatorsPage />} />
              <Route path="/university-results" element={<UniversityManagementPage />} />
              <Route path="/priority" element={<PriorityIndicatorsPage />} />
              <Route
                path="/targets"
                element={
                  <ProtectedRoute adminOnly>
                    <TargetSettingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute adminOnly>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <ProtectedRoute adminOnly>
                    <ChangeLogPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
