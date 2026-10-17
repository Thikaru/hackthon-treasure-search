-- 修正1：宝の道標の場所ヒントに画像（任意）を追加し、get_my_state の返し方を変更
-- SQL Editor で実行してください（何度実行しても安全）。

alter table private.treasure_secrets add column if not exists place_image_url text;

create or replace function public.get_my_state() returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then return jsonb_build_object('player', null); end if;
  select jsonb_build_object(
    'player', (select to_jsonb(p) - 'id' from public.players p where p.id = uid),
    'progress', coalesce((select jsonb_agg(to_jsonb(pt) - 'player_id') from public.player_treasures pt where pt.player_id = uid), '[]'::jsonb),
    'place_hints', coalesce((
      select jsonb_object_agg(s.treasure_id, jsonb_build_object('text', nullif(s.place_hint, ''), 'image_url', nullif(s.place_image_url, '')))
      from private.treasure_secrets s
      join public.player_treasures pt on pt.treasure_id = s.treasure_id and pt.player_id = uid
      where pt.state <> 'locked'), '{}'::jsonb),
    'redeemed', exists (select 1 from private.redemptions r where r.player_id = uid)
  ) into result;
  return result;
end $$;

grant execute on function public.get_my_state() to anon, authenticated;
