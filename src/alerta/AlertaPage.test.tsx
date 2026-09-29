import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

type H = (p: { eventType: string; new: unknown }) => void;
let h: H | null = null;
vi.mock('../lib/supabase', () => {
  const canal = { on: vi.fn((_a: string, _b: unknown, cb: H) => { h = cb; return canal; }), subscribe: vi.fn(() => canal) };
  return { supabase: { channel: vi.fn(() => canal), removeChannel: vi.fn() } };
});

import { AlertaPage } from '../pages/AlertaPage';

describe('AlertaPage', () => {
  it('mostra o PIX novo com valor formatado e some depois de 7 s', async () => {
    vi.useFakeTimers();
    render(<AlertaPage />);
    act(() => h!({ eventType: 'INSERT', new: { id: '1', nome: 'Carol', valor: '12.50', msg: 'salve', origem: 'manual', externo_id: null, off: false, created_at: '' } }));
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('R$ 12,50')).toBeInTheDocument();
    expect(screen.getByText('salve')).toBeInTheDocument();
    // uma fase por act: o React só agenda o próximo timer depois de aplicar a fase
    for (const ms of [500, 6000, 600]) {
      await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    }
    expect(screen.queryByText('Carol')).toBeNull();
    vi.useRealTimers();
  });
});
