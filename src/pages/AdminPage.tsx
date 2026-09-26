import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MembroEquipe {
  id: string;
  email: string;
  nome: string | null;
  papel: 'admin' | 'editor';
  user_id: string | null;
}

export function AdminPage() {
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'admin' | 'editor'>('editor');
  const [erro, setErro] = useState('');

  async function carregar() {
    const { data, error } = await supabase.from('membros_equipe').select('id, email, nome, papel, user_id').order('created_at');
    if (!error && data) setMembros(data as MembroEquipe[]);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function convidar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    const { error } = await supabase.from('membros_equipe').insert({ email, papel });
    if (error) setErro('Não deu pra convidar. Confere se o e-mail já não está cadastrado.');
    else {
      setEmail('');
      await carregar();
    }
  }

  return (
    <div className="painel">
      <h1>ADMIN · EQUIPE</h1>
      <form onSubmit={convidar} className="secao secao__linha">
        <input placeholder="email@exemplo.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <select value={papel} onChange={(e) => setPapel(e.target.value as 'admin' | 'editor')}>
          <option value="editor">EDITOR</option>
          <option value="admin">ADMIN</option>
        </select>
        <button type="submit">CONVIDAR</button>
      </form>
      {erro && <p>{erro}</p>}
      <ul className="admin-lista">
        {membros.map((m) => (
          <li key={m.id}>
            <span>{m.email}</span> — {m.papel} {!m.user_id && '(aguardando primeiro login)'}
          </li>
        ))}
      </ul>
    </div>
  );
}
