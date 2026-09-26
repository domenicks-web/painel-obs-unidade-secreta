import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactCameras } from './ReactCameras';
import { ESTADO_PADRAO } from '../../types/estado';

describe('ReactCameras', () => {
  it('mostra até três câmeras e o título', () => {
    render(<ReactCameras estado={{ ...ESTADO_PADRAO, cams: ['JOÃO', 'MARIA', 'PEDRO'], titulo: 'REACT DA FINAL' }} />);
    expect(screen.getByText('JOÃO')).toBeInTheDocument();
    expect(screen.getByText('MARIA')).toBeInTheDocument();
    expect(screen.getByText('PEDRO')).toBeInTheDocument();
    expect(screen.getByText('REACT DA FINAL')).toBeInTheDocument();
  });
});
