import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminPage } from './AdminPage';

vi.mock('../lib/supabase', () => {
  const order = vi.fn().mockResolvedValue({ data: [{ id: '1', email: 'a@a.com', nome: 'A', papel: 'admin', user_id: 'u1' }], error: null });
  const select = vi.fn(() => ({ order }));
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, insert }));
  return { supabase: { from } };
});

type AuthMock = { carregando: boolean; sessao: { user: { id: string } } | null; papel: 'admin' | 'editor' | null };

const useAuthMock = vi.fn<() => AuthMock>(() => ({ carregando: false, sessao: { user: { id: 'u1' } }, papel: 'admin' }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

import { supabase } from '../lib/supabase';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ carregando: false, sessao: { user: { id: 'u1' } }, papel: 'admin' });
});

describe('AdminPage', () => {
  it('lista os membros existentes', async () => {
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('a@a.com')).toBeInTheDocument());
  });

  it('convida um novo membro por e-mail', async () => {
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('a@a.com')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('email@exemplo.com'), { target: { value: 'novo@a.com' } });
    fireEvent.click(screen.getByText('CONVIDAR'));

    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('membros_equipe'));
    expect(vi.mocked(supabase.from).mock.results[1].value.insert).toHaveBeenCalledWith({ email: 'novo@a.com', papel: 'editor' });
  });

  it('redireciona quem não é admin e não consulta membros_equipe', async () => {
    useAuthMock.mockReturnValue({ carregando: false, sessao: { user: { id: 'u2' } }, papel: 'editor' });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('ADMIN · EQUIPE')).not.toBeInTheDocument();
    await waitFor(() => expect(supabase.from).not.toHaveBeenCalled());
  });
});
