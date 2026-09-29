import { describe, expect, it } from 'vitest';
import { tituloDaPagina } from './tituloDaPagina';

describe('tituloDaPagina', () => {
  it('um título por página', () => {
    expect(tituloDaPagina('/painel')).toBe('● Painel da Live · Unidade Secreta');
    expect(tituloDaPagina('/login')).toBe('Entrar · Unidade Secreta');
    expect(tituloDaPagina('/admin')).toBe('Galera e acessos · Unidade Secreta');
    expect(tituloDaPagina('/chat')).toBe('Chat ao vivo · Unidade Secreta');
    expect(tituloDaPagina('/tela/filme')).toBe('FILME/SÉRIE · Unidade Secreta');
    expect(tituloDaPagina('/tela/xyz')).toBe('Tela · Unidade Secreta');
  });
});
