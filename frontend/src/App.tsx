import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import NavBar from './components/Layout/NavBar';
import HomePage from './pages/HomePage';
import AuthPage from './components/Auth/AuthPage';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import AcceptInvitePage from './components/Auth/AcceptInvitePage';
import SetupOrgPage from './pages/SetupOrgPage';
import Dashboard from './components/Dashboard/Dashboard';
import RecognitionHistoryPage from './pages/RecognitionHistoryPage';
import RecognitionFeedPage from './pages/RecognitionFeedPage';
import RedemptionsPage from './pages/RedemptionsPage';
import AllRedemptionsPage from './pages/AllRedemptionsPage';
import PointsLedgerPage from './pages/PointsLedgerPage';
import OrgChartPage from './pages/OrgChartPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminRewardsPage from './pages/AdminRewardsPage';
import ProtectedRoute from './components/Common/ProtectedRoute';
import './App.css';

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/setup" element={<SetupOrgPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/preferences"
                element={
                  <ProtectedRoute>
                    <Navigate to="/profile?tab=preferences" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recognitions"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <RecognitionHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <RecognitionFeedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/redemptions"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <RedemptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/points"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <PointsLedgerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/redemptions"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <AllRedemptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rewards"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <AdminRewardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/org-chart"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <OrgChartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute>
                    <NavBar />
                    <ApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
