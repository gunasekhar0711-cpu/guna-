import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InspectionsList from './pages/InspectionsList';
import NewInspection from './pages/NewInspection';
import InspectionDetail from './pages/InspectionDetail';
import ProductionLines from './pages/ProductionLines';
import Settings from './pages/Settings';

// Layout wrapper for authenticated pages
function AppLayout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0f1d] text-slate-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspections"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <InspectionsList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspections/new"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NewInspection />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspections/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <InspectionDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lines"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProductionLines />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Redirections */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
