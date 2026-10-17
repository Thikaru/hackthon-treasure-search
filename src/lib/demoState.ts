// 開発時だけ使うデモデータ（npm run dev で開き、URL に ?demo=1 / ?demo=clear / ?demo=pins（宝を全部地図に出す）を付ける）。
// 本番の Supabase に試験用の参加者を作らずに、全画面の見た目を確かめるためのもの。
// 本番ビルドでは import.meta.env.DEV が false になり、読み込まれない。
import type { Area, Content, PlaceHint, Player, Treasure, TreasureProgress, TreasureState } from './game'

const AREAS: Area[] = [
  { id: 'sand', name: '砂浜エリア', short_name: '砂浜', description: '', needs_car: false, sort: 1 },
  { id: 'spotA', name: '王子ヶ岳', short_name: '王子ヶ岳', description: '', needs_car: false, sort: 2 },
  { id: 'spotB', name: 'たまの湯', short_name: 'たまの湯', description: '', needs_car: true, sort: 3 },
]

const T = (id: string, no: string, area_id: string, name: string, description: string, pin_x: number, pin_y: number, q: string): Treasure => ({
  id, no, area_id, name, description, pin_x, pin_y, sort: Number(no),
  locate_question: q,
  locate_hints: ['最後の文字から読んでみよう。', 'ひらがな2文字。'],
  acquire_question: 'ポールの札に書かれた「合言葉」を入力しよう。',
  acquire_hints: ['お宝のポールに付いている札をよく見てみよう。', '合言葉はひらがなで入力してOK。'],
})

const TREASURES: Treasure[] = [
  T('t01', '01', 'sand', '貝殻の羅針盤', '波に運ばれてきた、北を指し続ける不思議な貝殻。', 55, 248, '浜に並ぶボート。そのカバーは何色？（ひらがなで）'),
  T('t02', '02', 'sand', '流木の鍵', '長い旅をしてきた流木から生まれた、古い鍵。', 110, 273, '「すな」と「はま」。くっつけると、ここはどこ？'),
  T('t03', '03', 'sand', '潮騒の石碑', '耳をあてると波の音が聞こえる、小さな石碑。', 172, 302, '「なみ」を逆から読むと？'),
  T('t04', '04', 'sand', '星砂の小瓶', '夜になるとほんのり光る砂が詰まった小瓶。', 296, 359, '1週間は何日？（数字で）'),
  T('t05', '05', 'sand', '人魚のうろこ', '光の角度で七色に変わる、一枚のうろこ。', 344, 381, '「うみ」の反対の言葉は？'),
  T('t06', '06', 'spotA', '灯台の古地図', '昔の船乗りが使っていた、端の破れた地図。', 130, 250, '朝・昼・夜。いちばん暗いのは？'),
  T('t07', '07', 'spotA', '空色のビー玉', 'のぞきこむと、晴れた日の空が映るビー玉。', 270, 300, '春・夏・秋・冬。2番目の季節は？'),
  T('t08', '08', 'spotB', '展望台の鈴', '風が吹くと、遠くの島まで届く音で鳴る鈴。', 210, 240, '1・1・2・3・5・8。次の数は？'),
]

export const demoContent: Content = {
  areas: AREAS,
  treasures: TREASURES,
  settings: { guidepostMode: 'all', title: '渋川からの挑戦状', subtitle: '宝探し × 謎解き', clearCount: 6, prizeName: 'オリジナル記念品（仮）', receptionPlace: 'パークセンター（受付）', contact: '' },
}

export const demoPlayer: Player = { player_no: 128, nickname: 'うみねこ', transfer_code: 'DEMO-12345', status: 'active', created_at: new Date().toISOString() }

export function demoProgress(kind: string): Record<string, TreasureProgress> {
  const states: Record<string, TreasureState> =
    kind === 'pins'
      ? { t01: 'acquired', t02: 'found', t03: 'found', t04: 'acquired', t05: 'found', t06: 'acquired', t07: 'found', t08: 'found' }
      : kind === 'clear'
      ? { t01: 'acquired', t02: 'acquired', t03: 'acquired', t04: 'acquired', t05: 'acquired', t06: 'acquired', t07: 'found' }
      : { t01: 'acquired', t02: 'found', t03: 'locked', t04: 'located', t05: 'acquired', t06: 'acquired', t07: 'found' }
  return Object.fromEntries(
    Object.entries(states).map(([id, state]) => [id, { treasure_id: id, state, locate_hints: id === 't03' ? 1 : 0, acquire_hints: 0 } as TreasureProgress]),
  )
}

export const demoHints: Record<string, PlaceHint> = {
  t04: { text: '海の家のとなり、白いベンチの後ろに立っているポールを探そう。', image_url: null },
}
