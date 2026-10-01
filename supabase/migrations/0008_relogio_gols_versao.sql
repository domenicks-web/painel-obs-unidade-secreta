-- 0008: ajuste do relógio do FUTEBOL, gol somado no banco e versão da sala.
--
-- versao: sobe a cada mudança da linha (trigger, com a linha travada, então segue a ordem de
-- gravação). O painel ignora resposta/eco com versão menor que a que já tem: resposta de RPC
-- atrasada não traz de volta um estado mais velho.
-- somar_gol: "+ gol" em dois painéis ao mesmo tempo soma os dois (antes cada um gravava o
-- número que via, e um gol se perdia).
-- controlar_relogio ganha 'ajustar' (±segundos) e 'definir' (tempo exato), contados pela hora
-- do servidor: vale na hora pra todas as telas.

alter table public.salas add column if not exists versao bigint not null default 1;

create or replace function public.salas_versao()
returns trigger
language plpgsql
as $$
begin
  new.versao := old.versao + 1;
  return new;
end;
$$;

drop trigger if exists salas_versao on public.salas;
create trigger salas_versao
before update on public.salas
for each row execute function public.salas_versao();

-- novo parâmetro com default: o front antigo (2 argumentos) continua funcionando
drop function if exists public.controlar_relogio(text, text);

create or replace function public.controlar_relogio(p_slug text, p_acao text, p_segundos numeric default null)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_e jsonb;
  v_rodando boolean;
  v_agora bigint := agora_ms();
  v_atual numeric;
  v_novo numeric;
  v_patch jsonb;
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  select estado into v_e from salas where slug = p_slug for update;
  if v_e is null then raise exception 'sala não encontrada: %', p_slug; end if;
  v_rodando := coalesce((v_e->>'clockRodando')::boolean, false);
  v_atual := coalesce((v_e->>'clockAcumulado')::numeric, 0)
             + case when v_rodando then greatest(0, (v_agora - (v_e->>'clockInicio')::bigint) / 1000.0) else 0 end;

  if p_acao = 'iniciar' then
    if v_rodando then
      v_patch := '{}'::jsonb;
    else
      v_patch := jsonb_build_object('clockInicio', v_agora, 'clockRodando', true);
    end if;
  elsif p_acao = 'pausar' then
    if v_rodando then
      v_patch := jsonb_build_object('clockAcumulado', v_atual, 'clockInicio', null, 'clockRodando', false);
    else
      v_patch := '{}'::jsonb;
    end if;
  elsif p_acao = 'zerar' then
    v_patch := jsonb_build_object('clockAcumulado', 0, 'clockInicio', null, 'clockRodando', false);
  elsif p_acao in ('ajustar', 'definir') then
    if p_segundos is null then raise exception '% precisa dos segundos', p_acao; end if;
    if p_acao = 'ajustar' then
      v_novo := greatest(0, v_atual + p_segundos);
    else
      if p_segundos < 0 or p_segundos > 5999 then raise exception 'tempo fora de 00:00–99:59'; end if;
      v_novo := p_segundos;
    end if;
    -- rodando: o tempo novo vira o acumulado e o trecho recomeça agora
    v_patch := jsonb_build_object('clockAcumulado', least(v_novo, 5999),
                                  'clockInicio', case when v_rodando then to_jsonb(v_agora) else 'null'::jsonb end);
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

create or replace function public.somar_gol(p_slug text, p_lado text, p_delta integer)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_chave text;
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  if p_lado not in ('A', 'B') then raise exception 'lado inválido: %', p_lado; end if;
  if p_delta not in (1, -1) then raise exception 'gol muda de 1 em 1'; end if;
  v_chave := 'gols' || p_lado;

  update salas
  set estado = jsonb_set(estado, array[v_chave],
                         to_jsonb(greatest(0, coalesce((estado->>v_chave)::int, 0) + p_delta))),
      updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  if v_sala is null then raise exception 'sala não encontrada: %', p_slug; end if;
  return v_sala;
end;
$$;

revoke execute on function public.controlar_relogio(text, text, numeric) from public, anon;
grant execute on function public.controlar_relogio(text, text, numeric) to authenticated;
revoke execute on function public.somar_gol(text, text, integer) from public, anon;
grant execute on function public.somar_gol(text, text, integer) to authenticated;
revoke execute on function public.salas_versao() from public, anon, authenticated;
