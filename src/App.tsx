import { Route, Routes } from 'react-router-dom';
import { OverlayPage } from './pages/OverlayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/overlay/:cena" element={<OverlayPage />} />
    </Routes>
  );
}
