import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';
import ChallanNew from './pages/ChallanNew';
import ChallanDetail from './pages/ChallanDetail';

function RoleRoute({ roles, children }: { roles?: ('ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS')[]; children: React.ReactNode }) {
  if (roles) {
    return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="customers"
                element={<RoleRoute roles={['ADMIN', 'SALES', 'ACCOUNTS']}><Customers /></RoleRoute>}
              />
              <Route
                path="customers/:id"
                element={<RoleRoute roles={['ADMIN', 'SALES', 'ACCOUNTS']}><CustomerDetail /></RoleRoute>}
              />
              <Route path="products" element={<Products />} />
              <Route
                path="inventory"
                element={<RoleRoute roles={['ADMIN', 'WAREHOUSE', 'ACCOUNTS']}><Inventory /></RoleRoute>}
              />
              <Route
                path="challans"
                element={<RoleRoute roles={['ADMIN', 'SALES', 'ACCOUNTS']}><Challans /></RoleRoute>}
              />
              <Route
                path="challans/new"
                element={<RoleRoute roles={['ADMIN', 'SALES']}><ChallanNew /></RoleRoute>}
              />
              <Route
                path="challans/:id"
                element={<RoleRoute roles={['ADMIN', 'SALES', 'ACCOUNTS']}><ChallanDetail /></RoleRoute>}
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
