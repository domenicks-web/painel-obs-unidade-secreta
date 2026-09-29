import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { PainelPage } from './pages/PainelPage';
import { AdminPage } from './pages/AdminPage';
import { TelaPage } from './pages/TelaPage';
import { AlertaPage } from './pages/AlertaPage';
import { RotaProtegida } from './components/RotaProtegida';

export default function App() {
  return (
    <Routes>
      <Route path="/tela/:id" element={<TelaPage />} />
      <Route path="/alerta" element={<AlertaPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/painel"
        element={
          <RotaProtegida>
            <PainelPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/admin"
        element={
          <RotaProtegida>
            <AdminPage />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  );
}
