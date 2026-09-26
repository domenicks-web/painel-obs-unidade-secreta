import { Route, Routes } from 'react-router-dom';
import { OverlayPage } from './pages/OverlayPage';
import { LoginPage } from './pages/LoginPage';
import { PainelPage } from './pages/PainelPage';
import { AdminPage } from './pages/AdminPage';
import { RotaProtegida } from './components/RotaProtegida';

export default function App() {
  return (
    <Routes>
      <Route path="/overlay/:cena" element={<OverlayPage />} />
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
    </Routes>
  );
}
