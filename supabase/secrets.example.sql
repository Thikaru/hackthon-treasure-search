-- 非公開データのひな形。値を書き換えてから SQL Editor で実行してください。
-- このファイルに本番の値を書いてコミットしないこと（公開リポジトリのため）。

insert into private.config(key, value) values ('staff_pin', '［運営PINを決めて入れる］')
on conflict (key) do update set value = excluded.value;

-- token：QRに入るランダム文字列（16桁の英数字など）／short_code：QR下に印字する6桁
-- locate_answers / acquire_answers：正解（複数可。ひらがな・カタカナ・全角半角の違いは自動で吸収）
insert into private.treasure_secrets(treasure_id, token, short_code, place_hint, locate_answers, acquire_answers) values
  ('t01', encode(gen_random_bytes(8), 'hex'), '［6桁］', '［場所のヒント］', array['［正解］'], array['［合言葉］'])
on conflict (treasure_id) do update set place_hint = excluded.place_hint,
  locate_answers = excluded.locate_answers, acquire_answers = excluded.acquire_answers;
