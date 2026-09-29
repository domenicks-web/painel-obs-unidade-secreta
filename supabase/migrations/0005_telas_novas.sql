-- Telas novas (parte 1): estado novo, tabela pix com meta calculada no banco,
-- relógios pela hora do servidor. Remove o alerta antigo (eventos).

drop function if exists public.disparar_evento(text, text, jsonb);
drop table if exists public.eventos;

create or replace function public.agora_ms()
returns bigint language sql stable as $$
  select (extract(epoch from now()) * 1000)::bigint;
$$;

update public.salas
set estado = '{
  "titulo": "OPERAÇÃO AO VIVO",
  "ticker": "SE INSCREVE NO CANAL ● ATIVA O SININHO ● MANDA O PIX NA DESCRIÇÃO ● A UNIDADE NÃO PARA",
  "nomes": ["NOME 01","NOME 02","NOME 03","NOME 04","NOME 05","NOME 06"],
  "galera": [],
  "minutos": 5, "timerInicio": null, "msg": "VOLTAMOS JÁ",
  "hostCams": "1", "pixLink": "LIVEPIX.GG/UNIDADESECRETA",
  "metaDesc": "PIZZA PRA RAPAZIADA", "metaTotal": 500, "ajuste": 0,
  "metaAtual": 0, "pixNome": "—", "pixValor": 0, "topNome": "—", "topValor": 0,
  "timeA": "CASA", "timeB": "FORA", "golsA": 0, "golsB": 0,
  "jogo": "1º TEMPO", "jogoOutro": "",
  "clockInicio": null, "clockAcumulado": 0, "clockRodando": false,
  "enquete": {"casa": 0, "empate": 0, "fora": 0, "mostrar": false},
  "filme": "NOME DO FILME", "episodio": "T1 · E3",
  "ltNome": "NOME 01", "funcao": "UNIDADE SECRETA",
  "proximo": "SEXTA, 21H",
  "chatPin": null
}'::jsonb,
  updated_by = null,
  updated_by_nome = null
where slug = 'principal';

