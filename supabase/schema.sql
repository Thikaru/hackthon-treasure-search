-- =========================================================
-- 宝探し×謎解き  Supabase スキーマ
-- SQL Editor にそのまま貼り付けて実行してください（何度実行しても安全）。
-- 正解・QRトークン・運営PINは private スキーマに置き、ブラウザからは読めません。
-- =========================================================

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------- 公開してよいデータ ----------

create table if not exists public.settings (
  key text primary key,
  value text not null
);

create table if not exists public.areas (
  id text primary key,
  name text not null,
  short_name text not null,
  description text not null default '',
  needs_car boolean not null default false,
  sort int not null default 0
);

create table if not exists public.treasures (
  id text primary key,
  no text not null,
  area_id text not null references public.areas(id),
  name text not null,
  description text not null default '',
  pin_x int not null default 200,
  pin_y int not null default 300,
  locate_question text not null,
  locate_hints text[] not null default '{}',
  acquire_question text not null,
  acquire_hints text[] not null default '{}',
  sort int not null default 0,
  active boolean not null default true
);

-- ---------- 参加者データ ----------

create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  player_no int generated always as identity unique,
  nickname text not null check (char_length(nickname) between 1 and 12),
  transfer_code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.player_treasures (
  player_id uuid not null references public.players(id) on delete cascade on update cascade,
  treasure_id text not null references public.treasures(id) on delete cascade,
  state text not null default 'locked' check (state in ('locked', 'located', 'found', 'acquired')),
  locate_hints int not null default 0,
  acquire_hints int not null default 0,
  located_at timestamptz,
  found_at timestamptz,
  acquired_at timestamptz,
  primary key (player_id, treasure_id)
);

-- ---------- 非公開データ ----------

create table if not exists private.config (
  key text primary key,
  value text not null
);

create table if not exists private.treasure_secrets (
  treasure_id text primary key references public.treasures(id) on delete cascade,
  token text not null unique,
  short_code text not null unique,
  place_hint text not null default '',
  locate_answers text[] not null,
  acquire_answers text[] not null
);

