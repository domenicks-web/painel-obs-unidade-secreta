import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecaoCameras } from './SecaoCameras';
import { ESTADO_PADRAO } from '../../types/estado';

describe('SecaoCameras', () => {
  it('atualiza o nome da câmera 2 sem afetar as outras', () => {
    const atualizar = vi.fn();
    render(<SecaoCameras estado={ESTADO_PADRAO} atualizar={atualizar} />);
    const campos = screen.getAllByDisplayValue(/NOME 0[1-3]/);
    fireEvent.change(campos[1], { target: { value: 'JOÃO' } });
    expect(atualizar).toHaveBeenCalledWith({ cams: ['NOME 01', 'JOÃO', 'NOME 03'] });
  });
});
