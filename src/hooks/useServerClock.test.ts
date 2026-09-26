import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerClock } from './useServerClock';

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '../lib/supabase';

describe('useServerClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  it('aplica o offset do servidor sobre o relógio local', async () => {
    // servidor está 10s à frente do cliente
    vi.mocked(supabase.rpc).mockResolvedValue({ data: new Date(1_010_000).toISOString(), error: null } as never);

    const { result } = renderHook(() => useServerClock());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toBeGreaterThanOrEqual(1_010_000);
  });

  it('mantém o relógio local se a chamada falhar', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('falhou') } as never);

    const { result } = renderHook(() => useServerClock());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBeGreaterThanOrEqual(1_000_000);
  });
});