create table if not exists private.answer_logs (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade on update cascade,
  treasure_id text not null,
  kind text not null,
  input text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists private.certificate_tokens (
  token text primary key,
  player_id uuid not null references public.players(id) on delete cascade on update cascade,
  expires_at timestamptz not null
);

create table if not exists private.redemptions (
  player_id uuid primary key references public.players(id) on delete cascade on update cascade,
  prize text not null,
  count_at_redeem int not null,
  redeemed_at timestamptz not null default now()
);

create table if not exists private.staff_attempts (
  id bigint generated always as identity primary key,
  ok boolean not null,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------

alter table public.settings enable row level security;
alter table public.areas enable row level security;
alter table public.treasures enable row level security;
alter table public.players enable row level security;
alter table public.player_treasures enable row level security;

drop policy if exists "read settings" on public.settings;
create policy "read settings" on public.settings for select to anon, authenticated using (true);
drop policy if exists "read areas" on public.areas;
create policy "read areas" on public.areas for select to anon, authenticated using (true);
drop policy if exists "read treasures" on public.treasures;
create policy "read treasures" on public.treasures for select to anon, authenticated using (active);
drop policy if exists "read own player" on public.players;
create policy "read own player" on public.players for select to authenticated using (id = auth.uid());
drop policy if exists "read own progress" on public.player_treasures;
create policy "read own progress" on public.player_treasures for select to authenticated using (player_id = auth.uid());

revoke all on schema private from anon, authenticated;

-- ---------- 内部ヘルパー ----------

-- 全角/半角・カタカナ/ひらがな・大文字/小文字・空白の違いを吸収
create or replace function private.norm(t text) returns text
language sql immutable as $$
  select translate(
    lower(regexp_replace(normalize(coalesce(t, ''), NFKC), '\s', '', 'g')),
    'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ',
    'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ'
  )
$$;

create or replace function private.setting_int(k text, fallback int) returns int
language sql stable as $$
  select coalesce((select value::int from public.settings where key = k), fallback)
$$;

create or replace function private.require_player() returns uuid
language plpgsql stable security definer set search_path = public, private, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.players where id = uid and status = 'active') then
    raise exception 'not_registered';
  end if;
  return uid;
end $$;

-- 運営PINの確認（10分間に20回以上の失敗でロック）
create or replace function private.check_pin(p_pin text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare fails int;
begin
  select count(*) into fails from private.staff_attempts where not ok and created_at > now() - interval '10 minutes';
  if fails >= 20 then raise exception 'staff_locked'; end if;
  if p_pin is null or p_pin <> (select value from private.config where key = 'staff_pin') then
    insert into private.staff_attempts(ok) values (false);
    raise exception 'bad_pin';
  end if;
end $$;

-- ---------- 参加者向けRPC ----------

create or replace function public.register_player(p_nickname text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  insert into public.players(id, nickname) values (uid, left(trim(p_nickname), 12))
  on conflict (id) do update set nickname = excluded.nickname;
end $$;

create or replace function public.get_my_state() returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then return jsonb_build_object('player', null); end if;
  select jsonb_build_object(
    'player', (select to_jsonb(p) - 'id' from public.players p where p.id = uid),
    'progress', coalesce((select jsonb_agg(to_jsonb(pt) - 'player_id') from public.player_treasures pt where pt.player_id = uid), '[]'::jsonb),
    'place_hints', coalesce((
      select jsonb_object_agg(s.treasure_id, s.place_hint)
      from private.treasure_secrets s
      join public.player_treasures pt on pt.treasure_id = s.treasure_id and pt.player_id = uid
      where pt.state <> 'locked'), '{}'::jsonb),
    'redeemed', exists (select 1 from private.redemptions r where r.player_id = uid)
  ) into result;
  return result;
end $$;

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

create or replace function public.use_hint(p_treasure text, p_kind text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := private.require_player(); maxh int;
begin
  select coalesce(array_length(case when p_kind = 'locate' then locate_hints else acquire_hints end, 1), 0)
    into maxh from public.treasures where id = p_treasure;
  insert into public.player_treasures(player_id, treasure_id) values (uid, p_treasure) on conflict do nothing;
  if p_kind = 'locate' then
    update public.player_treasures set locate_hints = least(locate_hints + 1, maxh) where player_id = uid and treasure_id = p_treasure;
  else
    update public.player_treasures set acquire_hints = least(acquire_hints + 1, maxh) where player_id = uid and treasure_id = p_treasure;
  end if;
end $$;

-- QRのトークン または 6桁コードでお宝を「発見」にする
create or replace function public.scan_treasure(p_code text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := private.require_player(); tid text; cur text;
begin
  if (select count(*) from private.answer_logs where player_id = uid and kind = 'scan' and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'too_many';
  end if;
  select treasure_id into tid from private.treasure_secrets where token = trim(p_code) or short_code = regexp_replace(p_code, '\D', '', 'g');
  insert into private.answer_logs(player_id, treasure_id, kind, input, is_correct) values (uid, coalesce(tid, '-'), 'scan', left(p_code, 100), tid is not null);
  if tid is null then return jsonb_build_object('ok', false); end if;
  select state into cur from public.player_treasures where player_id = uid and treasure_id = tid;
  if cur is null or cur in ('locked', 'located') then
    insert into public.player_treasures(player_id, treasure_id, state, found_at) values (uid, tid, 'found', now())
    on conflict (player_id, treasure_id) do update set state = 'found', found_at = now();
    cur := 'found';
  end if;
  return jsonb_build_object('ok', true, 'treasure_id', tid, 'state', cur);
end $$;

-- クリア証明用の短命トークンを発行（スクリーンショット対策）
create or replace function public.issue_certificate() returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := private.require_player(); cnt int; tok text; exp timestamptz;
begin
  select count(*) into cnt from public.player_treasures where player_id = uid and state = 'acquired';
  if cnt < private.setting_int('clear_count', 6) then raise exception 'not_cleared'; end if;
  delete from private.certificate_tokens where player_id = uid and expires_at < now();
  tok := encode(gen_random_bytes(12), 'hex');
  exp := now() + make_interval(secs => private.setting_int('certificate_ttl_sec', 60));
  insert into private.certificate_tokens(token, player_id, expires_at) values (tok, uid, exp);
  return jsonb_build_object('token', tok, 'expires_at', exp);
end $$;

-- 別端末への引き継ぎ：引き継ぎコードの持ち主のデータを今のログインに付け替える
create or replace function public.restore_player(p_code text) returns boolean
language plpgsql security definer set search_path = public, private, extensions as $$
declare uid uuid := auth.uid(); old uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select id into old from public.players where transfer_code = upper(trim(p_code)) and id <> uid;
  if old is null then return false; end if;
  delete from public.players where id = uid;
  update public.players set id = uid, transfer_code = upper(encode(gen_random_bytes(5), 'hex')) where id = old;
  return true;
end $$;

-- ---------- 運営向けRPC（PIN必須） ----------

create or replace function public.staff_login(p_pin text) returns boolean
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  return true;
end $$;

create or replace function public.staff_verify_certificate(p_pin text, p_token text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare ct record; p record; cnt int; rd record;
begin
  perform private.check_pin(p_pin);
  select * into ct from private.certificate_tokens where token = trim(p_token);
  if ct is null then return jsonb_build_object('valid', false, 'reason', 'unknown'); end if;
  select * into p from public.players where id = ct.player_id;
  select count(*) into cnt from public.player_treasures where player_id = ct.player_id and state = 'acquired';
  select * into rd from private.redemptions where player_id = ct.player_id;
  return jsonb_build_object(
    'valid', ct.expires_at >= now(),
    'reason', case when ct.expires_at < now() then 'expired' else null end,
    'player_no', p.player_no,
    'nickname', p.nickname,
    'status', p.status,
    'count', cnt,
    'total', (select count(*) from public.treasures where active),
    'clear_count', private.setting_int('clear_count', 6),
    'redeemed_at', rd.redeemed_at
  );
end $$;

create or replace function public.staff_redeem(p_pin text, p_token text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare ct record; cnt int; prize text;
begin
  perform private.check_pin(p_pin);
  select * into ct from private.certificate_tokens where token = trim(p_token);
  if ct is null or ct.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  if exists (select 1 from public.players where id = ct.player_id and status <> 'active') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;
  select count(*) into cnt from public.player_treasures where player_id = ct.player_id and state = 'acquired';
  if cnt < private.setting_int('clear_count', 6) then return jsonb_build_object('ok', false, 'reason', 'not_cleared'); end if;
  select value into prize from public.settings where key = 'prize_name';
  insert into private.redemptions(player_id, prize, count_at_redeem) values (ct.player_id, coalesce(prize, ''), cnt)
  on conflict (player_id) do nothing;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.staff_redemptions(p_pin text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  return coalesce((
    select jsonb_agg(jsonb_build_object('player_no', p.player_no, 'nickname', p.nickname, 'count', r.count_at_redeem, 'prize', r.prize, 'redeemed_at', r.redeemed_at) order by r.redeemed_at desc)
    from private.redemptions r join public.players p on p.id = r.player_id), '[]'::jsonb);
end $$;

create or replace function public.staff_undo_redemption(p_pin text, p_player_no int) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  delete from private.redemptions where player_id = (select id from public.players where player_no = p_player_no);
end $$;

create or replace function public.staff_dashboard(p_pin text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare clear_n int := private.setting_int('clear_count', 6);
begin
  perform private.check_pin(p_pin);
  return jsonb_build_object(
    'players', (select count(*) from public.players),
    'players_today', (select count(*) from public.players where created_at >= date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'),
    'cleared', (select count(*) from (select player_id from public.player_treasures where state = 'acquired' group by player_id having count(*) >= clear_n) x),
    'redeemed', (select count(*) from private.redemptions),
    'treasures', (
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'no', t.no, 'name', t.name, 'area_id', t.area_id,
        'located', (select count(*) from public.player_treasures pt where pt.treasure_id = t.id and pt.state in ('located', 'found', 'acquired')),
        'found', (select count(*) from public.player_treasures pt where pt.treasure_id = t.id and pt.state in ('found', 'acquired')),
        'acquired', (select count(*) from public.player_treasures pt where pt.treasure_id = t.id and pt.state = 'acquired')
      ) order by t.sort)
      from public.treasures t where t.active)
  );
end $$;

create or replace function public.staff_players(p_pin text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'player_no', p.player_no, 'nickname', p.nickname, 'status', p.status, 'created_at', p.created_at,
      'acquired', (select count(*) from public.player_treasures pt where pt.player_id = p.id and pt.state = 'acquired'),
      'redeemed', exists (select 1 from private.redemptions r where r.player_id = p.id)
    ) order by p.player_no desc)
    from public.players p), '[]'::jsonb);
end $$;

create or replace function public.staff_set_player_status(p_pin text, p_player_no int, p_status text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  update public.players set status = p_status where player_no = p_player_no;
end $$;

-- QR印刷用（トークンと6桁コード）
create or replace function public.staff_qr_codes(p_pin text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  return coalesce((
    select jsonb_agg(jsonb_build_object('treasure_id', s.treasure_id, 'token', s.token, 'short_code', s.short_code) order by t.sort)
    from private.treasure_secrets s join public.treasures t on t.id = s.treasure_id), '[]'::jsonb);
end $$;

-- QRを紛失したときの再発行（古いQRは無効になる）
create or replace function public.staff_reissue_qr(p_pin text, p_treasure text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  perform private.check_pin(p_pin);
  update private.treasure_secrets
     set token = encode(gen_random_bytes(8), 'hex'),
         short_code = lpad((floor(random() * 900000) + 100000)::int::text, 6, '0')
   where treasure_id = p_treasure;
end $$;

-- ---------- 実行権限 ----------

revoke execute on all functions in schema public from public, anon;
grant execute on function public.get_my_state() to anon, authenticated;
grant execute on function public.register_player(text) to authenticated;
grant execute on function public.submit_answer(text, text, text) to authenticated;
grant execute on function public.use_hint(text, text) to authenticated;
grant execute on function public.scan_treasure(text) to authenticated;
grant execute on function public.issue_certificate() to authenticated;
grant execute on function public.restore_player(text) to authenticated;
grant execute on function public.staff_login(text) to anon, authenticated;
grant execute on function public.staff_verify_certificate(text, text) to anon, authenticated;
grant execute on function public.staff_redeem(text, text) to anon, authenticated;
grant execute on function public.staff_redemptions(text) to anon, authenticated;
grant execute on function public.staff_undo_redemption(text, int) to anon, authenticated;
grant execute on function public.staff_dashboard(text) to anon, authenticated;
grant execute on function public.staff_players(text) to anon, authenticated;
grant execute on function public.staff_set_player_status(text, int, text) to anon, authenticated;
grant execute on function public.staff_qr_codes(text) to anon, authenticated;
grant execute on function public.staff_reissue_qr(text, text) to anon, authenticated;
