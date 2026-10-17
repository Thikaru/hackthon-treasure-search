-- 修正3：1つずつ表示のとき、次の宝の道標が現れる条件を「前の道標を解く」から「前の道標のお宝を獲得する」に変更
-- 003_guidepost_mode.sql の後に SQL Editor で実行してください（何度実行しても安全）。

create or replace function private.guidepost_open(p_uid uuid, p_treasure text) returns boolean
language sql stable security definer set search_path = public, private, extensions as $$
  select coalesce((select value from public.settings where key = 'guidepost_mode'), 'sequential') = 'all'
    or not exists (
      select 1
      from public.treasures t
      join public.treasures prev on prev.area_id = t.area_id and prev.active and prev.sort < t.sort
      left join public.player_treasures pt on pt.treasure_id = prev.id and pt.player_id = p_uid
      where t.id = p_treasure and coalesce(pt.state, 'locked') <> 'acquired')
$$;
