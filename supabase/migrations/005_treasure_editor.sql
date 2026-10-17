-- 修正4：運営画面から謎の新規追加・正解の確認と変更をできるようにする
-- SQL Editor に貼り付けて実行してください（何度実行しても安全）。schema.sql にも同じ内容が入っています。

-- 未使用の6桁コードを作る
create or replace function private.new_short_code() returns text
language plpgsql volatile security definer set search_path = public, private, extensions as $$
declare c text;
begin
  loop
    c := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    exit when not exists (select 1 from private.treasure_secrets where short_code = c);
  end loop;
  return c;
end $$;

-- JSON配列 → 空でない文字列の配列（前後の空白は除く）
create or replace function private.text_list(j jsonb) returns text[]
language sql immutable as $$
  select coalesce(array_agg(btrim(x)) filter (where btrim(x) <> ''), '{}')
  from jsonb_array_elements_text(case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end) x
$$;

-- 運営用：すべての謎（非表示も含む）を、正解・場所ヒントつきで返す
create or replace function public.staff_treasures(p_pin text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  return coalesce((
    select jsonb_agg(to_jsonb(t) || jsonb_build_object(
             'locate_answers', coalesce(s.locate_answers, '{}'),
             'acquire_answers', coalesce(s.acquire_answers, '{}'),
             'place_hint', coalesce(s.place_hint, ''),
             'place_image_url', s.place_image_url,
             'short_code', s.short_code) order by t.sort, t.id)
    from public.treasures t left join private.treasure_secrets s on s.treasure_id = t.id), '[]'::jsonb);
end $$;

-- 運営用：謎の追加・更新。id が空なら新規（id・No・QRトークン・6桁コードを自動で作る）。保存した id を返す
create or replace function public.staff_save_treasure(p_pin text, p_t jsonb) returns text
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  v_id text := nullif(btrim(coalesce(p_t->>'id', '')), '');
  v_new boolean;
  v_no text := nullif(btrim(coalesce(p_t->>'no', '')), '');
  v_area text := btrim(coalesce(p_t->>'area_id', ''));
  v_name text := btrim(coalesce(p_t->>'name', ''));
  v_lq text := btrim(coalesce(p_t->>'locate_question', ''));
  v_aq text := btrim(coalesce(p_t->>'acquire_question', ''));
  v_la text[] := private.text_list(p_t->'locate_answers');
  v_aa text[] := private.text_list(p_t->'acquire_answers');
  v_img text := nullif(btrim(coalesce(p_t->>'place_image_url', '')), '');
  v_sort int;
  v_x int := least(greatest(coalesce((p_t->>'pin_x')::int, 200), 0), 390);
  v_y int := least(greatest(coalesce((p_t->>'pin_y')::int, 300), 110), 460);
begin
  perform private.check_pin(p_pin);

  if v_name = '' or char_length(v_name) > 40
     or not exists (select 1 from public.areas where id = v_area)
     or v_lq = '' or v_aq = ''
     or cardinality(v_la) = 0 or cardinality(v_aa) = 0
     or (v_img is not null and v_img !~* '^https?://')
     or (v_id is not null and v_id !~ '^[a-z0-9_-]{1,20}$') then
    raise exception 'invalid_input';
  end if;

  if v_id is null then
    select 't' || lpad((coalesce(max(substring(id from '^t(\d+)$')::int), 0) + 1)::text, 2, '0')
      into v_id from public.treasures;
  end if;
  v_new := not exists (select 1 from public.treasures where id = v_id);
  if v_no is null then
    v_no := coalesce((select no from public.treasures where id = v_id), lpad(coalesce(substring(v_id from '(\d+)$'), '0'), 2, '0'));
  end if;
  v_sort := coalesce((p_t->>'sort')::int,
                     (select sort from public.treasures where id = v_id),
                     (select coalesce(max(sort), 0) + 1 from public.treasures));

  insert into public.treasures(id, no, area_id, name, description, pin_x, pin_y,
                               locate_question, locate_hints, acquire_question, acquire_hints, sort, active)
  values (v_id, v_no, v_area, v_name, btrim(coalesce(p_t->>'description', '')), v_x, v_y,
          v_lq, private.text_list(p_t->'locate_hints'), v_aq, private.text_list(p_t->'acquire_hints'),
          v_sort, coalesce((p_t->>'active')::boolean, true))
  on conflict (id) do update set no = excluded.no, area_id = excluded.area_id, name = excluded.name,
    description = excluded.description, pin_x = excluded.pin_x, pin_y = excluded.pin_y,
    locate_question = excluded.locate_question, locate_hints = excluded.locate_hints,
    acquire_question = excluded.acquire_question, acquire_hints = excluded.acquire_hints,
    sort = excluded.sort, active = excluded.active;

  insert into private.treasure_secrets(treasure_id, token, short_code, place_hint, place_image_url, locate_answers, acquire_answers)
  values (v_id, encode(gen_random_bytes(8), 'hex'), private.new_short_code(),
          btrim(coalesce(p_t->>'place_hint', '')), v_img, v_la, v_aa)
  on conflict (treasure_id) do update set place_hint = excluded.place_hint, place_image_url = excluded.place_image_url,
    locate_answers = excluded.locate_answers, acquire_answers = excluded.acquire_answers;

  return v_id;
end $$;

-- 運営用：答え合わせのテスト。参加者と同じ判定（ひらがな・カタカナ・全角半角・空白の違いを吸収）
create or replace function public.staff_check_answer(p_pin text, p_answers text[], p_input text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  return jsonb_build_object(
    'ok', private.norm(p_input) <> '' and exists (select 1 from unnest(p_answers) a where private.norm(a) = private.norm(p_input)),
    'normalized', private.norm(p_input));
end $$;

-- QR再発行でも6桁コードが重ならないようにする
create or replace function public.staff_reissue_qr(p_pin text, p_treasure text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  update private.treasure_secrets
     set token = encode(gen_random_bytes(8), 'hex'), short_code = private.new_short_code()
   where treasure_id = p_treasure;
end $$;

revoke execute on function private.new_short_code() from public, anon, authenticated;
revoke execute on function public.staff_treasures(text) from public;
revoke execute on function public.staff_save_treasure(text, jsonb) from public;
revoke execute on function public.staff_check_answer(text, text[], text) from public;
grant execute on function public.staff_treasures(text) to anon, authenticated;
grant execute on function public.staff_save_treasure(text, jsonb) to anon, authenticated;
grant execute on function public.staff_check_answer(text, text[], text) to anon, authenticated;
grant execute on function public.staff_reissue_qr(text, text) to anon, authenticated;

select 'ok' as result,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('staff_treasures', 'staff_save_treasure', 'staff_check_answer')) as new_functions;
