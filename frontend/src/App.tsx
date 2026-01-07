import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/Layout/NavBar';
import HomePage from './pages/HomePage';
import AuthPage from './components/Auth/AuthPage';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import Dashboard from './components/Dashboard/Dashboard';
import PreferencesPage from './components/Preferences/PreferencesPage';
import RecognitionHistoryPage from './pages/RecognitionHistoryPage';
import RecognitionFeedPage from './pages/RecognitionFeedPage';
import RedemptionsPage from './pages/RedemptionsPage';
import ProtectedRoute from './components/Common/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
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
              path="/preferences"
              element={
                <ProtectedRoute>
                  <NavBar />
                  <PreferencesPage />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
