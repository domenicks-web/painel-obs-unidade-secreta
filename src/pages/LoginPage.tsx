import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviarLink(e: FormEvent) {
    e.preventDefault();
    setErro('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/painel' } });
    if (error) setErro('Não foi possível enviar o link. Tenta de novo.');
    else setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="tela-cheia">
        <p>Manda ver no seu e-mail — o link de acesso chegou em {email}.</p>
      </div>
    );
  }

  return (
    <div className="tela-cheia">
      <form onSubmit={enviarLink} className="login-form">
        <div className="login-form__logo">US</div>
        <h1>PAINEL AO VIVO</h1>
        <input
          type="email"
          required
          placeholder="seu-email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">ENVIAR LINK DE ACESSO</button>
        {erro && <p className="login-form__erro">{erro}</p>}
      </form>
    </div>
  );
}
