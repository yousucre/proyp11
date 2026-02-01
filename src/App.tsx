import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Radicacion from './pages/Radicacion';
import Expedientes from './pages/Expedientes';
import OtrasGestiones from './pages/OtrasGestiones';
import Gestion from './pages/Gestion';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import ResetPassword from './pages/ResetPassword';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

import { ConfigProvider } from './contexts/ConfigContext';

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="radicacion" element={<Radicacion />} />
              <Route path="gestion" element={<Gestion />} />
              <Route path="expedientes" element={<Expedientes />} />
              <Route path="otras-gestiones" element={<OtrasGestiones />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
