import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { CHAVE_LEMBRAR, supabase } from '../lib/supabase';
import '../styles/login.css';

const FAIXAS = [
  { texto: 'ÁREA RESTRITA', anim: 'lMarq 30s' },
  { texto: 'SÓ A UNIDADE', anim: 'lMarqR 34s' },
  { texto: 'QG DA UNIDADE', anim: 'lMarq 26s' },
  { texto: 'ÁREA RESTRITA', anim: 'lMarqR 30s' },
  { texto: 'SÓ A UNIDADE', anim: 'lMarq 32s' },
];

function Letreiro({ texto, vezes }: { texto: string; vezes: number }) {
  const bloco = (
    <span>
      {Array.from({ length: vezes }, (_, i) => (
        <span key={i}>
          {texto}
          <i className="login__ponto" />
        </span>
      ))}
    </span>
  );
  return (
    <>
      {bloco}
      {bloco}
    </>
  );
}

function mensagemDeErro(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-MAIL OU SENHA ERRADOS. TENTA DE NOVO';
    case 'email_not_confirmed':
      return 'CONTA SEM CONFIRMAÇÃO. FALA COM O UNDER';
    case 'email_provider_disabled':
      return 'LOGIN POR E-MAIL DESLIGADO NO SUPABASE';
    case 'over_request_rate_limit':
      return 'MUITAS TENTATIVAS. ESPERA UM POUCO';
    default:
      return error.message.toUpperCase();
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [lembrar, setLembrar] = useState(() => localStorage.getItem(CHAVE_LEMBRAR) !== '0');
  const [erro, setErro] = useState('');
  const [tremidas, setTremidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [ok, setOk] = useState(false);
  const [modal, setModal] = useState(false);
  const [aceso, setAceso] = useState(0);

  useEffect(() => {
    const iv = setInterval(
      () =>
        setAceso((atual) => {
          let n;
          do n = Math.floor(Math.random() * 10);
          while (n === atual);
          return n;
        }),
      1500,
    );
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModal(false);
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(iv);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => navigate('/painel'), 1700);
    return () => clearTimeout(t);
  }, [ok, navigate]);

  function falhar(msg: string) {
    setErro(msg);
    setTremidas((n) => n + 1);
    setCarregando(false);
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (carregando || ok) return;
    if (!email.includes('@')) return falhar('E-MAIL INVÁLIDO');
    if (!senha) return falhar('FALTOU A SENHA');

    localStorage.setItem(CHAVE_LEMBRAR, lembrar ? '1' : '0');
    setErro('');
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return falhar(mensagemDeErro(error));
    sucesso();
  }

  function sucesso() {
    setCarregando(false);
    setOk(true);
  }

  const n = Math.min(10, senha.length);
  const cor = (i: number) => (i === 9 ? 'var(--creme)' : 'var(--laranja)');

  return (
    <div className="login">
      <div className="login__fundo" aria-hidden>
        {FAIXAS.map((f, i) => (
          <div key={i} className="login__faixa" style={{ animation: `${f.anim} linear infinite` }}>
            <Letreiro texto={f.texto} vezes={3} />
          </div>
        ))}
      </div>

      <div className="login__conteudo">
        <div className="login__marca">
          <div className="login__etiqueta">
            <div className="login__led" />
            <div>PAINEL ADM</div>
          </div>
          <div className="login__titulo">
            QG DA
            <br />
            UNIDADE
          </div>
          <div className="login__sub">Entra pra mexer nas telas, no placar e nos PIX da live.</div>
          <div className="login__logo">
            <div className="login__logo-us">US</div>
            <div className="login__logo-grade">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ background: i === aceso || ok ? cor(i) : '#3a3035' }} />
              ))}
            </div>
          </div>
        </div>

        <div className="login__cartao-wrap">
          <form
            onSubmit={entrar}
            className="login__cartao"
            style={{ animation: tremidas ? (tremidas % 2 ? 'lShake .45s' : 'lShake .451s') : 'none' }}
          >
            <div className="login__listra" />
            <div className="login__cabeca">
              <div className="login__cartao-titulo">IDENTIFICA AÍ</div>
              <div className="login__cartao-sub">ACESSO SÓ PRA QUEM É DA UNIDADE</div>
            </div>

            <label className="login__campo">
              <span className="login__rotulo">E-MAIL</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErro('');
                }}
                placeholder="voce@email.com"
                autoComplete="username"
              />
            </label>

            <label className="login__campo">
              <span className="login__rotulo-linha">
                <span className="login__rotulo">SENHA</span>
                <button type="button" className="login__ver" onClick={() => setVer((v) => !v)}>
                  {ver ? 'ESCONDER' : 'VER'}
                </button>
              </span>
              <input
                type={ver ? 'text' : 'password'}
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro('');
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="login__senha"
              />
              <span className="login__bolinhas">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      background: i < n ? cor(i) : 'transparent',
                      borderColor: i < n ? cor(i) : '#3a3035',
                      animation: i === n - 1 ? 'lPop .3s ease-out' : 'none',
                    }}
                  />
                ))}
              </span>
            </label>

            {erro && (
              <div className="login__erro" role="alert">
                <div className="login__led login__led--rapido" />
                <div>{erro}</div>
              </div>
            )}

            <button type="submit" className="login__entrar" disabled={carregando}>
              {carregando ? 'VERIFICANDO…' : ok ? 'BEM-VINDO' : 'ENTRAR NO QG'}
            </button>

            <div className="login__rodape">
              <label className="login__lembrar">
                <button
                  type="button"
                  aria-pressed={lembrar}
                  onClick={() => setLembrar((l) => !l)}
                  style={{ background: lembrar ? 'var(--laranja)' : 'transparent' }}
                />
                <span>LEMBRAR NESTE PC</span>
              </label>
              <a
                href="#"
                className="login__esqueci"
                onClick={(e) => {
                  e.preventDefault();
                  setModal(true);
                }}
              >
                ESQUECI A SENHA
              </a>
            </div>
          </form>
        </div>
      </div>

      <div className="login__chao" />

      {modal && (
        <div className="login__modal-fundo" onClick={() => setModal(false)}>
          <div className="login__modal" onClick={(e) => e.stopPropagation()}>
            <div className="login__listra login__listra--invertida" />
            <div className="login__modal-etiqueta">ESQUECI A SENHA</div>
            <div className="login__modal-texto">
              É tudo hospedagem e banco de graça, rei.
              <br />
              Se esqueceu a senha, fala com o Under.
            </div>
            <button type="button" className="login__modal-botao" onClick={() => setModal(false)}>
              FECHOU
            </button>
          </div>
        </div>
      )}

      {ok && (
        <div className="login__liberado">
          <div className="login__liberado-faixa">
            <div className="login__faixa login__faixa--liberado">
              <Letreiro texto="ACESSO LIBERADO" vezes={2} />
            </div>
          </div>
          <div className="login__liberado-listra" />
        </div>
      )}
    </div>
  );
}
