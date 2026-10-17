-- 公開してよい初期データ（エリア・お宝・問題文・ヒント・設定）
-- schema.sql の後に実行してください。何度実行しても内容が上書きされるだけです。

insert into public.settings(key, value) values
  ('title', '浜辺の宝さがし'),
  ('subtitle', '宝探し × 謎解き'),
  ('clear_count', '6'),
  ('prize_name', 'オリジナル記念品（仮）'),
  ('reception_place', 'パークセンター（受付）'),
  ('contact', ''),
  ('certificate_ttl_sec', '60')
on conflict (key) do update set value = excluded.value;

insert into public.areas(id, name, short_name, description, needs_car, sort) values
  ('sand',  '砂浜エリア', '砂浜',      '海水浴場の砂浜に5つのお宝', false, 1),
  ('spotA', '王子ヶ岳',   '王子ヶ岳',  '[王子ヶ岳の説明]',          false, 2),
  ('spotB', 'たまの湯',   'たまの湯',  '[たまの湯の説明]',          true,  3)
on conflict (id) do update set name = excluded.name, short_name = excluded.short_name,
  description = excluded.description, needs_car = excluded.needs_car, sort = excluded.sort;

insert into public.treasures(id, no, area_id, name, description, pin_x, pin_y, locate_question, locate_hints, acquire_question, acquire_hints, sort) values
  ('t01', '01', 'sand', '貝殻の羅針盤', '波に運ばれてきた、北を指し続ける不思議な貝殻。', 55, 248,
   '浜に並ぶボート。そのカバーは何色？（ひらがなで）', array['砂浜の写真を思い出してみよう。', '空と同じ系統の色。ひらがな2文字。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 1),
  ('t02', '02', 'sand', '流木の鍵', '長い旅をしてきた流木から生まれた、古い鍵。', 110, 273,
   '「すな」と「はま」。くっつけると、ここはどこ？（ひらがなで）', array['そのままつなげてみよう。', 'ひらがな4文字。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 2),
  ('t03', '03', 'sand', '潮騒の石碑', '耳をあてると波の音が聞こえる、小さな石碑。', 172, 302,
   '「なみ」を逆から読むと？（ひらがなで）', array['最後の文字から読んでみよう。', 'ひらがな2文字。「み」から始まる。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 3),
  ('t04', '04', 'sand', '星砂の小瓶', '夜になるとほんのり光る砂が詰まった小瓶。', 296, 359,
   '1週間は何日？（数字で）', array['月曜から日曜まで数えてみよう。', '1けたの数字。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 4),
  ('t05', '05', 'sand', '人魚のうろこ', '光の角度で七色に変わる、一枚のうろこ。', 344, 381,
   '「うみ」の反対の言葉は？（ひらがなで）', array['浜の後ろに広がっているもの。', 'ひらがな2文字。「や」から始まる。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 5),
  ('t06', '06', 'spotA', '灯台の古地図', '昔の船乗りが使っていた、端の破れた地図。', 130, 250,
   '朝・昼・夜。いちばん暗いのは？（ひらがなで）', array['星が見える時間。', 'ひらがな2文字。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 6),
  ('t07', '07', 'spotA', '空色のビー玉', 'のぞきこむと、晴れた日の空が映るビー玉。', 270, 300,
   '春・夏・秋・冬。2番目の季節は？（ひらがなで）', array['海水浴の季節。', 'ひらがな2文字。'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 7),
  ('t08', '08', 'spotB', '展望台の鈴', '風が吹くと、遠くの島まで届く音で鳴る鈴。', 210, 240,
   '1・1・2・3・5・8。次の数は？（数字で）', array['前の2つの数を足してみよう。', '5 + 8 = ?'],
   'ポールの札に書かれた「合言葉」を入力しよう。', array['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'], 8)
on conflict (id) do update set no = excluded.no, area_id = excluded.area_id, name = excluded.name,
  description = excluded.description, pin_x = excluded.pin_x, pin_y = excluded.pin_y,
  locate_question = excluded.locate_question, locate_hints = excluded.locate_hints,
  acquire_question = excluded.acquire_question, acquire_hints = excluded.acquire_hints, sort = excluded.sort;

-- 非公開データ（正解・QRトークン・運営PIN）は supabase/secrets.example.sql を参考に、
-- 値を自分で決めて SQL Editor から直接投入してください（リポジトリには入れない）。