create table public.pix (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  valor numeric(10,2) not null check (valor > 0),
  msg text not null default '' check (char_length(msg) <= 280),
  origem text not null check (origem in ('manual', 'livepix')),
  externo_id text unique,
  off boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create index pix_created_at_idx on public.pix (created_at desc);

alter table public.pix enable row level security;
create policy "pix_select_publica" on public.pix for select using (true);
-- sem policy de escrita: tudo passa pelas funções abaixo (e, na parte 2, pelo webhook com service role)

alter publication supabase_realtime add table public.pix;

-- Recalcula meta/último/top no estado. Não mexe em updated_by/updated_at:
-- recálculo automático não é edição de ninguém.
create or replace function public.recalcular_pix(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ajuste numeric;
  v_soma numeric;
  v_ult_nome text; v_ult_valor numeric;
  v_top_nome text; v_top_valor numeric;
begin
  -- trava a linha antes de somar: com PIX chegando ao mesmo tempo, a soma é feita
  -- depois que o outro commit terminou e enxerga o PIX dele
  perform 1 from salas where slug = p_slug for update;
  select coalesce((estado->>'ajuste')::numeric, 0) into v_ajuste from salas where slug = p_slug;
  select coalesce(sum(valor), 0) into v_soma from pix where not off;
  select nome, valor into v_ult_nome, v_ult_valor from pix where not off order by created_at desc, id desc limit 1;
  select nome, valor into v_top_nome, v_top_valor from pix where not off order by valor desc, created_at asc, id asc limit 1;

  update salas
  set estado = estado || jsonb_build_object(
    'metaAtual', v_soma + coalesce(v_ajuste, 0),
    'pixNome', coalesce(v_ult_nome, '—'),
    'pixValor', coalesce(v_ult_valor, 0),
    'topNome', coalesce(v_top_nome, '—'),
    'topValor', coalesce(v_top_valor, 0)
  )
  where slug = p_slug;
end;
$$;
revoke execute on function public.recalcular_pix(text) from public, anon, authenticated;

create or replace function public.pix_mudou()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recalcular_pix('principal');
  return null;
end;
$$;

create trigger pix_recalcula
after insert or update or delete on public.pix
for each statement execute function public.pix_mudou();

-- nome de quem está logado (null se não for da equipe)
create or replace function public.nome_membro_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nome, email) from membros_equipe where user_id = auth.uid();
$$;

create or replace function public.atualizar_estado(p_slug text, p_patch jsonb)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_patch jsonb;
  v_caminhos jsonb := '{}'::jsonb;
  v_estado jsonb;
  v_k text;
  v_v jsonb;
  v_sala salas;
begin
  if v_nome is null then
    raise exception 'não autorizado';
  end if;

  v_patch := p_patch - array['metaAtual','pixNome','pixValor','topNome','topValor',
                             'timerInicio','clockInicio','clockAcumulado','clockRodando'];

  if jsonb_typeof(v_patch->'galera') = 'array' and jsonb_array_length(v_patch->'galera') > 20 then
    raise exception 'a galera tem no máximo 20 pessoas';
  end if;

  if v_patch ? 'minutos' then
    v_patch := v_patch || jsonb_build_object('timerInicio', agora_ms());
  end if;

  -- chaves com ponto ("nomes.1", "enquete.mostrar") mudam só aquele pedaço: dois editores
  -- mexendo em câmeras ou campos diferentes não se atropelam. Só nomes e enquete aceitam.
  for v_k, v_v in select * from jsonb_each(v_patch) loop
    if position('.' in v_k) > 0 then
      v_patch := v_patch - v_k;
      if split_part(v_k, '.', 1) in ('nomes', 'enquete') then
        v_caminhos := v_caminhos || jsonb_build_object(v_k, v_v);
      end if;
    end if;
  end loop;

  select estado into v_estado from salas where slug = p_slug for update;
  if v_estado is null then
    raise exception 'sala não encontrada: %', p_slug;
  end if;
  v_estado := v_estado || v_patch;
  for v_k, v_v in select * from jsonb_each(v_caminhos) loop
    v_estado := jsonb_set(v_estado, string_to_array(v_k, '.'), v_v, true);
  end loop;

  update salas
  set estado = v_estado,
      updated_at = now(),
      updated_by = auth.uid(),
      updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;

  if v_patch ? 'ajuste' or v_patch ? 'metaTotal' then
    perform recalcular_pix(p_slug);
    select * into v_sala from salas where slug = p_slug;
  end if;

  return v_sala;
end;
$$;

create or replace function public.reiniciar_contagem(p_slug text)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  update salas
  set estado = estado || jsonb_build_object('timerInicio', agora_ms()),
      updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  return v_sala;
end;
$$;

create or replace function public.controlar_relogio(p_slug text, p_acao text)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_e jsonb;
  v_rodando boolean;
  v_patch jsonb;
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  select estado into v_e from salas where slug = p_slug for update;
  v_rodando := coalesce((v_e->>'clockRodando')::boolean, false);

  if p_acao = 'iniciar' then
    if v_rodando then
      v_patch := '{}'::jsonb;
    else
      v_patch := jsonb_build_object('clockInicio', agora_ms(), 'clockRodando', true);
    end if;
  elsif p_acao = 'pausar' then
    if v_rodando then
      v_patch := jsonb_build_object(
        'clockAcumulado', coalesce((v_e->>'clockAcumulado')::numeric, 0)
                          + (agora_ms() - (v_e->>'clockInicio')::bigint) / 1000.0,
        'clockInicio', null,
        'clockRodando', false);
    else
      v_patch := '{}'::jsonb;
    end if;
  elsif p_acao = 'zerar' then
    v_patch := jsonb_build_object('clockAcumulado', 0, 'clockInicio', null, 'clockRodando', false);
  else
    raise exception 'ação inválida: %', p_acao;
  end if;

  update salas
  set estado = estado || v_patch,
      updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  return v_sala;
end;
$$;

create or replace function public.adicionar_pix_manual(p_nome text, p_valor numeric, p_msg text default '')
returns public.pix
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pix pix;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  insert into pix (nome, valor, msg, origem)
  values (trim(p_nome), p_valor, coalesce(trim(p_msg), ''), 'manual')
  returning * into v_pix;
  return v_pix;
end;
$$;

create or replace function public.alternar_pix(p_id uuid)
returns public.pix
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pix pix;
begin
  if nome_membro_atual() is null then raise exception 'não autorizado'; end if;
  update pix set off = not off where id = p_id returning * into v_pix;
  if v_pix is null then raise exception 'pix não encontrado'; end if;
  return v_pix;
end;
$$;

revoke execute on function public.atualizar_estado(text, jsonb) from anon;
revoke execute on function public.reiniciar_contagem(text) from anon;
revoke execute on function public.controlar_relogio(text, text) from anon;
revoke execute on function public.adicionar_pix_manual(text, numeric, text) from anon;
revoke execute on function public.alternar_pix(uuid) from anon;
