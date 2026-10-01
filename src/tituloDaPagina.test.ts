import { describe, expect, it } from 'vitest';
import { tituloDaPagina } from './tituloDaPagina';

describe('tituloDaPagina', () => {
  it('páginas do site', () => {
    expect(tituloDaPagina('/painel')).toBe('Painel | Unidade Secreta');
    expect(tituloDaPagina('/')).toBe('Painel | Unidade Secreta');
    expect(tituloDaPagina('/login')).toBe('Entrar | Unidade Secreta');
    expect(tituloDaPagina('/admin')).toBe('Equipe | Unidade Secreta');
    expect(tituloDaPagina('/chat')).toBe('Chat | Unidade Secreta');
    expect(tituloDaPagina('/alerta')).toBe('Alertas | Unidade Secreta');
  });
  it('telas do OBS com o nome escrito normal', () => {
    expect(tituloDaPagina('/tela/inicio')).toBe('Início | Unidade Secreta');
    expect(tituloDaPagina('/tela/mesa')).toBe('Mesa Redonda | Unidade Secreta');
    expect(tituloDaPagina('/tela/filme')).toBe('Filme/Série | Unidade Secreta');
    expect(tituloDaPagina('/tela/lower')).toBe('Lower Third | Unidade Secreta');
    expect(tituloDaPagina('/tela/xyz')).toBe('Unidade Secreta');
  });
});
