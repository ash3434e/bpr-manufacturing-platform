import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Production from './pages/Production';
import Forecast from './pages/Forecast';
import Alerts from './pages/Alerts';
import Plants from './pages/Plants';
import Traceability from './pages/Traceability';
import Simulation from './pages/Simulation';
import Scheduling from './pages/Scheduling';
import OrderManagement from './pages/OrderManagement';
import Emergency from './pages/Emergency';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="production" element={<Production />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="plants" element={<Plants />} />
            <Route path="traceability" element={<Traceability />} />
            <Route path="simulation" element={<Simulation />} />
            <Route path="scheduling" element={<Scheduling />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="emergency" element={<Emergency />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
