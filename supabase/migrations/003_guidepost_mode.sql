-- 修正2：宝の道標の表示方法（1つずつ／全問）を運営画面で切り替えられるようにする
-- SQL Editor で実行してください（何度実行しても安全）。

insert into public.settings(key, value) values ('guidepost_mode', 'sequential')
on conflict (key) do nothing;

-- 宝の道標が今その参加者に見えているか（guidepost_mode = 'all' なら常に見える。
-- 'sequential'（初期値）なら、同じエリアで並び順が前の道標をすべてクリアしている場合だけ見える）
create or replace function private.guidepost_open(p_uid uuid, p_treasure text) returns boolean
language sql stable security definer set search_path = public, private, extensions as $$
  select coalesce((select value from public.settings where key = 'guidepost_mode'), 'sequential') = 'all'
    or not exists (
      select 1
      from public.treasures t
      join public.treasures prev on prev.area_id = t.area_id and prev.active and prev.sort < t.sort
      left join public.player_treasures pt on pt.treasure_id = prev.id and pt.player_id = p_uid
      where t.id = p_treasure and coalesce(pt.state, 'locked') = 'locked')
$$;

create or replace function public.submit_answer(p_treasure text, p_kind text, p_answer text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  uid uuid := private.require_player();
  cur text;
  answers text[];
  ok boolean;
begin
  if p_kind not in ('locate', 'acquire') then raise exception 'bad_kind'; end if;
  if (select count(*) from private.answer_logs where player_id = uid and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'too_many';
  end if;

  select coalesce((select state from public.player_treasures where player_id = uid and treasure_id = p_treasure), 'locked') into cur;
  if p_kind = 'acquire' and cur not in ('found', 'acquired') then raise exception 'not_found_yet'; end if;
  -- 1つずつ表示モードでは、まだ現れていない宝の道標には答えられない
  if p_kind = 'locate' and cur = 'locked' and not private.guidepost_open(uid, p_treasure) then
    raise exception 'guidepost_hidden';
  end if;

  select case when p_kind = 'locate' then locate_answers else acquire_answers end
    into answers from private.treasure_secrets where treasure_id = p_treasure;
  if answers is null then raise exception 'unknown_treasure'; end if;

  ok := private.norm(p_answer) <> '' and exists (select 1 from unnest(answers) a where private.norm(a) = private.norm(p_answer));
  insert into private.answer_logs(player_id, treasure_id, kind, input, is_correct) values (uid, p_treasure, p_kind, left(p_answer, 100), ok);

  if ok then
    if p_kind = 'locate' and cur = 'locked' then
      insert into public.player_treasures(player_id, treasure_id, state, located_at) values (uid, p_treasure, 'located', now())
      on conflict (player_id, treasure_id) do update set state = 'located', located_at = now();
    elsif p_kind = 'acquire' and cur = 'found' then
      update public.player_treasures set state = 'acquired', acquired_at = now() where player_id = uid and treasure_id = p_treasure;
    end if;
  end if;
  return jsonb_build_object('ok', ok);
end $$;

-- 運営画面から変更できる設定（許可したキーと値だけ）
create or replace function public.staff_set_setting(p_pin text, p_key text, p_value text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  if p_key = 'guidepost_mode' and p_value in ('sequential', 'all') then
    insert into public.settings(key, value) values (p_key, p_value)
    on conflict (key) do update set value = excluded.value;
  else
    raise exception 'bad_setting';
  end if;
end $$;


grant execute on function public.submit_answer(text, text, text) to authenticated;
grant execute on function public.staff_set_setting(text, text, text) to anon, authenticated;
