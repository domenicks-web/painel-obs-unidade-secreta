-- 0011: animação de gol. O "+" grava, junto com o placar, o evento do gol (id novo, time, placar,
-- hora do servidor, duração e se anima). Cada fonte do OBS toca um evento uma vez só; quem abre
-- depois não toca gol antigo (compara a hora do evento com a do servidor). O "–" do mesmo time
-- marca o evento como anulado: a animação corta na hora.
-- Chaves do painel (estado da sala): golAnimA (padrão ligada), golAnimB (padrão desligada),
-- golDuracao (3 a 6 s, padrão 4), golSom.

create or replace function public.somar_gol(p_slug text, p_lado text, p_delta integer)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_chave text;
  v_e jsonb;
  v_antes int;
  v_novo int;
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  if p_lado not in ('A', 'B') then raise exception 'lado inválido: %', p_lado; end if;
  if p_delta not in (1, -1) then raise exception 'gol muda de 1 em 1'; end if;
  v_chave := 'gols' || p_lado;

  select estado into v_e from salas where slug = p_slug for update;
  if v_e is null then raise exception 'sala não encontrada: %', p_slug; end if;
  v_antes := coalesce((v_e->>v_chave)::int, 0);
  v_novo := greatest(0, v_antes + p_delta);
  if v_novo = v_antes then
    select * into v_sala from salas where slug = p_slug;
    return v_sala;
  end if;
  v_e := jsonb_set(v_e, array[v_chave], to_jsonb(v_novo));

  if p_delta = 1 then
    v_e := v_e || jsonb_build_object('golEvento', jsonb_build_object(
      'id', gen_random_uuid()::text,
      'lado', p_lado,
      'a', coalesce((v_e->>'golsA')::int, 0),
      'b', coalesce((v_e->>'golsB')::int, 0),
      'em', agora_ms(),
      'dur', least(6, greatest(3, coalesce((v_e->>'golDuracao')::numeric, 4))),
      'anim', coalesce((v_e->>('golAnim' || p_lado))::boolean, p_lado = 'A')));
  elsif v_e->'golEvento'->>'lado' = p_lado then
    v_e := jsonb_set(v_e, '{golEvento,anulado}', 'true');
  end if;

  update salas
  set estado = v_e, updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  return v_sala;
end;
$$;

-- REPETIR ANIMAÇÃO: o último gol de novo, com o placar de agora e a animação ligada
create or replace function public.repetir_gol(p_slug text)
returns public.salas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nome_membro_atual();
  v_e jsonb;
  v_sala salas;
begin
  if v_nome is null then raise exception 'não autorizado'; end if;
  select estado into v_e from salas where slug = p_slug for update;
  if v_e is null then raise exception 'sala não encontrada: %', p_slug; end if;
  if v_e->'golEvento'->>'lado' is null then raise exception 'nenhum gol pra repetir'; end if;

  update salas
  set estado = estado || jsonb_build_object('golEvento', jsonb_build_object(
        'id', gen_random_uuid()::text,
        'lado', v_e->'golEvento'->>'lado',
        'a', coalesce((v_e->>'golsA')::int, 0),
        'b', coalesce((v_e->>'golsB')::int, 0),
        'em', agora_ms(),
        'dur', least(6, greatest(3, coalesce((v_e->>'golDuracao')::numeric, 4))),
        'anim', true)),
      updated_at = now(), updated_by = auth.uid(), updated_by_nome = v_nome
  where slug = p_slug
  returning * into v_sala;
  return v_sala;
end;
$$;

revoke execute on function public.somar_gol(text, text, integer) from public, anon;
grant execute on function public.somar_gol(text, text, integer) to authenticated;
revoke execute on function public.repetir_gol(text) from public, anon;
grant execute on function public.repetir_gol(text) to authenticated;
