-- 修正5：お宝の場所を運営画面の地図から置けるようにする（実地図のエリアは緯度・経度で保存）
-- SQL Editor に貼り付けて実行してください（何度実行しても安全）。schema.sql にも同じ内容が入っています。

-- お宝の位置（緯度・経度）。実地図のエリアで使う。空なら従来の pin_x / pin_y から位置を割り出す
alter table public.treasures add column if not exists pin_lat double precision;
alter table public.treasures add column if not exists pin_lng double precision;

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
  v_lat double precision := nullif(p_t->>'pin_lat', '')::double precision;
  v_lng double precision := nullif(p_t->>'pin_lng', '')::double precision;
begin
  perform private.check_pin(p_pin);

  if v_name = '' or char_length(v_name) > 40
     or not exists (select 1 from public.areas where id = v_area)
     or v_lq = '' or v_aq = ''
     or cardinality(v_la) = 0 or cardinality(v_aa) = 0
     or (v_img is not null and v_img !~* '^https?://')
     or (v_id is not null and v_id !~ '^[a-z0-9_-]{1,20}$')
     or ((v_lat is null) <> (v_lng is null))
     or (v_lat is not null and (v_lat not between -90 and 90 or v_lng not between -180 and 180)) then
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

  insert into public.treasures(id, no, area_id, name, description, pin_x, pin_y, pin_lat, pin_lng,
                               locate_question, locate_hints, acquire_question, acquire_hints, sort, active)
  values (v_id, v_no, v_area, v_name, btrim(coalesce(p_t->>'description', '')), v_x, v_y, v_lat, v_lng,
          v_lq, private.text_list(p_t->'locate_hints'), v_aq, private.text_list(p_t->'acquire_hints'),
          v_sort, coalesce((p_t->>'active')::boolean, true))
  on conflict (id) do update set no = excluded.no, area_id = excluded.area_id, name = excluded.name,
    description = excluded.description, pin_x = excluded.pin_x, pin_y = excluded.pin_y,
    pin_lat = excluded.pin_lat, pin_lng = excluded.pin_lng,
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

revoke execute on function public.staff_save_treasure(text, jsonb) from public;
grant execute on function public.staff_save_treasure(text, jsonb) to anon, authenticated;

select 'ok' as result,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'treasures' and column_name in ('pin_lat', 'pin_lng')) as new_columns;
