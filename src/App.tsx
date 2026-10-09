import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TelaPage } from './pages/TelaPage';
import { ChatPage } from './pages/ChatPage';
import { AlertaPage } from './pages/AlertaPage';
import { GolPage } from './pages/GolPage';
import { RotaProtegida } from './components/RotaProtegida';
import { useTituloDaPagina } from './tituloDaPagina';

// Painel, admin e login vêm sob demanda: as telas do OBS baixam só o que usam.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const PainelPage = lazy(() => import('./pages/PainelPage').then((m) => ({ default: m.PainelPage })));
const PainelChatPage = lazy(() => import('./pages/PainelChatPage').then((m) => ({ default: m.PainelChatPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

export default function App() {
  useTituloDaPagina();
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/tela/:id" element={<TelaPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/alerta" element={<AlertaPage />} />
        <Route path="/gol" element={<GolPage />} />
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
          path="/painel/chat"
          element={
            <RotaProtegida>
              <PainelChatPage />
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
    </Suspense>
  );
}
