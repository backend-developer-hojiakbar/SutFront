import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WarehousePage from './pages/WarehousePage';
import DealersPage from './pages/DealersPage';
import ShopsPage from './pages/ShopsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import SotuvQaytarishPage from './pages/SotuvQaytarish';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token); // Token mavjudligini tekshirish
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/warehouse"
          element={
            <PrivateRoute>
              <WarehousePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dealers"
          element={
            <PrivateRoute>
              <DealersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/shops"
          element={
            <PrivateRoute>
              <ShopsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ReportsPage />
            </PrivateRoute>
          }
        />
        <Route path="/report-detail" element={<ReportDetailPage />} />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <PrivateRoute>
              <POSPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <ProductsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/qaytarish"
          element={
            <PrivateRoute>
              <SotuvQaytarishPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;