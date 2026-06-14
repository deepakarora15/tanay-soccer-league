import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import AuthPages from './components/AuthPages';
import Dashboard from './components/Dashboard';
import PredictionForm from './components/PredictionForm';
import Scorecard from './components/Scorecard';
import Schedule from './components/Schedule';
import NewsFeed from './components/NewsFeed';
import PersonalizedFeed from './components/PersonalizedFeed';
import FavoritesManager from './components/FavoritesManager';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import PointsTable from './components/PointsTable';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPages />}
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predictions" element={<PredictionForm />} />
        <Route path="/scores" element={<Scorecard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/feed" element={<PersonalizedFeed />} />
        <Route path="/favorites" element={<FavoritesManager />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/points-table" element={<PointsTable />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
