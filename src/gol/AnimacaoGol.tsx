import type { CSSProperties } from 'react';
import type { GolEvento } from './useGolAoVivo';
import './gol.css';

// Copiada da referência (Animacao Gol): mesmos tempos, keyframes, cores e fontes.
// 0–0,75 s faixas diagonais + flash; 0,45 s faixa preta abre; 0,6 s GOOOL letra por letra e a tela
// treme; 1,05 s "GOL DO [TIME]"; 1,2 s placar novo; barra de tempo; últimos 0,5 s saem com wipe.
const INK = '#1A1417';
const CREME = '#FFF3E0';
const LARANJA = '#FF6B1F';
const VIOLETA = '#8B6CF0';
const MONO = "'JetBrains Mono',monospace";
const listras = (c: string) => `repeating-linear-gradient(-45deg,${INK} 0 24px,${c} 24px 48px)`;

interface Props {
  gol: GolEvento;
  saindo: boolean;
  timeA: string;
  timeB: string;
}

export function AnimacaoGol({ gol, saindo, timeA, timeB }: Props) {
  const cor = gol.lado === 'A' ? LARANJA : VIOLETA;
  const alt = gol.lado === 'A' ? VIOLETA : LARANJA;
  const nome = gol.lado === 'A' ? timeA : timeB;
  const numero = (v: number, lado: 'A' | 'B') => (
    <span
      style={{
        display: 'inline-block',
        color: lado === gol.lado ? cor : CREME,
        animation: lado === gol.lado ? 'gPop .7s 1.35s cubic-bezier(.2,.8,.2,1) both' : 'none',
      }}
    >
      {v}
    </span>
  );
  const borda: CSSProperties = { height: 26, background: listras(cor), backgroundSize: '68px 26px' };

  return (
    <div
      className="g-anim"
      key={gol.id}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', animation: saindo ? 'gOut .5s cubic-bezier(.7,0,.3,1) both' : 'none' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: cor, animation: 'gFlash .6s .3s ease-out both' }} />
      {[listras(cor), CREME, alt].map((bg, i) => (
        <div
          key={i}
          style={{ position: 'absolute', top: -200, bottom: -200, left: 0, width: 900, background: bg, animation: `gWipe .75s ${i * 0.07}s cubic-bezier(.6,0,.3,1) both` }}
        />
      ))}
      <div style={{ position: 'absolute', inset: 0, animation: 'gShake .45s .7s both' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 250,
            height: 470,
            background: INK,
            transformOrigin: '50% 50%',
            animation: 'gBand .4s .45s cubic-bezier(.2,.8,.2,1) both',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ ...borda, animation: 'gStripe .5s linear infinite' }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {'GOOOL'.split('').map((l, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  font: "400 300px/1 'Bungee',sans-serif",
                  color: cor,
                  textShadow: `14px 14px 0 ${CREME}`,
                  animation: `gStamp .45s ${0.6 + i * 0.07}s cubic-bezier(.2,.8,.2,1) both`,
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <div style={{ ...borda, animation: 'gStripe .5s linear infinite reverse' }} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', justifyContent: 'center', alignItems: 'stretch', overflow: 'hidden', padding: '0 0 20px' }}>
          <div
            style={{
              background: cor,
              color: INK,
              font: "700 120px/1 'Barlow Condensed',sans-serif",
              padding: '18px 56px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              boxShadow: `10px 10px 0 ${CREME}`,
              animation: 'gSlide .45s 1.05s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            <span style={{ font: `700 26px/1 ${MONO}`, letterSpacing: '.18em', background: INK, color: cor, padding: '10px 12px' }}>GOL DO</span>
            {nome}
          </div>
          <div
            style={{
              background: INK,
              color: CREME,
              font: "400 96px/1 'Bungee',sans-serif",
              padding: '22px 44px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              border: `6px solid ${CREME}`,
              marginLeft: 24,
              animation: 'gSlideR .45s 1.2s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            {numero(gol.a, 'A')}
            <span style={{ fontSize: 44, color: '#8a7f84' }}>×</span>
            {numero(gol.b, 'B')}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: INK }}>
        <div style={{ height: '100%', background: cor, transformOrigin: '0 0', animation: `gBar ${gol.dur - 0.5}s linear both` }} />
      </div>
    </div>
  );
}
