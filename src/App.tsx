import { Route, Routes } from 'react-router-dom';
import { OverlayPage } from './pages/OverlayPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/overlay/:cena" element={<OverlayPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
