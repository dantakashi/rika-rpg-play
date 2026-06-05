// ============================================================
// data.js  –  GameData: 全データベース定数
// 問題・ボス・ガチャ・装備・レアリティ定義
// ============================================================
//
// 【目次】（エラー調査時はここを見て該当セクションへ飛ぶ）
//  §1  DIFFICULTIES / GENRES  難易度4段階・ジャンル定義
//  §2  QUESTION_DB  全問題（化学式・反応式・イオン・実験操作）※2軸タグ付きフラット配列
//  §3  ULTIMATE_QUIZZES  ボス必殺技用 長文クイズ
//  §4  getQuestions  絞り込み関数（図書館・道場・ボスが共通で使う）
//  §5  BOSSES_DB ボス定義（初級～超級）
//  §6  GACHA_DB ガチャテーブル（通常5種＋UR専用chaos）
//  §7  RARITY_DB レアリティ定義（C〜UR・ボーナス枠設定）
//  §8  STAT_META 全17ステータス定義＋rollBonusStats（ボーナス枠抽選）
//  §9  EQUIPMENT_TEMPLATES 装備テンプレート（通常＋UR専用ユニーク）
//  §10 SKILL_DESC / BUILD_GUIDE スキル解説・ビルドガイド
//  §11 STAT_CAPS / コスト関数 / fmtChem
//  §12 公開API return {}
//
// ◆ 問題データの考え方（2軸モデル）◆
//   各問題は「ジャンル(genre)」と「難易度(diff)」の2つのタグを持つ。
//   ・genre : 'formula'(化学式) / 'reaction'(反応式) / 'ion'(イオン) / 'experiment'(実験操作)
//   ・diff  : 'junior'(基礎) / 'mid'(応用) / 'senior'(発展) / 'supreme'(受験)
//             ※内部キーは旧来の junior/mid/senior/supreme を流用（道場・ボス・セーブと共通）。
//               画面上の表示ラベルは DIFFICULTIES から「基礎/応用/発展/受験」を引く。
//   ・type  : 'typing'(タイピング) / 'choice'(選択式：c=選択肢, a=正解index)
//   将来は genre を増やすだけで物理・生物など他分野へ拡張できる（→ 理科RPG化）。
//
const GameData = (function() {

    // ==========================================
    //   §1  DIFFICULTIES / GENRES
    // ==========================================
    // 難易度4段階（内部キーは旧来のものを維持。label が新しい呼び名）
    //  boss = この難易度を解禁するために倒すボスの帯（getDojoUnlockStatus と対応）
    // 難易度ラベル刷新（2026-06-05・ユーザー方針）: 全体を1段やさしい呼び名に。中1が「入門」から気軽に入れる。
    const DIFFICULTIES = [
      { key: 'junior',  label: '入門', color: 'bg-cyan-700',   boss: '初級' },
      { key: 'mid',     label: '基礎', color: 'bg-orange-700', boss: '中級' },
      { key: 'senior',  label: '応用', color: 'bg-purple-700', boss: '上級' },
      { key: 'supreme', label: '受験・定期試験', color: 'bg-rose-700',   boss: '超級' }
    ];

    // 教科（subject）= ジャンルの上位の束ね。理科RPG化の最上位軸。
    //  問題は subject を持つ（旧来の化学問題は subject 無し → 'chemistry' とみなす。getQuestions で正規化）。
    const SUBJECTS = [
      { key: 'chemistry', label: '化学', icon: '⚗️', color: 'bg-teal-700' },
      { key: 'physics',   label: '物理', icon: '🔧', color: 'bg-indigo-700' },
      { key: 'biology',   label: '生物', icon: '🌱', color: 'bg-green-700' },
      { key: 'earth',     label: '地学', icon: '🌏', color: 'bg-amber-700' }
    ];

    // ジャンル定義（subject = 所属教科, diffs = そのジャンルが持つ難易度の範囲）
    const GENRES = [
      // 化学
      { key: 'matter',      subject: 'chemistry', label: '物質のすがた', icon: '🧊', diffs: ['junior', 'mid'] },
      { key: 'formula',     subject: 'chemistry', label: '化学式',   icon: '⚗️', diffs: ['junior', 'mid'] },
      { key: 'reaction',    subject: 'chemistry', label: '反応式',   icon: '🔥', diffs: ['junior', 'mid', 'senior', 'supreme'] },
      { key: 'ion',         subject: 'chemistry', label: 'イオン',   icon: '⚡', diffs: ['junior', 'mid'] },
      { key: 'experiment',  subject: 'chemistry', label: '実験操作', icon: '🧪', diffs: ['junior', 'mid'] },
      // 物理（選択式＋計算タイピング。plain:true の問題は化学式整形を切る）
      { key: 'light_sound', subject: 'physics',   label: '光・音',         icon: '🔦', diffs: ['junior', 'mid'] },
      { key: 'force',       subject: 'physics',   label: '力・圧力',       icon: '🏋️', diffs: ['junior', 'mid'] },
      { key: 'electricity', subject: 'physics',   label: '電流・磁界',     icon: '⚡', diffs: ['junior', 'mid', 'senior', 'supreme'] },
      { key: 'motion',      subject: 'physics',   label: '運動・エネルギー', icon: '🏃', diffs: ['mid', 'senior', 'supreme'] },
      // 生物（選択式中心）
      { key: 'bio_plant',   subject: 'biology',   label: '植物',           icon: '🌿', diffs: ['junior', 'mid', 'senior'] },
      { key: 'bio_human',   subject: 'biology',   label: '動物・人体',     icon: '🫀', diffs: ['junior', 'mid', 'senior'] },
      { key: 'bio_cell',    subject: 'biology',   label: '細胞・生殖・遺伝', icon: '🧬', diffs: ['mid', 'senior'] },
      { key: 'bio_eco',     subject: 'biology',   label: '生態系・分類',   icon: '🐾', diffs: ['junior', 'mid'] },
      // 地学（選択式中心）
      { key: 'earth_land',  subject: 'earth',     label: '大地（火山・地震・地層）', icon: '🌋', diffs: ['junior', 'mid', 'senior'] },
      { key: 'earth_weather', subject: 'earth',   label: '天気',           icon: '☁️', diffs: ['junior', 'mid', 'senior'] },
      { key: 'earth_space', subject: 'earth',     label: '地球と宇宙（天体）', icon: '🪐', diffs: ['mid', 'senior'] }
    ];

    // ジャンル×難易度ごとの「学年」（1=中1, 2=中2, 3=中3）。指導要領に準拠した代表値。
    //  同じジャンルでも難易度が上がると上の学年内容になる（例: 反応式 基礎=中2 → 受験=中3）。
    //  ※先生が調整しやすいよう一覧化。存在しない難易度は省略（getQuestions が空を返す）。
    const GENRE_GRADES = {
      matter:       { junior:1, mid:1 },
      formula:      { junior:2, mid:2 },
      reaction:     { junior:2, mid:2, senior:3, supreme:3 },
      ion:          { junior:3, mid:3 },
      experiment:   { junior:1, mid:1 },
      light_sound:  { junior:1, mid:1 },
      force:        { junior:1, mid:1 },
      electricity:  { junior:2, mid:2, senior:3, supreme:3 },
      motion:       { mid:3, senior:3, supreme:3 },
      bio_plant:    { junior:1, mid:1, senior:2 },
      bio_human:    { junior:2, mid:2, senior:2 },
      bio_cell:     { mid:2, senior:3 },
      bio_eco:      { junior:1, mid:3 },
      earth_land:   { junior:1, mid:1, senior:2 },
      earth_weather:{ junior:2, mid:2, senior:2 },
      earth_space:  { mid:3, senior:3 }
    };

    // 範囲選択画面に出す「具体例」（表示ヒント・各3個まで）。先生が差し替え可。
    const GENRE_EXAMPLES = {
      matter:       ['状態変化', '水溶液の濃度', '密度'],
      formula:      ['H₂O 水', 'CO₂ 二酸化炭素', '酸化銀'],
      reaction:     ['水の電気分解', '銅の酸化', '中和反応'],
      ion:          ['水素イオン H⁺', 'ナトリウムイオン'],
      experiment:   ['ガスバーナー', '気体の集め方'],
      light_sound:  ['凸レンズ', '音の速さ', '反射'],
      force:        ['浮力', '圧力', 'ばねの力'],
      electricity:  ['オームの法則', '電力', '電磁誘導'],
      motion:       ['速さ', '仕事', '力学的エネルギー'],
      bio_plant:    ['光合成', '蒸散', '道管と師管'],
      bio_human:    ['消化', '血液の循環', '刺激と反応'],
      bio_cell:     ['細胞分裂', '遺伝の規則性', 'DNA'],
      bio_eco:      ['食物連鎖', '分解者', '動物の分類'],
      earth_land:   ['火山', '地震 P波S波', '地層'],
      earth_weather:['前線', '湿度', '気圧'],
      earth_space:  ['太陽の動き', '月の満ち欠け', '季節']
    };

    // 学年番号→ラベル。diffs(配列)を渡すと、そのジャンルで該当する学年の範囲を「中2」or「中2〜中3」で返す。
    function gradeNumToLabel(n) { return n ? ('中' + n) : ''; }
    function getGenreGradeRange(genre, diffs) {
      const g = GENRE_GRADES[genre]; if (!g) return '';
      const keys = (diffs && diffs.length) ? diffs : Object.keys(g);
      const nums = keys.map(d => g[d]).filter(n => n);
      if (!nums.length) return '';
      const lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
      return lo === hi ? gradeNumToLabel(lo) : (gradeNumToLabel(lo) + '〜' + gradeNumToLabel(hi));
    }
    // そのジャンル×難易度集合での「上の学年」（またぐ時は上に合わせる＝色・判定の基準）。
    function getGenreGradeMax(genre, diffs) {
      const g = GENRE_GRADES[genre]; if (!g) return 0;
      const keys = (diffs && diffs.length) ? diffs : Object.keys(g);
      const nums = keys.map(d => g[d]).filter(n => n);
      return nums.length ? Math.max.apply(null, nums) : 0;
    }

    // 学年カラー（学校固有・日付連動）。緑→黄→赤 の3年サイクルが進級に追従し、毎年4/1に切替。
    //  今年度(2026年度): 中1=緑/中2=黄/中3=赤。 来年度(2027〜): 中1=赤/中2=緑/中3=黄 … と巡回。
    const GRADE_COLOR_CYCLE = ['green', 'yellow', 'red']; // index0=緑,1=黄,2=赤
    const GRADE_COLOR_STYLE = {
      green:  { badge: 'bg-green-700',  text: 'text-green-300',  ring: 'ring-green-400',  label: '緑' },
      yellow: { badge: 'bg-yellow-600', text: 'text-yellow-300', ring: 'ring-yellow-400', label: '黄' },
      red:    { badge: 'bg-red-700',    text: 'text-red-300',    ring: 'ring-red-400',    label: '赤' }
    };
    // 年度（4/1始まり）。2026年度を基準アンカーにする。
    function _schoolYear(d) { return (d.getMonth() + 1) >= 4 ? d.getFullYear() : d.getFullYear() - 1; }
    function getGradeColorKey(gradeNum) {
      if (!gradeNum) return 'green';
      const sy = _schoolYear(new Date());
      const idx = (((gradeNum - 1) - (sy - 2026)) % 3 + 3) % 3;
      return GRADE_COLOR_CYCLE[idx];
    }
    // 学年バッジのCSSクラス（背景色＋白文字）。またぐ時の上学年を渡す。
    function getGradeBadgeClass(gradeNum) {
      const s = GRADE_COLOR_STYLE[getGradeColorKey(gradeNum)] || GRADE_COLOR_STYLE.green;
      return s.badge + ' text-white';
    }

    // ==========================================
    //   §2  QUESTION_DB  全問題（2軸タグ付きフラット配列）
    // ==========================================
    const QUESTION_DB = [

      // ───────── 化学式 formula：基礎（junior）＝単体・簡単な分子 ─────────
      { genre: 'formula', diff: 'junior', type: 'typing', name: '水素分子',        formula: 'H2',  desc: '水素原子2個でできた、最も軽い無色の気体。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '酸素分子',        formula: 'O2',  desc: '酸素原子2個でできた気体。ものを燃やすはたらきがある。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '窒素分子',        formula: 'N2',  desc: '空気の約8割をしめる気体。窒素原子2個でできる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'ヘリウム',        formula: 'He',  desc: '原子1個で安定している気体（単原子分子）。風船に使われることがあり、空気より軽い。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '塩素分子',        formula: 'Cl2', desc: '黄緑色で刺激臭のある有毒な気体。塩素原子2個。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '水分子',          formula: 'H2O', desc: '水素2・酸素1からできる。すべての生物に不可欠。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '二酸化炭素分子',  formula: 'CO2', desc: '炭素1・酸素2。石灰水を白くにごらせる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'アンモニア分子',  formula: 'NH3', desc: '窒素1・水素3。刺激臭がありアルカリ性を示す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'メタン分子',      formula: 'CH4', desc: '炭素1・水素4からなる気体。天然ガスの主成分で、燃えると二酸化炭素と水になる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '炭素',            formula: 'C',   desc: '元素記号で表す単体。黒鉛やダイヤモンドは、どちらも炭素だけでできている。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '硫黄',            formula: 'S',   desc: '黄色い固体の単体。鉄と化合すると硫化鉄、燃えると二酸化硫黄になる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '銅',              formula: 'Cu',  desc: '赤色の金属。電気や熱をよく通し、10円玉や電線に使われる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '鉄',              formula: 'Fe',  desc: '磁石につく代表的な金属。硫黄と化合すると、鉄とは性質の違う硫化鉄になる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'マグネシウム',    formula: 'Mg',  desc: '銀白色の軽い金属。燃えると強い光を出す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '亜鉛',            formula: 'Zn',  desc: '青みがかった金属。塩酸と反応して水素を出す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '銀',              formula: 'Ag',  desc: '白くかがやく金属。電気伝導性が最も高い。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '金',              formula: 'Au',  desc: 'さびにくく加工しやすい貴金属。イオンになりにくく、化学変化を受けにくい。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'アルミニウム',    formula: 'Al',  desc: '軽くてさびにくい金属。1円玉の材料。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'バリウム',        formula: 'Ba',  desc: 'アルカリ土類金属の一つ。硫酸イオンと結びつくと、水に溶けにくい硫酸バリウムになる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '水銀',            formula: 'Hg',  desc: '常温で液体の金属。毒性があるため、実験や廃棄では特に注意が必要。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'カルシウム',      formula: 'Ca',  desc: '骨や歯、石灰石にふくまれる銀白色の金属。水に入れると水素を出す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'カリウム',        formula: 'K',   desc: 'やわらかい銀白色の金属。水と激しく反応するため灯油中に保存する。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'ケイ素',          formula: 'Si',  desc: '岩石や砂の成分に多くふくまれる元素。半導体の材料としても使われる。' },

      // ───────── 化学式 formula：応用（mid）＝化合物 ─────────
      { genre: 'formula', diff: 'mid', type: 'typing', name: '酸化銀',            formula: 'Ag2O',  desc: '銀と酸素の化合物。加熱すると銀と酸素に分解する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '炭酸カルシウム',    formula: 'CaCO3', desc: '石灰石や貝がら・卵のからの主成分。塩酸を加えると二酸化炭素が発生する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '酸化マグネシウム',  formula: 'MgO',   desc: 'マグネシウムが強い光を出して燃え、酸素と結びついてできる白い物質。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '酸化銅',            formula: 'CuO',   desc: '銅が酸素と結びついてできる黒い物質。水素や炭素で還元すると銅にもどる。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '塩化銅',            formula: 'CuCl2', desc: '水に溶けると青色を示す。電気分解で銅と塩素に分かれる。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫化鉄',            formula: 'FeS',   desc: '鉄と硫黄が結びついた黒い物質。磁石につかない。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '塩化ナトリウム',    formula: 'NaCl',  desc: '食塩の成分。ナトリウムと塩素の化合物。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '塩化水素(塩酸)',    formula: 'HCl',   desc: '水に溶けると塩酸になる気体。水中ではH+とCl-に電離して酸性を示す。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '水酸化ナトリウム',  formula: 'NaOH',  desc: '強いアルカリ性を示す白い固体。空気中の水分を吸う（潮解）性質がある。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '炭酸ナトリウム',    formula: 'Na2CO3', desc: '炭酸水素ナトリウムを加熱すると、水と二酸化炭素を出してできる白い物質。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '炭酸水素ナトリウム', formula: 'NaHCO3', desc: '重そうの主成分。加熱すると炭酸ナトリウム・水・二酸化炭素に分解する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫化水素',          formula: 'H2S',   desc: '卵がくさったようなにおい（腐卵臭）の有毒な気体。火山ガスや温泉にふくまれる。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫酸',              formula: 'H2SO4', desc: '強い酸性を示す。水に溶けて電離する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫酸バリウム',      formula: 'BaSO4', desc: '水に溶けにくい白い固体。硫酸イオンとバリウムイオンが出会うと沈殿する。' },

      // ───────── 反応式 reaction：基礎（junior）＝基本の化合・酸化・燃焼 ─────────
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '水の電気分解', formula: 'O2',  display: '2H2O → 2H2 + [ ? ]', desc: '水に電流を流すと水素と酸素に分解する。陽極では酸素が発生し、体積は水素の半分になる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '水の電気分解', formula: 'H2O', display: '2[ ? ] → 2H2 + O2', desc: '反応の前後で原子の種類と数は変わらないため、水分子2個から水素2個と酸素1個ができる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '水の電気分解', formula: 'H2',  display: '2H2O → 2[ ? ] + O2', desc: '陰極では水素が発生する。水素と酸素の体積比は2:1になる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '銅の酸化反応', formula: 'CuO', display: '2Cu + O2 → 2[ ? ]', desc: '銅を加熱すると空気中の酸素と結びつき、黒色の酸化銅になる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '銅の酸化反応', formula: 'Cu',  display: '2[ ? ] + O2 → 2CuO', desc: '銅原子2個と酸素分子1個から酸化銅2個ができる。酸素が加わるので質量は増える。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: 'マグネシウムの燃焼', formula: 'MgO', display: '2Mg + O2 → 2[ ? ]', desc: 'マグネシウムは燃えると酸素と結びつき、白色の酸化マグネシウムになる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: 'マグネシウムの燃焼', formula: 'Mg',  display: '2[ ? ] + O2 → 2MgO', desc: '強い光を出す燃焼反応。反応前後でMg原子とO原子の数がそろうように係数2をつける。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '木炭(炭素)の燃焼', formula: 'CO2', display: 'C + O2 → [ ? ]', desc: '炭素が十分な酸素中で完全燃焼すると、二酸化炭素ができる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '木炭(炭素)の燃焼', formula: 'C',   display: '[ ? ] + O2 → CO2', desc: '燃焼は酸素と結びつく酸化の一種。炭素原子1個が二酸化炭素1個に入る。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '鉄と硫黄の化合', formula: 'FeS', display: 'Fe + S → [ ? ]', desc: '鉄と硫黄を加熱すると化合し、もとの鉄とは性質が違う硫化鉄になる。' },
      { genre: 'reaction', diff: 'junior', type: 'typing', name: '鉄と硫黄の化合', formula: 'Fe',  display: '[ ? ] + S → FeS', desc: '化合すると新しい物質ができる。硫化鉄は鉄のようには磁石につきにくい。' },

      // ───────── 反応式 reaction：応用（mid）＝分解・還元・沈殿 ─────────
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '炭酸水素ナトリウムの分解', formula: 'Na2CO3', display: '2NaHCO3 → [ ? ] + H2O + CO2', desc: '加熱すると炭酸ナトリウム・水・二酸化炭素に分かれる。重そうの熱分解としてよく出る反応。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '炭酸水素ナトリウムの分解', formula: 'NaHCO3', display: '2[ ? ] → Na2CO3 + H2O + CO2', desc: '1種類の物質が複数の物質に分かれる分解反応。係数2でNaやHの数をそろえる。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '炭酸水素ナトリウムの分解', formula: 'CO2', display: '2NaHCO3 → Na2CO3 + H2O + [ ? ]', desc: '発生する気体は二酸化炭素。石灰水を白くにごらせる性質で確かめられる。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '酸化銀の熱分解', formula: 'Ag2O', display: '2[ ? ] → 4Ag + O2', desc: '酸化銀を加熱すると、銀と酸素に分解する。反応後に残る金属は銀。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '酸化銀の熱分解', formula: 'Ag',  display: '2Ag2O → 4[ ? ] + O2', desc: '分解後に残る白っぽい金属が銀。酸素は火のついた線香を激しく燃やす。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '銅の還元反応', formula: 'Cu',  display: '2CuO + C → 2[ ? ] + CO2', desc: '炭素が酸化銅から酸素をうばうため、酸化銅は赤色の銅に還元される。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '銅の還元反応', formula: 'CuO', display: '2[ ? ] + C → 2Cu + CO2', desc: '酸化銅は酸素を失って銅になる。酸素を失う変化を還元という。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '銅の還元反応', formula: 'CO2', display: '2CuO + C → 2Cu + [ ? ]', desc: '還元と同時に、炭素は酸素と結びついて二酸化炭素になる。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '硫酸と塩化バリウムの反応', formula: 'BaSO4', display: 'H2SO4 + BaCl2 → 2HCl + [ ? ]', desc: 'Ba2+とSO42-が結びつき、水に溶けにくい白色沈殿の硫酸バリウムができる。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '硫酸と塩化バリウムの反応', formula: 'H2SO4', display: '[ ? ] + BaCl2 → 2HCl + BaSO4', desc: '水溶液中のイオンが組み替わり、沈殿ができる反応。硫酸イオンが目印になる。' },
      { genre: 'reaction', diff: 'mid', type: 'typing', name: '硫酸と塩化バリウムの反応', formula: 'HCl', display: 'H2SO4 + BaCl2 → 2[ ? ] + BaSO4', desc: 'BaSO4の沈殿のほかに塩酸が生じる。Cl原子が2個あるのでHClは2個になる。' },

      // ───────── 反応式 reaction：発展（senior）＝電気分解・中和 ─────────
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '塩化銅水溶液の電気分解', formula: 'CuCl2', display: '[ ? ] → Cu + Cl2', desc: '電流で銅（陰極）と塩素（陽極）に分かれる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '塩化銅水溶液の電気分解', formula: 'Cl2', display: 'CuCl2 → Cu + [ ? ]', desc: '陽極から発生する刺激臭の気体は塩素。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '塩酸の電気分解', formula: 'HCl', display: '2[ ? ] → H2 + Cl2', desc: '塩酸を電気分解すると水素と塩素ができる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '塩酸の電気分解', formula: 'H2', display: '2HCl → [ ? ] + Cl2', desc: '陰極から水素が発生する。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '塩酸と水酸化ナトリウムの中和', formula: 'NaCl', display: 'HCl + NaOH → [ ? ] + H2O', desc: '酸とアルカリが中和して塩（塩化ナトリウム）と水ができる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '塩酸と水酸化ナトリウムの中和', formula: 'HCl', display: '[ ? ] + NaOH → NaCl + H2O', desc: 'H⁺とOH⁻が結びついて水ができる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '炭酸カルシウムと塩酸の反応', formula: 'CO2', display: 'CaCO3 + 2HCl → CaCl2 + H2O + [ ? ]', desc: '石灰石に塩酸を加えると二酸化炭素が発生。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '炭酸カルシウムと塩酸の反応', formula: 'HCl', display: 'CaCO3 + 2[ ? ] → CaCl2 + H2O + CO2', desc: '炭酸カルシウム1に対し塩酸2で反応する。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '亜鉛と塩酸の反応', formula: 'H2', display: 'Zn + 2HCl → ZnCl2 + [ ? ]', desc: '亜鉛などの金属は酸と反応して水素を発生する。係数2で塩素と水素の数をそろえる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '亜鉛と塩酸の反応', formula: 'ZnCl2', display: 'Zn + 2HCl → [ ? ] + H2', desc: '亜鉛は塩酸中で亜鉛イオンになり、塩化物イオンと塩化亜鉛をつくる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: 'マグネシウムと塩酸の反応', formula: 'MgCl2', display: 'Mg + 2HCl → [ ? ] + H2', desc: 'マグネシウムが塩酸と反応すると塩化マグネシウムと水素ができる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: 'アンモニアと塩化水素の反応', formula: 'NH4Cl', display: 'NH3 + HCl → [ ? ]', desc: 'アンモニアと塩化水素が反応すると、白い固体の塩化アンモニウムができる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '硫酸と水酸化ナトリウムの中和', formula: 'Na2SO4', display: 'H2SO4 + 2NaOH → [ ? ] + 2H2O', desc: '硫酸のH+は2個あるため、水酸化ナトリウム2個と中和して硫酸ナトリウムと水をつくる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '硫酸と水酸化ナトリウムの中和', formula: 'NaOH', display: 'H2SO4 + 2[ ? ] → Na2SO4 + 2H2O', desc: '酸のH+とアルカリのOH-が1対1で水になるので、硫酸1に対して水酸化ナトリウム2が必要。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '二酸化炭素と石灰水の反応', formula: 'CaCO3', display: 'CO2 + Ca(OH)2 → [ ? ] + H2O', desc: '二酸化炭素を石灰水に通すと、水に溶けにくい炭酸カルシウムができて白くにごる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '二酸化炭素と石灰水の反応', formula: 'H2O', display: 'CO2 + Ca(OH)2 → CaCO3 + [ ? ]', desc: '石灰水の白いにごりはCaCO3。残ったHとOは水としてそろえる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '炭酸ナトリウムと塩酸の反応', formula: 'NaCl', display: 'Na2CO3 + 2HCl → 2[ ? ] + H2O + CO2', desc: '炭酸塩に酸を加えると二酸化炭素が発生する。Naが2個あるのでNaClも2個できる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '過酸化水素水の分解', formula: 'O2', display: '2H2O2 → 2H2O + [ ? ]', desc: '二酸化マンガンを加えると過酸化水素が分解し、酸素が発生する。触媒は反応式には入れない。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '鉄と硫酸銅水溶液の反応', formula: 'Cu', display: 'Fe + CuSO4 → FeSO4 + [ ? ]', desc: '鉄の方が銅より陽イオンになりやすいため、銅イオンから銅の単体が出てくる。' },
      { genre: 'reaction', diff: 'senior', type: 'typing', name: '水酸化カルシウムと塩酸の中和', formula: 'CaCl2', display: 'Ca(OH)2 + 2HCl → [ ? ] + 2H2O', desc: '水酸化カルシウムはOHを2個もつので、塩酸2個と中和して塩化カルシウムと水をつくる。' },

      // ───────── 反応式 reaction：受験（supreme）＝難関の反応式 ─────────
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '硫酸と水酸化バリウムの中和', formula: 'BaSO4', display: 'H2SO4 + Ba(OH)2 → [ ? ] + 2H2O', desc: '中和で水と硫酸バリウムの沈殿が同時にできる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '硫酸と水酸化バリウムの中和', formula: 'H2O', display: 'H2SO4 + Ba(OH)2 → BaSO4 + 2[ ? ]', desc: 'H⁺とOH⁻から水が生じる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'メタンの燃焼', formula: 'H2O', display: 'CH4 + 2O2 → CO2 + 2[ ? ]', desc: 'メタンが完全燃焼すると二酸化炭素と水ができる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'エタノールの燃焼', formula: 'CO2', display: 'C2H5OH + 3O2 → 2[ ? ] + 3H2O', desc: '有機物の燃焼では二酸化炭素と水が生じる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '希硫酸と亜鉛の反応', formula: 'H2', display: 'Zn + H2SO4 → ZnSO4 + [ ? ]', desc: '金属の亜鉛が酸と反応して水素を発生する。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '希硫酸と亜鉛の反応', formula: 'ZnSO4', display: 'Zn + H2SO4 → [ ? ] + H2', desc: '亜鉛が希硫酸に溶けてできる物質。このとき水素が発生する。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'プロパンの燃焼', formula: 'CO2', display: 'C3H8 + 5O2 → 3[ ? ] + 4H2O', desc: 'プロパンが完全燃焼すると二酸化炭素と水ができる。Cが3個なのでCO2は3個になる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'プロパンの燃焼', formula: 'O2', display: 'C3H8 + 5[ ? ] → 3CO2 + 4H2O', desc: '右辺の酸素原子は合計10個なので、左辺の酸素分子は5個必要になる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '酢酸と水酸化ナトリウムの中和', formula: 'CH3COONa', display: 'CH3COOH + NaOH → [ ? ] + H2O', desc: '酢酸は弱い酸だが、水酸化ナトリウムと中和して酢酸ナトリウムと水をつくる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '硝酸銀と塩化ナトリウムの反応', formula: 'AgCl', display: 'AgNO3 + NaCl → [ ? ] + NaNO3', desc: '銀イオンと塩化物イオンが結びつき、水に溶けにくい白色沈殿の塩化銀ができる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '硫酸銅水溶液と水酸化ナトリウムの反応', formula: 'Cu(OH)2', display: 'CuSO4 + 2NaOH → [ ? ] + Na2SO4', desc: '銅イオンと水酸化物イオンが結びつくと、青白い沈殿の水酸化銅ができる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '酸化鉄の炭素による還元', formula: 'Fe', display: '2Fe2O3 + 3C → 4[ ? ] + 3CO2', desc: '酸化鉄から酸素が取り除かれて鉄になる。炭素は酸素と結びつき二酸化炭素になる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'ブタンの燃焼', formula: 'O2', display: '2C4H10 + 13[ ? ] → 8CO2 + 10H2O', desc: 'ブタンの完全燃焼ではCO2とH2Oができる。右辺の酸素原子26個に合わせ、O2は13個必要。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'ブタンの燃焼', formula: 'H2O', display: '2C4H10 + 13O2 → 8CO2 + 10[ ? ]', desc: '水素原子は左辺で20個あるため、水分子は10個になる。炭素と水素を先にそろえると考えやすい。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: 'グルコースの燃焼', formula: 'CO2', display: 'C6H12O6 + 6O2 → 6[ ? ] + 6H2O', desc: 'グルコースが完全燃焼すると二酸化炭素と水になる。炭素原子が6個なのでCO2も6個。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '炭酸ナトリウムと塩化カルシウムの反応', formula: 'CaCO3', display: 'Na2CO3 + CaCl2 → [ ? ] + 2NaCl', desc: 'Ca2+とCO32-が結びつき、水に溶けにくい炭酸カルシウムの白色沈殿ができる。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '酸化銅の水素による還元', formula: 'H2O', display: 'CuO + H2 → Cu + [ ? ]', desc: '水素が酸化銅から酸素をうばい、水になる。酸化銅は酸素を失って銅に還元される。' },
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '硫化鉄と塩酸の反応', formula: 'H2S', display: 'FeS + 2HCl → FeCl2 + [ ? ]', desc: '硫化鉄に塩酸を加えると硫化水素が発生する。係数2で塩素と水素の数をそろえる。' },

      // ───────── イオン ion：基礎（junior）＝主要な単原子イオン ─────────
      { genre: 'ion', diff: 'junior', type: 'typing', name: '水素イオン',      formula: 'H+',  desc: '水素原子が電子を1個失った陽イオン。酸性の正体。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: 'ナトリウムイオン', formula: 'Na+', desc: 'ナトリウム原子が電子1個を失った陽イオン。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: 'カリウムイオン',   formula: 'K+',  desc: 'カリウム原子が電子1個を失った陽イオン。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: 'カルシウムイオン', formula: 'Ca2+', desc: 'カルシウム原子が電子2個を失った陽イオン。塩化カルシウムなどにふくまれる。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: 'マグネシウムイオン', formula: 'Mg2+', desc: 'マグネシウム原子が電子2個を失った陽イオン。金属原子は電子を失って陽イオンになりやすい。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: '亜鉛イオン',       formula: 'Zn2+', desc: '亜鉛原子が電子2個を失った陽イオン。酸と反応すると水溶液中でZn2+になる。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: '銅イオン',         formula: 'Cu2+', desc: '水溶液中で青色を示す陽イオン。塩化銅や硫酸銅の水溶液で見られる。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: 'バリウムイオン',   formula: 'Ba2+', desc: 'バリウム原子が電子2個を失った陽イオン。硫酸イオンと結びつくと白色沈殿をつくる。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: '塩化物イオン',     formula: 'Cl-', desc: '塩素原子が電子1個を受け取った陰イオン。塩酸や塩化ナトリウムの水溶液にふくまれる。' },
      { genre: 'ion', diff: 'junior', type: 'typing', name: '水酸化物イオン',   formula: 'OH-', desc: 'アルカリ性の正体となる陰イオン。H+と結びつくと水H2Oになる。' },

      // ───────── イオン ion：応用（mid）＝多原子イオン・イオン化傾向 ─────────
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'アンモニウムイオン', formula: 'NH4+',  desc: '多原子イオン。全体で+1の電荷をもつ。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '硝酸イオン',         formula: 'NO3-',  desc: '多原子イオン。全体で-1の電荷をもち、硝酸塩の中にふくまれる。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '硫酸イオン',         formula: 'SO42-', desc: '多原子イオン。全体で-2の電荷をもち、Ba2+と結びつくと白い沈殿をつくる。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '炭酸イオン',         formula: 'CO32-', desc: '多原子イオン。酸と反応すると二酸化炭素を発生しやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '塩酸の電離', formula: 'H+', display: 'HCl → [ ? ] + Cl-', desc: '塩化水素が水に溶けると、水素イオンと塩化物イオンに分かれて酸性を示す。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '水酸化ナトリウムの電離', formula: 'OH-', display: 'NaOH → Na+ + [ ? ]', desc: '水酸化ナトリウムは水中でナトリウムイオンと水酸化物イオンに分かれ、アルカリ性を示す。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '硫酸の電離', formula: 'SO42-', display: 'H2SO4 → 2H+ + [ ? ]', desc: '硫酸は水中で2個の水素イオンと1個の硫酸イオンに分かれる。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '塩化銅の電離', formula: 'Cu2+', display: 'CuCl2 → [ ? ] + 2Cl-', desc: '塩化銅は水中で銅イオンと塩化物イオンに分かれる。銅イオンは水溶液を青色に見せる。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '炭酸水素イオン', formula: 'HCO3-', desc: '炭酸水素ナトリウムなどにふくまれる多原子イオン。全体で-1の電荷をもつ。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '水酸化カルシウムの電離', formula: 'Ca2+', display: 'Ca(OH)2 → [ ? ] + 2OH-', desc: '水酸化カルシウムは水中でカルシウムイオン1個と水酸化物イオン2個に分かれる。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '塩化バリウムの電離', formula: 'Ba2+', display: 'BaCl2 → [ ? ] + 2Cl-', desc: '塩化バリウムは水中でBa2+とCl-に分かれる。Ba2+はSO42-の検出に使われる。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: '硫酸ナトリウムの電離', formula: 'Na+', display: 'Na2SO4 → 2[ ? ] + SO42-', desc: '硫酸ナトリウムはナトリウムイオン2個と硫酸イオン1個に分かれる。電荷の合計は0になる。' },
      // イオン化傾向（参考: K > Ca > Na > Mg > Al > Zn > Fe > Cu > Ag）
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: ZnとCuを比較', formula: 'Zn', display: 'CuとZn ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Zn>Cu。亜鉛の方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: FeとCuを比較', formula: 'Fe', display: 'CuとFe ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Fe>Cu。鉄の方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: MgとFeを比較', formula: 'Mg', display: 'FeとMg ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Mg>Fe。マグネシウムの方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: AlとZnを比較', formula: 'Al', display: 'ZnとAl ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Al>Zn。アルミニウムの方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: ZnとFeを比較', formula: 'Zn', display: 'FeとZn ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Zn>Fe。亜鉛の方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: CuとAgを比較', formula: 'Cu', display: 'AgとCu ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Cu>Ag。銅の方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: NaとMgを比較', formula: 'Na', display: 'MgとNa ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Na>Mg。ナトリウムの方が陽イオンになりやすい。' },
      { genre: 'ion', diff: 'mid', type: 'typing', name: 'イオン化傾向: FeとAgを比較', formula: 'Fe', display: 'AgとFe ─ 陽イオンになりやすいのは [ ? ]', desc: 'イオン化傾向は Fe>Ag。鉄の方が陽イオンになりやすい。' },

      // ───────── 実験操作 experiment：基礎（junior）＝安全・基本操作（選択式）─────────
      { genre: 'experiment', diff: 'junior', type: 'choice', name: 'ガスバーナーの点火',
        q: 'ガスバーナーに火をつけるとき、マッチの火を近づけながら開けるねじはどれか？',
        c: ['空気調節ねじ', 'ガス調節ねじ', '元栓', 'コック'], a: 1,
        desc: '元栓・コックを開けた後、マッチの火を近づけながらガス調節ねじを開けて点火する。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: 'ガスバーナーの炎の調節',
        q: 'ガスバーナーの炎がオレンジ色のとき、青い炎にするための操作はどれか？',
        c: ['ガス調節ねじを閉じる', '元栓を閉じる', '空気調節ねじを開けて空気を増やす', '水をかける'], a: 2,
        desc: 'オレンジの炎は空気（酸素）不足。空気調節ねじを開けて空気を増やすと完全燃焼し青い炎になる。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: '試験管の加熱',
        q: '試験管に入れた液体を加熱するとき、正しい操作はどれか？',
        c: ['口を自分に向ける', '一点だけを強く熱し続ける', '試験管の口を人のいない方へ向ける', '液体を満杯まで入れる'], a: 2,
        desc: '突沸して中身が飛び出す危険があるため、口は人のいない方向へ向ける。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: '薬品のにおいの調べ方',
        q: '薬品のにおいを確認するときの正しい方法はどれか？',
        c: ['鼻を直接つけて深く吸う', '手であおいでかぐ', '加熱してからかぐ', '容器を振ってからかぐ'], a: 1,
        desc: '有害な気体もあるため、手であおいで少量を確認する。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: '沸騰石のはたらき',
        q: '液体を加熱する前に沸騰石を入れる理由はどれか？',
        c: ['早く沸騰させるため', '急な沸騰（突沸）を防ぐため', '色をつけるため', 'においを消すため'], a: 1,
        desc: '沸騰石は突沸を防ぎ、おだやかに沸騰させるために入れる。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: '分銅の扱い方',
        q: '上皿てんびんの分銅を扱うとき、正しい方法はどれか？',
        c: ['手で持つ', 'ピンセットで持つ', '水でぬらして持つ', '息を吹きかけてから持つ'], a: 1,
        desc: '手の脂やさびを防ぐため、分銅はピンセットで扱う。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: 'メスシリンダーの読み方',
        q: 'メスシリンダーで体積をはかるとき、目盛りの読み方はどれか？',
        c: ['上から見下ろして読む', '液面の最も高い所を読む', '液面の最も低い所を真横から読む', '斜め上から読む'], a: 2,
        desc: '目の高さを液面に合わせ、へこんだ最下部を真横から読む。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: '薬品が皮膚についたとき',
        q: '薬品が手についたときの正しい対処はどれか？',
        c: ['ふき取って放置する', 'すぐに大量の水で洗い流す', 'こすって落とす', '別の薬品で中和する'], a: 1,
        desc: 'まず大量の水で洗い流すのが基本。その後、先生に伝える。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: 'リトマス紙の色変化',
        q: '酸性の水溶液をつけると、リトマス紙はどのように変化するか？',
        c: ['赤色リトマス紙が青くなる', '変化しない', '青色リトマス紙が赤くなる', '両方とも緑になる'], a: 2,
        desc: '酸性は青色リトマス紙を赤に変える。アルカリ性は赤を青に変える。' },
      { genre: 'experiment', diff: 'junior', type: 'choice', name: 'BTB溶液の色',
        q: 'BTB溶液が黄色を示すとき、その水溶液の性質はどれか？',
        c: ['アルカリ性', '中性', '酸性', '中和'], a: 2,
        desc: 'BTBは酸性で黄、中性で緑、アルカリ性で青を示す。' },

      // ───────── 実験操作 experiment：応用（mid）＝気体の発生・集め方・器具 ─────────
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '水上置換法',
        q: '水に溶けにくい気体を集めるのに適した方法はどれか？',
        c: ['上方置換法', '水上置換法', '下方置換法', 'ろ過'], a: 1,
        desc: '水に溶けにくい酸素・水素などは水上置換法で集める。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '上方置換法',
        q: 'アンモニアのように水に溶けやすく空気より軽い気体の集め方はどれか？',
        c: ['下方置換法', '水上置換法', '上方置換法', '蒸留'], a: 2,
        desc: '空気より軽く水に溶けやすい気体は上方置換法で集める。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '下方置換法',
        q: '塩化水素のように水に溶けやすく空気より重い気体の集め方はどれか？',
        c: ['下方置換法', '上方置換法', '水上置換法', '再結晶'], a: 0,
        desc: '空気より重く水に溶けやすい気体は下方置換法で集める。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '酸素の発生方法',
        q: '酸素を発生させる方法として正しいものはどれか？',
        c: ['石灰石にうすい塩酸を加える', '亜鉛にうすい塩酸を加える', '二酸化マンガンにうすい過酸化水素水を加える', '炭酸水素ナトリウムを加熱する'], a: 2,
        desc: '二酸化マンガンは触媒。過酸化水素水（オキシドール）の分解で酸素が発生する。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '二酸化炭素の発生方法',
        q: '二酸化炭素を発生させる方法として正しいものはどれか？',
        c: ['亜鉛にうすい塩酸を加える', '石灰石にうすい塩酸を加える', '過酸化水素水に二酸化マンガンを加える', '水を電気分解する'], a: 1,
        desc: '石灰石（炭酸カルシウム）とうすい塩酸で二酸化炭素が発生する。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '加熱をやめる手順',
        q: '気体を発生させる加熱をやめるとき、火を消す前にすべき操作はどれか？',
        c: ['ガラス管を水（水そう）から抜く', 'すぐ火を消す', '試験管を持ち上げる', '水を足す'], a: 0,
        desc: '先に火を消すと水が逆流して試験管が割れる。ガラス管を水から抜いてから火を消す。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '加熱する液体の量',
        q: '試験管に入れて加熱する液体の量の目安はどれか？',
        c: ['半分以上', '試験管の4分の1以下', '口いっぱい', '8分目'], a: 1,
        desc: '多すぎると突沸して危険。4分の1程度までにする。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: '顕微鏡の倍率',
        q: '顕微鏡で観察を始めるときの倍率はどれか？',
        c: ['高い倍率から始める', '低い倍率から始める', '最高倍率から始める', 'どの倍率でもよい'], a: 1,
        desc: 'まず低倍率で観察対象を見つけ、その後で高倍率にする。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: 'こまごめピペット',
        q: 'こまごめピペットで液体を吸うときの正しい操作はどれか？',
        c: ['液に入れてからゴム球を押す', '口で吸い上げる', 'ゴム球を押してから液に入れ、ゆるめて吸う', '吸ったまま先を上に向ける'], a: 2,
        desc: '先にゴム球を押して空気を出し、液に入れてからゆるめて吸う。吸ったまま上に向けない。' },
      { genre: 'experiment', diff: 'mid', type: 'choice', name: 'ろ過の操作',
        q: 'ろ過の操作で正しいものはどれか？',
        c: ['液を一気に注ぐ', 'ガラス棒に伝わらせて注ぎ、ろうとのあしを内壁につける', 'ろうとのあしを浮かせる', 'ろ紙を使わない'], a: 1,
        desc: '液はガラス棒を伝わらせて静かに注ぎ、ろうとのあしの長い方をビーカーの内壁につける。' },

      // ───────── 物理 physics（Phase 1：選択式70問・光音/力/電流/運動）─────────
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'光が鏡に当たってはね返る現象を何という？',
    c:['反射','屈折','回折','蒸発'], a:0,
    desc:'光が鏡などの表面ではね返る現象を反射という。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'鏡で光が反射するとき、入射角と反射角の関係として正しいものはどれ？',
    c:['入射角と反射角は等しい','入射角は反射角の2倍','反射角はいつも0度','入射角と反射角は無関係'], a:0,
    desc:'反射の法則では、入射角と反射角は等しくなる。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'光が空気中から水中へ進むとき、境界面で進む向きが変わる現象を何という？',
    c:['反射','屈折','凝結','放電'], a:1,
    desc:'光が異なる物質へ進むとき、進む向きが変わる現象を屈折という。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'凸レンズに平行な光を当てると、光は主にどこに集まる？',
    c:['焦点','中心の真上','レンズの端','光源の後ろ'], a:0,
    desc:'凸レンズに軸に平行な光を当てると、屈折して焦点に集まる。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'音は何によって生じる？',
    c:['物体の振動','物体の色','光の反射','水の蒸発'], a:0,
    desc:'音は物体が振動することで発生し、空気などを通して伝わる。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'音の大きさに最も関係が深いものはどれ？',
    c:['振幅','振動数','温度の単位','光の速さ'], a:0,
    desc:'音の大きさは振動の幅である振幅が大きいほど大きくなる。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'音の高さに最も関係が深いものはどれ？',
    c:['振動数','質量','面積','電圧'], a:0,
    desc:'音の高さは1秒間の振動回数である振動数が多いほど高くなる。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'真空中で音が伝わらない理由として正しいものはどれ？',
    c:['音を伝える物質がないから','光がないから','温度が必ず0度だから','重力がないから'], a:0,
    desc:'音は空気や水などの物質の振動として伝わるため、真空中では伝わらない。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'空気中の音の速さとして最も近い値はどれ？',
    c:['約34m/s','約340m/s','約3400m/s','約30万km/s'], a:1,
    desc:'中学理科では、空気中の音の速さをおよそ340m/sとして扱う。' },
  { subject:'physics', genre:'light_sound', diff:'junior', type:'choice',
    q:'水面にうつった景色が見える主な理由はどれ？',
    c:['水面で光が反射するから','水が音を吸収するから','水が電気を流すから','水が重力を消すから'], a:0,
    desc:'水面で光が反射し、その反射した光が目に入るため景色が見える。' },

  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'光が空気中からガラス中へ斜めに進むとき、一般に光はどちらへ曲がる？',
    c:['法線に近づく向き','法線から遠ざかる向き','必ず反射だけする','必ず直角に曲がる'], a:0,
    desc:'空気からガラスのような光が進みにくい物質へ入ると、光は法線に近づく向きに屈折する。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'凸レンズで、物体を焦点より外側に置いたときにスクリーンに映る像はどれ？',
    c:['実像','虚像','影だけ','音像'], a:0,
    desc:'物体が焦点より外側にあると、凸レンズの反対側に実像ができ、スクリーンに映せる。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'凸レンズでできる実像の向きとして正しいものはどれ？',
    c:['上下左右が逆になる','必ず正立する','左右だけ同じになる','向きは光源の色で決まる'], a:0,
    desc:'凸レンズでできる実像は、もとの物体に対して上下左右が逆になる。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'空気中で音が2秒間に進む距離は約何m？',
    c:['170m','340m','680m','3400m'], a:2,
    desc:'音の速さを約340m/sとすると、340m/s×2s=680m進む。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'山に向かって声を出すと4秒後に反射音が聞こえた。山までの距離は約何m？',
    c:['340m','680m','1360m','2720m'], a:1,
    desc:'音は山まで往復する。340m/s×4s=1360mが往復距離なので、片道は680m。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'モノコードで弦を短くして同じ強さではじくと、音はどう変わる？',
    c:['高くなる','低くなる','必ず大きくなる','伝わらなくなる'], a:0,
    desc:'弦が短いほど振動数が多くなり、音は高くなる。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'同じ弦をより強くはじいたとき、主に変わるものはどれ？',
    c:['音の大きさ','音の速さ','光の屈折角','電流の向き'], a:0,
    desc:'強くはじくと振幅が大きくなり、音が大きくなる。弦の長さが同じなら音の高さは主に変わらない。' },
  { subject:'physics', genre:'light_sound', diff:'mid', type:'choice',
    q:'光がガラス中から空気中へ斜めに出るとき、一般に光はどちらへ曲がる？',
    c:['法線から遠ざかる向き','法線に近づく向き','必ず吸収される','必ず音になる'], a:0,
    desc:'ガラスから空気のような光が進みやすい物質へ出ると、光は法線から遠ざかる向きに屈折する。' },

  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'力の単位はどれ？',
    c:['N','A','V','J'], a:0,
    desc:'力の単位はニュートンで、記号はNで表す。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'地球が物体を引く力を何という？',
    c:['重力','摩擦力','弾性力','磁力'], a:0,
    desc:'地球が物体を地球の中心へ向かって引く力を重力という。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'物体の運動をさまたげる向きにはたらく、面どうしの力を何という？',
    c:['摩擦力','浮力','重力','電力'], a:0,
    desc:'接している面の間で、すべりをさまたげる向きにはたらく力を摩擦力という。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'ばねやゴムがもとの形に戻ろうとしてはたらく力を何という？',
    c:['弾性力','電流','圧力','音波'], a:0,
    desc:'変形したばねやゴムがもとの形に戻ろうとしてはたらく力を弾性力という。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'水中の物体にはたらく、上向きの力を何という？',
    c:['浮力','摩擦力','重力','電圧'], a:0,
    desc:'水や空気などの中にある物体には、上向きの浮力がはたらく。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'磁石が鉄を引きつける力はどれ？',
    c:['磁力','重力','浮力','圧力'], a:0,
    desc:'磁石が鉄などを引きつけたり、磁石どうしが引き合ったり反発したりする力を磁力という。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'1つの物体に2つの力がはたらき、物体が静止し続けるときの説明として正しいものはどれ？',
    c:['2力がつり合っている','2力が同じ向きである','力がまったくない','重力だけが2倍になる'], a:0,
    desc:'物体が静止し続ける場合、はたらく力がつり合っていることがある。2力のつり合いでは大きさが等しく向きが反対になる。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'ばねののびと加えた力の関係として、範囲内で正しいものはどれ？',
    c:['力が大きいほどのびは大きい','力が大きいほどのびは小さい','のびは力と無関係','力を加えると必ず縮む'], a:0,
    desc:'ばねは限度内で、加えた力が大きいほどのびが大きくなる。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'圧力を大きくする方法として正しいものはどれ？',
    c:['同じ力で押す面積を小さくする','同じ力で押す面積を大きくする','力を0にする','物体の色を変える'], a:0,
    desc:'圧力は力を面積で割った量なので、同じ力なら面積が小さいほど圧力は大きい。' },
  { subject:'physics', genre:'force', diff:'junior', type:'choice',
    q:'大気の重さによって生じる圧力を何という？',
    c:['大気圧','水圧','電圧','音圧'], a:0,
    desc:'空気にも重さがあり、その重さによって大気圧が生じる。' },

  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'2Nの力で1cmのびるばねに6Nの力を加えると、のびは何cm？',
    c:['2cm','3cm','6cm','12cm'], a:1,
    desc:'のびは力に比例する。6Nは2Nの3倍なので、のびは1cm×3=3cm。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'20Nの力が4m2の面に垂直にはたらくとき、圧力は何Pa？',
    c:['5Pa','16Pa','24Pa','80Pa'], a:0,
    desc:'圧力=力÷面積なので、20N÷4m2=5Pa。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'水圧について正しい説明はどれ？',
    c:['深いほど大きくなる','深いほど小さくなる','深さに関係しない','水中では0になる'], a:0,
    desc:'水圧は水の重さによって生じ、深いほど上にある水の量が多いため大きくなる。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'浮力の大きさは、何と等しいと考えられる？',
    c:['押しのけた液体にはたらく重力','物体の色','物体の温度','水面の明るさ'], a:0,
    desc:'浮力は、物体が押しのけた液体にはたらく重力と等しい大きさになる。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'右向き5Nと左向き3Nの力が同じ物体にはたらくとき、合力はどれ？',
    c:['右向き2N','左向き2N','右向き8N','0N'], a:0,
    desc:'反対向きの力の合力は差で求める。5N-3N=2Nで、向きは大きいほうの右向き。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'右向き4Nと右向き6Nの力が同じ物体にはたらくとき、合力はどれ？',
    c:['右向き10N','左向き10N','右向き2N','0N'], a:0,
    desc:'同じ向きの力の合力は足し合わせる。4N+6N=10Nで右向き。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'てこで支点から力点までの距離を長くすると、同じ物体を動かすのに必要な力はどうなる？',
    c:['小さくなる','大きくなる','必ず0になる','距離と無関係に同じ'], a:0,
    desc:'てこでは支点から力点までの距離を長くすると、小さい力で大きな効果を出せる。' },
  { subject:'physics', genre:'force', diff:'mid', type:'choice',
    q:'100Nの力が0.5m2の面に垂直にはたらくとき、圧力は何Pa？',
    c:['50Pa','100Pa','200Pa','500Pa'], a:2,
    desc:'圧力=力÷面積なので、100N÷0.5m2=200Pa。' },

  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'電流の単位はどれ？',
    c:['A','V','Ω','W'], a:0,
    desc:'電流の単位はアンペアで、記号はAで表す。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'電圧の単位はどれ？',
    c:['V','A','N','J'], a:0,
    desc:'電圧の単位はボルトで、記号はVで表す。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'抵抗の単位はどれ？',
    c:['Ω','A','V','m/s'], a:0,
    desc:'抵抗の単位はオームで、記号はΩで表す。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'直列回路で、各部分を流れる電流について正しいものはどれ？',
    c:['どこでも同じ大きさ','電源から遠いほど大きい','枝分かれごとに必ず0になる','抵抗と無関係に変わる'], a:0,
    desc:'直列回路では電流の通り道が1本なので、各部分を流れる電流は同じ大きさになる。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'並列回路で、各枝に加わる電圧について正しいものはどれ？',
    c:['電源の電圧と等しい','枝が多いほど必ず0になる','電流と必ず同じ単位になる','抵抗があると電圧は存在しない'], a:0,
    desc:'並列回路では、それぞれの枝に電源と同じ電圧が加わる。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'電力の単位はどれ？',
    c:['W','A','V','Ω'], a:0,
    desc:'電力の単位はワットで、記号はWで表す。電力は電気器具が1秒あたりに使う電気エネルギーの量を表す。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'電流が流れる導線のまわりにできるものはどれ？',
    c:['磁界','真空','焦点','水圧'], a:0,
    desc:'電流が流れる導線のまわりには磁界ができる。' },
  { subject:'physics', genre:'electricity', diff:'junior', type:'choice',
    q:'電磁石を強くする方法として正しいものはどれ？',
    c:['コイルの巻き数を増やす','電流を小さくする','鉄しんを必ず外す','導線を切る'], a:0,
    desc:'電磁石は、コイルの巻き数を増やしたり電流を大きくしたりすると強くなる。' },

  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'抵抗3Ωに6Vの電圧を加えると、流れる電流は何A？',
    c:['0.5A','2A','3A','18A'], a:1,
    desc:'オームの法則V=IRより、I=V÷R=6V÷3Ω=2A。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'2Aの電流が流れる抵抗5Ωに加わる電圧は何V？',
    c:['2.5V','5V','7V','10V'], a:3,
    desc:'オームの法則V=IRより、V=2A×5Ω=10V。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'12Vの電圧で3Aの電流が流れる電気器具の電力は何W？',
    c:['4W','9W','15W','36W'], a:3,
    desc:'電力=電圧×電流なので、12V×3A=36W。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'100Wの電球を10秒使ったときの電力量は何J？',
    c:['10J','100J','1000J','10000J'], a:2,
    desc:'電力量=電力×時間なので、100W×10s=1000J。1Wは1秒あたり1Jを使うことを表す。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'抵抗2Ωと3Ωを直列につないだとき、全体の抵抗は何Ω？',
    c:['1Ω','5Ω','6Ω','1.2Ω'], a:1,
    desc:'直列つなぎの合成抵抗は足し合わせるので、2Ω+3Ω=5Ω。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'同じ抵抗2個を並列につなぐと、全体の抵抗は1個だけのときと比べてどうなる？',
    c:['小さくなる','大きくなる','必ず同じ','無限大になる'], a:0,
    desc:'並列回路では電流の通り道が増えるため、同じ抵抗2個なら全体の抵抗は1個だけのときより小さくなる。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'コイルに電流を流してできる磁界の向きを変える方法として正しいものはどれ？',
    c:['電流の向きを逆にする','コイルを紙で包む','電圧の単位を変える','抵抗の色を変える'], a:0,
    desc:'コイルのまわりの磁界の向きは電流の向きで決まるため、電流を逆にすると磁界の向きも逆になる。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'choice',
    q:'モーターが電気エネルギーを主に変えるものはどれ？',
    c:['運動エネルギー','化学エネルギーだけ','光の屈折','水圧'], a:0,
    desc:'モーターは電流が磁界から受ける力を利用し、電気エネルギーを主に運動エネルギーへ変える。' },

  { subject:'physics', genre:'electricity', diff:'senior', type:'choice',
    q:'抵抗6Ωと3Ωを並列につないだとき、合成抵抗は何Ω？',
    c:['2Ω','3Ω','9Ω','18Ω'], a:0,
    desc:'並列の合成抵抗は1/R=1/6+1/3=1/6+2/6=3/6=1/2なので、R=2Ω。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'choice',
    q:'抵抗2Ωと4Ωを直列につなぎ、12Vの電圧を加えた。回路を流れる電流は何A？',
    c:['1A','2A','3A','6A'], a:1,
    desc:'直列の合成抵抗は2Ω+4Ω=6Ω。オームの法則よりI=12V÷6Ω=2A。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'choice',
    q:'60Wの電気器具を2分間使ったときの電力量は何J？',
    c:['120J','1800J','3600J','7200J'], a:3,
    desc:'2分=120秒。電力量=電力×時間なので、60W×120s=7200J。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'choice',
    q:'3Vで0.5Aの電流が流れる豆電球の電力は何W？',
    c:['0.17W','1.5W','3.5W','6W'], a:1,
    desc:'電力=電圧×電流なので、3V×0.5A=1.5W。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'choice',
    q:'電熱線で発生する熱量を大きくする条件として正しいものはどれ？',
    c:['電力を大きくし、使う時間を長くする','電力を0にする','時間を0秒にする','電流と電圧を無関係にする'], a:0,
    desc:'電熱線で発生する熱量は電力量と関係し、電力量=電力×時間で求められる。電力が大きく時間が長いほど熱量は大きい。' },

  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'物体が20mを4秒で進んだときの速さは何m/s？',
    c:['4m/s','5m/s','16m/s','80m/s'], a:1,
    desc:'速さ=距離÷時間なので、20m÷4s=5m/s。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'速さ3m/sで10秒進むと、進む距離は何m？',
    c:['3m','10m','13m','30m'], a:3,
    desc:'距離=速さ×時間なので、3m/s×10s=30m。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'距離60mを速さ12m/sで進むと、かかる時間は何秒？',
    c:['5秒','12秒','48秒','720秒'], a:0,
    desc:'時間=距離÷速さなので、60m÷12m/s=5s。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'一定の速さで一直線上を進む運動を何という？',
    c:['等速直線運動','自由落下だけ','反射','放電'], a:0,
    desc:'速さが一定で、向きも変わらず一直線上を進む運動を等速直線運動という。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'力の向きに物体を動かしたときの仕事を求める式はどれ？',
    c:['仕事=力×移動距離','仕事=電圧÷電流','仕事=面積÷力','仕事=振動数×音速'], a:0,
    desc:'力の向きに物体が動いたとき、仕事[J]=力[N]×移動距離[m]で求める。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'10Nの力で物体を力の向きに2m動かした。仕事は何J？',
    c:['5J','10J','20J','40J'], a:2,
    desc:'仕事=力×移動距離なので、10N×2m=20J。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'40Jの仕事を8秒で行ったときの仕事率は何W？',
    c:['5W','8W','32W','320W'], a:0,
    desc:'仕事率=仕事÷時間なので、40J÷8s=5W。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'choice',
    q:'道具を使っても、摩擦などを無視すると変わらない量はどれ？',
    c:['必要な仕事の総量','必ず必要な力','必ず移動距離','物体の質量が0になること'], a:0,
    desc:'滑車や斜面などを使うと力の大きさや動かす距離は変えられるが、摩擦を無視すると仕事の総量は変わらない。' },

  { subject:'physics', genre:'motion', diff:'senior', type:'choice',
    q:'高さが高い位置にある物体ほど大きくなるエネルギーはどれ？',
    c:['位置エネルギー','電気抵抗','音の振動数','大気圧だけ'], a:0,
    desc:'高い位置にある物体は、落下すると仕事をすることができるため位置エネルギーをもつ。高さが高いほど大きい。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'choice',
    q:'速く動く物体ほど大きくなるエネルギーはどれ？',
    c:['運動エネルギー','位置エネルギーだけ','弾性力','電圧'], a:0,
    desc:'動いている物体がもつエネルギーを運動エネルギーという。速さが大きいほど運動エネルギーは大きい。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'choice',
    q:'摩擦や空気抵抗を無視できるとき、落下する物体の力学的エネルギーについて正しいものはどれ？',
    c:['全体として保存される','必ず0になる','位置エネルギーだけ増え続ける','運動エネルギーだけ消える'], a:0,
    desc:'摩擦や空気抵抗を無視できる場合、位置エネルギーと運動エネルギーの和である力学的エネルギーは保存される。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'choice',
    q:'斜面を使って重い物体を持ち上げると、摩擦を無視した場合どうなる？',
    c:['必要な力は小さくなるが、動かす距離は長くなる','必要な力も距離も必ず0になる','仕事の総量が必ず増える','重力がなくなる'], a:0,
    desc:'斜面を使うと小さい力で持ち上げられるが、その分だけ長い距離を動かす。摩擦を無視すれば仕事の総量は変わらない。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'choice',
    q:'120Jの仕事を30秒で行ったときの仕事率は何W？',
    c:['4W','30W','90W','3600W'], a:0,
    desc:'仕事率=仕事÷時間なので、120J÷30s=4W。' },

      // ───────── 物理 physics タイピング（計算30問・plain）─────────
  { subject:'physics', genre:'electricity', diff:'mid', type:'typing', plain:true,
    name:'オームの法則(電流)',
    display:'12Vの電圧を4Ωの抵抗に加えたときの電流は [ ? ] A',
    formula:'3',
    desc:'電流=電圧÷抵抗。12÷4=3A。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'typing', plain:true,
    name:'オームの法則(電圧)',
    display:'2Aの電流が5Ωの抵抗に流れるときの電圧は [ ? ] V',
    formula:'10',
    desc:'電圧=電流×抵抗。2×5=10V。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'typing', plain:true,
    name:'オームの法則(抵抗)',
    display:'18Vの電圧で3Aの電流が流れる抵抗は [ ? ] Ω',
    formula:'6',
    desc:'抵抗=電圧÷電流。18÷3=6Ω。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'typing', plain:true,
    name:'電力',
    display:'6Vの電圧で2Aの電流が流れる器具の電力は [ ? ] W',
    formula:'12',
    desc:'電力=電圧×電流。6×2=12W。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'typing', plain:true,
    name:'電力量',
    display:'20Wの電球を60秒使ったときの電力量は [ ? ] J',
    formula:'1200',
    desc:'電力量=電力×時間。20×60=1200J。' },
  { subject:'physics', genre:'electricity', diff:'mid', type:'typing', plain:true,
    name:'直列回路の合成抵抗',
    display:'3Ωと5Ωの抵抗を直列につないだときの合成抵抗は [ ? ] Ω',
    formula:'8',
    desc:'直列回路の合成抵抗は足し算。3+5=8Ω。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'typing', plain:true,
    name:'並列回路の合成抵抗',
    display:'6Ωと3Ωの抵抗を並列につないだときの合成抵抗は [ ? ] Ω',
    formula:'2',
    desc:'並列では1/R=1/6+1/3=3/6。よってR=2Ω。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'typing', plain:true,
    name:'直列回路の電流',
    display:'2Ωと4Ωの抵抗を直列につなぎ12Vの電圧を加えたときの電流は [ ? ] A',
    formula:'2',
    desc:'合成抵抗は2+4=6Ω。電流=12÷6=2A。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'typing', plain:true,
    name:'並列回路の全電流',
    display:'6Vの電源に3Ωと6Ωの抵抗を並列につないだときの全電流は [ ? ] A',
    formula:'3',
    desc:'各枝の電流は6÷3=2A、6÷6=1A。全電流は2+1=3A。' },
  { subject:'physics', genre:'electricity', diff:'senior', type:'typing', plain:true,
    name:'電力量と時間',
    display:'30Wの器具で1800Jの電力量を使う時間は [ ? ] 秒',
    formula:'60',
    desc:'時間=電力量÷電力。1800÷30=60秒。' },
  { subject:'physics', genre:'electricity', diff:'supreme', type:'typing', plain:true,
    name:'合成抵抗から電力',
    display:'4Ωと2Ωの抵抗を直列につなぎ12Vの電圧を加えたとき、回路全体の電力は [ ? ] W',
    formula:'24',
    desc:'合成抵抗は4+2=6Ω。電流は12÷6=2A、電力は12×2=24W。' },
  { subject:'physics', genre:'electricity', diff:'supreme', type:'typing', plain:true,
    name:'並列回路から電力',
    display:'12Vの電源に6Ωと3Ωの抵抗を並列につないだとき、回路全体の電力は [ ? ] W',
    formula:'72',
    desc:'全電流は12÷6+12÷3=2+4=6A。電力は12×6=72W。' },
  { subject:'physics', genre:'electricity', diff:'supreme', type:'typing', plain:true,
    name:'電力量の複合計算',
    display:'8Ωの抵抗に4Aの電流を30秒流したときの電力量は [ ? ] J',
    formula:'3840',
    desc:'電圧は4×8=32V。電力は32×4=128W、電力量は128×30=3840J。' },
  { subject:'physics', genre:'electricity', diff:'supreme', type:'typing', plain:true,
    name:'並列回路の合成抵抗から電流',
    display:'4Ωと4Ωの抵抗を並列につなぎ10Vの電圧を加えたとき、全電流は [ ? ] A',
    formula:'5',
    desc:'同じ4Ωを2本並列にすると合成抵抗は2Ω。電流は10÷2=5A。' },

  { subject:'physics', genre:'motion', diff:'mid', type:'typing', plain:true,
    name:'速さ',
    display:'120mを30秒で進む物体の速さは [ ? ] m/s',
    formula:'4',
    desc:'速さ=距離÷時間。120÷30=4m/s。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'typing', plain:true,
    name:'距離',
    display:'3m/sで20秒進む物体の移動距離は [ ? ] m',
    formula:'60',
    desc:'距離=速さ×時間。3×20=60m。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'typing', plain:true,
    name:'時間',
    display:'150mを5m/sで進むときにかかる時間は [ ? ] 秒',
    formula:'30',
    desc:'時間=距離÷速さ。150÷5=30秒。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'typing', plain:true,
    name:'仕事',
    display:'10Nの力で物体を3m動かしたときの仕事は [ ? ] J',
    formula:'30',
    desc:'仕事=力×距離。10×3=30J。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'typing', plain:true,
    name:'仕事率',
    display:'120Jの仕事を6秒でしたときの仕事率は [ ? ] W',
    formula:'20',
    desc:'仕事率=仕事÷時間。120÷6=20W。' },
  { subject:'physics', genre:'motion', diff:'mid', type:'typing', plain:true,
    name:'力の大きさ',
    display:'50Jの仕事で物体を5m動かしたときの力の大きさは [ ? ] N',
    formula:'10',
    desc:'力=仕事÷距離。50÷5=10N。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'typing', plain:true,
    name:'平均の速さ',
    display:'200mを40秒で進み、続けて100mを20秒で進んだときの平均の速さは [ ? ] m/s',
    formula:'5',
    desc:'全距離は200+100=300m、全時間は40+20=60秒。300÷60=5m/s。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'typing', plain:true,
    name:'位置エネルギー',
    display:'重さ20Nの物体を3mの高さまで持ち上げたときの位置エネルギーは [ ? ] J',
    formula:'60',
    desc:'位置エネルギーは重さ×高さ。20×3=60J。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'typing', plain:true,
    name:'仕事率と仕事',
    display:'15Wの仕事率で8秒間はたらいたときの仕事は [ ? ] J',
    formula:'120',
    desc:'仕事=仕事率×時間。15×8=120J。' },
  { subject:'physics', genre:'motion', diff:'senior', type:'typing', plain:true,
    name:'斜面の仕事',
    display:'重さ30Nの物体を摩擦のない斜面で2mの高さまで上げたときの仕事は [ ? ] J',
    formula:'60',
    desc:'摩擦がなければ斜面でも必要な仕事は重さ×高さ。30×2=60J。' },
  { subject:'physics', genre:'motion', diff:'supreme', type:'typing', plain:true,
    name:'斜面の力',
    display:'重さ40Nの物体を摩擦のない長さ5mの斜面で1m高くするために必要な力は [ ? ] N',
    formula:'8',
    desc:'必要な仕事は40×1=40J。力×5m=40Jなので、力は40÷5=8N。' },
  { subject:'physics', genre:'motion', diff:'supreme', type:'typing', plain:true,
    name:'滑車と仕事率',
    display:'重さ60Nの物体を動滑車で2m持ち上げる仕事を12秒でしたときの仕事率は [ ? ] W',
    formula:'10',
    desc:'動滑車でも仕事は重さ×高さで60×2=120J。仕事率は120÷12=10W。' },
  { subject:'physics', genre:'motion', diff:'supreme', type:'typing', plain:true,
    name:'仕事から時間',
    display:'重さ50Nの物体を4m持ち上げる仕事を25Wで行うと、かかる時間は [ ? ] 秒',
    formula:'8',
    desc:'仕事は50×4=200J。時間=仕事÷仕事率なので200÷25=8秒。' },
  { subject:'physics', genre:'motion', diff:'supreme', type:'typing', plain:true,
    name:'速さと仕事率',
    display:'20Nの力で物体を0.5m/sの速さで動かし続けるときの仕事率は [ ? ] W',
    formula:'10',
    desc:'1秒間に進む距離は0.5m。1秒間の仕事は20×0.5=10Jなので仕事率は10W。' },

  { subject:'physics', genre:'force', diff:'mid', type:'typing', plain:true,
    name:'圧力',
    display:'20Nの力が0.5m2の面積に加わるときの圧力は [ ? ] Pa',
    formula:'40',
    desc:'圧力=力÷面積。20÷0.5=40Pa。' },
  { subject:'physics', genre:'force', diff:'mid', type:'typing', plain:true,
    name:'フックの法則',
    display:'1Nで2cmのびるばねに3Nの力を加えたときののびは [ ? ] cm',
    formula:'6',
    desc:'ばねののびは力に比例する。1Nで2cmなら3Nでは2×3=6cm。' },

      // ───────── 生物 biology（選択式55問・植物/人体/細胞遺伝/生態系）─────────
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'花のつくりで、花粉をつくる部分はどれか。',
    c:['おしべ','めしべ','がく','花弁'], a:0,
    desc:'おしべの先にあるやくで花粉がつくられます。めしべは受粉後に種子や果実に関係する部分です。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'受粉とは、花粉がどこにつくことか。',
    c:['めしべの柱頭','子房','胚珠','花弁'], a:0,
    desc:'受粉は花粉がめしべの柱頭につくことです。その後、胚珠が種子になり、子房が果実になります。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'光合成で主にデンプンがつくられる場所はどこか。',
    c:['葉緑体','細胞壁','根毛','道管'], a:0,
    desc:'光合成は葉の細胞にある葉緑体で行われます。光を受けて二酸化炭素と水からデンプンなどをつくります。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'植物の光合成で、材料として使われるものの組み合わせはどれか。',
    c:['二酸化炭素と水','酸素とデンプン','窒素と酸素','水素と酸素'], a:0,
    desc:'光合成では二酸化炭素と水を材料にしてデンプンなどをつくり、酸素を放出します。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'植物の葉で、水蒸気が主に出入りする小さな穴を何というか。',
    c:['気孔','維管束','根毛','胚珠'], a:0,
    desc:'気孔は葉の表皮にある小さな穴で、蒸散や気体の出入りに関係します。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'根から吸収した水や無機養分を運ぶ管はどれか。',
    c:['道管','師管','気孔','子房'], a:0,
    desc:'道管は根から吸収した水や無機養分を上へ運びます。師管は光合成でできた養分を運びます。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'アブラナやサクラのように、胚珠が子房の中にある植物を何というか。',
    c:['被子植物','裸子植物','シダ植物','コケ植物'], a:0,
    desc:'被子植物は胚珠が子房に包まれている種子植物です。裸子植物は胚珠がむき出しです。' },
  { subject:'biology', genre:'bio_plant', diff:'junior', type:'choice',
    q:'単子葉類に多く見られる葉脈の特徴はどれか。',
    c:['平行脈','網状脈','葉脈がない','輪状に広がる脈'], a:0,
    desc:'単子葉類の葉脈は平行脈が多く、双子葉類は網状脈が多いです。' },
  { subject:'biology', genre:'bio_plant', diff:'mid', type:'choice',
    q:'ヨウ素液を使って調べる物質はどれか。',
    c:['デンプン','酸素','タンパク質','二酸化炭素'], a:0,
    desc:'ヨウ素液はデンプンがあると青紫色に変化します。光合成でデンプンができたかを調べる実験に使います。' },
  { subject:'biology', genre:'bio_plant', diff:'mid', type:'choice',
    q:'光合成の実験で、葉を一部だけアルミはくでおおう主な理由はどれか。',
    c:['光が必要かを比べるため','水が必要かを比べるため','酸素が出るかを比べるため','葉の温度を下げるため'], a:0,
    desc:'アルミはくで光をさえぎった部分と光が当たった部分を比べることで、光合成に光が必要かを調べられます。' },
  { subject:'biology', genre:'bio_plant', diff:'mid', type:'choice',
    q:'光合成と呼吸について正しい説明はどれか。',
    c:['植物は光合成も呼吸も行う','植物は昼だけ呼吸を行う','植物は夜だけ光合成を行う','植物は呼吸を行わない'], a:0,
    desc:'植物も生きているため一日中呼吸を行います。光合成は光が当たるときに行われます。' },
  { subject:'biology', genre:'bio_plant', diff:'mid', type:'choice',
    q:'蒸散がさかんになる条件として最も適切なものはどれか。',
    c:['晴れて風があり空気が乾いている','暗くて湿度が高い','気温が低く風がない','葉をすべて取り除く'], a:0,
    desc:'蒸散は気温が高く、空気が乾き、風があるとさかんになります。葉の気孔から水蒸気が出るためです。' },
  { subject:'biology', genre:'bio_plant', diff:'mid', type:'choice',
    q:'根の先端近くに多く、水や無機養分の吸収面積を広げるつくりはどれか。',
    c:['根毛','維管束','気孔','やく'], a:0,
    desc:'根毛は根の表面から細く伸びたつくりで、土と接する面積を広げて水や無機養分を吸収しやすくします。' },
  { subject:'biology', genre:'bio_plant', diff:'mid', type:'choice',
    q:'シダ植物とコケ植物に共通する特徴はどれか。',
    c:['胞子でふえる','花を咲かせる','種子をつくる','果実をつくる'], a:0,
    desc:'シダ植物やコケ植物は花や種子をつくらず、胞子でふえます。種子植物とはふえ方が異なります。' },
  { subject:'biology', genre:'bio_plant', diff:'senior', type:'choice',
    q:'維管束が輪のように並ぶことが多い植物のなかまはどれか。',
    c:['双子葉類','単子葉類','コケ植物','シダ植物'], a:0,
    desc:'双子葉類の茎では維管束が輪のように並ぶことが多いです。単子葉類では維管束が散らばることが多いです。' },
  { subject:'biology', genre:'bio_plant', diff:'senior', type:'choice',
    q:'マツのような裸子植物について正しい説明はどれか。',
    c:['胚珠がむき出しで子房がない','胚珠が子房の中にある','胞子だけでふえる','葉緑体をもたない'], a:0,
    desc:'裸子植物は胚珠がむき出しで、子房がありません。そのため被子植物のような果実はできません。' },
  { subject:'biology', genre:'bio_plant', diff:'senior', type:'choice',
    q:'葉の裏側に気孔が多い植物が多い理由として最も適切なものはどれか。',
    c:['水分の失われすぎを防ぎやすいから','光合成をまったくしないから','根から水を吸えないから','師管が葉の裏だけにあるから'], a:0,
    desc:'葉の裏側は表側より日光や風の影響を受けにくく、水分の失われすぎを防ぎながら気体を出入りさせやすいです。' },

  { subject:'biology', genre:'bio_human', diff:'junior', type:'choice',
    q:'だ液に含まれ、デンプンを分解する消化酵素はどれか。',
    c:['アミラーゼ','ペプシン','ヘモグロビン','インスリン'], a:0,
    desc:'だ液中のアミラーゼはデンプンを分解します。消化酵素は決まった物質にはたらく性質があります。' },
  { subject:'biology', genre:'bio_human', diff:'junior', type:'choice',
    q:'胃で主にタンパク質の消化に関わる消化酵素はどれか。',
    c:['ペプシン','アミラーゼ','リパーゼ','胆汁'], a:0,
    desc:'胃液に含まれるペプシンはタンパク質の消化に関わります。胆汁は消化酵素ではありません。' },
  { subject:'biology', genre:'bio_human', diff:'junior', type:'choice',
    q:'小腸の内側にある、養分の吸収面積を広げるつくりはどれか。',
    c:['柔毛','肺胞','気孔','腎臓'], a:0,
    desc:'小腸の内側には柔毛があり、表面積を広げて消化された養分を効率よく吸収します。' },
  { subject:'biology', genre:'bio_human', diff:'junior', type:'choice',
    q:'肺で酸素と二酸化炭素の交換が行われる小さな袋状のつくりはどれか。',
    c:['肺胞','心房','柔毛','腎小体'], a:0,
    desc:'肺胞は非常に薄い壁をもつ小さな袋で、まわりの毛細血管との間で気体の交換を行います。' },
  { subject:'biology', genre:'bio_human', diff:'junior', type:'choice',
    q:'血液中で酸素を運ぶはたらきが大きい成分はどれか。',
    c:['赤血球','白血球','血小板','血しょう'], a:0,
    desc:'赤血球にはヘモグロビンが含まれ、酸素と結びついて全身へ運びます。' },
  { subject:'biology', genre:'bio_human', diff:'junior', type:'choice',
    q:'背骨をもつ動物を何というか。',
    c:['脊椎動物','無脊椎動物','節足動物','軟体動物'], a:0,
    desc:'背骨をもつ動物を脊椎動物といいます。魚類、両生類、は虫類、鳥類、哺乳類が含まれます。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'心臓から全身へ血液を送り出す部屋はどれか。',
    c:['左心室','右心室','左心房','右心房'], a:0,
    desc:'左心室は酸素を多く含む血液を全身へ送り出します。心臓の中でも壁が厚い部屋です。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'全身から心臓へ戻った血液が最初に入る部屋はどれか。',
    c:['右心房','右心室','左心房','左心室'], a:0,
    desc:'全身をめぐった血液は大静脈を通って右心房に戻ります。その後、右心室から肺へ送られます。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'心臓から肺へ血液を送り、肺から心臓へ戻る血液の流れを何というか。',
    c:['肺循環','体循環','消化','反射'], a:0,
    desc:'肺循環は心臓と肺の間をめぐる血液の流れです。全身をめぐる流れは体循環です。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'尿をつくり、血液中の不要物を取り除く器官はどれか。',
    c:['腎臓','肝臓','胃','肺'], a:0,
    desc:'腎臓は血液中の不要物や余分な水分などをこし取り、尿をつくります。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'目や耳のように、外界からの刺激を受け取る器官を何というか。',
    c:['感覚器官','運動器官','消化器官','排出器官'], a:0,
    desc:'感覚器官は光、音、においなどの刺激を受け取ります。受け取った刺激は神経を通って脳などへ伝わります。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'熱いものに触れて思わず手を引っこめるような反応を何というか。',
    c:['反射','消化','呼吸','吸収'], a:0,
    desc:'反射は意識して考える前に起こるすばやい反応です。危険から体を守るはたらきがあります。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'節足動物にあてはまるものはどれか。',
    c:['エビ','イカ','ミミズ','クラゲ'], a:0,
    desc:'エビや昆虫などは節のあるあしと外骨格をもつ節足動物です。イカは軟体動物です。' },
  { subject:'biology', genre:'bio_human', diff:'mid', type:'choice',
    q:'魚類の特徴として正しいものはどれか。',
    c:['えらで呼吸する','肺で呼吸し体毛がある','親が乳で子を育てる','羽毛をもつ'], a:0,
    desc:'魚類は水中で生活し、えらで呼吸します。羽毛をもつのは鳥類、乳で子を育てるのは哺乳類です。' },
  { subject:'biology', genre:'bio_human', diff:'senior', type:'choice',
    q:'動脈について正しい説明はどれか。',
    c:['心臓から出ていく血液が流れる血管','必ず酸素の少ない血液が流れる血管','心臓へ戻る血液が流れる血管','血液が逆流するための血管'], a:0,
    desc:'動脈は心臓から出ていく血液が流れる血管です。肺動脈のように酸素の少ない血液が流れる例もあります。' },
  { subject:'biology', genre:'bio_human', diff:'senior', type:'choice',
    q:'静脈について正しい説明はどれか。',
    c:['心臓へ戻る血液が流れる血管','必ず酸素の多い血液が流れる血管','心臓から出る血液が流れる血管','血液をつくる血管'], a:0,
    desc:'静脈は心臓へ戻る血液が流れる血管です。肺静脈のように酸素の多い血液が流れる例もあります。' },
  { subject:'biology', genre:'bio_human', diff:'senior', type:'choice',
    q:'肝臓のはたらきとして正しいものはどれか。',
    c:['有害な物質を分解する','尿をつくる','酸素を取り入れる','デンプンをつくる'], a:0,
    desc:'肝臓には有害な物質を分解したり、養分をたくわえたりするはたらきがあります。尿をつくる主な器官は腎臓です。' },
  { subject:'biology', genre:'bio_human', diff:'senior', type:'choice',
    q:'鳥類と哺乳類に共通する特徴として正しいものはどれか。',
    c:['体温をほぼ一定に保つ','えらで呼吸する','卵を水中に産む','外骨格をもつ'], a:0,
    desc:'鳥類と哺乳類は恒温動物で、体温をほぼ一定に保ちます。魚類や両生類などとは体温調節の特徴が異なります。' },

  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'細胞の中にあり、遺伝に関係する染色体を含む部分はどれか。',
    c:['核','細胞膜','液胞','細胞壁'], a:0,
    desc:'核には染色体があり、遺伝に関係する情報を含みます。多くの細胞で重要なはたらきを調節しています。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'植物細胞にあり、動物細胞にはふつう見られないつくりはどれか。',
    c:['細胞壁','細胞膜','細胞質','核'], a:0,
    desc:'植物細胞には細胞壁や葉緑体、大きな液胞が見られます。細胞膜、細胞質、核は動物細胞にも見られます。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'1つの細胞からできている生物を何というか。',
    c:['単細胞生物','多細胞生物','脊椎動物','被子植物'], a:0,
    desc:'単細胞生物は1つの細胞だけで生命活動を行います。ゾウリムシやミカヅキモなどが例です。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'精子と卵が合体することを何というか。',
    c:['受精','分裂','発芽','蒸散'], a:0,
    desc:'受精は精子と卵が合体することです。受精によってできた細胞を受精卵といいます。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'親と同じ形質の子が、受精をせずにできるふえ方はどれか。',
    c:['無性生殖','有性生殖','受粉','減数分裂'], a:0,
    desc:'無性生殖では受精をせずに新しい個体ができます。親と同じ形質になりやすいことが特徴です。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'細胞分裂のとき、核の中で観察されやすくなるひも状のものはどれか。',
    c:['染色体','気孔','師管','柔毛'], a:0,
    desc:'細胞分裂のとき、核の中の染色体が見えやすくなります。染色体には遺伝に関係する情報が含まれます。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'親から子へ伝わる特徴を何というか。',
    c:['形質','器官','組織','刺激'], a:0,
    desc:'形質は色や形など、生物がもつ特徴のことです。遺伝によって親から子へ伝わるものがあります。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'対立形質のうち、子に現れやすい形質を現在の中学理科で何と呼ぶか。',
    c:['顕性形質','潜性形質','無性形質','中間形質'], a:0,
    desc:'子に現れやすい形質を顕性形質、現れにくい形質を潜性形質と呼びます。以前の優性・劣性に対応する用語です。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'メンデルが発見した、対になった遺伝子が生殖細胞に分かれて入るという法則はどれか。',
    c:['分離の法則','慣性の法則','質量保存の法則','フックの法則'], a:0,
    desc:'分離の法則では、対になった遺伝子が生殖細胞をつくるときに分かれて入ると考えます。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'純系の丸い種子のエンドウと純系のしわの種子のエンドウをかけ合わせたとき、F1に現れやすい形質はどれか。',
    c:['丸い種子','しわの種子','半分ずつ丸としわ','どちらも現れない'], a:0,
    desc:'エンドウの種子の形では丸が顕性形質です。純系どうしをかけ合わせるとF1はすべて丸になります。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'F1どうしを自家受粉させたF2で、顕性形質と潜性形質が現れる比として代表的なものはどれか。',
    c:['3:1','1:1','2:1','1:2:1'], a:0,
    desc:'顕性と潜性の1つの対立形質についてF1どうしを自家受粉させると、F2ではおよそ3:1で現れます。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'植物の細胞だけにあって、動物の細胞には見られないつくりはどれか。',
    c:['核','細胞膜','細胞壁','細胞質'], a:2,
    desc:'細胞壁・葉緑体・大きな液胞は植物の細胞に見られ、動物の細胞にはありません。細胞壁はからだを支えます。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'植物が光合成を行う、細胞内の緑色の粒を何というか。',
    c:['葉緑体','核','液胞','細胞膜'], a:0,
    desc:'葉緑体は緑色の色素(クロロフィル)をふくみ、光合成を行う場所です。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'細胞の中にふつう1個あり、染色体をふくむ丸いつくりを何というか。',
    c:['液胞','核','細胞壁','細胞膜'], a:1,
    desc:'核の中には遺伝情報をもつ染色体(DNA)があり、酢酸カーミンなどの染色液で赤く染まります。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'生殖細胞がつくられるときに行われる、特別な細胞分裂を何というか。',
    c:['体細胞分裂','減数分裂','二分裂','出芽'], a:1,
    desc:'減数分裂では染色体の数が半分になります。受精で2つの生殖細胞が合わさり、再びもとの数に戻ります。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'雌雄の生殖細胞が受精して子をつくる生殖を何というか。',
    c:['無性生殖','有性生殖','栄養生殖','分裂'], a:1,
    desc:'受精によって子をつくる生殖を有性生殖といい、子は両親の遺伝子を受けついで多様になります。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'受精卵が細胞分裂をくり返し、親と同じからだへ育っていく過程を何というか。',
    c:['発生','蒸散','呼吸','燃焼'], a:0,
    desc:'受精卵→胚→個体へと育つ過程を発生といいます。細胞の数がふえ、種類も分かれていきます。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'エンドウの種子の「丸」と「しわ」のように、同時には現れない対になる形質を何というか。',
    c:['顕性形質','対立形質','分離形質','潜性形質'], a:1,
    desc:'同時には現れない対になる形質を対立形質といいます。子に現れる方が顕性形質、現れない方が潜性形質です。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'親の形質を子に伝えるもとになる、染色体にある要素を何というか。',
    c:['遺伝子','栄養分','酸素','色素'], a:0,
    desc:'遺伝子は染色体にあり、その本体はDNAです。形質を決める情報を親から子へ伝えます。' },
  { subject:'biology', genre:'bio_cell', diff:'senior', type:'choice',
    q:'体細胞分裂の前後で、1個の細胞がもつ染色体の数はどうなるか。',
    c:['半分になる','変わらない','つねに2倍','なくなる'], a:1,
    desc:'体細胞分裂では分裂前に染色体が複製されて2等分されるため、分裂後も染色体の数は変わりません。' },
  { subject:'biology', genre:'bio_cell', diff:'mid', type:'choice',
    q:'受精を行わず、からだの一部などから新しい個体ができる生殖を何というか。',
    c:['有性生殖','受精','無性生殖','減数分裂'], a:2,
    desc:'受精を行わない生殖を無性生殖といい、子は親と同じ遺伝子をもちます(例:ジャガイモのいも、ミカヅキモの分裂)。' },

  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'植物のように、無機物から有機物をつくる生物を何というか。',
    c:['生産者','消費者','分解者','捕食者'], a:0,
    desc:'植物は光合成によって有機物をつくるため、生態系の生産者と呼ばれます。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'動物のように、ほかの生物を食べて生活する生物を何というか。',
    c:['消費者','生産者','分解者','無機物'], a:0,
    desc:'動物は植物やほかの動物を食べて有機物を得るため、消費者と呼ばれます。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'生物どうしの「食べる・食べられる」のつながりを何というか。',
    c:['食物連鎖','細胞分裂','光合成','肺循環'], a:0,
    desc:'食物連鎖は生物どうしの食べる・食べられる関係を表します。実際の自然界では多くの連鎖が網の目のようにつながります。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'落ち葉や死がいを分解する細菌や菌類などを何というか。',
    c:['分解者','生産者','一次消費者','肉食動物'], a:0,
    desc:'分解者は生物の死がいやふんなどの有機物を分解し、物質を自然界に戻すはたらきをします。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'食物連鎖のはじめに位置することが多い生物はどれか。',
    c:['植物','肉食動物','分解者','大型の魚'], a:0,
    desc:'多くの食物連鎖は、光合成で有機物をつくる植物から始まります。植物は生産者です。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'食物網とは何を表したものか。',
    c:['複数の食物連鎖が網の目のようにつながった関係','一つの細胞のつくり','血液の流れ','花のつくり'], a:0,
    desc:'自然界では生物が一種類だけを食べるとは限らないため、食物連鎖が複雑につながった食物網として考えます。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'自然界で分解者が少なくなると起こりやすいことはどれか。',
    c:['死がいや落ち葉が分解されにくくなる','光合成がすべて止まる','動物がすべて生産者になる','酸素が水に変わる'], a:0,
    desc:'分解者は死がいや落ち葉を分解して物質の循環を支えます。少なくなると有機物が分解されにくくなります。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'外来種について正しい説明はどれか。',
    c:['もともとその地域にいなかったが、人の活動などで入ってきた生物','必ず絶滅した生物','すべての地域にもともといる生物','光合成をしない植物'], a:0,
    desc:'外来種はもともとその地域にいなかった生物が人の活動などで入ってきたものです。在来の生物に影響することがあります。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'植物の光合成と動物の呼吸の関係として正しいものはどれか。',
    c:['酸素や二酸化炭素の循環に関係する','水だけを一方的に増やす','炭素の循環とは無関係である','生物どうしの関係には入らない'], a:0,
    desc:'植物の光合成は二酸化炭素を取り入れて酸素を出し、動物の呼吸は酸素を使って二酸化炭素を出します。物質の循環に関係します。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'植物などの生産者を食べる、草食動物のなかまを何というか。',
    c:['二次消費者','一次消費者','生産者','分解者'], a:1,
    desc:'生産者(植物)を直接食べる草食動物などを一次消費者といいます。さらにそれを食べる肉食動物は二次消費者です。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'一次消費者(草食動物)を食べる肉食動物のなかまを何というか。',
    c:['生産者','分解者','二次消費者','一次消費者'], a:2,
    desc:'一次消費者を食べる肉食動物などを二次消費者といいます。食べる順に生産者→一次消費者→二次消費者と続きます。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'生態系で、ふつう数量が最も多いのはどれか。',
    c:['生産者','一次消費者','二次消費者','大型の肉食動物'], a:0,
    desc:'数量のつり合いはピラミッド型で、光合成をする生産者が最も多く、上位の消費者ほど少なくなります。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'ある草地で草食動物が急にふえると、食べられる植物はまずどうなるか。',
    c:['ふえる','変わらない','二酸化炭素になる','へる'], a:3,
    desc:'草食動物がふえると食べられる植物がへります。やがて食物不足で草食動物もへり、もとのつり合いに戻ります。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'背骨をもつ動物(セキツイ動物)の5つのなかまの組み合わせとして正しいものはどれか。',
    c:['花・茎・葉・根・種子','魚類・両生類・は虫類・鳥類・ほ乳類','固体・液体・気体・原子・分子','胃・腸・肺・心臓・脳'], a:1,
    desc:'セキツイ動物は魚類・両生類・は虫類・鳥類・ほ乳類の5つに分けられます。卵生か胎生か、呼吸のしかたなどで区別します。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'昆虫やエビのように、からだやあしに節があり背骨をもたない動物のなかまを何というか。',
    c:['節足動物','ほ乳類','種子植物','魚類'], a:0,
    desc:'節足動物はからだが外骨格でおおわれ、あしに節があります。昆虫類・甲殻類などがふくまれ、背骨はありません。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'次のうち、軟体動物はどれか。',
    c:['バッタ','カエル','イカ','スズメ'], a:2,
    desc:'イカ・タコ・貝などは内臓を外とう膜が包む軟体動物です。バッタは節足動物、カエルは両生類、スズメは鳥類です。' },
  { subject:'biology', genre:'bio_eco', diff:'junior', type:'choice',
    q:'落ち葉やふんを無機物に分解する、菌類や細菌のなかまを何というか。',
    c:['生産者','分解者','一次消費者','二次消費者'], a:1,
    desc:'カビやキノコなどの菌類、細菌は有機物を無機物に分解する分解者で、物質の循環を支えています。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'ある生態系で肉食動物がへると、食べられていた草食動物は一時的にどうなるか。',
    c:['ふえる','すぐ絶滅する','植物になる','変化しない'], a:0,
    desc:'天敵がへると食べられる草食動物は一時的にふえます。するとえさの植物がへり、やがて全体のつり合いが調整されます。' },
  { subject:'biology', genre:'bio_eco', diff:'mid', type:'choice',
    q:'炭素が光合成・呼吸・食べる食べられるなどを通じて生物と環境の間をめぐる流れを何というか。',
    c:['食物連鎖だけ','窒素の固定','水の循環','炭素の循環'], a:3,
    desc:'炭素は二酸化炭素や有機物の形で、生物と大気・土の間を行き来します。この流れを炭素の循環といいます。' },

      // ───────── 地学 earth（選択式45問・大地/天気/天体）─────────
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'地下にある高温でどろどろにとけた物質を何というか。',
    c:['マグマ','溶岩','火山灰','軽石'], a:0,
    desc:'地下にあるとけた岩石をマグマといいます。地表に出たものは溶岩と呼ばれます。' },
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'ねばりけの小さいマグマでできやすい火山の形はどれか。',
    c:['傾きがゆるやかな火山','盛り上がったドーム状の火山','急で高い火山','噴火しない火山'], a:0,
    desc:'ねばりけの小さいマグマは流れやすく、傾きがゆるやかな火山をつくりやすいです。' },
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'火山灰を観察したときに見られる、小さな粒の主な正体はどれか。',
    c:['鉱物や火山ガラス','花粉だけ','食塩だけ','生物の細胞だけ'], a:0,
    desc:'火山灰には鉱物の結晶や火山ガラスの小さな粒が含まれます。顕微鏡で形や色を観察できます。' },
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'地震で最初に伝わり、初期微動を起こす波はどれか。',
    c:['P波','S波','音波','電波'], a:0,
    desc:'P波はS波より速く伝わり、最初に到着して初期微動を起こします。S波は主要動に関係します。' },
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'地震で、あとから伝わり主要動を起こす波はどれか。',
    c:['S波','P波','光波','水蒸気'], a:0,
    desc:'S波はP波より遅く伝わりますが、到着すると大きなゆれである主要動を起こします。' },
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'地震そのものの規模を表す値はどれか。',
    c:['マグニチュード','震度','気圧','湿度'], a:0,
    desc:'マグニチュードは地震の規模を表します。震度はある場所でのゆれの強さを表します。' },
  { subject:'earth', genre:'earth_land', diff:'junior', type:'choice',
    q:'粒の大きさが2mm以上の粒を多く含む堆積岩はどれか。',
    c:['れき岩','砂岩','泥岩','石灰岩'], a:0,
    desc:'れき岩は2mm以上のれきを多く含む堆積岩です。砂岩や泥岩はより小さい粒からできています。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'マグマが地表付近で急に冷えてできる火成岩を何というか。',
    c:['火山岩','深成岩','堆積岩','変成岩'], a:0,
    desc:'火山岩はマグマが地表付近で急に冷えてできた岩石です。斑状組織を示すことが多いです。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'マグマが地下深くでゆっくり冷えてできる火成岩を何というか。',
    c:['深成岩','火山岩','凝灰岩','石灰岩'], a:0,
    desc:'深成岩は地下深くでゆっくり冷えてでき、結晶が大きく育ちやすいため等粒状組織になります。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'火山岩に多い、大きな結晶と細かな部分が混じった組織を何というか。',
    c:['斑状組織','等粒状組織','柱状組織','層状組織'], a:0,
    desc:'火山岩は急に冷えるため、先にできた大きな結晶と細かな石基からなる斑状組織になりやすいです。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'花こう岩の特徴として正しいものはどれか。',
    c:['深成岩で等粒状組織をもつ','火山岩で斑状組織をもつ','堆積岩で化石を多く含む','火山灰が固まった岩石である'], a:0,
    desc:'花こう岩は地下深くでゆっくり冷えてできた深成岩で、等粒状組織をもちます。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'火山灰が固まってできた堆積岩はどれか。',
    c:['凝灰岩','石灰岩','チャート','泥岩'], a:0,
    desc:'凝灰岩は火山灰などが堆積して固まった岩石です。火山活動があったことを示す手がかりになります。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'地層ができた当時の環境を知る手がかりになる化石を何というか。',
    c:['示相化石','示準化石','鉱物化石','火山化石'], a:0,
    desc:'示相化石は地層ができた当時の環境を知る手がかりになります。サンゴは暖かく浅い海の環境を示します。' },
  { subject:'earth', genre:'earth_land', diff:'mid', type:'choice',
    q:'地層ができた年代を知る手がかりになる化石を何というか。',
    c:['示準化石','示相化石','断層化石','鉱物化石'], a:0,
    desc:'示準化石は地層の年代を知る手がかりです。広い範囲に分布し、短い期間に栄えた生物の化石が適しています。' },
  { subject:'earth', genre:'earth_land', diff:'senior', type:'choice',
    q:'石灰岩にうすい塩酸をかけたとき発生する気体はどれか。',
    c:['二酸化炭素','酸素','水素','窒素'], a:0,
    desc:'石灰岩は炭酸カルシウムを多く含み、うすい塩酸をかけると二酸化炭素が発生します。' },
  { subject:'earth', genre:'earth_land', diff:'senior', type:'choice',
    q:'地層が左右から押されて曲がった構造を何というか。',
    c:['しゅう曲','断層','隆起','沈降'], a:0,
    desc:'しゅう曲は地層が力を受けて曲がった構造です。断層は地層が切れてずれた構造です。' },
  { subject:'earth', genre:'earth_land', diff:'senior', type:'choice',
    q:'震源の真上にある地表の点を何というか。',
    c:['震央','震源','震度','初期微動'], a:0,
    desc:'震源は地下で地震が発生した場所、震央はその真上の地表の点です。' },
  { subject:'earth', genre:'earth_land', diff:'senior', type:'choice',
    q:'初期微動継続時間について正しい説明はどれか。',
    c:['震源から遠いほど長くなる','震源から遠いほど短くなる','場所に関係なく必ず同じ','主要動のあとに始まる'], a:0,
    desc:'P波とS波の速さが違うため、震源から遠いほど到着時刻の差が大きくなり、初期微動継続時間は長くなります。' },

  { subject:'earth', genre:'earth_weather', diff:'junior', type:'choice',
    q:'空気中に含むことができる水蒸気の最大量を何というか。',
    c:['飽和水蒸気量','露点','湿度','気圧'], a:0,
    desc:'飽和水蒸気量は空気が含むことのできる水蒸気の最大量です。温度が高いほど大きくなります。' },
  { subject:'earth', genre:'earth_weather', diff:'junior', type:'choice',
    q:'空気を冷やしたとき、水蒸気が水滴になり始める温度を何というか。',
    c:['露点','湿度','気圧','風力'], a:0,
    desc:'露点は空気中の水蒸気が凝結し始める温度です。露点以下になると水滴ができやすくなります。' },
  { subject:'earth', genre:'earth_weather', diff:'junior', type:'choice',
    q:'気圧を表す単位として使われるものはどれか。',
    c:['hPa','℃','％','m/s'], a:0,
    desc:'気圧はヘクトパスカル、記号hPaで表します。天気図では等圧線とともに使われます。' },
  { subject:'earth', genre:'earth_weather', diff:'junior', type:'choice',
    q:'まわりより気圧が高いところを何というか。',
    c:['高気圧','低気圧','前線','露点'], a:0,
    desc:'まわりより気圧が高いところを高気圧といいます。一般に下降気流が起こり、晴れやすいです。' },
  { subject:'earth', genre:'earth_weather', diff:'junior', type:'choice',
    q:'まわりより気圧が低いところを何というか。',
    c:['低気圧','高気圧','等圧線','季節風'], a:0,
    desc:'まわりより気圧が低いところを低気圧といいます。一般に上昇気流が起こり、雲ができやすいです。' },
  { subject:'earth', genre:'earth_weather', diff:'junior', type:'choice',
    q:'風向は何を表すか。',
    c:['風が吹いてくる方向','風が吹いていく方向','雲が動く速さ','気圧の高さ'], a:0,
    desc:'風向は風が吹いてくる方向で表します。北風は北から南へ向かって吹く風です。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'雲ができる主なしくみとして正しいものはどれか。',
    c:['空気が上昇して冷え、水蒸気が水滴や氷の粒になる','空気が下降して必ず温まる','水蒸気がすべて酸素に変わる','気圧が高いほど必ず雲が増える'], a:0,
    desc:'空気が上昇すると膨張して冷え、露点に達すると水蒸気が凝結して雲の粒になります。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'冷たい空気が暖かい空気を押し上げて進む前線はどれか。',
    c:['寒冷前線','温暖前線','停滞前線','閉そく前線'], a:0,
    desc:'寒冷前線では冷たい空気が暖かい空気の下にもぐりこみ、暖かい空気を急に押し上げます。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'暖かい空気が冷たい空気の上にはい上がって進む前線はどれか。',
    c:['温暖前線','寒冷前線','停滞前線','等圧線'], a:0,
    desc:'温暖前線では暖かい空気が冷たい空気の上をゆるやかにはい上がります。広い範囲で雨が降りやすいです。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'梅雨の時期に日本付近にできやすい前線はどれか。',
    c:['停滞前線','寒冷前線','温暖前線','閉そく前線'], a:0,
    desc:'梅雨の時期には、性質の異なる気団の間に停滞前線ができやすく、雨の日が続きます。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'冬の日本付近に強く影響する、冷たく乾いた気団はどれか。',
    c:['シベリア気団','小笠原気団','オホーツク海気団','赤道気団'], a:0,
    desc:'シベリア気団は冷たく乾いた大陸性の気団で、冬の日本の季節風に大きく関係します。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'夏の日本付近に強く影響する、暖かく湿った気団はどれか。',
    c:['小笠原気団','シベリア気団','揚子江気団','オホーツク海気団'], a:0,
    desc:'小笠原気団は暖かく湿った海洋性の気団で、夏の日本の天気に大きく影響します。' },
  { subject:'earth', genre:'earth_weather', diff:'mid', type:'choice',
    q:'天気図で、気圧の等しい地点を結んだ線を何というか。',
    c:['等圧線','前線','緯線','子午線'], a:0,
    desc:'等圧線は気圧が同じ地点を結んだ線です。間隔がせまいほど風が強くなりやすいです。' },
  { subject:'earth', genre:'earth_weather', diff:'senior', type:'choice',
    q:'寒冷前線が通過したあとに起こりやすい変化はどれか。',
    c:['気温が下がる','気温が必ず上がる','風が完全に止まる','気圧が0になる'], a:0,
    desc:'寒冷前線の通過後は冷たい空気に入れかわるため、気温が下がりやすくなります。' },
  { subject:'earth', genre:'earth_weather', diff:'senior', type:'choice',
    q:'空気中の水蒸気量が同じとき、気温が下がると湿度はどうなりやすいか。',
    c:['高くなる','低くなる','必ず0％になる','必ず変化しない'], a:0,
    desc:'気温が下がると飽和水蒸気量が小さくなるため、同じ水蒸気量でも湿度は高くなりやすいです。' },
  { subject:'earth', genre:'earth_weather', diff:'senior', type:'choice',
    q:'低気圧の中心付近で雲ができやすい主な理由はどれか。',
    c:['上昇気流が起こりやすいから','下降気流だけが起こるから','水蒸気が存在しないから','空気がまったく動かないから'], a:0,
    desc:'低気圧では中心付近に空気が集まり、上昇気流が起こりやすくなります。空気が冷えて雲ができやすいです。' },
  { subject:'earth', genre:'earth_weather', diff:'senior', type:'choice',
    q:'日本海側で冬に雪が多くなりやすい理由として最も適切なものはどれか。',
    c:['季節風が日本海で水蒸気を含み、山地で上昇するから','太平洋の海水がすべて凍るから','小笠原気団が乾いた風を送るから','梅雨前線が一年中停滞するから'], a:0,
    desc:'冬の北西の季節風は日本海を渡る間に水蒸気を含み、山地で上昇して雲をつくるため日本海側に雪を降らせます。' },

  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'地球が自転しているために起こる見かけの天体の動きを何というか。',
    c:['日周運動','年周運動','公転','満ち欠け'], a:0,
    desc:'地球が自転しているため、太陽や星は一日の間に東から西へ動くように見えます。これを日周運動といいます。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'太陽や星が一日のうちに動いて見える向きはどれか。',
    c:['東から西','西から東','北から南だけ','南から北だけ'], a:0,
    desc:'地球が西から東へ自転しているため、天体は見かけ上、東から西へ動いて見えます。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'地球が太陽のまわりを回る運動を何というか。',
    c:['公転','自転','日食','月食'], a:0,
    desc:'地球が太陽のまわりを約1年で1周する運動を公転といいます。季節の変化にも関係します。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'地球の地軸は、公転面に垂直な方向から約何度傾いているか。',
    c:['23.4度','3.14度','66.6度','90度'], a:0,
    desc:'地軸は公転面に垂直な方向から約23.4度傾いています。この傾きが季節による太陽高度の変化に関係します。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'太陽の表面に見られる、まわりより温度が低く暗く見える部分を何というか。',
    c:['黒点','満月','銀河','コロナだけ'], a:0,
    desc:'黒点は太陽の表面に見える暗い部分で、まわりより温度が低いため暗く見えます。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'月が地球の影に入って欠けて見える現象はどれか。',
    c:['月食','日食','満月','新月'], a:0,
    desc:'月食は月が地球の影に入る現象です。太陽、地球、月の順にほぼ一直線に並ぶと起こります。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'月が太陽の前を横切り、太陽が欠けて見える現象はどれか。',
    c:['日食','月食','年周運動','南中'], a:0,
    desc:'日食は月が太陽をかくすことで起こります。太陽、月、地球の順にほぼ一直線に並ぶと起こります。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'夕方、西の空に見える金星を何というか。',
    c:['よいの明星','明けの明星','北極星','夏の大三角'], a:0,
    desc:'夕方に西の空に見える金星をよいの明星といいます。明け方に東の空に見える金星は明けの明星です。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'水星・金星・地球・火星のように、岩石でできた小型の惑星を何というか。',
    c:['地球型惑星','木星型惑星','恒星','衛星'], a:0,
    desc:'水星、金星、地球、火星は岩石でできた小型の地球型惑星です。木星や土星は木星型惑星です。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'星座早見を使うとき、合わせる必要があるものはどれか。',
    c:['観察する月日と時刻','気温と湿度','震度とマグニチュード','風向と風力だけ'], a:0,
    desc:'星座早見は観察する月日と時刻を合わせて、そのとき見える星座の位置を調べます。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'地球が地軸を中心に1日に1回転する運動を何というか。',
    c:['公転','自転','満ち欠け','年周運動'], a:1,
    desc:'地球は西から東へ1日1回自転します。これにより太陽や星は東から西へ動いて見えます。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'太陽や星が1日のうちに東から西へ動いて見える、見かけの動きを何というか。',
    c:['日周運動','年周運動','公転','満ち欠け'], a:0,
    desc:'地球の自転により、太陽や星は1日で東→南→西へと動いて見えます。これを日周運動といいます。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'地球が太陽のまわりを1年に1回まわる運動を何というか。',
    c:['自転','公転','日周運動','満ち欠け'], a:1,
    desc:'地球は太陽のまわりを1年で1周公転します。地軸がかたむいたまま公転するため季節が生じます。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'季節によって太陽の南中高度や昼の長さが変わる、おもな原因はどれか。',
    c:['地軸が公転面に対してかたむいているから','月が地球を引っぱるから','太陽が地球を回るから','大気が動くから'], a:0,
    desc:'地軸が公転面に対して約23.4度かたむいたまま公転するため、季節によって太陽の南中高度や昼の長さが変わります。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'太陽のように、みずから光を出す天体を何というか。',
    c:['惑星','衛星','恒星','すい星'], a:2,
    desc:'みずから光り輝く天体を恒星といいます。太陽は恒星です。惑星や衛星は太陽の光を反射しています。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'地球のまわりを公転し、満ち欠けして見える天体はどれか。',
    c:['太陽','月','北極星','火星'], a:1,
    desc:'月は地球のまわりを公転する衛星で、太陽の光を反射し、位置関係によって満ち欠けして見えます。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'明け方の東の空や夕方の西の空に見え、真夜中には見えない惑星はどれか。',
    c:['金星','土星','火星','木星'], a:0,
    desc:'金星は地球より内側を公転する内惑星のため、明けの明星(明け方の東)・宵の明星(夕方の西)として見え、真夜中には見えません。' },
  { subject:'earth', genre:'earth_space', diff:'mid', type:'choice',
    q:'太陽を中心に、地球をふくむ8つの惑星などが集まったまとまりを何というか。',
    c:['銀河系','太陽系','星座','星団'], a:1,
    desc:'太陽と、そのまわりを公転する8つの惑星・衛星などのまとまりを太陽系といいます。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'惑星のまわりを公転する、月のような天体を何というか。',
    c:['恒星','衛星','すい星','銀河'], a:1,
    desc:'惑星のまわりを公転する天体を衛星といいます。月は地球の衛星です。' },
  { subject:'earth', genre:'earth_space', diff:'senior', type:'choice',
    q:'同じ時刻に観察すると、星座は1か月でおよそ何度、東から西へずれて見えるか。',
    c:['約30度','約90度','約180度','動かない'], a:0,
    desc:'地球の公転により、同じ時刻に見える星座は1か月で約30度(1年で約360度)西へずれます。これを年周運動といいます。' },

      // ───────── 化学 追加（2026-06-02・反応/イオン/化学式/実験）─────────
  { subject: 'chemistry', genre: 'reaction', diff: 'senior', type: 'typing', name: '過酸化水素の分解', formula: 'O2', display: '2H2O2 → 2H2O + [ ? ]', desc: '過酸化水素は二酸化マンガンを触媒にすると、水と酸素に分解する。酸素は火のついた線香を激しく燃やす。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'senior', type: 'typing', name: '水素の燃焼', formula: 'H2O', display: '2H2 + O2 → 2[ ? ]', desc: '水素は酸素と反応して水をつくる。水素2分子と酸素1分子から水2分子ができる。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'senior', type: 'typing', name: '鉄と塩酸の反応', formula: 'FeCl2', display: 'Fe + 2HCl → [ ? ] + H2', desc: '鉄がうすい塩酸と反応すると塩化鉄(II)と水素ができる。塩素原子が2個あるためFeCl2になる。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'senior', type: 'typing', name: '塩化銅水溶液の電気分解', formula: 'Cu', display: 'CuCl2 → [ ? ] + Cl2', desc: '塩化銅水溶液を電気分解すると、陰極に赤色の銅が付着し、陽極から塩素が発生する。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'senior', type: 'typing', name: '水酸化カルシウムと塩酸の中和', formula: 'CaCl2', display: 'Ca(OH)2 + 2HCl → [ ? ] + 2H2O', desc: '水酸化カルシウムはOHを2個もつため、塩酸2個と中和して塩化カルシウムと水をつくる。' },

  { subject: 'chemistry', genre: 'reaction', diff: 'supreme', type: 'typing', name: 'ブタンの完全燃焼', formula: 'O2', display: '2C4H10 + 13[ ? ] → 8CO2 + 10H2O', desc: 'ブタンを完全燃焼させると二酸化炭素と水ができる。係数を整数にそろえると酸素分子は13個になる。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'supreme', type: 'typing', name: 'グルコースの酸化', formula: 'CO2', display: 'C6H12O6 + 6O2 → 6[ ? ] + 6H2O', desc: 'グルコースが酸素と反応すると二酸化炭素と水ができる。炭素原子6個に合わせてCO2は6個になる。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'supreme', type: 'typing', name: '炭酸ナトリウムと塩酸の反応', formula: 'NaCl', display: 'Na2CO3 + 2HCl → 2[ ? ] + H2O + CO2', desc: '炭酸塩に酸を加えると二酸化炭素が発生する。ナトリウム2個に合わせて塩化ナトリウムは2個できる。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'supreme', type: 'typing', name: '酸化銅の水素による還元', formula: 'H2O', display: 'CuO + H2 → Cu + [ ? ]', desc: '水素が酸化銅から酸素をうばい、銅ができる。水素は酸素と結びついて水になる。' },
  { subject: 'chemistry', genre: 'reaction', diff: 'supreme', type: 'typing', name: '炭酸カルシウムの熱分解', formula: 'CaO', display: 'CaCO3 → [ ? ] + CO2', desc: '炭酸カルシウムを強く加熱すると、酸化カルシウムと二酸化炭素に分解する。石灰石の分解として扱われる。' },

  { subject: 'chemistry', genre: 'ion', diff: 'mid', type: 'typing', name: '銀イオン', formula: 'Ag+', desc: '銀原子が電子を1個失った陽イオン。塩化物イオンと結びつくと白色沈殿の塩化銀をつくる。' },
  { subject: 'chemistry', genre: 'ion', diff: 'mid', type: 'typing', name: '鉄(II)イオン', formula: 'Fe2+', desc: '鉄原子が電子を2個失った陽イオン。鉄には価数の違うイオンがあるため、電荷を区別して覚える。' },
  { subject: 'chemistry', genre: 'ion', diff: 'mid', type: 'typing', name: '鉄(III)イオン', formula: 'Fe3+', desc: '鉄原子が電子を3個失った陽イオン。鉄(II)イオンとは電荷が異なる。' },
  { subject: 'chemistry', genre: 'ion', diff: 'mid', type: 'typing', name: '硝酸の電離', formula: 'NO3-', display: 'HNO3 → H+ + [ ? ]', desc: '硝酸は水中で水素イオンと硝酸イオンに分かれる。酸性を示す原因はH+である。' },
  { subject: 'chemistry', genre: 'ion', diff: 'mid', type: 'typing', name: '水酸化バリウムの電離', formula: 'Ba2+', display: 'Ba(OH)2 → [ ? ] + 2OH-', desc: '水酸化バリウムは水中でバリウムイオンと水酸化物イオンに分かれ、アルカリ性を示す。' },

  { subject: 'chemistry', genre: 'formula', diff: 'mid', type: 'typing', name: '水酸化カルシウム', formula: 'Ca(OH)2', desc: '石灰水の主な成分。水に少し溶けてアルカリ性を示し、二酸化炭素と反応すると白くにごる。' },
  { subject: 'chemistry', genre: 'formula', diff: 'mid', type: 'typing', name: '塩化カルシウム', formula: 'CaCl2', desc: 'カルシウムイオンと塩化物イオンからできる塩。カルシウムは2価、塩化物イオンは1価なのでClが2個必要。' },
  { subject: 'chemistry', genre: 'formula', diff: 'mid', type: 'typing', name: '硝酸銀', formula: 'AgNO3', desc: '銀イオンと硝酸イオンからできる物質。塩化物イオンの確認で白色沈殿をつくる実験に使われる。' },
  { subject: 'chemistry', genre: 'formula', diff: 'mid', type: 'typing', name: '硫酸銅', formula: 'CuSO4', desc: '銅イオンと硫酸イオンからできる物質。水溶液は青色を示し、水酸化ナトリウムで青白い沈殿を生じる。' },

  { subject: 'chemistry', genre: 'experiment', diff: 'mid', type: 'choice', name: '水素の発生方法',
    q: '水素を発生させる方法として正しいものはどれか？',
    c: ['亜鉛にうすい塩酸を加える', '石灰石にうすい塩酸を加える', '二酸化マンガンに過酸化水素水を加える', '炭酸水素ナトリウムを加熱する'], a: 0,
    desc: '亜鉛など一部の金属はうすい塩酸と反応して水素を発生する。石灰石と塩酸では二酸化炭素が出る。' },
  { subject: 'chemistry', genre: 'experiment', diff: 'mid', type: 'choice', name: '水素の確認',
    q: '集めた気体が水素かどうかを確かめる方法として正しいものはどれか？',
    c: ['火のついたマッチを近づける', '石灰水に通す', '赤色リトマス紙を青くするか見る', 'においを直接かぐ'], a: 0,
    desc: '水素は火を近づけるとポンッと音を立てて燃える。石灰水を白くにごらせるのは二酸化炭素の確認である。' },
  { subject: 'chemistry', genre: 'experiment', diff: 'mid', type: 'choice', name: '二酸化炭素の確認',
    q: '発生した気体が二酸化炭素かどうかを確かめる方法はどれか？',
    c: ['石灰水に通して白くにごるか見る', '火のついた線香を入れて激しく燃えるか見る', '火を近づけて音を聞く', '乾いた青色リトマス紙だけを入れる'], a: 0,
    desc: '二酸化炭素は石灰水と反応して炭酸カルシウムを生じ、石灰水を白くにごらせる。' },
  { subject: 'chemistry', genre: 'experiment', diff: 'mid', type: 'choice', name: 'アンモニアの確認',
    q: 'アンモニアが発生したことを確かめる方法として正しいものはどれか？',
    c: ['ぬらした赤色リトマス紙を青くするか見る', '石灰水に通して白くにごるか見る', '火を近づけてポンッと鳴るか見る', '火のついた線香が激しく燃えるか見る'], a: 0,
    desc: 'アンモニアは水に溶けるとアルカリ性を示すため、ぬらした赤色リトマス紙を青色に変える。' },
  { subject: 'chemistry', genre: 'experiment', diff: 'mid', type: 'choice', name: '炭酸水素ナトリウム加熱時の水の確認',
    q: '炭酸水素ナトリウムを加熱してできた液体が水かどうかを確かめる試薬はどれか？',
    c: ['青色の塩化コバルト紙', '石灰水', 'BTB溶液', '硝酸銀水溶液'], a: 0,
    desc: '青色の塩化コバルト紙は水にふれると赤色に変わる。炭酸水素ナトリウムの分解では水も生じる。' },
  { subject: 'chemistry', genre: 'experiment', diff: 'mid', type: 'choice', name: '塩化物イオンの確認',
    q: '水溶液中に塩化物イオンがあるか調べるときに加える水溶液はどれか？',
    c: ['硝酸銀水溶液', '石灰水', 'フェノールフタレイン溶液', 'デンプン溶液'], a: 0,
    desc: '塩化物イオンに銀イオンを加えると、水に溶けにくい白色沈殿の塩化銀ができる。' },
    // ▼ 問題増強 +94（Codex下書き→Claude検算/重複除去/選択肢シャッフル済 2026-06-02）
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"水酸化バリウムと塩酸の中和","formula":"BaCl2","display":"Ba(OH)2 + 2HCl → [ ? ] + 2H2O","desc":"水酸化バリウムは2個のOH-をもつので、塩酸2個と中和して塩化バリウムと水をつくる。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"水酸化バリウムと塩酸の中和","formula":"HCl","display":"Ba(OH)2 + 2[ ? ] → BaCl2 + 2H2O","desc":"OH-が2個あるため、H+を出す塩酸も2個必要になる。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"硝酸と水酸化ナトリウムの中和","formula":"NaNO3","display":"HNO3 + NaOH → [ ? ] + H2O","desc":"硝酸と水酸化ナトリウムが中和すると、塩である硝酸ナトリウムと水ができる。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"硝酸と水酸化ナトリウムの中和","formula":"HNO3","display":"[ ? ] + NaOH → NaNO3 + H2O","desc":"酸のH+とアルカリのOH-が結びついて水になり、残りのイオンが塩をつくる。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"鉄と塩酸の反応","formula":"H2","display":"Fe + 2HCl → FeCl2 + [ ? ]","desc":"金属が酸と反応すると水素が発生する例で、発生気体はマッチの火で音を立てて燃える。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"酸化銅と水素の還元","formula":"Cu","display":"CuO + H2 → [ ? ] + H2O","desc":"水素が酸化銅から酸素をうばい、銅ができる。水素は同時に酸化されて水になる。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"酸化銅と水素の還元","formula":"H2O","display":"CuO + H2 → Cu + [ ? ]","desc":"還元後にできる水は、酸化銅に含まれていた酸素と水素が結びついたもの。"},
    {"subject":"chemistry","genre":"reaction","diff":"senior","type":"typing","name":"炭酸ナトリウムと塩酸の反応","formula":"CO2","display":"Na2CO3 + 2HCl → 2NaCl + H2O + [ ? ]","desc":"炭酸塩に酸を加えると二酸化炭素が発生しやすい。残りは塩と水になる。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"ブタンの完全燃焼","formula":"CO2","display":"2C4H10 + 13O2 → 8[ ? ] + 10H2O","desc":"炭素原子が合計8個あるため、完全燃焼で二酸化炭素は8個生じる。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"アンモニアの生成","formula":"NH3","display":"N2 + 3H2 → 2[ ? ]","desc":"窒素分子1個と水素分子3個からアンモニア分子2個ができると、原子数がそろう。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"アンモニアの生成","formula":"H2","display":"N2 + 3[ ? ] → 2NH3","desc":"右辺の水素原子は6個なので、左辺には水素分子3個が必要になる。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"酸化カルシウムと水の反応","formula":"Ca(OH)2","display":"CaO + H2O → [ ? ]","desc":"酸化カルシウムに水を加えると水酸化カルシウムができ、強い発熱をともなう。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"酸化カルシウムと水の反応","formula":"CaO","display":"[ ? ] + H2O → Ca(OH)2","desc":"石灰乾燥剤などに使われる酸化カルシウムは、水と反応して水酸化カルシウムになる。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"二酸化炭素と石灰水の反応","formula":"CaCO3","display":"CO2 + Ca(OH)2 → [ ? ] + H2O","desc":"石灰水が白くにごるのは、水に溶けにくい炭酸カルシウムができるため。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"二酸化炭素と石灰水の反応","formula":"Ca(OH)2","display":"CO2 + [ ? ] → CaCO3 + H2O","desc":"二酸化炭素の確認には水酸化カルシウム水溶液である石灰水を使う。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"硫化鉄と塩酸の反応","formula":"H2S","display":"FeS + 2HCl → FeCl2 + [ ? ]","desc":"硫化鉄に塩酸を加えると、腐卵臭のある硫化水素が発生する。"},
    {"subject":"chemistry","genre":"reaction","diff":"supreme","type":"typing","name":"硫化鉄と塩酸の反応","formula":"FeCl2","display":"FeS + 2HCl → [ ? ] + H2S","desc":"鉄は塩化物イオンと結びつき、塩化鉄(II)として水溶液中に残る。"},
    {"subject":"physics","genre":"light_sound","diff":"junior","type":"choice","q":"鏡に当たった光について、入射角と反射角の関係はどれか。","c":["角度は光の色だけで決まる","反射角の方が常に大きい","入射角の方が常に大きい","入射角と反射角は等しい"],"a":3,"desc":"光の反射では、法線を基準に測った入射角と反射角が等しくなる。"},
    {"subject":"physics","genre":"light_sound","diff":"junior","type":"choice","q":"空気中から水中へ光がななめに進むとき、光はどのように進むか。","c":["必ず直進する","境目で曲がる","完全に消える","水面にそって進む"],"a":1,"desc":"光が別の物質へ進むと速さが変わり、境界面で進む向きが変わる。これを屈折という。"},
    {"subject":"physics","genre":"light_sound","diff":"junior","type":"choice","q":"音が伝わるために必要なものとして正しいものはどれか。","c":["光","音を伝える物質","必ず金属","真空だけ"],"a":1,"desc":"音は空気や水、金属などの物質の振動として伝わる。真空中では伝わらない。"},
    {"subject":"physics","genre":"light_sound","diff":"mid","type":"choice","q":"凸レンズで実像をスクリーンに映すとき、像の向きは物体に対してどうなるか。","c":["上下左右が逆","同じ向き","上下だけ同じ","左右だけ同じ"],"a":0,"desc":"凸レンズによる実像は、物体に対して上下左右が逆向きにできる。"},
    {"subject":"physics","genre":"light_sound","diff":"mid","type":"choice","q":"音の高さを大きく左右する量はどれか。","c":["温度計の目盛り","振動数","振幅","音源の色"],"a":1,"desc":"振動数が大きいほど高い音になる。振幅は主に音の大きさに関係する。"},
    {"subject":"physics","genre":"light_sound","diff":"mid","type":"typing","plain":true,"name":"音の速さ","formula":"340","display":"音が1秒で340m進んだ。この音の速さは [ ? ] m/s","desc":"速さは距離を時間で割って求める。340mを1秒で進むので340m/s。"},
    {"subject":"physics","genre":"force","diff":"junior","type":"choice","q":"ばねに加える力を2倍にしたとき、のびが比例の範囲にあるなら、のびはどうなるか。","c":["変わらない","2倍になる","必ず0になる","半分になる"],"a":1,"desc":"ばねののびは、限度内では加えた力に比例する。これをフックの法則として扱う。"},
    {"subject":"physics","genre":"force","diff":"junior","type":"choice","q":"圧力を大きくする方法として正しいものはどれか。","c":["同じ力で面積を大きくする","同じ力で面積を小さくする","力を0にする","面積だけを無限に大きくする"],"a":1,"desc":"圧力は力を面積で割った量なので、同じ力なら面積が小さいほど大きい。"},
    {"subject":"physics","genre":"force","diff":"mid","type":"typing","plain":true,"name":"圧力の計算","formula":"200","display":"20Nの力が0.10m2の面にかかる。圧力は [ ? ] Pa","desc":"圧力は力÷面積。20÷0.10=200Paとなる。"},
    {"subject":"physics","genre":"force","diff":"mid","type":"typing","plain":true,"name":"ばねののび","formula":"6","display":"1Nで2cmのびるばねに3Nを加える。のびは [ ? ] cm","desc":"のびが力に比例するので、力が3倍ならのびも3倍で6cmになる。"},
    {"subject":"physics","genre":"force","diff":"mid","type":"choice","q":"水中の物体にはたらく浮力について正しい説明はどれか。","c":["空気中でだけ生じる","下向きにはたらく","重力と同じ意味である","上向きにはたらく"],"a":3,"desc":"浮力は液体や気体から受ける上向きの力で、物体を持ち上げる向きにはたらく。"},
    {"subject":"physics","genre":"electricity","diff":"junior","type":"choice","q":"回路を流れる電流の向きとして、中学校で約束されている向きはどれか。","c":["電池のマイナス極からプラス極","導線の外へ逃げる向き","電子と必ず同じ向き","電池のプラス極からマイナス極"],"a":3,"desc":"電流の向きはプラス極からマイナス極へ流れる向きとして扱う。電子の移動向きとは逆になる。"},
    {"subject":"physics","genre":"electricity","diff":"mid","type":"typing","plain":true,"name":"オームの法則","formula":"3","display":"6Vの電圧を2Ωの抵抗に加える。電流は [ ? ] A","desc":"電流=電圧÷抵抗。6÷2=3Aとなる。"},
    {"subject":"physics","genre":"electricity","diff":"mid","type":"typing","plain":true,"name":"抵抗の計算","formula":"4","display":"8Vで2A流れる抵抗の大きさは [ ? ] Ω","desc":"抵抗=電圧÷電流。8÷2=4Ωである。"},
    {"subject":"physics","genre":"electricity","diff":"senior","type":"choice","q":"直列回路で2つの抵抗をつなぐと、回路全体の抵抗はどうなるか。","c":["片方だけになる","各抵抗の和になる","必ず小さくなる","電池の個数だけで決まる"],"a":1,"desc":"直列回路の合成抵抗は各抵抗の和になるため、抵抗を増やすほど電流は流れにくくなる。"},
    {"subject":"physics","genre":"electricity","diff":"senior","type":"typing","plain":true,"name":"電力の計算","formula":"12","display":"3Vで4A流れる器具の電力は [ ? ] W","desc":"電力=電圧×電流。3×4=12Wになる。"},
    {"subject":"physics","genre":"electricity","diff":"supreme","type":"typing","plain":true,"name":"電力量の計算","formula":"600","display":"100Wの器具を6秒使った。電力量は [ ? ] J","desc":"電力量は電力×時間。100Wは1秒あたり100Jなので、6秒で600J。"},
    {"subject":"physics","genre":"electricity","diff":"supreme","type":"choice","q":"コイルに電流を流したとき、コイルのまわりにできるものはどれか。","c":["真空","二酸化炭素","磁界","凸レンズ"],"a":2,"desc":"電流が流れる導線やコイルのまわりには磁界ができる。電磁石はこの性質を利用する。"},
    {"subject":"physics","genre":"motion","diff":"mid","type":"typing","plain":true,"name":"速さの計算","formula":"5","display":"20mを4秒で進む物体の速さは [ ? ] m/s","desc":"速さは距離÷時間。20÷4=5m/sである。"},
    {"subject":"physics","genre":"motion","diff":"mid","type":"choice","q":"一定の速さで進む物体の距離と時間のグラフは、どのような形になりやすいか。","c":["原点を通る直線","水平な直線だけ","ぎざぎざの線だけ","必ず円"],"a":0,"desc":"速さが一定なら、進んだ距離は時間に比例するため、距離-時間グラフは直線になる。"},
    {"subject":"physics","genre":"motion","diff":"senior","type":"typing","plain":true,"name":"仕事の計算","formula":"30","display":"10Nの力で物体を3m動かした。仕事は [ ? ] J","desc":"仕事=力×力の向きに動いた距離。10×3=30Jとなる。"},
    {"subject":"physics","genre":"motion","diff":"senior","type":"typing","plain":true,"name":"仕事率の計算","formula":"20","display":"100Jの仕事を5秒で行った。仕事率は [ ? ] W","desc":"仕事率=仕事÷時間。100÷5=20Wである。"},
    {"subject":"physics","genre":"motion","diff":"supreme","type":"choice","q":"摩擦や空気抵抗を無視できるとき、位置エネルギーと運動エネルギーについて正しいものはどれか。","c":["合計は保存される","運動エネルギーだけ増え続ける","どちらも常に0になる","位置エネルギーだけ保存される"],"a":0,"desc":"摩擦などで失われない場合、位置エネルギーと運動エネルギーの合計である力学的エネルギーは保存される。"},
    {"subject":"physics","genre":"motion","diff":"supreme","type":"typing","plain":true,"name":"平均の速さ","formula":"12","display":"60mを5秒で進んだ。平均の速さは [ ? ] m/s","desc":"平均の速さは全体の距離を全体の時間で割る。60÷5=12m/s。"},
    {"subject":"biology","genre":"bio_plant","diff":"junior","type":"choice","q":"植物の葉で光合成が主に行われる場所はどこか。","c":["道管","根毛","細胞壁","葉緑体"],"a":3,"desc":"光合成は葉の細胞にある葉緑体で行われ、光のエネルギーを使ってデンプンなどをつくる。"},
    {"subject":"biology","genre":"bio_plant","diff":"junior","type":"choice","q":"根から吸い上げた水が主に通る管はどれか。","c":["気孔","道管","師管","胚珠"],"a":1,"desc":"道管は根から吸収した水や無機養分を上へ運ぶ管である。"},
    {"subject":"biology","genre":"bio_plant","diff":"junior","type":"choice","q":"葉の裏に多く、気体の出入りを調節するすき間はどれか。","c":["子房","気孔","維管束","根冠"],"a":1,"desc":"気孔は二酸化炭素や酸素、水蒸気の出入りに関わり、蒸散にも関係する。"},
    {"subject":"biology","genre":"bio_plant","diff":"mid","type":"choice","q":"光合成で使われる材料の組み合わせとして正しいものはどれか。","c":["水素と塩素","水と二酸化炭素","酸素とデンプン","窒素と酸素"],"a":1,"desc":"光合成では水と二酸化炭素を材料にして、有機物と酸素をつくる。"},
    {"subject":"biology","genre":"bio_plant","diff":"mid","type":"choice","q":"師管の主なはたらきはどれか。","c":["細胞を守る殻になる","水だけを根へ運ぶ","花粉をつくる","光合成でできた養分を運ぶ"],"a":3,"desc":"師管は葉でつくられた養分を、茎や根など植物体の各部へ運ぶ。"},
    {"subject":"biology","genre":"bio_plant","diff":"senior","type":"choice","q":"被子植物で受精後に種子になる部分はどれか。","c":["柱頭","胚珠","がく","花弁"],"a":1,"desc":"被子植物では胚珠が受精後に種子となり、子房は果実になる。"},
    {"subject":"biology","genre":"bio_human","diff":"junior","type":"choice","q":"血液中で酸素を運ぶ主な成分はどれか。","c":["血小板","赤血球","白血球","血しょうだけ"],"a":1,"desc":"赤血球にはヘモグロビンが含まれ、肺で受け取った酸素を全身へ運ぶ。"},
    {"subject":"biology","genre":"bio_human","diff":"junior","type":"choice","q":"食物中のデンプンを分解し始める消化液はどれか。","c":["胃液","血液","だ液","胆汁"],"a":2,"desc":"だ液に含まれるアミラーゼはデンプンを糖に分解し始める。"},
    {"subject":"biology","genre":"bio_human","diff":"junior","type":"choice","q":"肺で酸素と二酸化炭素の交換が行われる小さなふくろはどれか。","c":["じん臓","小腸","心房","肺胞"],"a":3,"desc":"肺胞は表面積が大きく、毛細血管と接しているため気体交換に適している。"},
    {"subject":"biology","genre":"bio_human","diff":"mid","type":"choice","q":"小腸の柔毛が多いことの利点はどれか。","c":["血液をつくらない","水分をすべて捨てる","表面積が増え養分を吸収しやすい","食物を燃やす"],"a":2,"desc":"柔毛によって小腸の内側の表面積が大きくなり、消化された養分を効率よく吸収できる。"},
    {"subject":"biology","genre":"bio_human","diff":"mid","type":"choice","q":"刺激を受け取ってから反応するまでの経路で、中枢神経にあたるものはどれか。","c":["脳とせきずい","骨と関節","赤血球と血小板","皮膚と筋肉"],"a":0,"desc":"中枢神経は脳とせきずいで、刺激の情報を判断し命令を出す中心になる。"},
    {"subject":"biology","genre":"bio_human","diff":"senior","type":"choice","q":"腎臓の主なはたらきとして正しいものはどれか。","c":["酸素を取り込む","血液中の不要物をこし取り尿をつくる","光合成を行う","胆汁をつくる"],"a":1,"desc":"腎臓は血液をろ過し、不要物や余分な水分を尿として体外へ出す準備をする。"},
    {"subject":"biology","genre":"bio_human","diff":"senior","type":"choice","q":"反射について正しい説明はどれか。","c":["意識してから必ず起こる","血液の成分名である","脳を通らずせきずいなどで素早く起こる反応がある","植物だけに見られる"],"a":2,"desc":"熱いものから手を引くような反射は、危険を避けるために短い経路で素早く起こる。"},
    {"subject":"biology","genre":"bio_cell","diff":"mid","type":"choice","q":"細胞の核に主に含まれ、遺伝情報を担うものはどれか。","c":["デンプン","塩化ナトリウム","DNA","石灰水"],"a":2,"desc":"DNAは遺伝情報を担う物質で、染色体の重要な成分である。"},
    {"subject":"biology","genre":"bio_cell","diff":"mid","type":"choice","q":"体細胞分裂の結果、娘細胞の染色体数はもとの細胞と比べてどうなるか。","c":["必ず2倍になる","必ず半分になる","同じになる","0になる"],"a":2,"desc":"体細胞分裂では、同じ染色体数をもつ細胞ができ、からだの成長や修復に関わる。"},
    {"subject":"biology","genre":"bio_cell","diff":"senior","type":"choice","q":"減数分裂が行われる主な目的はどれか。","c":["酸素を運ぶ","生殖細胞をつくる","骨を硬くする","消化液を出す"],"a":1,"desc":"減数分裂では染色体数が半分の生殖細胞をつくり、受精後に染色体数がもとに戻る。"},
    {"subject":"biology","genre":"bio_cell","diff":"senior","type":"choice","q":"メンデルの法則で、対立形質のうち子に現れやすい形質を何というか。","c":["突然変異だけ","顕性形質","潜性形質","無性生殖"],"a":1,"desc":"対立形質のうち、組み合わせによって表れやすい方を顕性形質という。"},
    {"subject":"biology","genre":"bio_cell","diff":"senior","type":"choice","q":"受精について正しい説明はどれか。","c":["葉緑体が分裂する","卵と精子の核が合体する","水が蒸発する","血液が固まる"],"a":1,"desc":"受精では卵と精子の核が合体し、新しい個体のもとになる受精卵ができる。"},
    {"subject":"biology","genre":"bio_eco","diff":"junior","type":"choice","q":"生産者と呼ばれる生物の例として最も適切なものはどれか。","c":["肉食動物","緑色植物","分解者だけ","寄生虫だけ"],"a":1,"desc":"緑色植物は光合成で有機物をつくるため、生態系の生産者と呼ばれる。"},
    {"subject":"biology","genre":"bio_eco","diff":"junior","type":"choice","q":"食物連鎖のはじめに位置しやすい生物はどれか。","c":["病原菌だけ","分解された無機物","大型肉食動物","植物プランクトン"],"a":3,"desc":"植物プランクトンや植物は光合成で有機物をつくり、多くの食物連鎖の出発点になる。"},
    {"subject":"biology","genre":"bio_eco","diff":"mid","type":"choice","q":"分解者のはたらきとして正しいものはどれか。","c":["死がいやふんを分解し無機物に戻す","酸素を元素に変える","太陽光をなくす","すべての動物を捕食する"],"a":0,"desc":"菌類や細菌類などの分解者は、死がいや排出物を分解し、物質の循環を支える。"},
    {"subject":"biology","genre":"bio_eco","diff":"mid","type":"choice","q":"外来種が問題になる理由として適切なものはどれか。","c":["必ず光合成しない","すべて同じ大きさになる","水を飲まない","地域の生態系のつり合いを崩すことがある"],"a":3,"desc":"外来種は天敵が少ない環境で増えすぎたり、在来種を捕食・競争で減らしたりすることがある。"},
    {"subject":"earth","genre":"earth_land","diff":"junior","type":"choice","q":"火山灰が積もってできた粒の細かい岩石はどれか。","c":["れき岩","石灰岩","花こう岩","凝灰岩"],"a":3,"desc":"凝灰岩は火山灰などの火山噴出物が固まってできた岩石である。"},
    {"subject":"earth","genre":"earth_land","diff":"junior","type":"choice","q":"地震で最初に届き、ゆれが小さい波はどれか。","c":["音波","P波","津波","S波"],"a":1,"desc":"P波はS波より速く伝わるため先に届き、初期微動を起こす。"},
    {"subject":"earth","genre":"earth_land","diff":"junior","type":"choice","q":"堆積岩に含まれやすく、過去の生物や環境を知る手がかりになるものはどれか。","c":["磁力線","化石","太陽黒点","露点"],"a":1,"desc":"化石は生物のからだや生活のあとが残ったもので、地層ができた時代や環境の手がかりになる。"},
    {"subject":"earth","genre":"earth_land","diff":"mid","type":"choice","q":"マグマが地下深くでゆっくり冷えてできる岩石の特徴はどれか。","c":["粒がすべて見えない","必ずガラスだけになる","水にすぐ溶ける","大きな結晶が見られやすい"],"a":3,"desc":"深成岩は地下でゆっくり冷えるため、鉱物の結晶が大きく成長しやすい。"},
    {"subject":"earth","genre":"earth_land","diff":"mid","type":"choice","q":"地層の上下関係を考えるとき、ふつう下にある地層は上の地層よりどう判断されるか。","c":["古い","新しい","同じ日にできた","必ず火山灰である"],"a":0,"desc":"地層が乱されていない場合、下の層ほど先に堆積しており古いと考える。"},
    {"subject":"earth","genre":"earth_land","diff":"senior","type":"choice","q":"示準化石として適している生物の条件はどれか。","c":["狭い地域で長く生きた","広い地域に短い期間だけ栄えた","現在だけにいる","化石にならない"],"a":1,"desc":"示準化石は地層の年代を比べる手がかりなので、広く分布し短い期間に限られる生物が適している。"},
    {"subject":"earth","genre":"earth_land","diff":"senior","type":"choice","q":"震源と震央の関係として正しいものはどれか。","c":["震央は必ず海底","震源は地表の観測所","震源と震央は同じ深さ","震央は震源の真上の地表の点"],"a":3,"desc":"震源は地震が発生した地下の場所で、震央はその真上にあたる地表の点である。"},
    {"subject":"earth","genre":"earth_weather","diff":"junior","type":"choice","q":"空気中の水蒸気が冷えて水滴になり始める温度を何というか。","c":["露点","融点","震度","沸点"],"a":0,"desc":"露点まで冷えると水蒸気が凝結し、水滴や雲、露ができやすくなる。"},
    {"subject":"earth","genre":"earth_weather","diff":"junior","type":"choice","q":"天気図で高気圧の中心付近では、空気は主にどう動くか。","c":["下降しやすい","水平方向に動かない","宇宙へ出る","必ず上昇する"],"a":0,"desc":"高気圧では空気が下降しやすく、雲ができにくいため晴れやすい。"},
    {"subject":"earth","genre":"earth_weather","diff":"mid","type":"choice","q":"寒冷前線が通過するときに起こりやすい天気はどれか。","c":["風が完全に止まる","必ず快晴が続く","短時間の強い雨や雷","雪だけが1か月続く"],"a":2,"desc":"寒冷前線では寒気が暖気を急に押し上げるため、積乱雲が発達しやすい。"},
    {"subject":"earth","genre":"earth_weather","diff":"mid","type":"choice","q":"日本付近の天気が西から東へ移り変わりやすい主な理由はどれか。","c":["地球が止まっているため","海水がすべて東へ流れるため","月の満ち欠けだけ","偏西風の影響"],"a":3,"desc":"中緯度では偏西風が吹くため、低気圧や高気圧が西から東へ移動しやすい。"},
    {"subject":"earth","genre":"earth_weather","diff":"senior","type":"choice","q":"温暖前線の近くで見られやすい雲と天気の特徴はどれか。","c":["雲が瞬間的に消える","広い範囲でおだやかな雨が続きやすい","雨がまったく降らない","必ず竜巻だけが起こる"],"a":1,"desc":"温暖前線では暖気が寒気の上をゆるやかに上がるため、層状の雲と広い範囲の雨が生じやすい。"},
    {"subject":"earth","genre":"earth_weather","diff":"senior","type":"choice","q":"海風が昼に吹きやすい理由として正しいものはどれか。","c":["山から空気が出ない","月が海を押す","陸が海より温まりやすく、陸上で上昇気流ができる","海が必ず凍る"],"a":2,"desc":"昼は陸の方が温まりやすく、陸上の空気が上昇するため、海から陸へ風が吹きやすい。"},
    {"subject":"earth","genre":"earth_space","diff":"mid","type":"choice","q":"月が満ち欠けして見える主な理由はどれか。","c":["地球の自転が止まるから","月が燃えたり消えたりするから","月が毎日形を変える物質だから","太陽に照らされた部分の見え方が変わる"],"a":3,"desc":"月自体の形は変わらないが、太陽光を受けた半分のうち地球から見える部分が変わる。"},
    {"subject":"earth","genre":"earth_space","diff":"mid","type":"choice","q":"太陽が東から西へ動いて見える主な理由はどれか。","c":["地球が西から東へ自転するため","地球が公転しないため","太陽が地球の周りを1日に何周もするため","月が太陽を押すため"],"a":0,"desc":"地球が西から東へ自転するため、太陽や星は東から西へ動くように見える。"},
    {"subject":"earth","genre":"earth_space","diff":"mid","type":"choice","q":"金星が満ち欠けして見える理由として正しいものはどれか。","c":["金星が自分で発光するため","金星が地球の衛星だから","太陽の光を反射し、地球から見える照らされた部分が変わる","大気がないため必ず見えない"],"a":2,"desc":"金星は太陽のまわりを公転し、地球から見える明るい部分の割合が変化する。"},
    {"subject":"earth","genre":"earth_space","diff":"senior","type":"choice","q":"季節によって見える星座が変わる主な理由はどれか。","c":["地球の大気がなくなるため","月が星座を作るため","地球が太陽のまわりを公転するため","星座が毎月消滅するため"],"a":2,"desc":"地球が公転するため、夜に地球が向く宇宙の方向が季節によって変わる。"},
    {"subject":"earth","genre":"earth_space","diff":"senior","type":"choice","q":"日食が起こるときの太陽・月・地球の並びとして正しいものはどれか。","c":["太陽-地球-月","地球-太陽-月","太陽-月-地球","月-太陽-地球"],"a":2,"desc":"日食は月が太陽の前を通り、月の影が地球に落ちることで起こる。"},
    {"subject":"earth","genre":"earth_space","diff":"senior","type":"choice","q":"地軸が傾いたまま公転することで起こる現象として最も適切なものはどれか。","c":["音の反射","火山灰の堆積","季節の変化","地震の発生"],"a":2,"desc":"地軸が傾いているため、太陽高度や昼の長さが季節で変わり、気温の差が生じる。"},
    {"subject":"physics","genre":"electricity","diff":"senior","type":"typing","plain":true,"name":"発熱量の計算","formula":"240","display":"40Wの電熱線を6秒使った。発熱量は [ ? ] J","desc":"電気器具の発熱量は電力量と同じように電力×時間で求められる。40×6=240J。"},
    {"subject":"physics","genre":"electricity","diff":"supreme","type":"choice","q":"電磁誘導でコイルに電流を流すために必要な操作はどれか。","c":["導線を切る","コイルを完全に止めたままにする","抵抗を必ず0にする","コイルの中の磁界を変化させる"],"a":3,"desc":"コイルを貫く磁界が変化すると誘導電流が流れる。発電機はこの原理を利用する。"},
    {"subject":"physics","genre":"motion","diff":"senior","type":"choice","q":"斜面を下る台車で、摩擦が小さいとき速さはどう変化しやすいか。","c":["必ず一定になる","しだいに大きくなる","向きが毎秒逆になる","すぐ0になる"],"a":1,"desc":"斜面方向に重力の一部がはたらくため、台車は加速して速さが大きくなる。"},
    {"subject":"physics","genre":"force","diff":"mid","type":"typing","plain":true,"name":"密度の計算","formula":"2","display":"質量60g、体積30cm3の物体の密度は [ ? ] g/cm3","desc":"密度は質量÷体積。60÷30=2g/cm3となる。"},
    {"subject":"biology","genre":"bio_plant","diff":"senior","type":"choice","q":"裸子植物の特徴として正しいものはどれか。","c":["光合成をしない","根を持たない","花をまったく作らない","胚珠が子房に包まれずむき出しになる"],"a":3,"desc":"裸子植物は胚珠が子房に包まれない。マツなどでは胚珠がりん片についている。"},
    {"subject":"biology","genre":"bio_human","diff":"senior","type":"choice","q":"肝臓のはたらきとして適切なものはどれか。","c":["酸素と二酸化炭素を交換する","光を感じる","養分の一部をたくわえ、有害物質を分解する","尿をためる"],"a":2,"desc":"肝臓は養分の貯蔵や有害物質の分解、胆汁の生成など多くのはたらきをもつ。"},
    {"subject":"biology","genre":"bio_cell","diff":"senior","type":"choice","q":"無性生殖の特徴として正しいものはどれか。","c":["植物では起こらない","親と同じ形質をもつ個体ができやすい","染色体が消える","必ず精子と卵が必要"],"a":1,"desc":"無性生殖では生殖細胞の受精を伴わないため、親と同じ遺伝的性質をもつ個体ができやすい。"},
    {"subject":"biology","genre":"bio_eco","diff":"mid","type":"choice","q":"生態系で物質が循環するために分解者が重要な理由はどれか。","c":["動物を植物に変える","酸素をすべてなくす","太陽をつくる","有機物を無機物に戻し植物が利用できるようにする"],"a":3,"desc":"分解者は死がいやふんを分解し、無機物として環境に戻すことで物質循環を支える。"},
    {"subject":"earth","genre":"earth_land","diff":"senior","type":"choice","q":"火成岩を火山岩と深成岩に分ける主な基準はどれか。","c":["地震の震度だけ","マグマが冷え固まった場所や冷え方","化石の種類だけ","水に溶ける量だけ"],"a":1,"desc":"火山岩は地表付近で急に冷え、深成岩は地下深くでゆっくり冷えてできる。"},
    {"subject":"earth","genre":"earth_weather","diff":"senior","type":"choice","q":"飽和水蒸気量について正しい説明はどれか。","c":["雲の重さだけを表す","地震の強さを表す","空気が含むことのできる水蒸気の最大量で、温度が高いほど大きい","太陽の明るさを表す"],"a":2,"desc":"飽和水蒸気量は温度が高いほど大きく、空気が冷えると水蒸気が凝結しやすくなる。"},
    {"subject":"earth","genre":"earth_space","diff":"senior","type":"choice","q":"月食が起こるときの太陽・地球・月の並びとして正しいものはどれか。","c":["太陽-地球-月","月-太陽-地球","太陽-月-地球","地球-月-太陽"],"a":0,"desc":"月食は地球の影に月が入ることで起こるため、太陽・地球・月の順に並ぶ。"},
    {"subject":"earth","genre":"earth_weather","diff":"mid","type":"choice","q":"等圧線の間隔がせまい場所では、風はどうなりやすいか。","c":["必ず無風になる","気温が必ず0度になる","強く吹きやすい","風向が存在しない"],"a":2,"desc":"等圧線の間隔がせまいほど気圧の差が大きく、風は強く吹きやすい。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "タンポポやアサガオのように、花弁がたがいにくっついている花を何というか。", "c": ["合弁花", "離弁花", "裸子花", "単性花"], "a": 0, "desc": "花弁がくっついている花を合弁花、1枚ずつ離れている花を離弁花という。タンポポ・アサガオは合弁花。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "アブラナやサクラのように、花弁が1枚ずつ離れている花を何というか。", "c": ["胞子花", "離弁花", "合弁花", "単子葉花"], "a": 1, "desc": "花弁が1枚ずつ離れている花を離弁花という。アブラナ・サクラ・エンドウなどが当てはまる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "花のつくりを外側から順に正しく並べたものはどれか。", "c": ["めしべ→おしべ→花弁→がく", "花弁→がく→おしべ→めしべ", "がく→花弁→おしべ→めしべ", "おしべ→めしべ→花弁→がく"], "a": 2, "desc": "多くの花は外側からがく・花弁・おしべ・めしべの順に並び、中心にめしべがある。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "受粉したあと、成長して果実になる部分はどれか。", "c": ["やく", "柱頭", "花弁", "子房"], "a": 3, "desc": "受粉後、子房は果実に、子房の中の胚珠は種子になる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "受粉したあと、成長して種子になる部分はどれか。", "c": ["胚珠", "子房", "がく", "やく"], "a": 0, "desc": "胚珠は受粉後に種子になる。胚珠を包む子房は果実になる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "葉でつくられた養分（栄養分）を運ぶ管はどれか。", "c": ["道管", "師管", "気孔", "根毛"], "a": 1, "desc": "師管は葉でできた養分を植物全体へ運ぶ。道管は根からの水や無機養分を運ぶ。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "道管と師管が集まって束になっている部分を何というか。", "c": ["気孔", "胚珠", "維管束", "葉緑体"], "a": 2, "desc": "道管と師管が集まった束を維管束という。水や養分の通り道になる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "植物が根から吸い上げた水を、葉から水蒸気として出すはたらきを何というか。", "c": ["光合成", "呼吸", "蒸発のみ", "蒸散"], "a": 3, "desc": "根から吸った水を葉の気孔から水蒸気として出すはたらきを蒸散という。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "ホウセンカのなかまのように、子葉が2枚の植物を何というか。", "c": ["双子葉類", "単子葉類", "裸子植物", "コケ植物"], "a": 0, "desc": "子葉が2枚なら双子葉類、1枚なら単子葉類。ホウセンカ・アサガオは双子葉類。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "トウモロコシやイネのように、子葉が1枚の植物を何というか。", "c": ["裸子植物", "単子葉類", "双子葉類", "シダ植物"], "a": 1, "desc": "子葉が1枚なら単子葉類。トウモロコシ・イネ・ユリなどが当てはまる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "双子葉類の根に多く見られる、太い主根と細い側根からなるつくりを何というか。", "c": ["根毛だけ", "仮根", "主根と側根", "ひげ根"], "a": 2, "desc": "双子葉類は主根と側根からなる根をもつ。単子葉類はひげ根が多い。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "イネやトウモロコシのように、たくさんの細い根が広がる根を何というか。", "c": ["主根", "側根", "根毛", "ひげ根"], "a": 3, "desc": "単子葉類はひげ根をもつことが多い。双子葉類は主根と側根をもつ。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "次のうち、種子をつくらず胞子でふえる植物はどれか。", "c": ["イヌワラビ", "エンドウ", "イチョウ", "アブラナ"], "a": 0, "desc": "イヌワラビはシダ植物で胞子でふえる。イチョウは裸子植物、アブラナ・エンドウは被子植物。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "コケ植物について正しい説明はどれか。", "c": ["維管束が発達している", "根・茎・葉の区別がはっきりしない", "種子でふえる", "花を咲かせる"], "a": 1, "desc": "コケ植物は根・茎・葉の区別がはっきりせず、維管束もない。体の表面全体から水を取り入れる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "マツの花には、花弁やがくが見られない。これはマツがどのなかまだからか。", "c": ["シダ植物", "コケ植物", "裸子植物", "被子植物"], "a": 2, "desc": "マツは裸子植物で、花弁やがくのない花をつくる。胚珠がむき出しになっている。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "光合成によって、植物が出す気体はどれか。", "c": ["窒素", "水素", "二酸化炭素", "酸素"], "a": 3, "desc": "光合成では二酸化炭素と水を材料にデンプンをつくり、酸素を出す。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "光合成が行われるために必要なものとして、最も適切な組み合わせはどれか。", "c": ["光・二酸化炭素・水", "酸素・窒素・光", "水・酸素・暗やみ", "デンプン・酸素・光"], "a": 0, "desc": "光合成には光・二酸化炭素・水が必要で、デンプンと酸素ができる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "葉の表皮にあり、2つの孔辺細胞に囲まれたすきまを何というか。", "c": ["胚珠", "気孔", "道管", "師管"], "a": 1, "desc": "気孔は2つの孔辺細胞に囲まれたすきまで、蒸散や気体の出入りの出口になる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "多くの植物で、気孔が特に多く分布しているのはどこか。", "c": ["茎の中心", "根の先端", "葉の裏側", "葉の表側"], "a": 2, "desc": "多くの植物では葉の裏側に気孔が多い。直射日光による水分の失われすぎを防ぎやすいと考えられている。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "植物の細胞に見られ、動物の細胞には見られないつくりはどれか。", "c": ["核", "細胞膜", "細胞質", "細胞壁"], "a": 3, "desc": "細胞壁・葉緑体・発達した液胞は植物の細胞に見られる特徴。核や細胞膜は動物にもある。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "葉が緑色に見えるのは、細胞の中に何が多くふくまれているからか。", "c": ["葉緑体", "液胞", "核", "細胞壁"], "a": 0, "desc": "葉緑体には緑色の色素が含まれ、ここで光合成が行われる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "裸子植物の例として正しいものはどれか。", "c": ["ツツジ", "マツ", "アブラナ", "タンポポ"], "a": 1, "desc": "マツ・スギ・イチョウは裸子植物。アブラナ・タンポポ・ツツジは被子植物。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "葉に見られる、すじのような維管束の通り道を何というか。", "c": ["根毛", "子房", "葉脈", "気孔"], "a": 2, "desc": "葉脈は葉の中の維管束で、水や養分を運ぶ。網状脈と平行脈がある。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "junior", "type": "choice", "q": "双子葉類の葉に多く見られる、網の目のような葉脈を何というか。", "c": ["平行脈", "輪状脈", "放射脈", "網状脈"], "a": 3, "desc": "双子葉類は網状脈、単子葉類は平行脈をもつことが多い。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "光合成によってデンプンができたことを調べるとき、葉の緑色を脱色するために使うものはどれか。", "c": ["あたためたエタノール", "うすい塩酸", "石灰水", "BTB溶液"], "a": 0, "desc": "葉をあたためたエタノールにひたして脱色すると、ヨウ素液での色の変化が見やすくなる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "葉でデンプンができたかどうかを確かめるとき、最後にかける薬品はどれか。", "c": ["うすい硫酸", "ヨウ素液", "石灰水", "フェノールフタレイン液"], "a": 1, "desc": "ヨウ素液はデンプンがあると青紫色に変化する。脱色した葉にかけて調べる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "植物が呼吸で出す気体を確かめる実験で、二酸化炭素の有無を調べるのに使うものはどれか。", "c": ["BTB溶液", "うすい塩酸", "石灰水", "ヨウ素液"], "a": 2, "desc": "石灰水は二酸化炭素を通すと白くにごる。呼吸で出る二酸化炭素の確認に使う。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "BTB溶液を入れた水に植物を入れて光を当てると、溶液が青色になった。これは何が使われたためか。", "c": ["酸素", "デンプン", "水素", "二酸化炭素"], "a": 3, "desc": "光合成で二酸化炭素が使われると水溶液中の二酸化炭素が減り、BTB溶液は青色（アルカリ性側）になる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "蒸散の量を調べる実験で、葉の表側にワセリンをぬる目的はどれか。", "c": ["表側の気孔をふさいで比べるため", "水の吸い上げを止めるため", "光合成を止めるため", "葉を枯らすため"], "a": 0, "desc": "ワセリンで気孔をふさいだ部分からは蒸散できない。表・裏でぬり分けて蒸散量を比べる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "蒸散の実験で、水面に油を浮かべるのはなぜか。", "c": ["気孔を開かせるため", "水面からの水の蒸発を防ぐため", "水温を上げるため", "光合成を促すため"], "a": 1, "desc": "油で水面をおおうと、葉以外（水面）からの蒸発を防げるので、蒸散量だけを正しく比べられる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "対照実験で「光以外の条件を同じにする」のはなぜか。", "c": ["植物を枯らさないため", "水をたくさん使うため", "結果のちがいが光によると確かめるため", "実験を早く終わらせるため"], "a": 2, "desc": "調べたい条件（光）だけを変え、ほかを同じにすることで、結果のちがいの原因を1つに絞れる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "植物の呼吸について正しい説明はどれか。", "c": ["昼だけ呼吸する", "夜だけ光合成する", "呼吸はしない", "一日中、酸素を取り入れ二酸化炭素を出す"], "a": 3, "desc": "植物も動物と同じく一日中呼吸している。昼は光合成も同時に行うため、見かけ上は二酸化炭素を吸っているように見える。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "昼間の植物で、光合成と呼吸の量を比べたとき、ふつう正しいのはどれか。", "c": ["光合成の量のほうが多い", "呼吸の量のほうが多い", "どちらも行わない", "つねに等しい"], "a": 0, "desc": "十分な光があるとき、光合成の量が呼吸の量を上回るため、全体として二酸化炭素を吸収し酸素を出す。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "根の表面積を広げ、水や無機養分の吸収を効率よくするつくりはどれか。", "c": ["葉緑体", "根毛", "維管束", "気孔"], "a": 1, "desc": "根毛は根の表皮細胞が細く伸びたもので、土と接する面積を広げて吸収を助ける。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "被子植物が裸子植物と異なる点として正しいものはどれか。", "c": ["維管束をもたない", "葉緑体をもたない", "胚珠が子房の中にある", "胞子でふえる"], "a": 2, "desc": "被子植物は胚珠が子房に包まれている。裸子植物は胚珠がむき出し。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "単子葉類の特徴の組み合わせとして正しいものはどれか。", "c": ["子葉2枚・網状脈・主根と側根", "子葉1枚・網状脈・主根", "子葉2枚・平行脈・ひげ根", "子葉1枚・平行脈・ひげ根"], "a": 3, "desc": "単子葉類は子葉1枚・平行脈・ひげ根。双子葉類は子葉2枚・網状脈・主根と側根。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "葉でできたデンプンが運ばれるときには、何という物質に変えられて師管を通るか。", "c": ["水にとけやすい糖", "酸素", "二酸化炭素", "タンパク質"], "a": 0, "desc": "デンプンは水にとけやすい糖に変えられて師管を通り、植物全体へ運ばれる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "植物の茎で、道管が位置するのはふつうどちら側か。", "c": ["根の先端だけ", "茎の内側", "茎の外側", "茎の表皮だけ"], "a": 1, "desc": "維管束では内側に道管、外側に師管が位置する。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "赤く着色した水にホウセンカをさしておくと、茎の断面で赤く染まるのはどこか。", "c": ["表皮", "気孔", "道管", "師管"], "a": 2, "desc": "水を運ぶ道管が赤く染まる。これにより道管の位置を確認できる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "mid", "type": "choice", "q": "光合成でできたデンプンが、日光に当たらない夜の間に減っているのはなぜか。", "c": ["光合成で消えるから", "水にとけて気孔から出るから", "根にもどって種子になるから", "糖に変えられて運ばれたり使われたりするから"], "a": 3, "desc": "できたデンプンは糖に変えられて運ばれ、成長や呼吸に使われるため、夜の間に減っていく。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "種子植物を被子植物と裸子植物に分ける基準として正しいものはどれか。", "c": ["胚珠が子房に包まれているかどうか", "花弁の色", "根がひげ根かどうか", "葉緑体があるかどうか"], "a": 0, "desc": "胚珠が子房に包まれていれば被子植物、むき出しなら裸子植物。これが分類の基準になる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "シダ植物とコケ植物のちがいとして正しいものはどれか。", "c": ["シダ植物だけが胞子でふえる", "シダ植物には維管束があるが、コケ植物にはない", "どちらも種子でふえる", "コケ植物だけが光合成する"], "a": 1, "desc": "シダ植物は維管束をもち根・茎・葉の区別があるが、コケ植物は維管束がなく区別がはっきりしない。どちらも胞子でふえる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "植物をなかま分けするとき、最初に種子をつくるかどうかで分ける。種子をつくらないなかまはどれか。", "c": ["裸子植物", "単子葉類", "シダ植物・コケ植物", "被子植物"], "a": 2, "desc": "シダ植物とコケ植物は種子をつくらず胞子でふえる。種子植物（被子・裸子）とは大きく分けられる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "コケ植物が水分を主に取り入れる方法として正しいものはどれか。", "c": ["発達した根から吸収する", "道管を通して吸い上げる", "気孔だけから取り入れる", "からだの表面全体から取り入れる"], "a": 3, "desc": "コケ植物には維管束や本当の根がなく、からだの表面全体から水分を取り入れる。根のように見える部分（仮根）はおもにからだを固定する。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "双子葉類をさらに分けるとき、合弁花類と離弁花類は何で区別するか。", "c": ["花弁がくっついているか離れているか", "子葉の枚数", "根のつくり", "葉脈の形"], "a": 0, "desc": "双子葉類は花弁がくっつく合弁花類（タンポポ・アサガオ）と、離れる離弁花類（アブラナ・サクラ）に分けられる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "植物全体で見たとき、昼間に「二酸化炭素を吸収しているように見える」のはなぜか。", "c": ["師管がはたらかないから", "光合成の量が呼吸の量を上回るから", "呼吸をやめているから", "蒸散が止まるから"], "a": 1, "desc": "昼は呼吸もしているが、光合成のほうが多いため、差し引きで二酸化炭素を吸収しているように見える。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "senior", "type": "choice", "q": "マツの花のつくりについて正しい説明はどれか。", "c": ["花弁が大きく目立つ", "果実をつくる", "雌花のりん片に胚珠がむき出しでついている", "子房の中に胚珠がある"], "a": 2, "desc": "マツは裸子植物で、雌花のりん片に胚珠がむき出しについている。子房がないので果実はできない。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "デンプンを分解する消化酵素であるアミラーゼをふくむ消化液はどれか。", "c": ["胃液", "胆汁", "水", "だ液"], "a": 3, "desc": "だ液にはアミラーゼがふくまれ、デンプンを麦芽糖などに分解する。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "胃液にふくまれ、タンパク質を分解する消化酵素はどれか。", "c": ["ペプシン", "アミラーゼ", "リパーゼ", "カタラーゼ"], "a": 0, "desc": "胃液にはペプシンがふくまれ、タンパク質を分解する。だ液のアミラーゼはデンプンを分解する。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "消化された養分の多くが吸収される器官はどこか。", "c": ["食道", "小腸", "大腸", "胃"], "a": 1, "desc": "小腸の壁の柔毛から、ブドウ糖やアミノ酸などの養分が吸収される。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "小腸の内側にあり、養分を吸収する表面積を広げる小さな突起を何というか。", "c": ["じん臓", "毛細血管だけ", "柔毛（柔突起）", "肺胞"], "a": 2, "desc": "小腸のかべには多数の柔毛があり、表面積を広げて養分を効率よく吸収する。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "肺で酸素を取り入れ、二酸化炭素を出すはたらきを何というか。", "c": ["消化", "排出", "循環", "呼吸（ガス交換）"], "a": 3, "desc": "肺では血液に酸素を取り入れ、二酸化炭素を出すガス交換が行われる。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "肺の中で、気管支の先につながっている小さなふくろを何というか。", "c": ["肺胞", "柔毛", "じん臓", "ぼうこう"], "a": 0, "desc": "肺胞は小さなふくろで、まわりを毛細血管が取り囲み、表面積を広げて効率よくガス交換を行う。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "全身に血液を送り出すポンプのはたらきをする器官はどれか。", "c": ["かん臓", "心臓", "肺", "じん臓"], "a": 1, "desc": "心臓は規則正しく収縮して全身に血液を送り出す。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "血液の成分のうち、酸素を運ぶはたらきをするものはどれか。", "c": ["血小板", "血しょう", "赤血球", "白血球"], "a": 2, "desc": "赤血球にふくまれるヘモグロビンが酸素と結びついて運ぶ。白血球は病原体の防御、血小板は止血に関わる。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "体に入った細菌などの異物を取り除くはたらきをする血液の成分はどれか。", "c": ["赤血球", "血小板", "血しょう", "白血球"], "a": 3, "desc": "白血球は体内に入った細菌などをとらえて分解し、体を守る。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "出血したときに血液を固めて止血に関わる成分はどれか。", "c": ["血小板", "赤血球", "白血球", "ヘモグロビン"], "a": 0, "desc": "血小板は出血したときに血液を固めるはたらきをもつ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "背骨（せきつい）をもつ動物をまとめて何というか。", "c": ["軟体動物", "セキツイ動物", "無セキツイ動物", "節足動物"], "a": 1, "desc": "背骨をもつ動物をセキツイ動物、もたない動物を無セキツイ動物という。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "次のうち、セキツイ動物はどれか。", "c": ["バッタ", "ミミズ", "ウサギ", "イカ"], "a": 2, "desc": "ウサギは背骨をもつセキツイ動物（哺乳類）。イカは軟体動物、バッタは節足動物、ミミズは無セキツイ動物。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "次の動物のうち、魚類はどれか。", "c": ["イカ", "クジラ", "カエル", "サバ"], "a": 3, "desc": "サバは魚類。イカは軟体動物、クジラは哺乳類、カエルは両生類。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "子のときはえらや皮ふで、おとなになると肺や皮ふで呼吸する動物のなかまはどれか。", "c": ["両生類", "魚類", "は虫類", "哺乳類"], "a": 0, "desc": "両生類（カエルなど）は子（オタマジャクシ）のときえらで、おとなになると肺と皮ふで呼吸する。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "からだがうろこでおおわれ、陸上にかたい殻のある卵をうむ動物のなかまはどれか。", "c": ["哺乳類", "は虫類", "両生類", "鳥類"], "a": 1, "desc": "は虫類（トカゲ・ヘビ・カメ）はうろこでおおわれ、陸上に殻のある卵をうむ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "子を母親の体内である程度育ててからうむ（胎生）動物のなかまはどれか。", "c": ["は虫類", "魚類", "哺乳類", "鳥類"], "a": 2, "desc": "哺乳類は胎生で、生まれた子は乳で育てられる。ほかの多くは卵をうむ卵生。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "鳥類のからだの表面は、おもに何でおおわれているか。", "c": ["うろこ", "しめった皮ふ", "毛", "羽毛"], "a": 3, "desc": "鳥類は羽毛でおおわれている。は虫類はうろこ、哺乳類は毛、両生類はしめった皮ふ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "junior", "type": "choice", "q": "刺激を受け取る目・耳・鼻などをまとめて何というか。", "c": ["感覚器官", "運動器官", "消化器官", "排出器官"], "a": 0, "desc": "光や音などの刺激を受け取る器官を感覚器官という。目・耳・鼻・舌・皮ふなど。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "デンプンが消化されて最終的に吸収されるとき、何という物質になっているか。", "c": ["麦芽糖のまま", "ブドウ糖", "アミノ酸", "脂肪酸"], "a": 1, "desc": "デンプンは最終的にブドウ糖まで分解されて小腸から吸収される。タンパク質はアミノ酸まで分解される。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "タンパク質が消化されて吸収されるとき、何という物質になっているか。", "c": ["脂肪酸とモノグリセリド", "麦芽糖", "アミノ酸", "ブドウ糖"], "a": 2, "desc": "タンパク質は消化酵素によってアミノ酸まで分解されてから吸収される。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "脂肪が消化されると、何という物質に分解されて吸収されるか。", "c": ["ブドウ糖", "アミノ酸", "麦芽糖", "脂肪酸とモノグリセリド"], "a": 3, "desc": "脂肪は脂肪酸とモノグリセリドに分解されて柔毛から吸収され、再び脂肪になってリンパ管に入る。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "胆汁について正しい説明はどれか。", "c": ["消化酵素はふくまないが脂肪を細かくする", "デンプンを分解する", "胃でつくられる", "タンパク質を分解する"], "a": 0, "desc": "胆汁は肝臓でつくられ胆のうにためられる。消化酵素はふくまないが、脂肪を細かい粒にして消化を助ける。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "小腸の柔毛で、ブドウ糖やアミノ酸が吸収されて入るのはどこか。", "c": ["すい臓", "毛細血管", "リンパ管", "胆のう"], "a": 1, "desc": "ブドウ糖やアミノ酸は毛細血管に入る。脂肪酸とモノグリセリドは再び脂肪になってリンパ管に入る。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "肺胞がたくさんあることの利点として正しいものはどれか。", "c": ["血液をきれいにできる", "体温を下げられる", "ガス交換を行う表面積が大きくなる", "空気の量を減らせる"], "a": 2, "desc": "多数の肺胞によって表面積が大きくなり、酸素と二酸化炭素のガス交換を効率よく行える。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "心臓から肺へ送られ、肺から心臓へもどる血液の流れを何というか。", "c": ["体循環", "門脈循環", "リンパ循環", "肺循環"], "a": 3, "desc": "心臓→肺→心臓の流れを肺循環、心臓→全身→心臓の流れを体循環という。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "酸素を多くふくむ血液を何というか。", "c": ["動脈血", "静脈血", "リンパ液", "血しょうのみ"], "a": 0, "desc": "酸素を多くふくむ血液を動脈血、二酸化炭素を多くふくむ血液を静脈血という。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "肺で酸素を受け取った直後の動脈血が流れるのは、ふつうどの血管か。", "c": ["門脈", "肺静脈", "肺動脈", "大静脈"], "a": 1, "desc": "肺で酸素を受け取った血液（動脈血）は肺静脈を通って心臓にもどる。肺動脈には静脈血が流れる点に注意。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "血液の液体成分で、養分や不要物を運ぶものはどれか。", "c": ["白血球", "血小板", "血しょう", "赤血球"], "a": 2, "desc": "血しょうは血液の液体成分で、養分・不要物・二酸化炭素などをとかして運ぶ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "血液中の不要物（尿素など）をこし出して尿をつくる器官はどれか。", "c": ["かん臓", "すい臓", "ひ臓", "じん臓"], "a": 3, "desc": "じん臓は血液から尿素などの不要物をこし出して尿をつくる。尿はぼうこうにためられる。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "アンモニアを害の少ない尿素に変えるはたらきをする器官はどれか。", "c": ["かん臓", "じん臓", "すい臓", "ぼうこう"], "a": 0, "desc": "細胞でできた有害なアンモニアは、かん臓で害の少ない尿素に変えられ、じん臓で尿として排出される。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "刺激に対して、意識とは無関係に起こるすばやい反応を何というか。", "c": ["感覚", "反射", "記憶", "意識的な反応"], "a": 1, "desc": "熱いものに思わず手を引っこめるような、意識とは無関係に起こる反応を反射という。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "反射で、命令の信号を出す中枢になるのはおもにどこか。", "c": ["小脳", "延髄だけ", "せきずい", "大脳"], "a": 2, "desc": "反射では信号が大脳を経ずにせきずいなどで命令が出されるため、反応が速い。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "脳やせきずいのように、判断や命令を行う神経をまとめて何というか。", "c": ["末しょう神経", "感覚神経", "運動神経", "中枢神経"], "a": 3, "desc": "脳とせきずいを中枢神経、そこから枝分かれする神経を末しょう神経という。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "感覚器官で受け取った刺激の信号を中枢へ伝える神経はどれか。", "c": ["感覚神経", "運動神経", "交感神経のみ", "中枢神経"], "a": 0, "desc": "刺激の信号を中枢に伝えるのが感覚神経、中枢からの命令を筋肉などに伝えるのが運動神経。"},
    {"subject": "biology", "genre": "bio_human", "diff": "mid", "type": "choice", "q": "うでを曲げのばしするとき、骨についている筋肉のはたらきとして正しいものはどれか。", "c": ["筋肉は骨を動かさない", "一方が縮むと他方がゆるむ", "両方が同時に縮む", "両方が同時にゆるむ"], "a": 1, "desc": "うでには対になった筋肉があり、一方が縮むともう一方がゆるむことで曲げのばしができる。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "セキツイ動物5つのなかまのうち、変温動物の組み合わせとして正しいものはどれか。", "c": ["哺乳類・は虫類", "魚類・鳥類", "魚類・両生類・は虫類", "鳥類・哺乳類"], "a": 2, "desc": "魚類・両生類・は虫類は変温動物、鳥類・哺乳類は恒温動物。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "恒温動物の特徴として正しいものはどれか。", "c": ["まわりの温度とともに体温が変化する", "体温をもたない", "冬は体温が0℃になる", "まわりの温度が変わっても体温をほぼ一定に保つ"], "a": 3, "desc": "恒温動物（鳥類・哺乳類）は外の温度が変わっても体温をほぼ一定に保つ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "クジラやイルカが哺乳類に分類される理由として正しいものはどれか。", "c": ["肺で呼吸し、子を乳で育てる", "水中でえら呼吸する", "うろこでおおわれている", "卵をうみ羽毛をもつ"], "a": 0, "desc": "クジラやイルカは水中にすむが、肺で呼吸し胎生で子を乳で育てるため哺乳類に分類される。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "無セキツイ動物のうち、からだやあしに節があるなかまを何というか。", "c": ["環形動物", "節足動物", "軟体動物", "刺胞動物"], "a": 1, "desc": "こん虫やエビ・カニのように、からだやあしに節があり外骨格をもつなかまを節足動物という。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "イカやアサリのように、内臓が外とう膜でおおわれた無セキツイ動物を何というか。", "c": ["セキツイ動物", "コケ動物", "軟体動物", "節足動物"], "a": 2, "desc": "イカ・タコ・貝などは外とう膜で内臓がおおわれた軟体動物。骨格をもたない。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "こん虫類のからだは、おもにいくつの部分に分かれているか。", "c": ["頭部・腹部の2つ", "1つ", "頭部・胸部・腹部・尾部の4つ", "頭部・胸部・腹部の3つ"], "a": 3, "desc": "こん虫類のからだは頭部・胸部・腹部の3つに分かれ、胸部に6本のあしがある。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "節足動物がもつ、からだの外側のかたい殻のような骨格を何というか。", "c": ["外骨格", "内骨格", "背骨", "外とう膜"], "a": 0, "desc": "節足動物はからだの外側に外骨格をもち、それを脱皮しながら成長する。セキツイ動物は内骨格をもつ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "senior", "type": "choice", "q": "目で受け取った光の刺激が、最終的に伝わって「見える」と感じる場所はどこか。", "c": ["網膜だけ", "大脳", "せきずい", "運動神経"], "a": 1, "desc": "網膜で受け取った光の刺激は、視神経を通って大脳に伝わり、そこで「見える」と感じる。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "植物・動物のどちらの細胞にも共通して見られるつくりはどれか。", "c": ["葉緑体", "発達した液胞", "核と細胞膜", "細胞壁"], "a": 2, "desc": "核・細胞膜・細胞質は植物にも動物にもある。細胞壁・葉緑体・発達した液胞は植物の特徴。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "細胞の中にふつう1つあり、酢酸カーミン液や酢酸オルセイン液で染まるつくりはどれか。", "c": ["葉緑体", "液胞", "細胞壁", "核"], "a": 3, "desc": "核は染色液（酢酸カーミン・酢酸オルセイン）で赤や青紫に染まる。中に遺伝に関わる染色体がある。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "1個の細胞だけでからだができている生物を何というか。", "c": ["単細胞生物", "多細胞生物", "セキツイ動物", "分解者"], "a": 0, "desc": "ゾウリムシやアメーバのように1個の細胞でできた生物を単細胞生物、多数の細胞からなる生物を多細胞生物という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "多細胞生物で、同じはたらきをもつ細胞が集まったものを何というか。", "c": ["器官系", "組織", "器官", "個体"], "a": 1, "desc": "細胞→組織→器官→個体の順にまとまっていく。同じはたらきの細胞の集まりが組織。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "いくつかの組織が集まって、まとまったはたらきをするものを何というか。", "c": ["細胞", "個体", "器官", "組織"], "a": 2, "desc": "胃や葉のように、いくつかの組織が集まって特定のはたらきをするものを器官という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "生物が酸素を使って養分を分解し、エネルギーを取り出すはたらきを何というか。", "c": ["光合成", "蒸散", "消化", "細胞による呼吸"], "a": 3, "desc": "細胞は酸素を使って養分を分解しエネルギーを取り出す（細胞の呼吸）。このとき二酸化炭素と水ができる。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "オオカナダモの葉を顕微鏡で観察したとき、緑色の小さな粒として見えるものはどれか。", "c": ["葉緑体", "核", "液胞", "細胞壁"], "a": 0, "desc": "緑色の小さな粒は葉緑体で、光合成を行う。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "顕微鏡で、最初は低い倍率で観察するのはなぜか。", "c": ["低倍率しか使えないから", "広い範囲から目的のものを見つけやすいから", "倍率が高いほうがこわれやすいから", "光が強すぎるから"], "a": 1, "desc": "低倍率は視野が広く明るいので、まず目的のものを見つけてから高倍率にするとよい。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "mid", "type": "choice", "q": "顕微鏡の倍率は、何の積で求められるか。", "c": ["対物レンズの倍率だけ", "しぼりの数値", "接眼レンズの倍率×対物レンズの倍率", "接眼レンズ＋対物レンズ"], "a": 2, "desc": "顕微鏡の倍率＝接眼レンズの倍率×対物レンズの倍率。例：10倍×40倍＝400倍。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "受精によって子をつくる生殖を何というか。", "c": ["無性生殖", "栄養生殖", "分裂", "有性生殖"], "a": 3, "desc": "雌雄の生殖細胞が受精して子をつくる生殖を有性生殖、受精によらない生殖を無性生殖という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "受精を行わず、親のからだの一部から新しい個体ができる生殖を何というか。", "c": ["無性生殖", "有性生殖", "受精", "減数分裂"], "a": 0, "desc": "ジャガイモのいもや、ミカヅキモの分裂のように、受精によらず親と同じ形質の子ができる生殖を無性生殖という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "生殖細胞がつくられるときに行われ、染色体の数がもとの半分になる細胞分裂を何というか。", "c": ["分化", "減数分裂", "体細胞分裂", "受精"], "a": 1, "desc": "卵や精子などの生殖細胞をつくるときの分裂を減数分裂といい、染色体の数が半分になる。受精で再びもとにもどる。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "からだをつくる細胞がふえるときの、染色体の数が変わらない分裂を何というか。", "c": ["受精", "分化", "体細胞分裂", "減数分裂"], "a": 2, "desc": "成長のとき体の細胞がふえる分裂を体細胞分裂といい、分裂の前後で染色体の数は変わらない。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "染色体にふくまれ、生物の形や性質を決める情報を持つ物質を何というか。", "c": ["タンパク質だけ", "デンプン", "ヘモグロビン", "DNA（遺伝子の本体）"], "a": 3, "desc": "染色体にふくまれる遺伝子の本体はDNA（デオキシリボ核酸）という物質である。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "メンデルが調べた、エンドウの「丸い種子」と「しわの種子」のように、同時に現れない形質どうしを何というか。", "c": ["対立形質", "顕性形質", "潜性形質", "分離形質"], "a": 0, "desc": "丸としわのように、どちらか一方しか現れない対になる形質を対立形質という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "純系の丸い種子（AA）としわの種子（aa）をかけ合わせたとき、子に現れる形質はどれか。", "c": ["丸としわが3:1", "すべて丸", "すべてしわ", "丸としわが半分ずつ"], "a": 1, "desc": "丸が顕性（優性）形質なので、子（Aa）はすべて丸になる。しわは潜性（劣性）で子には現れない。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "子（すべて丸、Aa）どうしをかけ合わせたとき、孫に現れる丸：しわの比はおよそどれか。", "c": ["1:3", "すべて丸", "3:1", "1:1"], "a": 2, "desc": "Aa×Aaでは AA:Aa:aa＝1:2:1 となり、表に現れる形質は丸：しわ＝3:1になる。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "対立形質をもつ純系どうしをかけ合わせたとき、子に現れるほうの形質を何というか。", "c": ["潜性形質（劣性形質）", "中間形質", "分離形質", "顕性形質（優性形質）"], "a": 3, "desc": "子に現れるほうを顕性形質、現れず隠れるほうを潜性形質という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "減数分裂で、対になっている遺伝子が分かれて別々の生殖細胞に入ることを何の法則というか。", "c": ["分離の法則", "優性の法則", "独立の法則", "遺伝の法則"], "a": 0, "desc": "対になった遺伝子が分かれて別々の生殖細胞に入ることを分離の法則という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "生物が長い年月をかけて世代を重ねる間に変化し、新しい種類が生じることを何というか。", "c": ["分化", "進化", "成長", "遺伝"], "a": 1, "desc": "生物が長い時間をかけて変化し、新しい種類が生じることを進化という。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "senior", "type": "choice", "q": "コウモリの翼・クジラのひれ・ヒトのうでのように、もとは同じつくりだったと考えられる器官を何というか。", "c": ["感覚器官", "生殖器官", "相同器官", "こん跡器官"], "a": 2, "desc": "現在のはたらきは違っても、もとは同じものから変化したと考えられる器官を相同器官という。進化の証拠とされる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "ある地域にすむ生物と、そのまわりの環境を一つのまとまりとして見たものを何というか。", "c": ["食物連鎖", "個体群", "分解者", "生態系"], "a": 3, "desc": "生物とそれを取りまく水・空気・土などの環境を一つのまとまりとして見たものを生態系という。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "「植物→草食動物→肉食動物」のような、食べる・食べられるの関係のつながりを何というか。", "c": ["食物連鎖", "生態系", "光合成", "呼吸"], "a": 0, "desc": "食べる・食べられるの関係が鎖のようにつながったものを食物連鎖という。実際は網の目状の食物網になる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "光合成によって、みずから養分（有機物）をつくり出す生物を何というか。", "c": ["肉食動物", "生産者", "消費者", "分解者"], "a": 1, "desc": "植物のように光合成で養分をつくる生物を生産者という。それを食べる動物が消費者。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "ほかの生物を食べて養分を得る動物を、生態系の中で何というか。", "c": ["分解者", "光合成者", "消費者", "生産者"], "a": 2, "desc": "自分で養分をつくれず、ほかの生物を食べて養分を得る生物を消費者という。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "生物の死がいやふんなどを分解し、養分を得ている生物を何というか。", "c": ["生産者", "草食動物", "肉食動物", "分解者"], "a": 3, "desc": "菌類や細菌類など、死がいやふんを無機物に分解する生物を分解者という。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "次のうち、分解者のなかまにあたるものはどれか。", "c": ["カビやキノコ（菌類）", "イネ（植物）", "ウサギ（草食動物）", "ワシ（肉食動物）"], "a": 0, "desc": "カビ・キノコなどの菌類や細菌類は、死がいやふんを分解する分解者である。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "食物連鎖で、数量の関係をピラミッドで表すと、ふつう最も数が多いのはどれか。", "c": ["大形の肉食動物", "植物（生産者）", "草食動物", "小形の肉食動物"], "a": 1, "desc": "生産者（植物）が最も数量が多く、上位の消費者になるほど少なくなり、ピラミッド型になる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "草食動物が一時的にふえると、ふつう短期的にはどうなるか。", "c": ["すべての生物が同時に消える", "変化はまったく起きない", "植物が減り、肉食動物がふえる", "植物がふえ、肉食動物が減る"], "a": 2, "desc": "草食動物がふえると、食べられる植物は減り、それを食べる肉食動物はふえる。やがてつり合いがもどる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "生物のなかまを大きく分けるとき、植物・動物のほかにふくまれるなかまはどれか。", "c": ["岩石", "水", "空気", "菌類"], "a": 3, "desc": "生物には植物・動物のほか、カビやキノコのなかまである菌類などがいる。岩石・水・空気は生物ではない。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "junior", "type": "choice", "q": "観察した生物をなかま分け（分類）するとき、最も適切な方法はどれか。", "c": ["共通点や相違点に注目して仲間に分ける", "大きさの順だけに並べる", "名前のあいうえお順に並べる", "見つけた順に並べる"], "a": 0, "desc": "分類では、からだのつくりやふえ方などの共通点・相違点に注目して、特徴の似たものを仲間に分ける。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "生態系の中で、炭素が生物から大気へもどる主なはたらきはどれか。", "c": ["受粉", "呼吸", "光合成", "蒸散"], "a": 1, "desc": "生物の呼吸によって、有機物の炭素が二酸化炭素として大気にもどる。光合成は逆に大気から取り込む。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "大気中の二酸化炭素を生物のからだに取りこむ主なはたらきはどれか。", "c": ["分解", "蒸散", "光合成", "呼吸"], "a": 2, "desc": "生産者の光合成によって、大気中の二酸化炭素が有機物として生物のからだに取りこまれる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "土の中の微生物のはたらきを調べる実験で、加熱して微生物をいなくした土を使う目的はどれか。", "c": ["養分を増やすため", "温度を上げて反応を速めるため", "水分を増やすため", "微生物がいる土と比べる対照にするため"], "a": 3, "desc": "加熱して微生物をいなくした土を対照とし、微生物のいる土と比べることで、分解が微生物によると確かめられる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "菌類・細菌類が分解者とよばれるのは、有機物を最終的に何に変えるからか。", "c": ["二酸化炭素や水などの無機物", "デンプンなどの有機物", "酸素だけ", "タンパク質"], "a": 0, "desc": "分解者は死がいやふんなどの有機物を二酸化炭素・水・無機の養分などに分解する。これが再び生産者に利用される。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "菌類（カビ・キノコ）のふえ方として正しいものはどれか。", "c": ["光合成でふえる", "胞子でふえる", "種子でふえる", "卵をうむ"], "a": 1, "desc": "菌類は胞子でふえる。葉緑体をもたず、ほかの生物や死がいから有機物を取りこんで生活する。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "外来種（外来生物）が在来の生態系にもたらす問題として正しいものはどれか。", "c": ["まったく影響しない", "分解者を増やして土を豊かにする", "もとからいた生物を減らし生態系のつり合いをくずすことがある", "必ず生態系を豊かにする"], "a": 2, "desc": "人間によってほかの地域から持ちこまれた外来種は、在来種を食べたり競争したりして生態系のつり合いをくずすことがある。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "食物連鎖の出発点となるエネルギーは、もとをたどるとおもにどこから来ているか。", "c": ["地熱", "風", "分解者", "太陽の光"], "a": 3, "desc": "生産者が光合成で太陽の光エネルギーを取りこむことで、生態系全体のエネルギーの流れが始まる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "mid", "type": "choice", "q": "微生物が出すはたらきによって、デンプンが分解されたことを調べるのに使える薬品はどれか。", "c": ["ヨウ素液（青紫にならなければ分解された）", "石灰水", "フェノールフタレイン液", "食塩水"], "a": 0, "desc": "デンプンが残っていればヨウ素液で青紫になる。色が変わらなければ、微生物のはたらきで分解されたとわかる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地下にある岩石が高温でとけてどろどろになったものを何というか。", "c": ["れき", "マグマ", "溶岩", "火山灰"], "a": 1, "desc": "地下のとけた物質をマグマ、それが地表に出たものを溶岩という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "マグマのねばりけが強い火山の形として正しいものはどれか。", "c": ["平らな形", "円すい形で必ず低い", "もり上がったドーム状", "傾斜のゆるやかな形"], "a": 2, "desc": "ねばりけが強いマグマは流れにくく、もり上がったドーム状の火山になる。色は白っぽいことが多い。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "マグマのねばりけが弱い（さらさら）火山の噴火のようすとして正しいものはどれか。", "c": ["激しく爆発的な噴火が多い", "噴火しない", "必ず火山灰だけが出る", "おだやかに溶岩が流れ出すことが多い"], "a": 3, "desc": "ねばりけの弱いマグマはガスがぬけやすく、おだやかに溶岩を流す噴火になりやすい。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "マグマが冷えて固まってできた岩石をまとめて何というか。", "c": ["火成岩", "堆積岩", "変成岩", "石灰岩"], "a": 0, "desc": "マグマが冷えて固まった岩石を火成岩という。火山岩と深成岩に分けられる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "マグマが地表や地表近くで急に冷えて固まった火成岩を何というか。", "c": ["れき岩", "火山岩", "深成岩", "堆積岩"], "a": 1, "desc": "地表近くで急に冷えた火成岩を火山岩という。結晶が大きく成長できず、斑状組織になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "マグマが地下深くでゆっくり冷えて固まった火成岩を何というか。", "c": ["石灰岩", "チャート", "深成岩", "火山岩"], "a": 2, "desc": "地下深くでゆっくり冷えた火成岩を深成岩という。大きな鉱物がきっちり組み合わさった等粒状組織になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "火山岩に見られる、大きな鉱物（斑晶）のまわりを細かい部分（石基）が囲むつくりを何というか。", "c": ["等粒状組織", "層状組織", "れき状組織", "斑状組織"], "a": 3, "desc": "火山岩は斑状組織。深成岩は大きな鉱物がそろった等粒状組織になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "深成岩に見られる、大きな鉱物がきっちり組み合わさったつくりを何というか。", "c": ["等粒状組織", "斑状組織", "れき状組織", "化石組織"], "a": 0, "desc": "地下でゆっくり冷えると鉱物が大きく成長し、等粒状組織になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地震が発生した場所（岩盤が破壊された地下の場所）を何というか。", "c": ["プレート", "震源", "震央", "断層"], "a": 1, "desc": "地震が発生した地下の場所を震源、その真上の地表の点を震央という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "震源の真上にあたる地表の地点を何というか。", "c": ["活断層", "海溝", "震央", "震源"], "a": 2, "desc": "震源の真上の地表の点を震央という。震源は地下にある。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地震のゆれのうち、はじめに伝わる小さなゆれを何というか。", "c": ["主要動", "余震", "本震", "初期微動"], "a": 3, "desc": "速いP波によるはじめの小さなゆれが初期微動、遅いS波による大きなゆれが主要動。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地震のあとに伝わる大きなゆれを何というか。", "c": ["主要動", "初期微動", "前震", "地割れ"], "a": 0, "desc": "初期微動のあとに来る大きなゆれを主要動という。S波によって起こる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "ある地点での地震によるゆれの大きさを表す尺度はどれか。", "c": ["波の速さ", "震度", "マグニチュード", "震源の深さ"], "a": 1, "desc": "各地点のゆれの大きさは震度（0〜7）で表す。地震そのものの規模はマグニチュードで表す。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地震そのものの規模（エネルギーの大きさ）を表すものはどれか。", "c": ["初期微動継続時間", "震央距離", "マグニチュード", "震度"], "a": 2, "desc": "地震の規模はマグニチュード（M）で表す。1か所の地震ではMは1つだが、震度は場所によって異なる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "流れる水によって運ばれた土砂が、海や湖の底などに積もることを何というか。", "c": ["侵食", "運搬", "風化", "堆積"], "a": 3, "desc": "土砂が積もることを堆積、けずられることを侵食、運ばれることを運搬という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "土砂が積もって長い年月で固まってできた岩石をまとめて何というか。", "c": ["堆積岩", "火成岩", "火山岩", "深成岩"], "a": 0, "desc": "土砂などが固まってできた岩石を堆積岩という。れき岩・砂岩・泥岩・石灰岩などがある。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "れき・砂・泥のうち、河口から最も遠く深いところまで運ばれて堆積しやすいものはどれか。", "c": ["すべて同じ", "泥", "れき", "砂"], "a": 1, "desc": "粒の小さい泥は軽く、遠く深いところまで運ばれて堆積する。粒の大きいれきは河口近くに堆積する。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地層にふくまれ、地層ができた当時の環境や年代を知る手がかりになるものはどれか。", "c": ["火山灰", "断層", "化石", "れき"], "a": 2, "desc": "化石は当時の生物の遺がいや活動のあとで、当時の環境（示相化石）や年代（示準化石）を知る手がかりになる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地層に力が加わって地面がずれ動いたもの（くいちがい）を何というか。", "c": ["しゅう曲", "整合", "風化", "断層"], "a": 3, "desc": "地層がずれたものを断層、波打つように曲がったものをしゅう曲という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "うすい塩酸をかけると気体（二酸化炭素）を出してとける堆積岩はどれか。", "c": ["石灰岩", "砂岩", "泥岩", "チャート"], "a": 0, "desc": "石灰岩は炭酸カルシウムをふくみ、塩酸をかけると二酸化炭素を出してとける。チャートはとけない。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "地表の岩石が、気温の変化や水のはたらきで長い年月の間にもろくくずれていくことを何というか。", "c": ["噴火", "風化", "堆積", "地震"], "a": 1, "desc": "岩石が気温変化や水のはたらきでくずれていくことを風化という。風化した岩石は侵食・運搬されやすい。"},
    {"subject": "earth", "genre": "earth_land", "diff": "junior", "type": "choice", "q": "白っぽい火成岩に多くふくまれ、無色や白色の鉱物はどれか。", "c": ["磁鉄鉱", "化石", "セキエイ・チョウ石", "クロウンモ・カクセン石"], "a": 2, "desc": "セキエイやチョウ石は無色・白色の鉱物で、白っぽい火成岩に多い。黒っぽい鉱物にはクロウンモ・カクセン石などがある。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "初期微動が続く時間（初期微動継続時間）と震源までの距離の関係として正しいものはどれか。", "c": ["震源から遠いほど短くなる", "距離と関係しない", "つねに一定", "震源から遠いほど長くなる"], "a": 3, "desc": "P波とS波の速さの差から、震源から遠いほど初期微動継続時間は長くなる。これを使って震源距離を求められる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "地震でP波とS波が同時に発生するのに、観測点に届く時刻がずれるのはなぜか。", "c": ["P波のほうがS波より速く伝わるから", "S波のほうが速いから", "震源が2つあるから", "波の大きさがちがうから"], "a": 0, "desc": "P波（初期微動）はS波（主要動）より速く伝わるため、遠い地点ほど到達時刻の差が大きくなる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "白っぽく、ねばりけの強いマグマからできる火山岩はどれか。", "c": ["石灰岩", "流紋岩", "玄武岩", "はんれい岩"], "a": 1, "desc": "白っぽい火山岩は流紋岩、黒っぽいものは玄武岩。深成岩では白い花こう岩、黒いはんれい岩が対応する。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "黒っぽく、ねばりけの弱いマグマからできる深成岩はどれか。", "c": ["流紋岩", "安山岩", "はんれい岩", "花こう岩"], "a": 2, "desc": "黒っぽい深成岩ははんれい岩、白っぽい深成岩は花こう岩。火山岩では玄武岩・流紋岩が対応する。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "火山岩と深成岩で組織にちがいが生じる主な原因はどれか。", "c": ["マグマの色のちがい", "地震の有無", "化石の有無", "マグマの冷え方（速さ）のちがい"], "a": 3, "desc": "急に冷えると斑状組織（火山岩）、ゆっくり冷えると等粒状組織（深成岩）になる。冷える速さが組織を決める。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "広い範囲の地層を比べるとき、目印として役立つ、火山灰が積もってできた層を何というか。", "c": ["かぎ層（鍵層）", "断層", "整合", "しゅう曲"], "a": 0, "desc": "同じ時期に広く積もる火山灰の層などは、地層を対比するときの目印（かぎ層）になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "地層が堆積した当時の「環境」を知る手がかりになる化石を何というか。", "c": ["生痕", "示相化石", "示準化石", "標準化石"], "a": 1, "desc": "サンゴ（あたたかく浅い海）やシジミ（河口や湖）のように、当時の環境を示す化石を示相化石という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "地層が堆積した「年代（時代）」を知る手がかりになる化石を何というか。", "c": ["生痕化石", "標本化石", "示準化石", "示相化石"], "a": 2, "desc": "広い範囲にすみ短い期間に栄えた生物の化石（アンモナイト・サンヨウチュウなど）は、年代を示す示準化石になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "アンモナイトの化石が見つかった地層は、いつの時代に堆積したと考えられるか。", "c": ["古生代", "新生代", "現代", "中生代"], "a": 3, "desc": "アンモナイトは中生代の示準化石。サンヨウチュウは古生代、ビカリアやナウマンゾウは新生代の示準化石。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "サンヨウチュウの化石が見つかった地層は、いつの時代に堆積したと考えられるか。", "c": ["古生代", "中生代", "新生代", "先カンブリア時代だけ"], "a": 0, "desc": "サンヨウチュウは古生代の示準化石。中生代はアンモナイトや恐竜、新生代はナウマンゾウなどが代表的。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "地層を観察してできた順番を考えるとき、ふつう正しいのはどれか（上下が逆転していない場合）。", "c": ["まん中の層が最も古い", "下の層ほど古い", "上の層ほど古い", "どの層も同じ時期"], "a": 1, "desc": "地層は下から順に積み重なるので、ふつう下の層ほど古く、上の層ほど新しい。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "河口付近で、れき・砂・泥が分かれて堆積するのは、何のちがいによるか。", "c": ["化石の有無", "塩分のちがいだけ", "粒の大きさ（重さ）", "色のちがい"], "a": 2, "desc": "粒の大きい（重い）れきは河口近く、小さい（軽い）泥は遠く沖まで運ばれて堆積する。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "日本付近で地震が多いのは、地下で何が動いているからと考えられているか。", "c": ["マグマだけ", "地下水", "火山灰", "プレート"], "a": 3, "desc": "日本付近では複数のプレートが動いてぶつかり合うため、ひずみがたまって地震が多く起こる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "mid", "type": "choice", "q": "海底で地震が起こったときなどに発生し、沿岸に大きな被害をもたらすことがある波を何というか。", "c": ["津波", "高潮", "液状化", "土石流"], "a": 0, "desc": "海底の地震などで海水が持ち上げられて起こる波を津波という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "地下のごく浅い場所でずれが生じ、くり返し活動するおそれのある断層を何というか。", "c": ["かぎ層", "活断層", "正断層だけ", "整合面"], "a": 1, "desc": "過去にくり返しずれ、今後も活動するおそれのある断層を活断層という。内陸の地震の原因になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "海のプレートが大陸のプレートの下にしずみこむ境界にできる、深い海底の地形を何というか。", "c": ["大陸だな", "三角州", "海溝", "海嶺"], "a": 2, "desc": "海のプレートがしずみこむ境界には深い海溝ができ、その付近では大きな地震が起こりやすい。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "地震のゆれで地面が急に軟弱になり、砂や水がふき出す現象を何というか。", "c": ["風化", "しゅう曲", "堆積", "液状化"], "a": 3, "desc": "水を多くふくむ砂地などで、地震のゆれにより地面が液体のようになる現象を液状化という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "地層が左右から押される力を受けて、波打つように曲がったものを何というか。", "c": ["しゅう曲", "断層", "整合", "液状化"], "a": 0, "desc": "地層が大きな力で押されて波打つように曲がったものをしゅう曲という。横からの力がはたらいた証拠になる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "地層の重なりが連続して堆積した関係を整合というのに対し、長い中断や侵食をはさんだ重なりを何というか。", "c": ["かぎ層", "不整合", "しゅう曲", "活断層"], "a": 1, "desc": "堆積の中断や侵食をはさんで重なった地層の関係を不整合という。境界面（不整合面）が手がかりになる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "火山の噴出物のうち、すき間が多く軽くて水に浮くことがある白っぽいものはどれか。", "c": ["黒曜石", "石灰岩", "軽石", "溶岩のかたまり"], "a": 2, "desc": "軽石はガスがぬけたあとのすき間が多く、軽くて水に浮くことがある。ねばりけの強いマグマからできやすい。"},
    {"subject": "earth", "genre": "earth_land", "diff": "senior", "type": "choice", "q": "同じ火成岩でも、花こう岩と流紋岩は化学的な成分が似ている。ちがいの主な原因はどれか。", "c": ["ふくまれる化石のちがい", "地震の大きさ", "堆積した年代", "冷え方（できた場所）のちがい"], "a": 3, "desc": "花こう岩（深成岩）と流紋岩（火山岩）は成分が似るが、ゆっくり冷えたか急に冷えたかで組織が異なる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "空気中にふくむことのできる水蒸気の最大量を何というか。", "c": ["飽和水蒸気量", "露点", "湿度", "気圧"], "a": 0, "desc": "ある温度の空気1m³がふくむことのできる水蒸気の最大量を飽和水蒸気量という。気温が高いほど大きい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "空気を冷やしていったとき、水蒸気が水滴に変わり始める温度を何というか。", "c": ["凝固点", "露点", "沸点", "飽和点"], "a": 1, "desc": "空気を冷やして水蒸気が凝結し始める温度を露点という。露点が高いほど空気中の水蒸気が多い。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "空気のしめりぐあいを、飽和水蒸気量に対する割合で表したものを何というか。", "c": ["気圧", "降水量", "湿度", "気温"], "a": 2, "desc": "湿度（％）＝実際の水蒸気量÷その気温の飽和水蒸気量×100。空気のしめりぐあいを表す。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "空気が上昇すると雲ができやすいのはなぜか。", "c": ["上空ほど気温が高いから", "水蒸気がふえるから", "風が止まるから", "上空ほど気圧が低く、空気が膨張して温度が下がるから"], "a": 3, "desc": "上昇した空気は気圧の低い上空で膨張して温度が下がり、露点に達すると水蒸気が凝結して雲ができる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "1気圧はおよそ何hPa（ヘクトパスカル）か。", "c": ["約1013hPa", "約100hPa", "約500hPa", "約2000hPa"], "a": 0, "desc": "1気圧は約1013hPa。天気図では等圧線で気圧の分布を表す。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "高気圧の中心付近で起こりやすい空気の動きはどれか。", "c": ["横ばいだけ", "うずを巻く上昇", "下降気流", "上昇気流"], "a": 2, "desc": "高気圧の中心では下降気流が生じ、雲ができにくく晴れやすい。低気圧の中心では上昇気流で雲ができやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "低気圧の中心付近で天気がくずれやすいのはなぜか。", "c": ["下降気流が起こるから", "気温が必ず下がるから", "風がふかないから", "上昇気流が起こり雲ができやすいから"], "a": 3, "desc": "低気圧の中心では上昇気流が生じ、空気が冷えて雲ができやすく、雨が降りやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "性質の異なる気団が接してできる境の面が地表と交わる線を何というか。", "c": ["前線", "等圧線", "等温線", "海岸線"], "a": 0, "desc": "暖気と寒気が接する境の面（前線面）が地表と交わる線を前線という。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "寒気が暖気の下にもぐりこみ、暖気を押し上げながら進む前線を何というか。", "c": ["閉そく前線", "寒冷前線", "温暖前線", "停滞前線"], "a": 1, "desc": "寒冷前線では寒気が暖気を急に押し上げ、積乱雲ができて短時間に強い雨が降りやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "暖気が寒気の上にはい上がりながら進む前線を何というか。", "c": ["停滞前線", "閉そく前線", "温暖前線", "寒冷前線"], "a": 2, "desc": "温暖前線では暖気がゆるやかに寒気の上にはい上がり、乱層雲などで広い範囲に弱い雨が長く降りやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "寒冷前線が通過したあとの天気の変化として正しいものはどれか。", "c": ["気温が上がり続ける", "雨がやまず一日中弱い雨", "変化はない", "気温が下がり、風向が変わる"], "a": 3, "desc": "寒冷前線通過後は寒気におおわれて気温が下がり、風向が南よりから北よりに変わることが多い。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "晴れの日と雨の日を比べたとき、1日の気温の変化が大きいのはどちらか。", "c": ["晴れの日", "雨の日", "どちらも同じ", "くもりの日が最大"], "a": 0, "desc": "晴れの日は日射が地面を強く温め、夜は熱が逃げやすいので気温差が大きい。雲が多い日は差が小さい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "乾湿計で湿度を求めるとき、乾球と湿球の示す温度の関係はふつうどうなるか。", "c": ["関係しない", "湿球のほうが低い（または等しい）", "湿球のほうが必ず高い", "つねに等しい"], "a": 1, "desc": "湿球は水の蒸発で熱がうばわれるため、乾球より低い温度を示す。差が大きいほど湿度は低い。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "junior", "type": "choice", "q": "天気図で、気圧が等しい地点を結んだ線を何というか。", "c": ["等温線", "等高線", "等圧線", "前線"], "a": 2, "desc": "同じ気圧の地点を結んだ線が等圧線。間隔がせまいほど風が強い。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "気温が高いほど飽和水蒸気量はどうなるか。", "c": ["小さくなる", "変わらない", "0になる", "大きくなる"], "a": 3, "desc": "気温が高いほど空気はより多くの水蒸気をふくめるため、飽和水蒸気量は大きくなる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "同じ量の水蒸気をふくむ空気の温度を下げていくと、湿度はどうなるか。", "c": ["高くなる", "低くなる", "変わらない", "必ず0になる"], "a": 0, "desc": "温度を下げると飽和水蒸気量が小さくなるため、同じ水蒸気量でも湿度は高くなる。露点で100％になる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "等圧線の間隔がせまいところでは、風はふつうどうなるか。", "c": ["向きが定まらないだけ", "強くふく", "弱くなる", "ふかない"], "a": 1, "desc": "等圧線の間隔がせまいほど気圧の差が急で、風が強くふく。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "寒冷前線にともなって発達しやすく、短時間に強い雨を降らせる雲はどれか。", "c": ["巻雲", "うろこ雲", "積乱雲", "乱層雲"], "a": 2, "desc": "寒冷前線では暖気が急に押し上げられ、積乱雲が発達して短時間の強い雨やかみなりをもたらす。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "温暖前線にともない、広い範囲に長い時間おだやかな雨を降らせる雲はおもにどれか。", "c": ["積乱雲", "積雲", "巻積雲", "乱層雲"], "a": 3, "desc": "温暖前線では暖気がゆるやかにはい上がり、乱層雲などが広がって弱い雨が長く降りやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "陸と海では昼間あたたまり方がちがう。よく晴れた昼に海から陸へふく風を何というか。", "c": ["海風", "陸風", "季節風", "偏西風"], "a": 0, "desc": "昼は陸があたたまりやすく上昇気流が生じ、海から陸へ海風がふく。夜は逆に陸風がふく。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "日本の冬に、大陸から北西の冷たい季節風がふく主な原因はどれか。", "c": ["梅雨前線ができるから", "シベリア高気圧が発達するから", "太平洋高気圧が発達するから", "台風が多いから"], "a": 1, "desc": "冬はシベリア高気圧が発達し、そこから北西の季節風がふく。日本海側に雪、太平洋側に乾いた晴れをもたらす。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "日本の夏に蒸し暑い晴天をもたらす、あたたかくしめった高気圧はどれか。", "c": ["オホーツク海気団", "移動性高気圧", "太平洋高気圧（小笠原気団）", "シベリア高気圧"], "a": 2, "desc": "夏は太平洋高気圧（小笠原気団）が発達し、南東の季節風とともに蒸し暑い晴天をもたらす。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "梅雨の時期に、日本付近に長くとどまって雨を降らせる前線を何というか。", "c": ["寒冷前線", "温暖前線", "閉そく前線", "停滞前線（梅雨前線）"], "a": 3, "desc": "勢力の似た気団が接してほとんど動かない前線を停滞前線といい、梅雨や秋雨をもたらす。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "湿度が100％になっているのはどんなときか。", "c": ["気温が露点に達したとき", "気温が最高のとき", "風が最も強いとき", "気圧が最も高いとき"], "a": 0, "desc": "空気を冷やして露点に達すると、ふくむ水蒸気量が飽和水蒸気量と等しくなり湿度100％になる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "mid", "type": "choice", "q": "露点が高い空気について正しい説明はどれか。", "c": ["風が弱い", "ふくまれる水蒸気の量が多い", "必ず気温が低い", "気圧が低い"], "a": 1, "desc": "露点はふくまれる水蒸気量で決まり、露点が高いほど水蒸気が多い。気温とは別の量である。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "senior", "type": "choice", "q": "台風について正しい説明はどれか。", "c": ["高気圧の一種", "冬にだけ発生する", "熱帯の海上で発生し、前線をともなわない強い低気圧", "寒気と暖気が接した前線"], "a": 2, "desc": "台風は熱帯の海上で発生した低気圧が発達したもので、前線をともなわず強い風と雨をもたらす。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "senior", "type": "choice", "q": "日本付近の上空を一年中ふいていて、低気圧や移動性高気圧を西から東へ移動させる風を何というか。", "c": ["貿易風", "季節風", "海風", "偏西風"], "a": 3, "desc": "中緯度の上空を西から東へふく偏西風によって、日本の天気はおおむね西から東へ変わる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "senior", "type": "choice", "q": "春や秋に、移動性高気圧と低気圧が交互に通るため天気が周期的に変わるのはなぜか。", "c": ["偏西風で西から東へ次々に移動してくるから", "台風が多いから", "季節風が強いから", "停滞前線が居すわるから"], "a": 0, "desc": "春・秋は移動性高気圧と低気圧が偏西風に流されて交互に通過するため、天気が数日の周期で変わりやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "senior", "type": "choice", "q": "冬に日本海側で雪が多く、太平洋側で乾いた晴れになりやすいのはなぜか。", "c": ["偏西風がふかないから", "季節風が日本海で水蒸気を得て山地で雪を降らせ、太平洋側では乾くから", "台風が来るから", "梅雨前線のため"], "a": 1, "desc": "冬の北西季節風は日本海で水蒸気を得て、山地にぶつかって日本海側に雪を降らせ、山をこえると乾いた風になる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "senior", "type": "choice", "q": "閉そく前線ができるのは、ふつうどんなときか。", "c": ["高気圧が発達したとき", "台風が上陸したとき", "寒冷前線が温暖前線に追いついたとき", "停滞前線が消えるとき"], "a": 2, "desc": "進みの速い寒冷前線が温暖前線に追いつくと閉そく前線ができ、低気圧の衰え始めの目安になる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "senior", "type": "choice", "q": "湿度が同じでも、気温が高い空気と低い空気では、ふくむ水蒸気の量はどうなるか。", "c": ["気温が低いほうが多い", "つねに同じ", "湿度だけで決まる", "気温が高いほうが多い"], "a": 3, "desc": "湿度が同じでも飽和水蒸気量は気温が高いほど大きいので、気温が高い空気のほうが実際にふくむ水蒸気量は多い。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "地球が地軸を中心に1日に1回転していることを何というか。", "c": ["自転", "公転", "日周運動", "年周運動"], "a": 0, "desc": "地球が地軸を中心に1日1回まわることを自転、太陽のまわりを1年で1周することを公転という。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "地球が太陽のまわりを1年かけて1周することを何というか。", "c": ["南中", "公転", "自転", "日周運動"], "a": 1, "desc": "地球は太陽のまわりを1年で1周（公転）する。これが季節の変化や星座の見え方の変化の原因になる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "太陽や星が1日のうちに東から西へ動いて見えるのは、地球の何によるか。", "c": ["大気の動き", "星自身の運動", "自転", "公転"], "a": 2, "desc": "地球が西から東へ自転しているため、太陽や星は見かけ上、東から西へ動いて見える（日周運動）。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "太陽が真南にきて、最も高くなることを何というか。", "c": ["日周", "公転", "日食", "南中"], "a": 3, "desc": "太陽が真南にきたときを南中といい、そのときの高さを南中高度、その時刻を南中時刻という。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "太陽の1日の動きを透明半球に記録すると、点はどのような並びになるか。", "c": ["等しい間隔で並ぶ", "だんだんせまくなる", "ばらばらになる", "1点に集まる"], "a": 0, "desc": "太陽は一定の速さで動いて見えるため、一定時間ごとの記録点は等間隔に並ぶ。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "星が一晩のうちに、北の空で北極星を中心に回って見えるのはなぜか。", "c": ["大気がゆれるから", "地球が自転しているから", "星が地球のまわりを回るから", "地球が公転するから"], "a": 1, "desc": "地軸の延長近くに北極星があるため、地球の自転によって星は北極星を中心に反時計回りに回って見える。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "同じ時刻に見える星座が、1か月ごとに少しずつ西へずれていくのは何によるか。", "c": ["月の満ち欠け", "太陽の自転", "地球の公転", "地球の自転"], "a": 2, "desc": "地球の公転により、同じ時刻に見える星座は1か月で約30°西へずれる（年周運動）。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "真夜中に南の空に見える星座は、地球から見て太陽とどのような位置関係にあるか。", "c": ["太陽と同じ方向", "太陽の真横（東）", "太陽の真横（西）", "太陽と反対の方向"], "a": 3, "desc": "真夜中に南中する星座は、地球をはさんで太陽と反対側にある。だから季節ごとに見える星座が変わる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "みずから光を出してかがやいている天体はどれか。", "c": ["恒星", "惑星", "衛星", "すい星"], "a": 0, "desc": "太陽のようにみずから光る天体を恒星という。惑星や衛星は恒星の光を反射して光って見える。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "太陽のまわりを公転している、みずからは光らない比較的大きな天体を何というか。", "c": ["星座", "惑星", "恒星", "衛星"], "a": 1, "desc": "太陽のまわりを公転する天体を惑星という。地球・金星・火星などがある。衛星は惑星のまわりを回る。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "惑星のまわりを公転している天体を何というか。月は地球の何にあたるか。", "c": ["惑星", "すい星", "衛星", "恒星"], "a": 2, "desc": "惑星のまわりを回る天体を衛星という。月は地球の衛星である。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "太陽の表面に見られる、まわりより温度が低く黒く見える部分を何というか。", "c": ["プロミネンス", "コロナ", "クレーター", "黒点"], "a": 3, "desc": "黒点はまわりより温度が低い（約4000℃）ため黒く見える。位置の移動から太陽の自転がわかる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "太陽の黒点を毎日観察すると少しずつ移動して見える。このことからわかるのはどれか。", "c": ["太陽も自転している", "太陽が地球を回る", "黒点が動く生き物である", "地球が止まっている"], "a": 0, "desc": "黒点が一定方向に移動して見えることから、太陽自身も自転していることがわかる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "月の表面に多数見られる、いん石の衝突でできたと考えられる丸いくぼみを何というか。", "c": ["海溝", "クレーター", "黒点", "プロミネンス"], "a": 1, "desc": "月の表面のクレーターは、いん石などの衝突でできたと考えられている。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "地球から見て月が新月から満月へと形を変えていくのは何によるか。", "c": ["地球の自転", "月の自転だけ", "月の公転による太陽・地球・月の位置関係の変化", "月がみずから光る量の変化"], "a": 2, "desc": "月が地球のまわりを公転し、太陽・地球・月の位置関係が変わるため、光って見える部分が変化して満ち欠けする。"},
    {"subject": "earth", "genre": "earth_space", "diff": "mid", "type": "choice", "q": "夕方の西の空に見える月は、ふつうどのような形か。", "c": ["満月", "新月", "左側が光る形", "右側が光る三日月（または半月）"], "a": 3, "desc": "夕方の西空に見えるのは、太陽の方向（西）に近い右側が光る月（三日月や上弦の月）になる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "夏至のころ、日本で太陽の南中高度が一年で最も高くなるのはなぜか。", "c": ["地軸が公転面に対して傾いたまま公転しているから", "地球が太陽に最も近いから", "太陽が大きくなるから", "自転が速くなるから"], "a": 0, "desc": "地軸が傾いたまま公転するため、夏は太陽の南中高度が高く昼が長い。季節の変化の原因はこの地軸の傾き。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "地軸の傾きが季節をつくる。冬至のころ日本の昼の長さと南中高度はどうなるか。", "c": ["変化しない", "昼が短く、南中高度が低い", "昼が長く、南中高度が高い", "昼夜が等しく高度も最大"], "a": 1, "desc": "冬至は太陽の南中高度が最も低く、昼の長さも最も短い。受ける日射が弱く気温が下がりやすい。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "金星が「明けの明星」「よいの明星」として、真夜中には見えないのはなぜか。", "c": ["金星が遠すぎるから", "金星に大気がないから", "金星が地球より内側を公転しているから", "金星がみずから光らないから"], "a": 2, "desc": "金星は地球より内側（太陽側）を公転する内惑星なので、太陽から大きく離れて見えず、真夜中の空には見えない。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "金星を望遠鏡で見ると、月のように満ち欠けし、見かけの大きさも変わる。これは主に何によるか。", "c": ["金星がみずから光るから", "金星の自転", "地球の公転だけ", "金星と地球の距離・位置関係が変化するから"], "a": 3, "desc": "金星は地球との距離や太陽との位置関係が変わるため、満ち欠けし見かけの大きさも変化する。近いほど大きく細く見える。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "太陽・月・地球がこの順で一直線に並び、月によって太陽がかくされる現象を何というか。", "c": ["日食", "月食", "満月", "南中"], "a": 0, "desc": "太陽−月−地球が一直線に並び、月が太陽をかくすのが日食。新月のときに起こる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "太陽・地球・月がこの順で並び、月が地球の影に入る現象を何というか。", "c": ["日周運動", "月食", "日食", "新月"], "a": 1, "desc": "太陽−地球−月の順に並び、月が地球の影に入るのが月食。満月のときに起こる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "太陽・惑星・衛星・すい星などのまとまりを何というか。", "c": ["星団", "星座", "太陽系", "銀河系"], "a": 2, "desc": "太陽を中心とした天体のまとまりを太陽系という。太陽系をふくむさらに大きな恒星の集団が銀河系。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "太陽系の惑星のうち、おもに気体でできていて大きく密度が小さいなかまを何というか。", "c": ["地球型惑星", "小惑星", "衛星", "木星型惑星"], "a": 3, "desc": "木星・土星などはおもに気体からなり大きく密度が小さい木星型惑星。地球・火星などは岩石主体で小さい地球型惑星。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "地球型惑星の特徴として正しいものはどれか。", "c": ["岩石や金属が主で小型・密度が大きい", "気体が主で大型・密度が小さい", "みずから光る", "衛星をもたない"], "a": 0, "desc": "水星・金星・地球・火星は岩石や金属が主の地球型惑星で、小型だが密度が大きい。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "太陽系をふくむ、数千億個の恒星からなる大きな集団を何というか。", "c": ["星団のみ", "銀河系（天の川銀河）", "太陽系", "星座"], "a": 1, "desc": "太陽系をふくむ恒星の大集団が銀河系。地球から見た銀河系の断面が天の川として見える。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "星の明るさを表す「等級」について正しいものはどれか。", "c": ["すべての星が同じ等級", "色で決まる", "数が小さいほど明るい", "数が大きいほど明るい"], "a": 2, "desc": "等級は数が小さいほど明るい。1等星は6等星よりずっと明るい。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "星の色のちがいは、おもに何のちがいを表しているか。", "c": ["地球からの距離だけ", "星の大きさだけ", "星の年齢だけ", "星の表面温度"], "a": 3, "desc": "星の色は表面温度を反映する。青白い星ほど高温、赤い星ほど低温である。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "北の空の星の動きから、地軸の延長上付近にあってほとんど動かないように見える星はどれか。", "c": ["北極星", "シリウス", "ベテルギウス", "金星"], "a": 0, "desc": "北極星は地軸の延長近くにあるため、ほぼ動かず、ほかの星はその北極星を中心に回って見える。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "同じ星座が、半年後の同じ時刻に見える位置はどうなるか。", "c": ["少しだけ北", "約180°ずれた位置（見えないこともある）", "まったく同じ位置", "約90°東"], "a": 1, "desc": "地球の公転により、半年で約180°ずれる。そのため季節によって見える星座が大きく変わる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "senior", "type": "choice", "q": "日食が新月のたびに必ず起こるわけではないのはなぜか。", "c": ["月が光らないから", "地球が止まるから", "月の公転面が地球の公転面に対して少し傾いているから", "新月の回数が少ないから"], "a": 2, "desc": "月の公転面は地球の公転面（黄道面）に対して約5°傾いているため、太陽・月・地球が一直線にそろうときだけ日食になる。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "物質をつくる最小の粒子", "q": "物質をつくっていて、それ以上分けることができない最小の粒子を何というか。", "c": ["原子", "分子", "イオン", "電子"], "a": 0, "desc": "物質をつくる最小の粒子を原子という。原子がいくつか結びついたものが分子。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "分子", "q": "いくつかの原子が結びついてできた、物質の性質を示すまとまりを何というか。", "c": ["混合物", "分子", "原子核", "元素"], "a": 1, "desc": "分子は原子が結びついた粒子で、その物質の性質を示す最小のまとまり。水分子や酸素分子など。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "単体", "q": "1種類の元素だけからできている物質を何というか。", "c": ["混合物", "水溶液", "単体", "化合物"], "a": 2, "desc": "1種類の元素からなる物質が単体（酸素・鉄・銅など）。2種類以上の元素が結びついた純粋な物質が化合物。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "化合物", "q": "2種類以上の元素が結びついてできた純粋な物質を何というか。", "c": ["単体", "混合物", "元素", "化合物"], "a": 3, "desc": "水や二酸化炭素のように、2種類以上の元素が結びついた純粋な物質を化合物という。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "混合物", "q": "いくつかの物質が混ざり合ったものを何というか。", "c": ["混合物", "化合物", "単体", "分子"], "a": 0, "desc": "食塩水や空気のように、いくつかの物質が混ざったものを混合物という。混ざっているだけで結びついてはいない。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "単体を選ぶ", "q": "次のうち、単体はどれか。", "c": ["塩化ナトリウム", "酸素", "水", "二酸化炭素"], "a": 1, "desc": "酸素は1種類の元素（O）からなる単体。水・二酸化炭素・塩化ナトリウムは化合物。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "化合物を選ぶ", "q": "次のうち、化合物はどれか。", "c": ["酸素", "水素", "水", "鉄"], "a": 2, "desc": "水（H₂O）は水素と酸素が結びついた化合物。鉄・酸素・水素は単体。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "混合物を選ぶ", "q": "次のうち、混合物はどれか。", "c": ["水", "銅", "二酸化炭素", "空気"], "a": 3, "desc": "空気は窒素・酸素などが混ざった混合物。水・銅・二酸化炭素は純粋な物質。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "元素記号", "q": "酸素を表す元素記号はどれか。", "c": ["O", "Au", "Na", "H"], "a": 0, "desc": "酸素はO。水素はH、ナトリウムはNa、金はAu。"},
    {"subject": "chemistry", "genre": "formula", "diff": "junior", "type": "choice", "name": "化学式の意味", "q": "化学式が表しているものとして正しいものはどれか。", "c": ["物質の色だけ", "物質をつくる元素の種類と数", "物質の重さだけ", "物質の値段"], "a": 1, "desc": "化学式は、その物質がどの元素の原子何個からできているかを記号と数字で表したもの。"},
    {"subject": "chemistry", "genre": "formula", "diff": "mid", "type": "choice", "name": "純粋な物質", "q": "1種類の物質だけでできているものを何というか。", "c": ["水溶液", "溶媒", "純粋な物質（純物質）", "混合物"], "a": 2, "desc": "1種類の物質からできているものを純粋な物質という。単体と化合物に分けられる。"},
    {"subject": "chemistry", "genre": "formula", "diff": "mid", "type": "choice", "name": "状態変化と化学変化", "q": "氷がとけて水になる変化について正しいものはどれか。", "c": ["別の物質ができる化学変化", "分解である", "酸化である", "物質の種類は変わらない状態変化"], "a": 3, "desc": "氷→水は状態変化で、H₂Oのまま。物質そのものは変わらない。化学変化は別の物質ができる。"},
    {"subject": "chemistry", "genre": "formula", "diff": "mid", "type": "choice", "name": "分子をつくらない物質", "q": "塩化ナトリウムや金属のように、分子をつくらない物質の説明として正しいものはどれか。", "c": ["多数の原子（イオン）が規則正しく並んでいる", "1個の分子で性質が決まる", "原子が存在しない", "気体である"], "a": 0, "desc": "塩化ナトリウムや金属は分子をつくらず、多数の原子やイオンが規則正しく並んでいる。"},
    {"subject": "chemistry", "genre": "formula", "diff": "mid", "type": "choice", "name": "化学変化の例", "q": "次のうち、化学変化（別の物質ができる変化）はどれか。", "c": ["ろうがとける", "鉄がさびて酸化鉄になる", "水が氷になる", "砂糖が水にとける"], "a": 1, "desc": "鉄がさびるのは酸素と結びつく化学変化。こおる・とける・とけ込むは状態変化や溶解で、物質は変わらない。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "分解", "q": "1種類の物質が2種類以上の物質に分かれる化学変化を何というか。", "c": ["還元", "中和", "分解", "化合"], "a": 2, "desc": "1種類の物質が複数に分かれる変化が分解。加熱や電流によって起こる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "酸化", "q": "物質が酸素と結びつく化学変化を何というか。", "c": ["還元", "分解", "蒸発", "酸化"], "a": 3, "desc": "物質が酸素と結びつく変化を酸化、酸化物が酸素をうばわれる変化を還元という。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "燃焼", "q": "酸化のうち、熱や光を出しながら激しく進むものを何というか。", "c": ["燃焼", "還元", "蒸留", "溶解"], "a": 0, "desc": "熱や光を出す激しい酸化を燃焼という。木炭やマグネシウムの燃焼など。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "還元", "q": "酸化物が酸素をうばわれる化学変化を何というか。", "c": ["燃焼", "還元", "酸化", "化合"], "a": 1, "desc": "酸化銅が炭素によって酸素をうばわれ銅になるような変化が還元。酸化と還元は同時に起こる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "化合", "q": "2種類以上の物質が結びついて別の1種類の物質ができる変化を何というか。", "c": ["還元", "蒸発", "化合", "分解"], "a": 2, "desc": "鉄と硫黄が結びついて硫化鉄ができるように、結びついて別の物質ができる変化を化合という。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "質量保存の法則", "q": "化学変化の前後で、物質全体の質量は変わらない。この法則を何というか。", "c": ["定比例の法則", "フックの法則", "オームの法則", "質量保存の法則"], "a": 3, "desc": "化学変化の前後で原子の数や種類は変わらないため、全体の質量は保存される（質量保存の法則）。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "発熱反応", "q": "化学変化のとき、まわりに熱を出して温度が上がる反応を何というか。", "c": ["発熱反応", "吸熱反応", "中和", "分解"], "a": 0, "desc": "熱を放出する反応が発熱反応（鉄の酸化を利用したかいろなど）。熱を吸収するのが吸熱反応。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "吸熱反応", "q": "まわりから熱を吸収して温度が下がる反応を何というか。", "c": ["酸化", "吸熱反応", "発熱反応", "燃焼"], "a": 1, "desc": "まわりの熱を吸収する反応が吸熱反応。クエン酸と炭酸水素ナトリウムの反応などが例。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "junior", "type": "choice", "name": "石灰石と塩酸", "q": "石灰石にうすい塩酸を加えたときに発生する気体はどれか。", "c": ["水素", "アンモニア", "二酸化炭素", "酸素"], "a": 2, "desc": "石灰石（炭酸カルシウム）に塩酸を加えると二酸化炭素が発生する。石灰水を白くにごらせる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "mid", "type": "choice", "name": "銅の加熱で質量増加", "q": "銅を空気中で加熱すると質量が増えるのはなぜか。", "c": ["銅が蒸発するから", "水分を吸うから", "炭素がつくから", "銅が空気中の酸素と結びつくから"], "a": 3, "desc": "銅は加熱すると酸素と結びついて酸化銅になり、結びついた酸素の分だけ質量が増える。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "mid", "type": "choice", "name": "炭素のはたらき", "q": "酸化銅と炭素の粉を混ぜて加熱すると銅ができる。このときの炭素のはたらきはどれか。", "c": ["酸化銅から酸素をうばう（還元する）", "酸化銅に酸素を与える", "銅を蒸発させる", "変化しない"], "a": 0, "desc": "炭素は酸化銅から酸素をうばって自分は二酸化炭素になる。酸化銅は還元されて銅になる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "mid", "type": "choice", "name": "反応式の意味", "q": "化学反応式で、矢印の左右（反応の前後）で必ず等しくなるものはどれか。", "c": ["色の濃さ", "原子の種類と数", "分子の個数", "物質の体積"], "a": 1, "desc": "化学変化では原子は新たに生じたり消えたりしないので、反応式の左右で原子の種類と数は等しい。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "mid", "type": "choice", "name": "密閉容器の質量", "q": "密閉した容器の中で気体が発生する反応を起こしたとき、反応前後の全体の質量はどうなるか。", "c": ["減る", "半分になる", "変わらない", "増える"], "a": 2, "desc": "気体がにげなければ、質量保存の法則どおり反応前後の質量は変わらない。ふたを開けて気体がにげると減る。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "mid", "type": "choice", "name": "酸化と還元の関係", "q": "酸化と還元の関係について正しいものはどれか。", "c": ["別々の反応で起こる", "還元だけが単独で起こる", "どちらも起こらない", "一方が酸化されると他方が還元され、同時に起こる"], "a": 3, "desc": "ある物質が酸素をうばわれて還元されるとき、酸素をうばった物質は酸化される。両者は同時に起こる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "mid", "type": "choice", "name": "鉄と硫黄の化合", "q": "鉄と硫黄の混合物を加熱してできた硫化鉄の性質として正しいものはどれか。", "c": ["もとの鉄とは性質がちがい、磁石につきにくい", "鉄と同じく磁石によくつく", "塩酸と反応しない", "気体である"], "a": 0, "desc": "化合してできた硫化鉄は、もとの鉄や硫黄とは性質がちがう。磁石につきにくく、塩酸と反応して硫化水素（卵のくさったにおい）を出す。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "senior", "type": "choice", "name": "中和", "q": "酸性の水溶液とアルカリ性の水溶液を混ぜて、たがいの性質を打ち消し合う反応を何というか。", "c": ["分解", "中和", "酸化", "還元"], "a": 1, "desc": "酸とアルカリを混ぜると、水素イオンと水酸化物イオンが結びついて水ができ、たがいの性質を打ち消す（中和）。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "senior", "type": "choice", "name": "塩", "q": "中和のとき、酸の陰イオンとアルカリの陽イオンが結びついてできる物質をまとめて何というか。", "c": ["アルカリ", "水", "塩（えん）", "酸"], "a": 2, "desc": "中和では水とともに塩ができる。塩酸と水酸化ナトリウムの中和では塩化ナトリウムが塩になる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "senior", "type": "choice", "name": "中和でできる水", "q": "中和で水ができるのは、どのイオンどうしが結びつくからか。", "c": ["ナトリウムイオンと塩化物イオン", "水素イオンと塩化物イオン", "銅イオンと酸素", "水素イオンと水酸化物イオン"], "a": 3, "desc": "中和では H⁺ と OH⁻ が結びついて水（H₂O）ができる。これが酸・アルカリの性質が打ち消される理由。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "原子核", "q": "原子の中心にあり、+の電気をもつ部分を何というか。", "c": ["原子核", "電子", "陰イオン", "分子"], "a": 0, "desc": "原子は中心の原子核（+）と、そのまわりを回る電子（−）からできている。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "電子", "q": "原子核のまわりにあり、−の電気をもつ小さな粒子を何というか。", "c": ["原子核", "電子", "陽子", "中性子"], "a": 1, "desc": "−の電気をもつ電子が原子核のまわりにある。電子を失ったり受け取ったりするとイオンになる。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "陽イオン", "q": "原子が電子を失って、+の電気を帯びたものを何というか。", "c": ["分子", "原子核", "陽イオン", "陰イオン"], "a": 2, "desc": "電子を失うと+の電気を帯びた陽イオンになる。電子を受け取ると−の陰イオンになる。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "陰イオン", "q": "原子が電子を受け取って、−の電気を帯びたものを何というか。", "c": ["陽イオン", "原子核", "中性子", "陰イオン"], "a": 3, "desc": "電子を受け取ると−の電気を帯びた陰イオンになる。塩化物イオン Cl⁻ など。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "電解質", "q": "水にとかしたとき、電流が流れる物質を何というか。", "c": ["電解質", "非電解質", "単体", "分子"], "a": 0, "desc": "水にとけてイオンに分かれ、電流を流す物質を電解質という。塩化ナトリウム・塩化水素など。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "非電解質", "q": "水にとかしても電流が流れない物質を何というか。", "c": ["イオン", "非電解質", "電解質", "金属"], "a": 1, "desc": "水にとけてもイオンに分かれず電流を流さない物質を非電解質という。砂糖・エタノールなど。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "電解質を選ぶ", "q": "次のうち、水にとかすと電流が流れる電解質はどれか。", "c": ["エタノール", "デンプン", "塩化ナトリウム", "砂糖"], "a": 2, "desc": "塩化ナトリウムは水中でNa⁺とCl⁻に電離する電解質。砂糖・エタノール・デンプンは非電解質。"},
    {"subject": "chemistry", "genre": "ion", "diff": "junior", "type": "choice", "name": "電離", "q": "電解質が水にとけて陽イオンと陰イオンに分かれることを何というか。", "c": ["蒸発", "中和", "還元", "電離"], "a": 3, "desc": "電解質が水にとけてイオンに分かれることを電離という。これにより水溶液に電流が流れる。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "酸性のイオン", "q": "酸性の水溶液に共通してふくまれ、酸性を示すもとになるイオンはどれか。", "c": ["水素イオン H⁺", "水酸化物イオン OH⁻", "ナトリウムイオン Na⁺", "塩化物イオン Cl⁻"], "a": 0, "desc": "酸性の正体は水素イオン H⁺。アルカリ性の正体は水酸化物イオン OH⁻。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "アルカリ性のイオン", "q": "アルカリ性の水溶液に共通してふくまれ、アルカリ性を示すもとになるイオンはどれか。", "c": ["銅イオン Cu²⁺", "水酸化物イオン OH⁻", "水素イオン H⁺", "塩化物イオン Cl⁻"], "a": 1, "desc": "アルカリ性の正体は水酸化物イオン OH⁻。水酸化ナトリウム水溶液などにふくまれる。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "pH", "q": "水溶液の酸性・中性・アルカリ性の強さを数値で表したものを何というか。", "c": ["密度", "電力", "pH", "質量パーセント濃度"], "a": 2, "desc": "pHは7が中性、7より小さいと酸性、7より大きいとアルカリ性。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "pHと性質", "q": "pHが7より小さい水溶液は何性か。", "c": ["中性", "アルカリ性", "どちらでもない", "酸性"], "a": 3, "desc": "pH<7は酸性、pH=7は中性、pH>7はアルカリ性。値が小さいほど酸性が強い。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "BTBの色(酸性)", "q": "BTB溶液を加えた水溶液が黄色になった。この水溶液は何性か。", "c": ["酸性", "中性", "アルカリ性", "判定できない"], "a": 0, "desc": "BTB溶液は酸性で黄色、中性で緑色、アルカリ性で青色を示す。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "塩酸の電気分解", "q": "うすい塩酸を電気分解したとき、陰極で発生する気体はどれか。", "c": ["二酸化炭素", "水素", "酸素", "塩素"], "a": 1, "desc": "塩酸の電気分解では陰極に水素、陽極に塩素が発生する。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "塩化銅水溶液の電気分解", "q": "塩化銅水溶液を電気分解したとき、陰極に付着する赤い物質はどれか。", "c": ["水素", "酸素", "銅", "塩素"], "a": 2, "desc": "塩化銅水溶液の電気分解では陰極に銅が付着し、陽極から塩素が発生する。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "化学電池", "q": "うすい塩酸などの電解質水溶液に2種類の金属を入れて導線でつなぐと電流がとり出せる。この装置を何というか。", "c": ["電気分解装置", "光電池", "コンデンサー", "化学電池"], "a": 3, "desc": "2種類の金属と電解質水溶液で電流をとり出す装置を化学電池という。化学エネルギーを電気エネルギーに変える。"},
    {"subject": "chemistry", "genre": "ion", "diff": "mid", "type": "choice", "name": "電池の−極", "q": "亜鉛板と銅板を使った電池で、−極になるのはどちらか。", "c": ["亜鉛板（イオンになりやすい方）", "銅板", "どちらもならない", "水溶液"], "a": 0, "desc": "イオンになりやすい（陽イオンになりやすい）金属が−極になる。亜鉛は銅よりイオンになりやすいので−極。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "junior", "type": "choice", "name": "酸素の性質", "q": "酸素の性質として正しいものはどれか。", "c": ["刺激臭がある", "ものを燃やすはたらきがある", "石灰水を白くにごらせる", "空気より軽い"], "a": 1, "desc": "酸素はものを燃やすはたらき（助燃性）がある。火のついた線香を入れると炎を上げて激しく燃える。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "junior", "type": "choice", "name": "二酸化炭素の確認", "q": "発生した気体を石灰水に通すと白くにごった。この気体はどれか。", "c": ["水素", "窒素", "二酸化炭素", "酸素"], "a": 2, "desc": "二酸化炭素は石灰水を白くにごらせる。この反応で二酸化炭素かどうかを確かめられる。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "junior", "type": "choice", "name": "水素の確認", "q": "試験管に集めた気体に火を近づけると、ポンと音を立てて燃えた。この気体はどれか。", "c": ["酸素", "二酸化炭素", "アンモニア", "水素"], "a": 3, "desc": "水素は火を近づけるとポンと音を立てて燃え、水ができる。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "junior", "type": "choice", "name": "リトマス紙(酸性)", "q": "酸性の水溶液をつけたとき、リトマス紙はどのように変化するか。", "c": ["青色リトマス紙が赤色になる", "赤色リトマス紙が青色になる", "どちらも変化しない", "黒くなる"], "a": 0, "desc": "酸性は青色リトマス紙を赤くする。アルカリ性は赤色リトマス紙を青くする。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "junior", "type": "choice", "name": "上皿てんびん", "q": "上皿てんびんで決まった質量の薬品をはかりとるとき、分銅はどちらの皿にのせるか。", "c": ["のせなくてよい", "はかりとる薬品と反対側の皿", "薬品と同じ側の皿", "両方の皿"], "a": 1, "desc": "決まった質量をはかりとるときは、反対側の皿に分銅をのせ、つり合うまで薬品を加える。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "水素の集め方", "q": "水にとけにくい水素を集めるのに適した方法はどれか。", "c": ["下方置換法", "加熱蒸留", "水上置換法", "上方置換法"], "a": 2, "desc": "水素は水にとけにくいので水上置換法で集める。純粋な気体を集めやすい。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "アンモニアの集め方", "q": "水にとてもよくとけ、空気より軽いアンモニアを集めるのに適した方法はどれか。", "c": ["下方置換法", "水上置換法", "ろ過", "上方置換法"], "a": 3, "desc": "アンモニアは水によくとけ空気より軽いので、上方置換法で集める。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "二酸化炭素の集め方", "q": "水に少しとけ、空気より重い二酸化炭素を集める方法として適切なものはどれか。", "c": ["下方置換法（または水上置換法）", "上方置換法だけ", "必ず上方置換法", "集められない"], "a": 0, "desc": "二酸化炭素は空気より重いので下方置換法で集められる。水に少ししかとけないため水上置換法でも集められる。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "ろ過", "q": "液体にとけ残った固体を、ろ紙を使って分ける操作を何というか。", "c": ["中和", "ろ過", "蒸留", "再結晶"], "a": 1, "desc": "ろ紙を使って固体と液体を分ける操作がろ過。ガラス棒を伝わらせ、ろうとのあしを容器のかべにつける。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "蒸留", "q": "液体を加熱して気体にし、それを冷やして再び液体にして取り出す方法を何というか。", "c": ["再結晶", "電気分解", "蒸留", "ろ過"], "a": 2, "desc": "沸点のちがいを利用して液体を分ける方法が蒸留。水とエタノールの混合物を分けるときなどに使う。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "再結晶", "q": "温度によるとける量のちがいを利用して、固体をいったんとかして再び結晶として取り出す方法を何というか。", "c": ["ろ過", "蒸留", "中和", "再結晶"], "a": 3, "desc": "物質が温度によってとける量がちがうことを利用して、純粋な結晶を取り出す方法を再結晶という。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "mid", "type": "choice", "name": "メスシリンダーの読み方", "q": "メスシリンダーで液量を読むとき、目をどの位置に合わせて読むか。", "c": ["液面のへこんだ底を真横から", "液面の上のふちを上から", "底から見上げる", "どこでもよい"], "a": 0, "desc": "液面のへこんだ部分（メニスカス）の底を、真横から目の高さを合わせて読む。"},
    {"subject": "physics", "genre": "light_sound", "diff": "junior", "type": "choice", "q": "光が同じ物質の中をまっすぐに進むことを何というか。", "c": ["全反射", "光の直進", "光の反射", "光の屈折"], "a": 1, "desc": "光が同じ物質中をまっすぐ進むことを光の直進という。かげができるのもこのため。"},
    {"subject": "physics", "genre": "light_sound", "diff": "junior", "type": "choice", "q": "光が鏡などの表面ではね返ることを何というか。", "c": ["直進", "分散", "反射", "屈折"], "a": 2, "desc": "光が物体の表面ではね返ることを反射という。入射角と反射角は等しい（反射の法則）。"},
    {"subject": "physics", "genre": "light_sound", "diff": "junior", "type": "choice", "q": "光が反射するとき、入射角と反射角の関係として正しいものはどれか。", "c": ["入射角のほうが大きい", "反射角のほうが大きい", "関係はない", "つねに等しい"], "a": 3, "desc": "反射の法則により、入射角と反射角はつねに等しい。"},
    {"subject": "physics", "genre": "light_sound", "diff": "junior", "type": "choice", "q": "光が水やガラスなど異なる物質に進むとき、境界で進む向きが変わることを何というか。", "c": ["屈折", "反射", "直進", "振動"], "a": 0, "desc": "光が異なる物質へ進むとき境界で折れ曲がることを屈折という。水中のものが浮いて見えるのはこのため。"},
    {"subject": "physics", "genre": "light_sound", "diff": "junior", "type": "choice", "q": "水中から空気中へ光が進むとき、入射角が大きいと境界で全部反射する。この現象を何というか。", "c": ["分散", "全反射", "乱反射", "屈折"], "a": 1, "desc": "水中（ガラス中）から空気中へ進むとき、ある角度をこえると光がすべて反射する全反射が起こる。光ファイバーに利用される。"},
    {"subject": "physics", "genre": "light_sound", "diff": "junior", "type": "choice", "q": "光源でない物体が見えるのはなぜか。", "c": ["目から光が出るから", "音が伝わるから", "物体で反射した光が目に届くから", "物体がみずから光るから"], "a": 2, "desc": "光源でない物体は、当たった光を反射し、その光が目に届くことで見える。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "凸レンズで、焦点の外側に物体を置いたときにスクリーンにうつる像を何というか。", "c": ["虚像（正立）", "像はできない", "光源像", "実像（上下左右が逆）"], "a": 3, "desc": "焦点の外側に物体があると、上下左右が逆の実像がスクリーンにできる。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "虫めがね（凸レンズ）で、焦点の内側にある物体を見たときに見える像はどれか。", "c": ["正立で拡大した虚像", "倒立した実像", "同じ大きさの実像", "像はできない"], "a": 0, "desc": "焦点の内側に物体を置くと、正立で拡大した虚像が見える。虫めがねで大きく見えるのはこのため。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "音が出ているとき、音源（おんさや弦など）はどうなっているか。", "c": ["光っている", "振動している", "静止している", "とけている"], "a": 1, "desc": "音は物体の振動によって生じ、空気などを伝わって耳に届く。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "空気をぬいた容器（真空）の中で音が鳴っているとき、外には音はどう伝わるか。", "c": ["光になって伝わる", "一瞬だけ伝わる", "伝わらない", "よりよく伝わる"], "a": 2, "desc": "音は振動を伝える物質（媒質）が必要なので、真空中では伝わらない。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "音の高さ（高い・低い）を決めるものはどれか。", "c": ["振幅", "音を伝える物質", "光の量", "振動数"], "a": 3, "desc": "振動数が多いほど高い音になる。振動数の単位はHz（ヘルツ）。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "音の大きさ（大きい・小さい）を決めるものはどれか。", "c": ["振幅", "振動数", "音の速さ", "温度"], "a": 0, "desc": "振幅が大きいほど大きい音になる。振動数は音の高さを決める。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "choice", "q": "雷が光ってから音が遅れて聞こえるのはなぜか。", "c": ["音が反射するから", "光のほうが音よりずっと速いから", "音のほうが速いから", "光は曲がるから"], "a": 1, "desc": "光は秒速約30万km、音は空気中で秒速約340m。光がはるかに速いため、光が先に届き音が遅れる。"},
    {"subject": "physics", "genre": "light_sound", "diff": "mid", "type": "typing", "plain": true, "name": "音の速さ(やまびこ)", "display": "音の速さを340m/sとする。がけに向かって音を出し、2秒後にやまびこが返った。がけまでの距離は [ ? ] m", "formula": "340", "desc": "音は往復したので、片道は2秒の半分の1秒分。340m/s×1s＝340m。（往復680mの半分）"},
    {"subject": "physics", "genre": "force", "diff": "junior", "type": "choice", "q": "地球が物体をその中心に向かって引く力を何というか。", "c": ["弾性力", "磁力", "重力", "摩擦力"], "a": 2, "desc": "地球が物体を引く力が重力。物体の重さは、その物体にはたらく重力の大きさのこと。"},
    {"subject": "physics", "genre": "force", "diff": "junior", "type": "choice", "q": "ばねののびが、加えた力の大きさに比例するという法則を何というか。", "c": ["オームの法則", "慣性の法則", "作用反作用の法則", "フックの法則"], "a": 3, "desc": "ばねののびは加えた力に比例する（フックの法則）。これを利用したのがばねばかり。"},
    {"subject": "physics", "genre": "force", "diff": "junior", "type": "choice", "q": "力の大きさを表す単位はどれか。", "c": ["N（ニュートン）", "g（グラム）", "Pa（パスカル）", "J（ジュール）"], "a": 0, "desc": "力の大きさの単位はN（ニュートン）。質量100gの物体にはたらく重力は約1N。"},
    {"subject": "physics", "genre": "force", "diff": "junior", "type": "choice", "q": "質量と重さについて正しい説明はどれか。", "c": ["重さは場所で変わらない", "質量は場所が変わっても変わらないが、重さは変わる", "質量も重さも場所で変わる", "質量も重さも変わらない"], "a": 1, "desc": "質量は物体そのものの量で場所によらず一定。重さは重力の大きさなので、月では約6分の1になる。"},
    {"subject": "physics", "genre": "force", "diff": "junior", "type": "choice", "q": "2つの力がつり合う条件として正しくないものはどれか。", "c": ["2力の向きが反対", "2力が一直線上にある", "2力の向きが同じ", "2力の大きさが等しい"], "a": 2, "desc": "2力のつり合いの条件は「大きさが等しい・向きが反対・一直線上」。向きが同じではつり合わない。"},
    {"subject": "physics", "genre": "force", "diff": "junior", "type": "choice", "q": "面を垂直に押す力が、一定の面積あたりにどれだけはたらくかを表す量を何というか。", "c": ["重力", "浮力", "磁力", "圧力"], "a": 3, "desc": "単位面積あたりにはたらく力を圧力という。圧力＝力÷面積。単位はPa（パスカル）。"},
    {"subject": "physics", "genre": "force", "diff": "mid", "type": "choice", "q": "水中の物体にはたらく上向きの力を何というか。", "c": ["浮力", "重力", "摩擦力", "張力"], "a": 0, "desc": "水中の物体には上向きの浮力がはたらく。浮力の大きさは物体が押しのけた水の重さに等しい。"},
    {"subject": "physics", "genre": "force", "diff": "mid", "type": "choice", "q": "水圧について正しい説明はどれか。", "c": ["上向きにしかはたらかない", "深いところほど大きくなる", "浅いところほど大きい", "どこでも同じ"], "a": 1, "desc": "水圧は水の重さによる圧力で、深いところほど大きくなる。あらゆる向きからはたらく。"},
    {"subject": "physics", "genre": "force", "diff": "mid", "type": "choice", "q": "空気（大気）の重さによって生じる圧力を何というか。", "c": ["浮力", "弾性力", "大気圧", "水圧"], "a": 2, "desc": "地球をとりまく大気の重さによる圧力を大気圧という。標高が高いほど小さくなる。"},
    {"subject": "physics", "genre": "force", "diff": "mid", "type": "choice", "q": "物体を水に入れたとき、浮くか沈むかを決めるのは何の関係か。", "c": ["色と形", "温度だけ", "音の大きさ", "重力と浮力の大小"], "a": 3, "desc": "重力より浮力が大きければ浮き、重力のほうが大きければ沈む。等しければ水中で静止する。"},
    {"subject": "physics", "genre": "electricity", "diff": "junior", "type": "choice", "q": "回路を流れる電気の流れを何というか。また、その単位はどれか。", "c": ["電流・A（アンペア）", "電圧・V（ボルト）", "抵抗・Ω（オーム）", "電力・W（ワット）"], "a": 0, "desc": "電気の流れが電流で、単位はA（アンペア）。電流を流そうとするはたらきが電圧（V）。"},
    {"subject": "physics", "genre": "electricity", "diff": "junior", "type": "choice", "q": "枝分かれのない、電流の通り道が1本道になっている回路を何というか。", "c": ["開回路", "直列回路", "並列回路", "短絡回路"], "a": 1, "desc": "電流の通り道が1本道の回路が直列回路。途中で枝分かれする回路が並列回路。"},
    {"subject": "physics", "genre": "electricity", "diff": "junior", "type": "choice", "q": "直列回路の各点を流れる電流の大きさについて正しいものはどれか。", "c": ["電源に近いほど大きい", "電源から遠いほど大きい", "どの点でも同じ", "枝ごとに分かれる"], "a": 2, "desc": "直列回路では、電流は枝分かれしないのでどの点でも同じ大きさになる。"},
    {"subject": "physics", "genre": "electricity", "diff": "junior", "type": "choice", "q": "電流計の回路へのつなぎ方として正しいものはどれか。", "c": ["並列につなぐ", "電源にだけつなぐ", "つながなくてよい", "はかりたい部分に直列につなぐ"], "a": 3, "desc": "電流計は回路に直列につなぐ。電圧計ははかりたい部分に並列につなぐ。"},
    {"subject": "physics", "genre": "electricity", "diff": "junior", "type": "choice", "q": "2種類の物体をこすり合わせたときに生じる電気を何というか。", "c": ["静電気", "電流", "磁気", "電圧"], "a": 0, "desc": "こすり合わせで生じる電気が静電気。同じ種類の電気はしりぞけ合い、ちがう種類は引き合う。"},
    {"subject": "physics", "genre": "electricity", "diff": "mid", "type": "choice", "q": "電流の流れにくさを表す量を何というか。単位はどれか。", "c": ["電流・A", "抵抗・Ω（オーム）", "電力・W", "電圧・V"], "a": 1, "desc": "電流の流れにくさが抵抗で、単位はΩ（オーム）。抵抗が大きいほど電流は流れにくい。"},
    {"subject": "physics", "genre": "electricity", "diff": "mid", "type": "choice", "q": "1秒あたりに使われる電気エネルギーの大きさを表す量を何というか。", "c": ["抵抗（単位Ω）", "電圧（単位V）", "電力（単位W）", "電力量（単位J）"], "a": 2, "desc": "1秒あたりに使う電気エネルギーが電力で、単位はW（ワット）。電力＝電圧×電流。"},
    {"subject": "physics", "genre": "electricity", "diff": "mid", "type": "typing", "plain": true, "name": "電力量(熱量)の計算", "display": "500Wの電熱線を60秒間使ったときの電力量（発生する熱量）は [ ? ] J", "formula": "30000", "desc": "電力量（J）＝電力（W）×時間（s）＝500×60＝30000J。"},
    {"subject": "physics", "genre": "electricity", "diff": "senior", "type": "choice", "q": "コイルの近くで磁石を動かすと電流が流れる現象を何というか。", "c": ["静電誘導", "放電", "整流", "電磁誘導"], "a": 3, "desc": "磁界の変化によってコイルに電流が流れる現象が電磁誘導。このとき流れる電流を誘導電流という。"},
    {"subject": "physics", "genre": "electricity", "diff": "senior", "type": "choice", "q": "流れる向きが周期的に入れかわる電流を何というか。", "c": ["交流", "直流", "静電気", "誘導電流"], "a": 0, "desc": "向きが周期的に変わる電流が交流（家庭のコンセント）。一定向きに流れる電流が直流（乾電池）。"},
    {"subject": "physics", "genre": "electricity", "diff": "senior", "type": "choice", "q": "導線に電流を流すと、そのまわりにできるものは何か。", "c": ["音波", "磁界", "電界だけ", "重力場"], "a": 1, "desc": "電流を流すと導線のまわりに同心円状の磁界ができる。電流の向きと磁界の向きには右ねじの関係がある。"},
    {"subject": "physics", "genre": "electricity", "diff": "senior", "type": "choice", "q": "磁界の中の導線に電流を流すと導線が力を受ける。この性質を利用した装置はどれか。", "c": ["変圧器", "電池", "モーター", "発電機だけ"], "a": 2, "desc": "磁界中の電流が受ける力を利用してコイルを回転させるのがモーター。逆に磁界の変化で電流を得るのが発電機。"},
    {"subject": "physics", "genre": "motion", "diff": "mid", "type": "choice", "q": "物体が一定の速さで一直線上を進む運動を何というか。", "c": ["自由落下", "円運動", "加速運動", "等速直線運動"], "a": 3, "desc": "速さも向きも変わらない運動が等速直線運動。距離は時間に比例し、グラフは原点を通る直線になる。"},
    {"subject": "physics", "genre": "motion", "diff": "mid", "type": "choice", "q": "物体が、外から力を受けないかぎり、静止または等速直線運動を続けようとする性質を何というか。", "c": ["慣性", "弾性", "摩擦", "浮力"], "a": 0, "desc": "物体が運動の状態を保とうとする性質が慣性。バスが急発進すると体が後ろにかたむくのはこのため。"},
    {"subject": "physics", "genre": "motion", "diff": "mid", "type": "choice", "q": "Aの物体がBの物体を押すと、BもAを同じ大きさで反対向きに押し返す。この関係を何というか。", "c": ["てこの原理", "作用・反作用", "2力のつり合い", "慣性"], "a": 1, "desc": "一方が力を加えると、相手も同じ大きさで反対向きの力を加え返す（作用・反作用の法則）。"},
    {"subject": "physics", "genre": "motion", "diff": "mid", "type": "typing", "plain": true, "name": "移動距離の計算", "display": "4m/sの速さで6秒間進んだときの移動距離は [ ? ] m", "formula": "24", "desc": "距離＝速さ×時間＝4m/s×6s＝24m。"},
    {"subject": "physics", "genre": "motion", "diff": "senior", "type": "choice", "q": "物体に力を加え、その向きに動かしたときに「仕事をした」という。仕事の大きさの求め方はどれか。", "c": ["力＋距離", "距離÷時間", "力の大きさ×力の向きに動いた距離", "力÷距離"], "a": 2, "desc": "仕事（J）＝力（N）×力の向きに動いた距離（m）。動かなければ仕事は0。"},
    {"subject": "physics", "genre": "motion", "diff": "senior", "type": "choice", "q": "高い所にある物体が、その位置によってもつエネルギーを何というか。", "c": ["運動エネルギー", "熱エネルギー", "弾性エネルギー", "位置エネルギー"], "a": 3, "desc": "高い所にある物体がもつエネルギーが位置エネルギー。高さが高いほど、質量が大きいほど大きい。"},
    {"subject": "physics", "genre": "motion", "diff": "senior", "type": "choice", "q": "運動している物体がもつエネルギーを何というか。", "c": ["運動エネルギー", "位置エネルギー", "電気エネルギー", "化学エネルギー"], "a": 0, "desc": "運動している物体がもつエネルギーが運動エネルギー。速さが速いほど、質量が大きいほど大きい。"},
    {"subject": "physics", "genre": "motion", "diff": "senior", "type": "choice", "q": "摩擦や空気の抵抗がなければ、位置エネルギーと運動エネルギーの和は一定に保たれる。この和を何というか。", "c": ["仕事率", "力学的エネルギー", "熱量", "電力量"], "a": 1, "desc": "位置エネルギーと運動エネルギーの和が力学的エネルギー。摩擦などがなければ一定に保たれる（力学的エネルギーの保存）。"},
    {"subject": "physics", "genre": "motion", "diff": "senior", "type": "choice", "q": "道具（てこや滑車）を使って仕事をしても、仕事の量そのものは変わらない。この原理を何というか。", "c": ["作用反作用の法則", "フックの法則", "仕事の原理", "慣性の法則"], "a": 2, "desc": "道具を使うと力は小さくできるが動かす距離が長くなり、仕事の量は変わらない（仕事の原理）。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "2H₂Oの水素原子", "q": "2H₂O にふくまれる水素原子は全部で何個か。", "c": ["4個", "2個", "1個", "6個"], "a": 0, "desc": "水分子1個に水素2個、2倍で4個。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "CO₂の原子数", "q": "CO₂ 1個にふくまれる原子は全部で何個か。", "c": ["4個", "3個", "2個", "1個"], "a": 1, "desc": "炭素1＋酸素2＝3個。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "単体を選ぶ", "q": "次のうち単体はどれか。", "c": ["アンモニア NH₃", "二酸化炭素 CO₂", "窒素 N₂", "水 H₂O"], "a": 2, "desc": "N₂は1種類の元素＝単体。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "同素体", "q": "同じ元素からなり性質がちがう単体どうしを何というか。", "c": ["同位体", "化合物", "混合物", "同素体"], "a": 3, "desc": "ダイヤモンドと黒鉛など。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "組成式", "q": "分子をつくらず組成式で表す物質はどれか。", "c": ["塩化ナトリウム", "酸素", "水", "アンモニア"], "a": 0, "desc": "NaClはイオンが規則的に並ぶ。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "係数の意味", "q": "化学反応式の係数が表すのは何の比か。", "c": ["色の比", "粒子の数の比", "質量の比", "温度の比"], "a": 1, "desc": "係数は分子・原子の数の比。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "水の電気分解の比", "q": "水の電気分解で生じる水素と酸素の体積比は。", "c": ["1:1", "3:1", "2:1", "1:2"], "a": 2, "desc": "H₂:O₂＝2:1。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "NaClの成分", "q": "塩化ナトリウムをつくる元素は。", "c": ["ナトリウムと酸素", "水素と塩素", "炭素と酸素", "ナトリウムと塩素"], "a": 3, "desc": "NaとClの化合物。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "2CO₂の酸素原子", "q": "2CO₂ の酸素原子は全部で何個か。", "c": ["4個", "2個", "3個", "6個"], "a": 0, "desc": "CO₂に酸素2個、2倍で4個。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "純物質", "q": "次のうち純物質はどれか。", "c": ["海水", "二酸化炭素", "空気", "食塩水"], "a": 1, "desc": "空気・食塩水・海水は混合物。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "H₂SO₄の原子数", "q": "H₂SO₄ 1個の原子の総数は。", "c": ["4個", "3個", "7個", "6個"], "a": 2, "desc": "H2＋S1＋O4＝7個。"},
    {"subject": "chemistry", "genre": "formula", "diff": "supreme", "type": "choice", "name": "化合物を選ぶ", "q": "次のうち化合物はどれか。", "c": ["銅", "酸素", "鉄", "酸化銅"], "a": 3, "desc": "酸化銅は銅と酸素の化合物。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "銅と酸素の比", "q": "銅:酸素＝4:1で結びつく。銅1.2gと結びつく酸素は。", "c": ["0.3g", "0.4g", "1.2g", "4.8g"], "a": 0, "desc": "1.2÷4＝0.3g。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "酸化銅の質量", "q": "銅0.8gが完全に酸化すると酸化銅は何gか（銅:酸素＝4:1）。", "c": ["0.2g", "1.0g", "0.8g", "1.6g"], "a": 1, "desc": "酸素0.2gが加わる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "マグネシウムの比", "q": "Mg:O＝3:2で結びつく。Mg6gと結びつく酸素は。", "c": ["6g", "3g", "4g", "2g"], "a": 2, "desc": "6×2÷3＝4g。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "定比例の法則", "q": "化合物中の成分元素の質量比が一定という法則は。", "c": ["質量保存の法則", "アボガドロの法則", "フックの法則", "定比例の法則"], "a": 3, "desc": "化合物の成分比はいつも一定。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "発熱反応", "q": "次のうち発熱反応はどれか。", "c": ["鉄粉の酸化", "炭酸水素ナトリウムの分解", "水の電気分解", "炭酸カルシウムの分解"], "a": 0, "desc": "かいろは鉄の酸化で発熱。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "吸熱反応", "q": "次のうち吸熱反応はどれか。", "c": ["メタンの燃焼", "クエン酸と重そうの反応", "鉄の酸化", "中和"], "a": 1, "desc": "温度が下がる吸熱反応。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "還元できるもの", "q": "酸化銅を還元できるのは。", "c": ["水", "窒素", "炭素や水素", "酸素"], "a": 2, "desc": "酸素をうばう物質が必要。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "中和でできる塩", "q": "塩酸と水酸化ナトリウムの中和でできる塩は。", "c": ["硫酸ナトリウム", "炭酸カルシウム", "硝酸カリウム", "塩化ナトリウム"], "a": 3, "desc": "NaClと水ができる。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "質量保存", "q": "密閉容器内の反応前後で全体の質量は。", "c": ["変わらない", "増える", "減る", "半分になる"], "a": 0, "desc": "質量保存の法則。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "白い沈殿", "q": "塩化バリウムと硫酸で生じる白い沈殿は。", "c": ["水酸化銅", "硫酸バリウム", "塩化ナトリウム", "炭酸カルシウム"], "a": 1, "desc": "水に溶けにくいBaSO₄。"},
    {"subject": "chemistry", "genre": "reaction", "diff": "supreme", "type": "choice", "name": "有機物の燃焼", "q": "有機物を完全燃焼させると必ずできるのは。", "c": ["炭素と水", "窒素と水", "二酸化炭素と水", "水素と酸素"], "a": 2, "desc": "C・Hが酸化される。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "電池の−極", "q": "うすい塩酸に亜鉛板と銅板。−極になるのは。", "c": ["銅板", "塩酸", "水素", "亜鉛板"], "a": 3, "desc": "イオンになりやすい亜鉛が−極。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "イオン化傾向", "q": "金属が陽イオンになりやすい順を何というか。", "c": ["イオン化傾向", "電気陰性度", "pH", "溶解度"], "a": 0, "desc": "発展用語。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "電池の変換", "q": "化学電池は何を電気エネルギーに変えるか。", "c": ["位置エネルギー", "化学エネルギー", "光エネルギー", "熱エネルギー"], "a": 1, "desc": "化学変化で電気をとり出す。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "ちょうど中和", "q": "酸とアルカリが過不足なく中和したとき水溶液は（強酸・強塩基）。", "c": ["アルカリ性", "決まらない", "中性", "酸性"], "a": 2, "desc": "H⁺とOH⁻が等しい。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "pH7より大", "q": "pHが7より大きい水溶液は。", "c": ["酸性", "中性", "気体", "アルカリ性"], "a": 3, "desc": "pH>7はアルカリ性。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "塩酸の電気分解(陽極)", "q": "塩酸の電気分解で陽極に発生する気体は。", "c": ["塩素", "水素", "酸素", "二酸化炭素"], "a": 0, "desc": "陽極は塩素、陰極は水素。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "塩化銅(陰極)", "q": "塩化銅水溶液の電気分解で陰極につくのは。", "c": ["酸素", "銅", "塩素", "水素"], "a": 1, "desc": "陰極に赤い銅が付着。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "酸性のイオン", "q": "酸性を示すもとのイオンは。", "c": ["Na⁺", "Cl⁻", "H⁺", "OH⁻"], "a": 2, "desc": "水素イオンが酸性の正体。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "アルカリのイオン", "q": "アルカリ性を示すもとのイオンは。", "c": ["H⁺", "Cl⁻", "Na⁺", "OH⁻"], "a": 3, "desc": "水酸化物イオンが正体。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "陽イオンになる", "q": "原子が電子を失うとどうなるか。", "c": ["陽イオン", "陰イオン", "分子", "原子核"], "a": 0, "desc": "＋の電気を帯びる。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "電解質", "q": "水にとかすと電流が流れるのは。", "c": ["デンプン", "塩化ナトリウム", "砂糖", "エタノール"], "a": 1, "desc": "電離する電解質。"},
    {"subject": "chemistry", "genre": "ion", "diff": "supreme", "type": "choice", "name": "銅イオンの色", "q": "銅イオンをふくむ水溶液の色は。", "c": ["無色", "赤色", "青色", "黄色"], "a": 2, "desc": "Cu²⁺は青色を示す。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "水素の捕集", "q": "水素を集めるのに適した方法は。", "c": ["上方置換", "下方置換", "ろ過", "水上置換"], "a": 3, "desc": "水にとけにくい。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "アンモニアの捕集", "q": "アンモニアを集めるのに適した方法は。", "c": ["上方置換", "下方置換", "水上置換", "蒸留"], "a": 0, "desc": "水によくとけ空気より軽い。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "蒸留", "q": "水とエタノールの混合物を分ける方法は。", "c": ["中和", "蒸留", "ろ過", "再結晶"], "a": 1, "desc": "沸点の差を利用。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "再結晶", "q": "溶解度の差で固体を取り出す方法は。", "c": ["ろ過", "電気分解", "再結晶", "蒸留"], "a": 2, "desc": "温度を下げて結晶化。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "飽和水溶液", "q": "これ以上とけない状態の水溶液を。", "c": ["希薄溶液", "混合物", "コロイド", "飽和水溶液"], "a": 3, "desc": "溶解度まで溶けた状態。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "フェノールフタレイン", "q": "フェノールフタレイン液がアルカリ性で示す色は。", "c": ["赤(桃)色", "黄色", "青色", "無色"], "a": 0, "desc": "酸・中性では無色。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "濃度", "q": "質量パーセント濃度は溶質の質量を何で割るか。", "c": ["密度", "水溶液全体の質量", "水の質量", "体積"], "a": 1, "desc": "溶質÷(溶質＋溶媒)×100。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "二酸化炭素の捕集", "q": "空気より重い二酸化炭素に適した集め方は。", "c": ["ろ過", "蒸留", "下方置換", "上方置換"], "a": 2, "desc": "水上置換でも集められる。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "ガスバーナー", "q": "ガスバーナーの炎が赤いとき不足しているのは。", "c": ["ガス", "水", "熱", "空気(酸素)"], "a": 3, "desc": "空気調節ねじを開ける。"},
    {"subject": "chemistry", "genre": "experiment", "diff": "supreme", "type": "choice", "name": "酸素の確認", "q": "火のついた線香を激しく燃やす気体は。", "c": ["酸素", "水素", "二酸化炭素", "窒素"], "a": 0, "desc": "酸素は助燃性をもつ。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "凸レンズで物体を焦点距離の2倍に置くとできる像は。", "c": ["像はできない", "同じ大きさの実像", "拡大した実像", "虚像"], "a": 1, "desc": "2f→等倍の倒立実像。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "凸レンズで焦点の内側に物体を置くと見えるのは。", "c": ["像はできない", "点", "正立拡大の虚像", "倒立の実像"], "a": 2, "desc": "虫めがねの見え方。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "1秒間に680回振動する音の振動数は。", "c": ["340Hz", "68Hz", "1360Hz", "680Hz"], "a": 3, "desc": "振動数の単位はHz。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "typing", "plain": true, "name": "反射音の時間", "display": "音速340m/s。1700m先の壁からの反射音が返るまで [ ? ] 秒", "formula": "10", "desc": "往復3400m÷340＝10秒。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "全反射を利用したものは。", "c": ["光ファイバー", "虫めがね", "日時計", "方位磁針"], "a": 0, "desc": "光を閉じこめて伝える。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "弦を短く強く張ると音は。", "c": ["変わらない", "高くなる", "低くなる", "消える"], "a": 1, "desc": "振動数が増える。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "入射角が30°のときの反射角は。", "c": ["90°", "15°", "30°", "60°"], "a": 2, "desc": "反射の法則で等しい。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "気温が高いほど空気中の音の速さは。", "c": ["遅くなる", "変わらない", "0になる", "速くなる"], "a": 3, "desc": "気温で音速は変化。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "音の大きさを決めるのは。", "c": ["振幅", "振動数", "音速", "温度"], "a": 0, "desc": "振幅が大きいほど大きい音。"},
    {"subject": "physics", "genre": "light_sound", "diff": "supreme", "type": "choice", "q": "水中のものが浮いて見える原因は光の。", "c": ["分散", "屈折", "反射", "直進"], "a": 1, "desc": "境界で曲がるため。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "浮力の大きさは何に等しいか。", "c": ["水の深さ", "物体の体積", "押しのけた水の重さ", "物体の重さ"], "a": 2, "desc": "アルキメデスの原理。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "水圧がはたらく向きは。", "c": ["下向きだけ", "上向きだけ", "横だけ", "あらゆる向き"], "a": 3, "desc": "深いほど大きい。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "一直線上で同じ向きの3Nと2Nの合力は。", "c": ["5N", "1N", "6N", "0N"], "a": 0, "desc": "同じ向きは和。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "反対向きの4Nと4Nの合力は。", "c": ["16N", "0N", "8N", "4N"], "a": 1, "desc": "つり合って0。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "月で重さが約1/6になっても変わらないのは。", "c": ["重力", "圧力", "質量", "重さ"], "a": 2, "desc": "質量は場所によらない。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "標高が高いほど大気圧は。", "c": ["大きくなる", "変わらない", "0になる", "小さくなる"], "a": 3, "desc": "上にある空気が減る。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "同じ力でも接地面積を小さくすると圧力は。", "c": ["大きくなる", "小さくなる", "変わらない", "0になる"], "a": 0, "desc": "圧力＝力÷面積。"},
    {"subject": "physics", "genre": "force", "diff": "supreme", "type": "choice", "q": "水に浮く条件は、浮力と重力の関係が。", "c": ["重力＝0", "浮力≧重力", "浮力<重力", "浮力＝0"], "a": 1, "desc": "浮力が重力以上で浮く。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "同じ10Ωを2本並列にした合成抵抗は。", "c": ["10Ω", "2Ω", "5Ω", "20Ω"], "a": 2, "desc": "並列は小さくなる。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "並列回路で各抵抗にかかる電圧は。", "c": ["枝で分かれる", "0", "合計が電源", "電源と同じで等しい"], "a": 3, "desc": "並列は電圧が等しい。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "電力量の単位はどれか。", "c": ["J（ジュール）", "Ω", "V", "A"], "a": 0, "desc": "熱量・電力量はJ。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "コイルに磁石を出し入れして電流を得る現象は。", "c": ["整流", "電磁誘導", "静電気", "放電"], "a": 1, "desc": "誘導電流が流れる。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "家庭のコンセントの電流は。", "c": ["静電気", "誘導電流", "交流", "直流"], "a": 2, "desc": "向きが周期的に変わる。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "電流のまわりの磁界の向きを表す法則は。", "c": ["オームの法則", "フックの法則", "慣性の法則", "右ねじの法則"], "a": 3, "desc": "電流と磁界の関係。"},
    {"subject": "physics", "genre": "electricity", "diff": "supreme", "type": "choice", "q": "直列回路の各点を流れる電流は。", "c": ["どこも等しい", "枝で分かれる", "0", "増える"], "a": 0, "desc": "直列は電流が等しい。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "1秒間に50打点する記録タイマーの1打点の時間は。", "c": ["0.5秒", "0.02秒", "0.05秒", "0.1秒"], "a": 1, "desc": "1÷50＝0.02秒。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "等速直線運動で移動距離と時間の関係は。", "c": ["反比例", "曲線", "比例(原点を通る直線)", "一定"], "a": 2, "desc": "距離は時間に比例。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "走るバスが急停止すると体が前に倒れる。これは。", "c": ["重力", "摩擦", "浮力", "慣性"], "a": 3, "desc": "慣性の法則。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "壁を押すと押し返される。この関係は。", "c": ["作用・反作用", "つり合い", "慣性", "弾性"], "a": 0, "desc": "同じ大きさ反対向き。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "動滑車で引く力が半分になると、引く距離は。", "c": ["4倍", "2倍", "半分", "同じ"], "a": 1, "desc": "仕事の原理で変わらない。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "摩擦がなければ位置エネルギーと運動エネルギーの和は。", "c": ["減る", "0になる", "一定に保たれる", "増える"], "a": 2, "desc": "力学的エネルギー保存。"},
    {"subject": "physics", "genre": "motion", "diff": "supreme", "type": "choice", "q": "位置エネルギーが大きいのは。", "c": ["低い所の軽い物体", "地面の物体", "静止した軽い物体", "高い所の重い物体"], "a": 3, "desc": "高さ・質量が大きいほど大。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "蒸散が最も多く行われるのは。", "c": ["葉の裏", "葉の表", "茎", "根"], "a": 0, "desc": "気孔が裏に多い。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "相対量で表・5、裏・20、茎・2のとき葉全体の蒸散量は。", "c": ["5", "25", "20", "22"], "a": 1, "desc": "表5＋裏20＝25。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "光合成に光が必要かを調べる対照実験で変える条件は。", "c": ["温度", "二酸化炭素", "光の有無だけ", "光と水"], "a": 2, "desc": "調べる条件だけ変える。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "双子葉類の茎の維管束の並び方は。", "c": ["散在", "なし", "うずまき", "輪状"], "a": 3, "desc": "単子葉類は散在。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "光合成でできた養分を運ぶのは。", "c": ["師管", "道管", "気孔", "根毛"], "a": 0, "desc": "道管は水を運ぶ。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "胚珠がむき出しの植物は。", "c": ["エンドウ", "マツ", "サクラ", "アブラナ"], "a": 1, "desc": "裸子植物。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "昼の植物で量が多いのは。", "c": ["蒸散", "どちらも0", "光合成", "呼吸"], "a": 2, "desc": "光合成＞呼吸。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "デンプンがあると青紫になる薬品は。", "c": ["石灰水", "BTB", "塩酸", "ヨウ素液"], "a": 3, "desc": "光合成の確認に使う。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "胞子でふえる植物は。", "c": ["イヌワラビ", "アブラナ", "マツ", "イチョウ"], "a": 0, "desc": "シダ植物は胞子でふえる。"},
    {"subject": "biology", "genre": "bio_plant", "diff": "supreme", "type": "choice", "q": "光合成が行われる細胞内のつくりは。", "c": ["細胞壁", "葉緑体", "液胞", "核"], "a": 1, "desc": "緑色の粒で光合成。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "デンプンは最終的に何になって吸収されるか。", "c": ["脂肪酸", "麦芽糖", "ブドウ糖", "アミノ酸"], "a": 2, "desc": "タンパク質はアミノ酸。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "タンパク質を分解する胃液中の酵素は。", "c": ["アミラーゼ", "リパーゼ", "胆汁", "ペプシン"], "a": 3, "desc": "だ液はアミラーゼ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "小腸の柔毛があることの利点は。", "c": ["表面積が広がる", "水が増える", "消化が止まる", "酸素が出る"], "a": 0, "desc": "吸収を効率化。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "肺から心臓へ動脈血を運ぶ血管は。", "c": ["大静脈", "肺静脈", "肺動脈", "大動脈"], "a": 1, "desc": "肺静脈に動脈血。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "有害なアンモニアを尿素に変える器官は。", "c": ["胃", "肺", "肝臓", "じん臓"], "a": 2, "desc": "じん臓は尿をつくる。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "熱いものから思わず手を引く反応の中枢は。", "c": ["大脳", "小脳", "心臓", "せきずい"], "a": 3, "desc": "反射はせきずい。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "恒温動物の組み合わせは。", "c": ["鳥類と哺乳類", "魚類と両生類", "は虫類と魚類", "両生類とは虫類"], "a": 0, "desc": "体温をほぼ一定に保つ。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "胎生でふえるなかまは。", "c": ["魚類", "哺乳類", "鳥類", "は虫類"], "a": 1, "desc": "子を乳で育てる。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "だ液のはたらきを調べる対照実験で使うのは。", "c": ["石灰水", "エタノール", "水を入れた試験管", "塩酸"], "a": 2, "desc": "だ液以外を同じにする。"},
    {"subject": "biology", "genre": "bio_human", "diff": "supreme", "type": "choice", "q": "こん虫類のあしは何本か。", "c": ["8本", "4本", "10本", "6本"], "a": 3, "desc": "胸部に6本。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "Aa×Aaの子に現れる顕性:潜性の比は。", "c": ["3:1", "1:1", "1:3", "すべて顕性"], "a": 0, "desc": "分離の法則による。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "丸としわのように同時に現れない形質を。", "c": ["純系", "対立形質", "顕性形質", "相同器官"], "a": 1, "desc": "対になる形質。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "生殖細胞をつくるとき染色体数が半分になる分裂は。", "c": ["受精", "分化", "減数分裂", "体細胞分裂"], "a": 2, "desc": "受精でもとに戻る。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "遺伝子の本体である物質は。", "c": ["タンパク質", "デンプン", "脂質", "DNA"], "a": 3, "desc": "染色体にふくまれる。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "受精によらず親と同じ形質の子ができる生殖は。", "c": ["無性生殖", "有性生殖", "受精", "減数分裂"], "a": 0, "desc": "いもや分裂など。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "純系の丸(AA)としわ(aa)の子はすべて。", "c": ["3:1", "丸", "しわ", "半分ずつ"], "a": 1, "desc": "丸が顕性。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "代を重ねても同じ形質になるものを。", "c": ["対立形質", "分離", "純系", "雑種"], "a": 2, "desc": "遺伝子が同じ。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "植物にも動物にも共通する細胞のつくりは。", "c": ["細胞壁", "葉緑体", "発達した液胞", "核と細胞膜"], "a": 3, "desc": "細胞壁などは植物のみ。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "体細胞分裂の前後で染色体の数は。", "c": ["変わらない", "半分になる", "2倍になる", "0になる"], "a": 0, "desc": "同じ数が受けつがれる。"},
    {"subject": "biology", "genre": "bio_cell", "diff": "supreme", "type": "choice", "q": "1個の細胞でからだができている生物は。", "c": ["分解者", "単細胞生物", "多細胞生物", "セキツイ動物"], "a": 1, "desc": "ゾウリムシなど。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "草食動物が増えると短期的に植物は。", "c": ["変わらない", "消える", "減る", "増える"], "a": 2, "desc": "食べられて減る。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "光合成で有機物をつくる生物は。", "c": ["消費者", "分解者", "還元者", "生産者"], "a": 3, "desc": "植物など。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "分解者にあたるのは。", "c": ["菌類・細菌類", "植物", "草食動物", "肉食動物"], "a": 0, "desc": "死がいを無機物に。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "生物から大気へ炭素を戻すはたらきは。", "c": ["受粉", "呼吸", "光合成", "蒸散"], "a": 1, "desc": "二酸化炭素を放出。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "数量ピラミッドで最も多いのは。", "c": ["小形肉食", "大形肉食", "生産者", "草食動物"], "a": 2, "desc": "下ほど多い。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "微生物のはたらきを示す対照に使う土は。", "c": ["肥えた土", "水だけ", "砂だけ", "加熱した土"], "a": 3, "desc": "微生物をいなくして比べる。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "外来種が引き起こす問題は。", "c": ["在来種を減らす", "分解を止める", "光合成を増やす", "害がない"], "a": 0, "desc": "生態系のつり合いをくずす。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "食物連鎖のエネルギーの出発点は。", "c": ["分解者", "太陽の光", "地熱", "風"], "a": 1, "desc": "生産者が光を取りこむ。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "菌類のふえ方は。", "c": ["卵", "分裂のみ", "胞子", "種子"], "a": 2, "desc": "カビ・キノコは胞子。"},
    {"subject": "biology", "genre": "bio_eco", "diff": "supreme", "type": "choice", "q": "生物どうしの食べる・食べられる関係の網目を。", "c": ["生態系", "食物連鎖", "ピラミッド", "食物網"], "a": 3, "desc": "連鎖が網目状に。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "初期微動継続時間が長いほど震源は。", "c": ["遠い", "近い", "浅い", "同じ"], "a": 0, "desc": "P波S波の差が広がる。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "typing", "plain": true, "name": "震源距離の計算", "display": "P波8km/s・S波4km/s。初期微動継続時間が5秒のとき震源距離は [ ? ] km", "formula": "40", "desc": "距離×(1/4−1/8)＝5 → 40km。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "地震の規模を表すのは。", "c": ["震央", "マグニチュード", "震度", "初期微動"], "a": 1, "desc": "震度は各地のゆれ。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "地層の年代を知る手がかりになる化石は。", "c": ["生痕", "標本", "示準化石", "示相化石"], "a": 2, "desc": "アンモナイトなど。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "サンゴの化石が示す当時の環境は。", "c": ["冷たい深海", "湖", "陸上", "あたたかく浅い海"], "a": 3, "desc": "示相化石。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "地層を対比する目印になる層は。", "c": ["火山灰の層", "れき層", "泥層", "断層"], "a": 0, "desc": "かぎ層という。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "地下深くでゆっくり冷えてできた岩石は。", "c": ["石灰岩", "深成岩", "火山岩", "堆積岩"], "a": 1, "desc": "等粒状組織。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "うすい塩酸で二酸化炭素を出す岩石は。", "c": ["砂岩", "花こう岩", "石灰岩", "チャート"], "a": 2, "desc": "炭酸カルシウムをふくむ。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "アンモナイトが栄えた地質時代は。", "c": ["古生代", "新生代", "現代", "中生代"], "a": 3, "desc": "示準化石。"},
    {"subject": "earth", "genre": "earth_land", "diff": "supreme", "type": "choice", "q": "ねばりけの強いマグマの火山の形は。", "c": ["ドーム状", "傾斜のゆるい形", "平ら", "くぼみ"], "a": 0, "desc": "白っぽく盛り上がる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "飽和17.3、水蒸気量8.65g/m³のときの湿度は約。", "c": ["100%", "50%", "25%", "75%"], "a": 1, "desc": "8.65÷17.3≒0.5。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "空気を冷やして水滴ができ始める温度は。", "c": ["融点", "飽和点", "露点", "沸点"], "a": 2, "desc": "露点で湿度100%。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "気温が高いほど飽和水蒸気量は。", "c": ["小さい", "一定", "0", "大きい"], "a": 3, "desc": "多くの水蒸気をふくめる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "寒冷前線で発達する雲は。", "c": ["積乱雲", "乱層雲", "巻雲", "うろこ雲"], "a": 0, "desc": "短時間の強い雨。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "寒冷前線が通過したあと、気温は。", "c": ["0になる", "下がる", "上がる", "変わらない"], "a": 1, "desc": "寒気におおわれる。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "日本の冬の気圧配置は。", "c": ["東高西低", "移動性高気圧", "西高東低", "南高北低"], "a": 2, "desc": "シベリア高気圧。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "梅雨をもたらす前線は。", "c": ["寒冷前線", "温暖前線", "閉そく前線", "停滞前線"], "a": 3, "desc": "勢力が同じで動かない。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "低気圧の中心付近の気流は。", "c": ["上昇気流", "下降気流", "無風", "横ばい"], "a": 0, "desc": "雲ができやすい。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "湿度が100%になるのは気温が何に達したとき。", "c": ["最高気温", "露点", "沸点", "0℃"], "a": 1, "desc": "飽和に達する。"},
    {"subject": "earth", "genre": "earth_weather", "diff": "supreme", "type": "choice", "q": "日本上空を西から東へ吹く風は。", "c": ["季節風", "海風", "偏西風", "貿易風"], "a": 2, "desc": "天気が西から東へ移る。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "北緯35°の地点の春分の南中高度は。", "c": ["35°", "78°", "23°", "55°"], "a": 3, "desc": "90−35＝55°。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "北緯35°の夏至の南中高度は約。", "c": ["78°", "55°", "32°", "90°"], "a": 0, "desc": "90−35＋23.4≒78°。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "星が東から西へ動いて見える原因は。", "c": ["太陽の自転", "地球の自転", "地球の公転", "月の公転"], "a": 1, "desc": "日周運動。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "同じ時刻の星座は1か月で約何度動くか。", "c": ["90°", "360°", "30°", "15°"], "a": 2, "desc": "年周運動。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "金星が真夜中に見えないのは。", "c": ["遠いから", "光らないから", "小さいから", "地球より内側を回るから"], "a": 3, "desc": "内惑星のため。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "月が満ち欠けする原因は。", "c": ["月の公転による位置関係", "月の光る量の変化", "地球の自転", "日食"], "a": 0, "desc": "太陽・地球・月の位置。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "みずから光る天体は。", "c": ["すい星", "恒星", "惑星", "衛星"], "a": 1, "desc": "太陽など。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "太陽が月にかくされる現象は。", "c": ["南中", "満月", "日食", "月食"], "a": 2, "desc": "新月のときに起こる。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "気体が主で大きく密度が小さい惑星は。", "c": ["地球", "火星", "水星", "木星"], "a": 3, "desc": "木星型惑星。"},
    {"subject": "earth", "genre": "earth_space", "diff": "supreme", "type": "choice", "q": "太陽系をふくむ数千億の恒星の集団は。", "c": ["銀河系", "太陽系", "星座", "星団"], "a": 0, "desc": "天の川銀河。"},

    // ── 物質のすがた（中1・身のまわりの物質）選択式 2026-06-05 Codex生成→Claude QA。状態変化/水溶液/密度/物質の区別。
    //   ※matterは概念中心のためタイピング無し（実験操作と同様。Japanese語のタイピングは戦闘入力(ASCII/char単位)に不適）。計算は選択式で扱う。
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'固体の形', q:'固体の説明として正しいものはどれ？', c:['形も体積もほぼ決まっている','形は決まらず体積も決まらない','入れ物いっぱいに広がる','必ず透明である'], a:0, desc:'固体は形と体積がほぼ決まっている状態です。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'液体の形', q:'水のような液体の説明として正しいものはどれ？', c:['形も体積も決まっている','入れ物に合わせて形が変わる','必ず空気中に広がる','つかんでも形がくずれない'], a:1, desc:'液体は体積はほぼ決まっていますが、形は入れ物に合わせて変わります。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'気体の広がり', q:'気体の説明として正しいものはどれ？', c:['形だけ決まっている','体積だけ決まっている','入れ物いっぱいに広がる','必ず目で見える'], a:2, desc:'気体は形も体積も決まらず、入れ物いっぱいに広がります。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'融解', q:'氷が水になる変化を何という？', c:['凝固','蒸発','凝縮','融解'], a:3, desc:'固体が液体になる変化を融解といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'凝固', q:'水が氷になる変化を何という？', c:['凝固','融解','蒸発','昇華'], a:0, desc:'液体が固体になる変化を凝固といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'蒸発', q:'水たまりの水が少しずつ水蒸気になる変化を何という？', c:['凝縮','蒸発','凝固','融解'], a:1, desc:'液体が気体になる変化を蒸発といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'凝縮', q:'冷たいコップの外側に水滴がつくのは、空気中の水蒸気が何になったから？', c:['氷','水蒸気','水','金属'], a:2, desc:'気体の水蒸気が液体の水になる変化を凝縮といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'昇華', q:'ドライアイスが液体にならず気体になる変化を何という？', c:['蒸発','凝固','融解','昇華'], a:3, desc:'固体が直接気体になる変化を昇華といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'溶質', q:'食塩水で、水に溶けている食塩を何という？', c:['溶質','溶媒','溶液','沈殿'], a:0, desc:'液体に溶けている物質を溶質といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'溶媒', q:'食塩水で、食塩を溶かしている水を何という？', c:['溶質','溶媒','結晶','気体'], a:1, desc:'溶質を溶かしている液体を溶媒といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'溶液', q:'食塩が水に溶けた食塩水全体を何という？', c:['溶質','溶媒','溶液','結晶'], a:2, desc:'溶質が溶媒に溶けた全体を溶液といいます。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'濃い水溶液', q:'同じ量の水に、砂糖を多く溶かした水溶液はどうなる？', c:['うすくなる','必ず凍る','金属になる','濃くなる'], a:3, desc:'同じ量の水なら、溶けている砂糖が多いほど濃い水溶液になります。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'密度の意味', q:'密度は、同じ体積あたりの何を表す量？', c:['質量','色','温度','におい'], a:0, desc:'密度は同じ体積あたりの質量を表す量です。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'密度で沈む', q:'水より密度が大きい物体を水に入れると、ふつうどうなる？', c:['浮く','沈む','消える','必ず溶ける'], a:1, desc:'水より密度が大きい物体は、水に沈みやすいです。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'密度で浮く', q:'水より密度が小さい物体を水に入れると、ふつうどうなる？', c:['沈む','固まる','浮く','燃える'], a:2, desc:'水より密度が小さい物体は、水に浮きやすいです。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'有機物', q:'砂糖や紙のように、燃やすと二酸化炭素を出す物質のなかまはどれ？', c:['金属','無機物','水溶液','有機物'], a:3, desc:'多くの有機物は炭素を含み、燃やすと二酸化炭素を出します。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'無機物', q:'食塩や水のように、有機物でない物質のなかまはどれ？', c:['無機物','有機物','溶媒だけ','気体だけ'], a:0, desc:'有機物でない物質を無機物といいます。食塩や水は無機物です。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'金属の性質', q:'金属に共通する性質として正しいものはどれ？', c:['必ず水に浮く','電気を通しやすい','燃やすと必ず黒くなる','必ず白い粉である'], a:1, desc:'金属は電気や熱を通しやすい性質があります。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'非金属', q:'次のうち、金属ではないものはどれ？', c:['鉄','銅','炭素','アルミニウム'], a:2, desc:'炭素は金属ではなく、非金属の物質です。' },
    { subject:'chemistry', genre:'matter', diff:'junior', type:'choice', name:'白い粉', q:'白い粉を区別するとき、最初に安全でない調べ方はどれ？', c:['見た目を見る','水に溶けるか調べる','加熱したときの変化を見る','なめて味を調べる'], a:3, desc:'実験で物質をなめるのは危険です。安全な方法で調べます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'融点', q:'物質が固体から液体に変わり始める温度を何という？', c:['融点','沸点','密度','濃度'], a:0, desc:'固体がとけ始める温度を融点といいます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'沸点', q:'液体が沸騰して気体に変わる温度を何という？', c:['融点','沸点','溶解度','密度'], a:1, desc:'液体が沸騰する温度を沸点といいます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'純物質の温度', q:'純粋な物質が融解している間、温度はどうなりやすい？', c:['急に下がり続ける','必ず0℃になる','ほぼ一定になる','物質に関係なく100℃になる'], a:2, desc:'純粋な物質は融解中や沸騰中、温度がほぼ一定になります。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'混合物', q:'食塩水のように、いくつかの物質が混ざったものを何という？', c:['単体','元素','純物質','混合物'], a:3, desc:'食塩水は水と食塩が混ざった混合物です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'濃度計算1', q:'水90gに食塩10gを溶かした。質量パーセント濃度は何％？', c:['10%','11%','20%','90%'], a:0, desc:'溶液は100gなので、10g÷100g×100=10%です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'濃度計算2', q:'水80gに砂糖20gを溶かした。質量パーセント濃度は何％？', c:['16%','20%','25%','80%'], a:1, desc:'溶液は100gなので、20g÷100g×100=20%です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'濃度計算3', q:'5%の食塩水100gに含まれる食塩は何g？', c:['2g','10g','5g','20g'], a:2, desc:'100gの5%なので、食塩は5gです。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'濃度計算4', q:'水45gに食塩5gを溶かした。質量パーセント濃度は何％？', c:['5%','9%','45%','10%'], a:3, desc:'溶液は50gなので、5g÷50g×100=10%です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'溶解度', q:'一定量の水に溶ける物質の限度の量を何という？', c:['溶解度','密度','沸点','体積'], a:0, desc:'一定量の水に溶ける限度の量を溶解度といいます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'飽和水溶液', q:'もうそれ以上溶質が溶けきれない水溶液を何という？', c:['うすい水溶液','飽和水溶液','純物質','気体'], a:1, desc:'限度まで溶けている水溶液を飽和水溶液といいます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'再結晶', q:'温かい水溶液を冷やして、溶けていた物質を結晶として取り出す方法を何という？', c:['蒸発','昇華','再結晶','燃焼'], a:2, desc:'温度による溶解度の差を利用して結晶を取り出す方法を再結晶といいます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'結晶', q:'規則正しい形をした固体の粒を何という？', c:['溶媒','濃度','気体','結晶'], a:3, desc:'物質の粒子が規則正しく並んだ固体を結晶といいます。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'密度計算1', q:'質量20g、体積10cm3の物質の密度は何g/cm3？', c:['2','0.5','10','30'], a:0, desc:'密度=質量÷体積なので、20÷10=2g/cm3です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'密度計算2', q:'質量15g、体積5cm3の物質の密度は何g/cm3？', c:['0.3','3','10','75'], a:1, desc:'密度=15÷5=3g/cm3です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'質量計算', q:'密度2g/cm3、体積4cm3の物質の質量は何g？', c:['2g','4g','8g','16g'], a:2, desc:'質量=密度×体積なので、2×4=8gです。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'体積計算', q:'質量12g、密度3g/cm3の物質の体積は何cm3？', c:['3cm3','9cm3','15cm3','4cm3'], a:3, desc:'体積=質量÷密度なので、12÷3=4cm3です。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'金属光沢', q:'金属の表面をみがくと見られやすい性質はどれ？', c:['金属光沢','甘いにおい','水に必ず溶ける','必ず磁石につく'], a:0, desc:'金属はみがくと特有の光沢を示すことがあります。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'金属でない性質', q:'金属でない物質に多い性質として正しいものはどれ？', c:['電気をよく通す','電気を通しにくい','たたくと必ず広がる','すべて磁石につく'], a:1, desc:'非金属は、金属に比べて電気を通しにくいものが多いです。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'白い粉の加熱', q:'砂糖を加熱したときに起こりやすい変化はどれ？', c:['すぐ金属になる','必ず食塩になる','こげて黒くなる','水に戻る'], a:2, desc:'砂糖は有機物なので、加熱するとこげて黒くなりやすいです。' },
    { subject:'chemistry', genre:'matter', diff:'mid', type:'choice', name:'デンプン確認', q:'デンプンを調べる薬品として適切なものはどれ？', c:['BTB溶液','石灰水','塩酸','ヨウ素液'], a:3, desc:'デンプンはヨウ素液で青紫色に変化します。' },
    ];

    // ==========================================
    //   §3  ULTIMATE_QUIZZES  ボス必殺技用 長文クイズ
    // ==========================================
    // ボスの必殺技カウンター専用。通常の選択式問題より「文章が長い」状況設定型の問題をここに集める。
    const ULTIMATE_QUIZZES = [
      { q: 'うすい塩酸の入った試験管に亜鉛片を入れると、さかんに気体が発生した。この気体を集めて火のついたマッチを近づけると、ポンッと音を立てて燃えた。発生した気体は何か？',
        c: ['酸素', '二酸化炭素', '水素', 'アンモニア'], a: 2,
        desc: '金属の亜鉛はうすい塩酸と反応して水素を発生する。水素は火を近づけると音を立てて燃える。' },
      { q: '酸化銅と炭素の粉をよく混ぜて加熱すると、赤色の銅ができ、ある気体が発生して石灰水を白くにごらせた。このとき炭素が酸化銅からうばったものは何か？',
        c: ['水素', '酸素', '窒素', '塩素'], a: 1,
        desc: '炭素は酸化銅から酸素をうばうため、酸化銅は銅に還元される。炭素自身は酸化されて二酸化炭素になる。' },
      { q: '水を電気分解すると、陰極と陽極からそれぞれ気体が発生した。陰極側に集まった気体の体積は、陽極側の気体のおよそ何倍か？',
        c: ['2倍', '0.5倍', '同じ', '3倍'], a: 0,
        desc: '水の電気分解では水素と酸素が2:1の体積比で発生する。陰極側に集まるのは水素。' },
      { q: 'うすい塩酸とうすい水酸化ナトリウム水溶液を混ぜ合わせると、たがいの性質を打ち消し合って水と塩ができた。このような反応を何というか？',
        c: ['酸化', '還元', '中和', '電気分解'], a: 2,
        desc: '酸とアルカリが互いの性質を打ち消し合う反応を中和という。中和では水と塩ができる。' },
      { q: 'マグネシウムリボンに火をつけると、強い光を出して燃え、あとに白い粉（酸化マグネシウム）が残った。マグネシウムに起きた化学変化を何というか？',
        c: ['還元', '酸化', '蒸発', '溶解'], a: 1,
        desc: '物質が酸素と結びつく変化を酸化という。マグネシウムは酸素と結びつき酸化マグネシウムになる。' },
      { q: 'ある水溶液にBTB溶液を加えると青色になった。この水溶液にうすい塩酸を少しずつ加え、緑色になったところで止めた。このときの水溶液の性質は何か？',
        c: ['酸性', '中性', 'アルカリ性', '変化しない'], a: 1,
        desc: 'BTB溶液は酸性で黄、中性で緑、アルカリ性で青を示す。緑色になった水溶液は中性。' },
      { q: '塩化銅水溶液に電流を流すと、一方の電極には赤い物質が付着し、もう一方の電極からは刺激臭のある気体が発生した。電極に付着した赤い物質は何か？',
        c: ['鉄', '銅', '銀', '炭素'], a: 1,
        desc: '塩化銅水溶液の電気分解では、陰極に赤色の銅が付着する。陽極からは塩素が発生する。' },
      { q: '鉄粉と硫黄の粉を混ぜて加熱すると、黒い物質（硫化鉄）ができた。この黒い物質に磁石を近づけると、加熱する前と比べてどうなるか？',
        c: ['加熱前と同じく強く引きつけられる', '磁石に引きつけられなくなる', '燃え出す', '気体になる'], a: 1,
        desc: '鉄と硫黄が化合すると硫化鉄という別の物質になる。硫化鉄は鉄の性質を失うため磁石につきにくい。' },
      { q: '炭酸水素ナトリウムを加熱すると、炭酸ナトリウム・水・ある気体に分解した。発生した気体を石灰水に通すと白くにごった。この気体は何か？',
        c: ['酸素', '水素', '二酸化炭素', 'アンモニア'], a: 2,
        desc: '炭酸水素ナトリウムを加熱すると二酸化炭素が発生する。二酸化炭素は石灰水を白くにごらせる。' },
      { q: 'うすい過酸化水素水（オキシドール）に二酸化マンガンを加えると気体が発生した。火のついた線香をその気体に入れると、線香が炎を上げて激しく燃えた。この気体は何か？',
        c: ['水素', '二酸化炭素', '窒素', '酸素'], a: 3,
        desc: '過酸化水素水は二酸化マンガンを加えると分解して酸素を発生する。酸素にはものを燃やすはたらきがある。' },
      { q: '金属のイオンへのなりやすさを比べる実験で、硫酸銅水溶液に鉄くぎを入れると、くぎの表面に赤い銅が付着した。この結果から、鉄と銅のどちらが陽イオンになりやすいといえるか？',
        c: ['鉄', '銅', 'どちらも同じ', '判定できない'], a: 0,
        desc: '鉄が銅イオンに電子を渡して鉄イオンになり、銅が単体として出てくる。鉄の方が陽イオンになりやすい。' },
      { q: 'うすい硫酸とうすい水酸化バリウム水溶液を混ぜ合わせると、白い沈殿が生じた。この白い沈殿は何という物質か？',
        c: ['塩化バリウム', '硫酸バリウム', '炭酸カルシウム', '水酸化銅'], a: 1,
        desc: 'バリウムイオンと硫酸イオンが結びつくと、水に溶けにくい白色沈殿の硫酸バリウムができる。' },
      { q: 'アンモニアを発生させて集める実験で、気体を水上置換法ではなく上方置換法で集めた。アンモニアが水上置換法に向かない主な理由は何か？',
        c: ['水に非常によく溶けるから', '空気より重いから', '酸素と反応するから', '無色だから'], a: 0,
        desc: 'アンモニアは水に非常によく溶けるため、水上置換法では集めにくい。空気より軽いので上方置換法を使う。' },
      { q: '石灰石にうすい塩酸を加えて発生した気体を石灰水に通すと、石灰水が白くにごった。この白いにごりのもとになる物質は何か？',
        c: ['塩化カルシウム', '炭酸カルシウム', '水酸化カルシウム', '酸化カルシウム'], a: 1,
        desc: '二酸化炭素が石灰水と反応すると、白色の炭酸カルシウムができる。このため石灰水が白くにごる。' },
      { q: '黒色の酸化銀を加熱すると、白っぽい金属が残り、火のついた線香を入れると激しく燃える気体が発生した。残った金属は何か？',
        c: ['銅', '銀', '亜鉛', 'アルミニウム'], a: 1,
        desc: '酸化銀は加熱で銀と酸素に分解する。発生した酸素は火のついた線香を激しく燃やす。' },
      { q: '硫酸銅水溶液に水酸化ナトリウム水溶液を加えると、青白い沈殿ができた。この沈殿をつくるために結びついたイオンの組み合わせはどれか？',
        c: ['Cu2+ と OH-', 'Na+ と SO42-', 'H+ と Cl-', 'Ba2+ と SO42-'], a: 0,
        desc: '銅イオンCu2+と水酸化物イオンOH-が結びつき、水に溶けにくい水酸化銅Cu(OH)2ができる。' },
      { q: 'うすい塩酸に水酸化ナトリウム水溶液を少しずつ加え、BTB溶液が緑色になったところで加えるのをやめた。水を蒸発させると主に残る物質は何か？',
        c: ['塩化ナトリウム', '水酸化ナトリウム', '塩化水素', '炭酸ナトリウム'], a: 0,
        desc: '塩酸と水酸化ナトリウムがちょうど中和すると、塩化ナトリウムと水ができる。水を蒸発させると塩が残る。' },
      { q: '石灰水にストローで息を吹き込むと白くにごった。さらに長く二酸化炭素を通し続けると、にごりがうすくなることがある。最初の白いにごりの主成分は何か？',
        c: ['炭酸カルシウム', '塩化カルシウム', '水酸化ナトリウム', '硫酸バリウム'], a: 0,
        desc: '二酸化炭素と石灰水の水酸化カルシウムが反応し、水に溶けにくい炭酸カルシウムができるため白くにごる。' },
      { q: '炭酸ナトリウム水溶液にうすい塩酸を少しずつ加えると、気体が発生した。発生した気体を石灰水に通すと白くにごった。この気体は何か？',
        c: ['水素', '酸素', '二酸化炭素', '塩素'], a: 2,
        desc: '炭酸塩に酸を加えると二酸化炭素が発生する。二酸化炭素は石灰水を白くにごらせる。' },
      { q: '水酸化カルシウム水溶液にうすい塩酸を加えていくと、アルカリ性が弱まり中性に近づいた。この中和で主にできる塩はどれか？',
        c: ['塩化カルシウム', '炭酸カルシウム', '硫酸カルシウム', '水酸化ナトリウム'], a: 0,
        desc: 'Ca(OH)2のCa2+と塩酸のCl-から塩化カルシウムができ、H+とOH-は水になる。' },
      { q: '過酸化水素水に二酸化マンガンを加えると気体が発生した。反応後も二酸化マンガンはほとんど残っていた。この実験で二酸化マンガンの役割は何か？',
        c: ['反応で消費される燃料', '酸素そのもの', '反応を助ける触媒', '発生した水素を吸収する物質'], a: 2,
        desc: '二酸化マンガンは過酸化水素の分解を速める触媒で、反応の前後でほとんど変化しない。' },
      { q: '硫酸銅水溶液に鉄くぎを入れてしばらく置くと、くぎの表面に赤色の物質が付着し、水溶液の青色がうすくなった。赤色の物質として正しいものはどれか？',
        c: ['銅', '鉄', '硫黄', '酸化銀'], a: 0,
        desc: '鉄は銅より陽イオンになりやすいため、銅イオンが電子を受け取って銅の単体として析出する。' },

      // ───────── 必殺技 追加（物理・生物・地学・subject付き）─────────
  { subject: 'physics',
    q: '豆電球2個を直列につないだ回路で、一方の豆電球を外すともう一方も消えた。電流の通り道が切れたと考えると、この回路の特徴として正しいものはどれか？',
    c: ['電流は枝分かれせず同じ道を流れる', '各豆電球には必ず別々の電源が必要', '一方を外しても他方には電流が流れる', '電圧は存在しない'], a: 0,
    desc: '直列回路では電流の通り道が1本なので、一部が切れると回路全体に電流が流れなくなる。' },
  { subject: 'physics',
    q: '抵抗3Ωの電熱線に6Vの電圧を加えたところ、一定の電流が流れた。実験後、電圧と抵抗の関係からこの電流の大きさを求めるとどれか？',
    c: ['0.5A', '2A', '3A', '18A'], a: 1,
    desc: 'オームの法則I=V/Rを使う。6V÷3Ω=2Aなので、流れる電流は2Aである。' },
  { subject: 'physics',
    q: '鏡に向けて光を斜めに当てると、光は別の向きにはね返った。入射角を30度にしたとき、反射角として正しい値はどれか？',
    c: ['15度', '30度', '60度', '90度'], a: 1,
    desc: '光の反射では入射角と反射角が等しい。角度は鏡の面ではなく法線から測る。' },
  { subject: 'physics',
    q: 'ばねに2Nの力を加えると1cmのびた。同じばねを弾性の限界内で使い、8Nの力を加えたときののびとして正しいものはどれか？',
    c: ['2cm', '4cm', '6cm', '8cm'], a: 1,
    desc: 'フックの法則では、ばねののびは加えた力に比例する。力が4倍なので、のびも4倍の4cmになる。' },
  { subject: 'physics',
    q: '台車がなめらかな斜面を下り、一定時間ごとの位置を記録すると間隔がだんだん広くなった。この台車の運動の説明として正しいものはどれか？',
    c: ['速さが増している', '速さが一定である', '速さが減っている', '必ず静止している'], a: 0,
    desc: '同じ時間で進む距離が大きくなるほど速さは増している。斜面を下る台車は重力のはたらきで加速する。' },

  { subject: 'biology',
    q: 'オオカナダモの葉を顕微鏡で観察すると、緑色の小さな粒が細胞の中に多数見えた。光合成を行う場所として、この粒の名称はどれか？',
    c: ['葉緑体', '核', '細胞壁', '液胞'], a: 0,
    desc: '葉緑体は光を受けて光合成を行う場所である。植物の細胞には細胞壁や液胞も見られる。' },
  { subject: 'biology',
    q: '植物を光に当てた葉と暗い場所に置いた葉で、ヨウ素液の色の変化を比べた。光を当てた葉だけ青紫色になった主な理由はどれか？',
    c: ['デンプンができたから', '酸素がなくなったから', '水が蒸発したから', '葉緑体が消えたから'], a: 0,
    desc: '光合成ではデンプンなどの養分がつくられる。ヨウ素液はデンプンがあると青紫色に変化する。' },
  { subject: 'biology',
    q: 'だ液を加えたデンプン液を体温に近い温度でしばらく置くと、デンプンが分解された。だ液に含まれる消化酵素として正しいものはどれか？',
    c: ['アミラーゼ', 'ペプシン', '胆汁', 'ヘモグロビン'], a: 0,
    desc: 'だ液に含まれるアミラーゼはデンプンを分解する。酵素ははたらきやすい温度に幅がある。' },
  { subject: 'biology',
    q: 'ヒトの血液を観察すると、酸素を運ぶはたらきに関係する赤い成分が多く見られた。この成分の名称として正しいものはどれか？',
    c: ['赤血球', '白血球', '血小板', '血しょう'], a: 0,
    desc: '赤血球にはヘモグロビンが含まれ、酸素を運ぶ。白血球は体を守るはたらき、血小板は止血に関係する。' },
  { subject: 'biology',
    q: 'メダカの受精卵を毎日観察すると、細胞の数が増え、やがて体の形がわかるようになった。このような受精卵の変化を何というか？',
    c: ['発生', '蒸散', '消化', '分類'], a: 0,
    desc: '受精卵が細胞分裂をくり返し、からだの形をつくっていく過程を発生という。' },

  { subject: 'earth',
    q: '地震計の記録を見ると、はじめに小さなゆれが届き、その後に大きなゆれが届いた。はじめの小さなゆれを起こす波として正しいものはどれか？',
    c: ['P波', 'S波', '表面波だけ', '津波'], a: 0,
    desc: 'P波はS波より速く伝わるため、先に到着して初期微動を起こす。S波は主要動に関係する。' },
  { subject: 'earth',
    q: 'ある地点で初期微動継続時間が長い地震ほど、震源から遠い地点で観測されたとわかった。この時間について正しい説明はどれか？',
    c: ['震源から遠いほど長くなる', '震源から遠いほど短くなる', '震源距離と無関係である', '必ず0秒になる'], a: 0,
    desc: 'P波とS波の到着時刻の差が初期微動継続時間である。震源から遠いほど差が大きくなりやすい。' },
  { subject: 'earth',
    q: '天気図で等圧線がせまい間隔で並んでいる地域を見つけた。風の強さを予想するとき、この地域について正しいものはどれか？',
    c: ['風が強くなりやすい', '風が必ず止む', '気圧差がない', '雲が必ず消える'], a: 0,
    desc: '等圧線の間隔がせまいほど気圧の差が大きく、風が強くなりやすい。' },
  { subject: 'earth',
    q: '夜空を数時間おきに観察すると、星座全体が東から西へ動いて見えた。この見かけの動きの主な原因として正しいものはどれか？',
    c: ['地球の自転', '地球の公転だけ', '月の満ち欠け', '太陽の黒点'], a: 0,
    desc: '星の日周運動は地球の自転によって起こる見かけの動きである。地球は西から東へ自転している。' },
  { subject: 'earth',
    q: '太陽、月、地球がこの順にほぼ一直線に並び、月が太陽の光をさえぎった。地球から見られる現象として正しいものはどれか？',
    c: ['日食', '月食', '満月', '流星群'], a: 0,
    desc: '日食は月が太陽と地球の間に入り、太陽の一部または全部を隠す現象である。' }
    ];

    // ==========================================
    //   §4  getQuestions  絞り込み関数
    // ==========================================
    // 図書館・道場・ボスがこの1つの関数を通して問題を取得する。
    //  opts.subject  : 単一の教科キー（'chemistry'/'physics'）
    //  opts.subjects : 教科キーの配列（複数許可）
    //  opts.diff   : 単一の難易度キー（'junior'等）
    //  opts.diffs  : 難易度キーの配列（複数許可）
    //  opts.genres : ジャンルキーの配列（空/未指定なら全ジャンル）
    //  opts.type   : 'typing' / 'choice'（未指定なら両方）
    //  ※ subject 未指定の旧問題は 'chemistry' とみなす（互換）。
    function getQuestions(opts) {
      opts = opts || {};
      return QUESTION_DB.filter(function(q) {
        var subj = q.subject || 'chemistry';
        if (opts.subject  && subj !== opts.subject) return false;
        if (opts.subjects && opts.subjects.indexOf(subj) < 0) return false;
        if (opts.diff && q.diff !== opts.diff) return false;
        if (opts.diffs && opts.diffs.indexOf(q.diff) < 0) return false;
        if (opts.genres && opts.genres.length && opts.genres.indexOf(q.genre) < 0) return false;
        if (opts.type && q.type !== opts.type) return false;
        if (opts.grades && opts.grades.length) {
          var gg = GENRE_GRADES[q.genre];
          var gnum = gg ? gg[q.diff] : null;
          if (!gnum || opts.grades.indexOf(gnum) < 0) return false;
        }
        return true;
      });
    }

    // ある難易度で「実際に問題が存在する」ジャンル一覧を返す。
    //  type を渡すと形式も限定（ボス範囲選択では type:'typing' で呼ぶ＝必ず該当問題が含まれる）。
    //  subject を渡すとその教科のジャンルだけに限定（ボスは自分の教科で呼ぶ）。
    //  返り値: GENRES と同じ順の [{key,label,icon}]
    function getAvailableGenres(diff, type, subject) {
      return GENRES.filter(function(g) {
        if (subject && g.subject !== subject) return false;
        return getQuestions({ diff: diff, genres: [g.key], type: type }).length > 0;
      }).map(function(g) { return { key: g.key, label: g.label, icon: g.icon }; });
    }

    // ==========================================
    //   §5  BOSSES_DB
    // ==========================================
    // ボス12体の定義 (HPを1/10、攻撃力を2倍に再設定)
    const BOSSES_DB = [
      // 初級ボス
      { id: 'b1_1', tier: 'junior', name: '炭酸の化身「コーラ」', avatar: '🥤', hp: 500, atk: 240, speed: 2.0, ultSpeed: 0.3, stanDef: 0.5, desc: '炭酸ガスの力で通常攻撃を連打してくる。' },
      { id: 'b1_2', tier: 'junior', name: '錆びゆく鉄騎兵「ルスト」', avatar: '🛡️', hp: 900, atk: 300, speed: 1.2, ultSpeed: 0.2, stanDef: 1.5, desc: '頑強な防御力を持つが、行動速度は遅い。' },
      { id: 'b1_3', tier: 'junior', name: '水溶液の狂気「アクア」', avatar: '💧', hp: 1300, atk: 360, speed: 1.5, ultSpeed: 0.5, stanDef: 1.0, desc: '必殺技のチャージが速く、頻繁にクイズを仕掛けてくる。' },

      // 中級ボス
      { id: 'b2_1', tier: 'mid', name: '反応熱の支配者「カルド」', avatar: '🔥', hp: 2800, atk: 700, speed: 1.8, ultSpeed: 0.24, stanDef: 1.2, desc: '熱化学の使い手。一撃が大きく、クリティカル率が高い。' },
      { id: 'b2_2', tier: 'mid', name: '活性化の魔術師「カタリス」', avatar: '⚡', hp: 2200, atk: 560, speed: 3.5, ultSpeed: 0.36, stanDef: 0.8, desc: '行動速度が異常に速く、プレイヤーの回答スピードが試される。' },
      { id: 'b2_3', tier: 'mid', name: '炭酸水素竜「ベーキング」', avatar: '🐉', hp: 4200, atk: 840, speed: 1.0, ultSpeed: 0.6, stanDef: 2.0, desc: '熱分解によって巨大な必殺技を放つHP特化竜。' },

      // 上級ボス (ATK調整: 指数成長ステータスとのバランス)
      { id: 'b3_1', tier: 'senior', name: '強酸の化身「アシッド」', avatar: '🧪', hp: 8500, atk: 720, speed: 2.4, ultSpeed: 0.3, stanDef: 1.5, desc: '触れるものすべてを溶かす高火力。行動速度も速い。' },
      { id: 'b3_2', tier: 'senior', name: '強塩基の巨人「アルカリ」', avatar: '🧱', hp: 12000, atk: 560, speed: 1.6, ultSpeed: 0.2, stanDef: 2.5, desc: 'スタン耐性が極めて高く、気絶しにくい驚異の巨人。' },
      { id: 'b3_3', tier: 'senior', name: '中和の魔術師「バッファー」', avatar: '⚖️', hp: 15000, atk: 880, speed: 1.8, ultSpeed: 0.44, stanDef: 1.8, desc: '通常攻撃と必殺技をバランスよく使いこなす強敵。' },

      // 超級ボス (ATK調整: 強いが倒せる範囲に)
      { id: 'b4_1', tier: 'supreme', name: '絶対障壁のダイヤモンド', avatar: '💎', hp: 35000, atk: 1080, speed: 1.4, ultSpeed: 0.2, stanDef: 3.0, desc: '防御力が極めて高く、スタン中以外はダメージを大幅カットする。' },
      { id: 'b4_2', tier: 'supreme', name: '暴走するニトロ化合物', avatar: '💥', hp: 28000, atk: 1400, speed: 2.8, ultSpeed: 0.8, stanDef: 0.5, desc: '超高速で必殺技を放ってくる、スタン力の高い一撃必殺タイプ。' },
      { id: 'b4_3', tier: 'supreme', name: '最終化学兵器「アポカリプス」', avatar: '🪐', hp: 60000, atk: 1200, speed: 2.2, ultSpeed: 0.4, stanDef: 2.0, desc: '全てを無に帰す破壊神。HP30%以下になると暴走する。' }
    ];

    // ==========================================
    //   §5b  ENDGAME_BOSSES_DB  裏ボス（専科の試練）
    // ==========================================
    // ラスボス撃破後(hasClearedOnce)に解禁。endgame:true が目印。
    //  kind 'range' = 教科×ジャンル限定で出題 / 'pure' = 全範囲・純粋に強い
    //  base = レベル1基準のステータス（getEndgameBossStats で Lv1〜20 にスケール）
    //  reward = 初回撃破で得る恒久バフ（getPermaBuffTotals で合算・PERMA_BUFF_CAP で頭打ち）
    //  title = 撃破で解禁される称号id（TITLES_DB）
    const ENDGAME_BOSSES_DB = [
      // ── 範囲限定（化学） ──
      { id:'tr_reaction', endgame:true, kind:'range', subject:'chemistry', genres:['reaction'], diff:'supreme',
        name:'反応式の覇者 イクオール', avatar:'⚖️', title:'t_reaction',
        base:{ hp:95000, atk:1500, speed:2.2, ultSpeed:0.45, stanDef:2.5, evade:0.30 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'化学反応式のみを問う試練。係数を制する者だけが立ち向かえる。' },
      { id:'tr_ion', endgame:true, kind:'range', subject:'chemistry', genres:['ion'], diff:'mid',
        name:'イオンの支配者 カチオン', avatar:'⚡', title:'t_ion',
        base:{ hp:90000, atk:1500, speed:2.3, ultSpeed:0.45, stanDef:2.3, evade:0.30 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'イオン式・電離のみを問う。陽と陰の理を見極めよ。' },
      { id:'tr_experiment', endgame:true, kind:'range', subject:'chemistry', genres:['experiment'], diff:'mid',
        name:'実験の達人 メスフラスコ', avatar:'🧪', title:'t_experiment',
        base:{ hp:90000, atk:1450, speed:2.1, ultSpeed:0.45, stanDef:2.4, evade:0.30 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'実験操作のみを問う選択式の試練。安全と手順を極めよ。' },
      // ── 範囲限定（物理） ──
      { id:'tr_electricity', endgame:true, kind:'range', subject:'physics', genres:['electricity'], diff:'supreme',
        name:'電流卿オーム', avatar:'⚡', title:'t_electricity',
        base:{ hp:95000, atk:1550, speed:2.4, ultSpeed:0.5, stanDef:2.5, evade:0.32 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'電流・磁界のみを問う。オームの法則を体に刻め。' },
      { id:'tr_motion', endgame:true, kind:'range', subject:'physics', genres:['motion'], diff:'supreme',
        name:'力学の巨人 ニュートン', avatar:'🏋️', title:'t_motion',
        base:{ hp:100000, atk:1500, speed:2.0, ultSpeed:0.45, stanDef:2.8, evade:0.30 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'運動・エネルギーのみを問う。仕事とエネルギーの理を示せ。' },
      { id:'tr_light', endgame:true, kind:'range', subject:'physics', genres:['light_sound'], diff:'mid',
        name:'光波の魔王 プリズム', avatar:'🔦', title:'t_light',
        base:{ hp:90000, atk:1450, speed:2.3, ultSpeed:0.45, stanDef:2.2, evade:0.32 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'光・音のみを問う。反射と屈折の先を見よ。' },
      // ── 範囲限定（生物） ──
      { id:'tr_bio_plant', endgame:true, kind:'range', subject:'biology', genres:['bio_plant'], diff:'senior',
        name:'世界樹ユグドラ', avatar:'🌳', title:'t_bio_plant',
        base:{ hp:92000, atk:1450, speed:2.0, ultSpeed:0.45, stanDef:2.4, evade:0.30 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'植物のみを問う。光合成と植物のつくりを極めよ。' },
      { id:'tr_bio_human', endgame:true, kind:'range', subject:'biology', genres:['bio_human'], diff:'senior',
        name:'生命の守護者 アナトミア', avatar:'🫀', title:'t_bio_human',
        base:{ hp:95000, atk:1500, speed:2.2, ultSpeed:0.45, stanDef:2.5, evade:0.30 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'動物・人体のみを問う。からだのしくみを見極めよ。' },
      { id:'tr_bio_gene', endgame:true, kind:'range', subject:'biology', genres:['bio_cell'], diff:'senior',
        name:'遺伝子の支配者 ヘリックス', avatar:'🧬', title:'t_bio_gene',
        base:{ hp:93000, atk:1500, speed:2.3, ultSpeed:0.5, stanDef:2.3, evade:0.32 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'細胞・生殖・遺伝のみを問う。生命の設計図を解け。' },
      // ── 範囲限定（地学） ──
      { id:'tr_earth_land', endgame:true, kind:'range', subject:'earth', genres:['earth_land'], diff:'senior',
        name:'大地の巨神 テラ', avatar:'🌋', title:'t_earth_land',
        base:{ hp:98000, atk:1500, speed:1.9, ultSpeed:0.45, stanDef:2.8, evade:0.28 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'火山・地震・地層のみを問う。大地の記憶を読み解け。' },
      { id:'tr_earth_weather', endgame:true, kind:'range', subject:'earth', genres:['earth_weather'], diff:'senior',
        name:'嵐の支配者 テンペスト', avatar:'🌪️', title:'t_earth_weather',
        base:{ hp:93000, atk:1480, speed:2.4, ultSpeed:0.5, stanDef:2.2, evade:0.33 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'天気のみを問う。前線と気団の理を制せ。' },
      { id:'tr_earth_space', endgame:true, kind:'range', subject:'earth', genres:['earth_space'], diff:'senior',
        name:'天空の覇者 コスモス', avatar:'🪐', title:'t_earth_space',
        base:{ hp:95000, atk:1520, speed:2.3, ultSpeed:0.5, stanDef:2.4, evade:0.32 },
        reward:{ goldMul:0.02, atk:0.01, hp:0.01, def:0.01 },
        desc:'天体のみを問う。地球と宇宙の動きを見通せ。' },
      // ── 純粋に強い（全範囲・エンドコンテンツ） ──
      { id:'tr_omega', endgame:true, kind:'pure', subject:null, genres:null, diff:'supreme',
        name:'理科の化身 オメガ', avatar:'🌌', title:'t_omega',
        base:{ hp:160000, atk:2000, speed:2.5, ultSpeed:0.6, stanDef:3.0, evade:0.40 },
        reward:{ goldMul:0.05, atk:0.03, hp:0.03, def:0.03 },
        desc:'全教科・全範囲から容赦なく問う、現状最強の敵。腕試しの頂。' }
    ];

    // 恒久バフの合計上限（ソフトキャップ）。ユーザー確定: 各ステータス+20%・ゴールド+40%。
    const PERMA_BUFF_CAP = { atk:0.20, hp:0.20, def:0.20, goldMul:0.40 };

    // 裏ボスのステータスをレベル(1〜20)にスケールして返す。
    //  Lv1 でもラスボス（hp60000/atk1200）を超える。Lv上限解放=より強い装備実装時に20→拡張するだけ。
    //  levels: 数値（全ステ一律）または {hp,atk,speed,ult}（ステータスごとに1〜20）。
    //  範囲ボスは固定なので 1 を渡す。エンドボス(オメガ)はステ別レベルのオブジェクトを渡す。
    //  ※ 全て20にすると従来の Lv20（検証済みバランス）を再現する。
    function getEndgameBossStats(boss, levels) {
      function k(key) {
        let L = (typeof levels === 'number') ? levels : ((levels && levels[key]) || 1);
        L = Math.max(1, Math.min(20, L));
        return L - 1;
      }
      const b = boss.base;
      return {
        hp:       Math.floor(b.hp  * (1 + 0.65 * k('hp'))),
        atk:      Math.floor(b.atk * (1 + 0.22 * k('atk'))),
        speed:    +(b.speed    * (1 + 0.03 * k('speed'))).toFixed(3),
        ultSpeed: +(b.ultSpeed * (1 + 0.04 * k('ult'))).toFixed(3),
        stanDef:  b.stanDef,
        evade:    Math.min(0.6, b.evade + 0.01 * k('atk'))
      };
    }

    // 撃破済み裏ボスid配列から恒久バフ合計を導出（生数値は保存しない＝べき等・移行安全）。
    function getPermaBuffTotals(defeatedEndgame) {
      const t = { goldMul:0, atk:0, hp:0, def:0 };
      (defeatedEndgame || []).forEach(id => {
        const b = ENDGAME_BOSSES_DB.find(x => x.id === id);
        if (!b || !b.reward) return;
        ['goldMul','atk','hp','def'].forEach(k => { t[k] += (b.reward[k] || 0); });
      });
      // ソフトキャップ
      Object.keys(PERMA_BUFF_CAP).forEach(k => { t[k] = Math.min(t[k], PERMA_BUFF_CAP[k]); });
      return t;
    }

    // ==========================================
    //   §5c  TITLES_DB  称号（名前フレーム）
    // ==========================================
    // frame = index.html の CSS クラス（豪華さの段階）。unlock で解禁条件を判定。
    //  unlock.type: 'bossCount'(通常ボス撃破数) / 'clear'(ラスボス) / 'endgame'(特定裏ボス撃破) / 'always'
    const TITLES_DB = [
      { id:'none',         name:'称号なし',       frame:'',            unlock:{type:'always'},                desc:'フレームを外す。' },
      { id:'t_novice',     name:'見習い錬金術師', frame:'frame-bronze', unlock:{type:'bossCount', n:3},        desc:'通常ボスを3体撃破。' },
      { id:'t_seeker',     name:'真理の探究者',   frame:'frame-silver', unlock:{type:'bossCount', n:6},        desc:'通常ボスを6体撃破。' },
      { id:'t_master',     name:'反応の猛者',     frame:'frame-gold',   unlock:{type:'bossCount', n:9},        desc:'通常ボスを9体撃破。' },
      { id:'t_clear',      name:'化学の覇王',     frame:'frame-clear',  unlock:{type:'clear'},                 desc:'ラスボス アポカリプスを撃破。' },
      // 裏ボス称号（豪華フレーム）
      { id:'t_reaction',   name:'反応式の覇者',   frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_reaction'},   desc:'裏ボス「反応式の覇者」を撃破。' },
      { id:'t_ion',        name:'イオンの王',     frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_ion'},        desc:'裏ボス「イオンの支配者」を撃破。' },
      { id:'t_experiment', name:'実験の達人',     frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_experiment'}, desc:'裏ボス「実験の達人」を撃破。' },
      { id:'t_electricity',name:'電流卿',         frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_electricity'}, desc:'裏ボス「電流卿オーム」を撃破。' },
      { id:'t_motion',     name:'力学の巨人',     frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_motion'},     desc:'裏ボス「力学の巨人」を撃破。' },
      { id:'t_light',      name:'光波の支配者',   frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_light'},      desc:'裏ボス「光波の魔王」を撃破。' },
      { id:'t_bio_plant',  name:'世界樹の守人',   frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_bio_plant'}, desc:'裏ボス「世界樹ユグドラ」を撃破。' },
      { id:'t_bio_human',  name:'生命の守護者',   frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_bio_human'}, desc:'裏ボス「生命の守護者アナトミア」を撃破。' },
      { id:'t_bio_gene',   name:'遺伝子の支配者', frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_bio_gene'},  desc:'裏ボス「遺伝子の支配者ヘリックス」を撃破。' },
      { id:'t_earth_land', name:'大地の巨神',     frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_earth_land'}, desc:'裏ボス「大地の巨神テラ」を撃破。' },
      { id:'t_earth_weather', name:'嵐の支配者',  frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_earth_weather'}, desc:'裏ボス「嵐の支配者テンペスト」を撃破。' },
      { id:'t_earth_space', name:'天空の覇者',    frame:'frame-endgame', unlock:{type:'endgame', boss:'tr_earth_space'}, desc:'裏ボス「天空の覇者コスモス」を撃破。' },
      { id:'t_omega',      name:'理科の頂',       frame:'frame-omega',   unlock:{type:'endgame', boss:'tr_omega'},      desc:'最強の裏ボス「理科の化身オメガ」を撃破。' }
    ];

    // 称号が解禁済みか判定（player を渡す）。
    function isTitleUnlocked(title, player) {
      const u = title.unlock || {};
      if (u.type === 'always') return true;
      if (u.type === 'bossCount') return (player.defeatedBosses || []).length >= u.n;
      if (u.type === 'clear') return !!player.hasClearedOnce;
      if (u.type === 'endgame') return (player.defeatedEndgame || []).indexOf(u.boss) >= 0;
      return false;
    }

    // ==========================================
    //   §5d  AVATARS_DB  プレイヤーアバター
    // ==========================================
    // 画像が来れば img を assets/ui/avatar_<id>.png に置く。無ければ emoji。
    const AVATARS_DB = [
      { id:'default', name:'錬金術師',   emoji:'🧪' },
      { id:'scholar', name:'博士',       emoji:'🧑‍🔬' },
      { id:'wizard',  name:'魔導士',     emoji:'🧙' },
      { id:'knight',  name:'騎士',       emoji:'🤺' },
      { id:'star',    name:'星詠み',     emoji:'🌟' },
      { id:'robot',   name:'錬成ロボ',   emoji:'🤖' },
      { id:'cat',     name:'実験ねこ',   emoji:'🐱' },
      { id:'dragon',  name:'竜化',       emoji:'🐲' },
      // 追加AIアバター
      { id:'ninja',   name:'理科忍者',   emoji:'🥷' },
      { id:'hero',    name:'科学ヒーロー', emoji:'🦸' },
      { id:'fairy',   name:'精霊',       emoji:'🧚' },
      { id:'penguin', name:'実験ペンギン', emoji:'🐧' },
      // いらすとや枠（ユーザー差し込み・絵柄やわらか）
      { id:'irasuto_boy',  name:'男の子', emoji:'👦' },
      { id:'irasuto_girl', name:'女の子', emoji:'👧' },
      { id:'irasuto_cat',  name:'ねこ',   emoji:'🐈' },
      { id:'irasuto_dog',  name:'いぬ',   emoji:'🐕' }
    ];

    // ==========================================
    //   §6  GACHA_DB
    // ==========================================
    // ガチャの定義
    // ・通常5種は SSR(Legendary) 止まり（UR は出ない）。
    // ・chaos = UR専用ガチャ。requiresClear:true → ラスボス撃破(hasClearedOnce)で解禁。
    //   ここだけが UR(内部キー Relic) の排出元。rates に無いレアリティは確率0扱い。
    const GACHA_DB = {
      iron:   { name: 'アイアンガチャ',  price: 1000,   rates: { Common: 0.70, Uncommon: 0.25, Rare: 0.05 } },
      bronze: { name: 'ブロンズガチャ',  price: 5000,   rates: { Common: 0.30, Uncommon: 0.50, Rare: 0.15, Epic: 0.05 } },
      silver: { name: 'シルバーガチャ',  price: 25500,  rates: { Common: 0.10, Uncommon: 0.30, Rare: 0.40, Epic: 0.15, Legendary: 0.05 } },
      gold:   { name: 'ゴールドガチャ',  price: 120000, rates: { Uncommon: 0.10, Rare: 0.35, Epic: 0.35, Legendary: 0.20 } },
      // UR専用ガチャをビルド系統別に4分割（画像は共通 gacha_chaos.png、背景色で区別）。
      //  theme= UR(Relic)排出時に UNIQUE_EQUIP_TEMPLATES をこのthemeで絞る（各系統から全部位が出る）。
      ur_attack:     { name: '攻撃URガチャ',   price: 300000, requiresClear: true, theme: 'attack',     img: 'chaos', bg: 'attack',     rates: { Rare: 0.17, Epic: 0.35, Legendary: 0.40, Relic: 0.08 } },
      ur_durability: { name: '耐久URガチャ',   price: 300000, requiresClear: true, theme: 'durability', img: 'chaos', bg: 'durability', rates: { Rare: 0.17, Epic: 0.35, Legendary: 0.40, Relic: 0.08 } },
      ur_combo:      { name: 'コンボURガチャ', price: 300000, requiresClear: true, theme: 'combo',       img: 'chaos', bg: 'combo',       rates: { Rare: 0.17, Epic: 0.35, Legendary: 0.40, Relic: 0.08 } },
      ur_special:    { name: '特殊URガチャ',   price: 300000, requiresClear: true, theme: 'special',     img: 'chaos', bg: 'special',     rates: { Rare: 0.17, Epic: 0.35, Legendary: 0.40, Relic: 0.08 } }
    };

    // ── ガチャ価格の逓減 ──
    //  各難易度の「最後のボス」を倒すごとに価格が下がる（初期100%→60→40→30→20%）。
    //  表示価格は上2桁で丸める（キリよく）。
    const GACHA_MILESTONE_BOSSES = ['b1_3', 'b2_3', 'b3_3', 'b4_3'];
    const GACHA_DISCOUNTS = [1.0, 0.6, 0.4, 0.3, 0.2];
    function _round2sig(n) {
      n = Math.round(n);
      if (n < 100) return Math.round(n / 10) * 10;
      const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
      return Math.round(n / p) * p;
    }
    // basePrice と「倒した節目ボス数(0〜4)」から割引後の価格を返す
    function getGachaPrice(basePrice, milestonesCleared) {
      const f = GACHA_DISCOUNTS[Math.max(0, Math.min(4, milestonesCleared || 0))];
      return _round2sig(basePrice * f);
    }
    // 割引率（%表示用。0〜4節目 → 100/60/40/30/20）
    function gachaDiscountPct(milestonesCleared) {
      return Math.round(GACHA_DISCOUNTS[Math.max(0, Math.min(4, milestonesCleared || 0))] * 100);
    }

    // ==========================================
    //   §7  RARITY_DB
    // ==========================================
    // 🔬 装備レアリティ設定
    //  mult       : メインステータス基本値の倍率（個体差は廃止＝固定値）
    //  sell       : 売却額
    //  bonusSlots : ランダムボーナス枠の数
    //  rollMin/Max: 各ボーナス枠の「+Nレベル分」ロール範囲
    //  ※ 旧 Mythic(UR+)・Ultimate(LR) は廃止。Relic を UR として運用（色は旧UR+のindigo系）。
    //  ※ Ultimate(LR) の cyan演出は「UR装備が超越+5MAX」のときに動的付与する（cyanGlow）。
    const RARITY_DB = {
      Common:    { name: 'C (コモン)',            color: 'text-slate-300 border-slate-700 bg-slate-900/60', mult: 1.0, sell: 50,    bonusSlots: 1, rollMin: 1, rollMax: 3 },
      Uncommon:  { name: 'UC (アンコモン)',        color: 'text-emerald-300 border-emerald-500 bg-emerald-950/40 shadow-sm shadow-emerald-500/20', mult: 1.5, sell: 200,   bonusSlots: 2, rollMin: 1, rollMax: 3 },
      Rare:      { name: 'R (レア)',              color: 'text-blue-300 border-blue-500 bg-blue-950/40 shadow-md shadow-blue-500/30', mult: 2.2, sell: 800,   bonusSlots: 2, rollMin: 2, rollMax: 4 },
      Epic:      { name: 'SR (スーパーレア)',      color: 'text-purple-300 border-purple-500 bg-purple-950/40 shadow-lg shadow-purple-500/40', mult: 3.2, sell: 3000,  bonusSlots: 3, rollMin: 2, rollMax: 5 },
      Legendary: { name: 'SSR (スーパースーパーレア)', color: 'text-amber-300 border-amber-500 bg-amber-950/40 shadow-xl shadow-amber-500/50', mult: 4.5, sell: 12000, bonusSlots: 3, rollMin: 3, rollMax: 6 },
      Relic:     { name: 'UR (ウルトラレア)',      color: 'text-indigo-300 border-indigo-500 bg-indigo-950/40 shadow-xl shadow-indigo-500/70', mult: 6.5, sell: 40000, bonusSlots: 3, rollMin: 3, rollMax: 7 }
    };

    // 超越+5MAX の UR に動的付与する演出クラス（旧 Ultimate/LR の cyan animate-pulse）
    const CYAN_GLOW_CLASS = 'text-cyan-300 border-cyan-400 bg-cyan-950/60 shadow-2xl shadow-cyan-400/80 border-2 animate-pulse';

    // ==========================================
    //   §8  STAT_META + rollBonusStats
    // ==========================================
    // 🧬 ステータス定義（全17種）
    //  jp   : 表示名
    //  mode : 'exp' = 指数カーブ(base×1.05^lv) / 'lin' = 線形(per×lv)
    //  base : exp用の基礎上昇量 / per : lin用の1レベルあたり上昇量
    //  cap  : 'overflow' = ボーナスで上限50を超えてよい / 'hard' = 合計をLv50相当で頭打ち
    //         （hard はスタン時間・各種%・連撃数など、突破するとバランスが壊れるもの）
    // 数値ステは8本に整理（17→8）。コンボ系/シールド/スタン/吸血は「スキル」へ移行（engine getEffectiveStats でスキル駆動）。
    //  critDmg/dodge 等の % 系も装備メインステ(stat:'crit'等)で持てるよう engine 側で main() を加算する。
    const STAT_META = {
      hp:        { jp: '最大体力 (HP)',       mode: 'exp', base: 50,    cap: 'overflow' },
      atk:       { jp: '攻撃力',             mode: 'exp', base: 8,     cap: 'overflow' },
      def:       { jp: '防御力',             mode: 'exp', base: 4,     cap: 'overflow' },
      crit:      { jp: 'クリティカル率',      mode: 'lin', per: 0.009, cap: 'hard' },
      critDmg:   { jp: 'クリティカル倍率',    mode: 'lin', per: 0.03,  cap: 'overflow' },
      multi:     { jp: '連撃数',             mode: 'lin', per: 0.06,  cap: 'hard' },
      dodge:     { jp: '回避率',             mode: 'lin', per: 0.005, cap: 'hard' },
      goldMul:   { jp: 'ゴールド倍率',        mode: 'lin', per: 0.02,  cap: 'overflow' }
    };

    // ゴールドで「強化」できるのはこの3コアだけ（第1段の簡素化）。
    //  残り14ステは消滅させず、装備メインステ／ボーナス枠／スキル由来でのみ働く＝初心者の強化画面を3本に。
    const ALLOCATABLE_STATS = ['hp', 'atk', 'def'];

    // 後方互換: 既存コードが参照する STAT_NAMES_JP は STAT_META から自動生成
    const STAT_NAMES_JP = {};
    Object.keys(STAT_META).forEach(k => { STAT_NAMES_JP[k] = STAT_META[k].jp; });

    // ボーナス枠で抽選対象になるステータス（全17種）
    const BONUS_POOL = Object.keys(STAT_META);

    // レアリティに応じてランダムなボーナスステータス枠を生成する（個体値の代替）
    //  返り値: [{ key, lv }, ...]  lv は「+Nレベル分」
    function rollBonusStats(rarity) {
      const rd = RARITY_DB[rarity];
      if (!rd) return [];
      const slots = rd.bonusSlots || 0;
      const pool = BONUS_POOL.slice();
      const out = [];
      for (let i = 0; i < slots && pool.length > 0; i++) {
        const pick = Math.floor(Math.random() * pool.length);
        const key = pool.splice(pick, 1)[0];
        const lv = rd.rollMin + Math.floor(Math.random() * (rd.rollMax - rd.rollMin + 1));
        out.push({ key, lv });
      }
      return out;
    }

    // ボーナスステータス再ロール（更新券で使用）。ロックした枠は保持し、残りだけ引き直す。
    //  lockedStats=保持する {key,lv} 配列。スロット数は元装備のboNusSlotsを維持。ロック済キーは重複させない。
    function rerollBonusStats(rarity, lockedStats) {
      const rd = RARITY_DB[rarity];
      if (!rd) return (lockedStats || []).slice();
      const slots = rd.bonusSlots || 0;
      const locked = (lockedStats || []).slice(0, slots);
      const used = locked.map(function(b) { return b.key; });
      const pool = BONUS_POOL.filter(function(k) { return used.indexOf(k) < 0; });
      const out = locked.slice();
      const need = slots - locked.length;
      for (let i = 0; i < need && pool.length > 0; i++) {
        const pick = Math.floor(Math.random() * pool.length);
        const key = pool.splice(pick, 1)[0];
        const lv = rd.rollMin + Math.floor(Math.random() * (rd.rollMax - rd.rollMin + 1));
        out.push({ key, lv });
      }
      return out;
    }
    // ロック枚数→消費するステ更新券枚数（ユーザー確定: 全更新1 / 1ロック3 / 2ロック10）。
    function rerollTicketCost(lockCount) { return lockCount >= 2 ? 10 : lockCount === 1 ? 3 : 1; }

    // ==========================================
    //   §9  EQUIPMENT_TEMPLATES
    // ==========================================
    // 装備の雛形（通常装備）
    //  ・個体差は廃止。メインステータスは baseVal × レアリティmult の固定値。
    //  ・ハクスラの引き要素は rollBonusStats() のボーナス枠で表現する。
    //  ・skill は味付け。メイン stat は8本(hp/atk/def/crit/critDmg/multi/dodge/goldMul)から割当て。
    //  ・スロット別メイン目安: weapon=atk / head=hp / body=def / feet=dodge / accessory=crit|critDmg|goldMul
    //  ・※新スキル(吸血/シールド付与/気絶付与/必殺耐性)は当面ベース装備に仮配置（最終的なレアリティ配分・ロスターはCodexで再調整予定）。
    const BASE_EQUIP_TEMPLATES = [
      { id: 'nb_w01', type: 'weapon', name: '鉄の剣', stat: 'atk', baseVal: 11, emoji: '⚔️', skill: 'なし' },
      { id: 'nb_w02', type: 'weapon', name: '分度器の剣', stat: 'atk', baseVal: 12, emoji: '📐', skill: 'なし' },
      { id: 'nb_w03', type: 'weapon', name: 'チョーク弓', stat: 'crit', baseVal: 0.04, emoji: '🏹', skill: 'なし' },
      { id: 'nb_w04', type: 'weapon', name: '気絶ハンマー', stat: 'atk', baseVal: 11, emoji: '🔨', skill: '気絶付与' },
      { id: 'nb_w05', type: 'weapon', name: '小さなメス', stat: 'crit', baseVal: 0.05, emoji: '🔪', skill: '吸血' },
      { id: 'nb_h01', type: 'head', name: '安全帽', stat: 'hp', baseVal: 65, emoji: '⛑️', skill: 'なし' },
      { id: 'nb_h02', type: 'head', name: '実験ゴーグル', stat: 'def', baseVal: 8, emoji: '🥽', skill: 'なし' },
      { id: 'nb_h03', type: 'head', name: '暗記ハチマキ', stat: 'hp', baseVal: 70, emoji: '🎗️', skill: 'ヒント' },
      { id: 'nb_h04', type: 'head', name: '守りヘルム', stat: 'def', baseVal: 8, emoji: '🪖', skill: '必殺耐性' },
      { id: 'nb_h05', type: 'head', name: '静電フード', stat: 'hp', baseVal: 60, emoji: '🧢', skill: 'シールド付与' },
      { id: 'nb_b01', type: 'body', name: '白衣', stat: 'def', baseVal: 7, emoji: '🥼', skill: 'なし' },
      { id: 'nb_b02', type: 'body', name: '体力の鎧', stat: 'hp', baseVal: 75, emoji: '🦺', skill: 'なし' },
      { id: 'nb_b03', type: 'body', name: '盾エプロン', stat: 'def', baseVal: 8, emoji: '🛡️', skill: 'シールド付与' },
      { id: 'nb_b04', type: 'body', name: '耐火ベスト', stat: 'def', baseVal: 9, emoji: '🧯', skill: '必殺耐性' },
      { id: 'nb_b05', type: 'body', name: '回復コート', stat: 'hp', baseVal: 70, emoji: '🥼', skill: '吸血' },
      { id: 'nb_f01', type: 'feet', name: '運動ぐつ', stat: 'dodge', baseVal: 0.05, emoji: '👟', skill: 'なし' },
      { id: 'nb_f02', type: 'feet', name: '反復ブーツ', stat: 'multi', baseVal: 1, emoji: '🥾', skill: 'なし' },
      { id: 'nb_f03', type: 'feet', name: '軽いくつ', stat: 'dodge', baseVal: 0.06, emoji: '🥿', skill: 'なし' },
      { id: 'nb_f04', type: 'feet', name: '触媒ブーツ', stat: 'dodge', baseVal: 0.05, emoji: '⚗️', skill: '触媒の祝福' },
      { id: 'nb_f05', type: 'feet', name: '止まりぐつ', stat: 'multi', baseVal: 1, emoji: '👞', skill: '気絶付与' },
      { id: 'nb_a01', type: 'accessory', name: '会心リング', stat: 'crit', baseVal: 0.05, emoji: '💍', skill: 'なし' },
      { id: 'nb_a02', type: 'accessory', name: '光る宝石', stat: 'critDmg', baseVal: 0.35, emoji: '💎', skill: 'なし' },
      { id: 'nb_a03', type: 'accessory', name: '金のメダル', stat: 'goldMul', baseVal: 0.25, emoji: '🏅', skill: 'なし' },
      { id: 'nb_a04', type: 'accessory', name: '幸運コイン', stat: 'goldMul', baseVal: 0.3, emoji: '🪙', skill: 'ボーナス出現率+4%' },
      { id: 'nb_a05', type: 'accessory', name: '答案ルーペ', stat: 'critDmg', baseVal: 0.4, emoji: '🔍', skill: 'ヒント' },
    ];

    // 🌟 UR専用ユニーク装備（ケイオスガチャ＝chaos でのみ排出）
    //  skill 名は PHASE2 設計書 1-3 と一致させてある（戦闘効果の配線は第2段で実装）。
    //  スロットごとに排他（同じスロットには1種だけ装備可）。
    const UNIQUE_EQUIP_TEMPLATES = [
      { id: 'nu_attack_w01', type: 'weapon', name: '必中の剣', stat: 'atk', baseVal: 14, emoji: '🎯', skill: '必中の理', theme: 'attack' },
      { id: 'nu_attack_w02', type: 'weapon', name: 'サイコロ刃', stat: 'crit', baseVal: 0.07, emoji: '🎲', skill: '賭博師の刃', theme: 'attack' },
      { id: 'nu_attack_h01', type: 'head', name: '冷静ゴーグル', stat: 'def', baseVal: 9, emoji: '🥽', skill: '冷静な一撃', theme: 'attack' },
      { id: 'nu_attack_b01', type: 'body', name: '力の鎧', stat: 'hp', baseVal: 75, emoji: '🦺', skill: 'ダメージ+25%', theme: 'attack' },
      { id: 'nu_attack_f01', type: 'feet', name: '連打ぐつ', stat: 'multi', baseVal: 1, emoji: '👟', skill: '乱打の型', theme: 'attack' },
      { id: 'nu_attack_a01', type: 'accessory', name: '力のお守り', stat: 'critDmg', baseVal: 0.5, emoji: '💪', skill: 'ダメージ+50%', theme: 'attack' },
      { id: 'nu_durability_w01', type: 'weapon', name: '守りのつえ', stat: 'atk', baseVal: 12, emoji: '🪄', skill: 'シールド付与', theme: 'durability' },
      { id: 'nu_durability_h01', type: 'head', name: '不死鳥ヘルム', stat: 'hp', baseVal: 85, emoji: '🔥', skill: '不死の誓い', theme: 'durability' },
      { id: 'nu_durability_h02', type: 'head', name: '耐性ゴーグル', stat: 'def', baseVal: 10, emoji: '🥽', skill: '必殺耐性', theme: 'durability' },
      { id: 'nu_durability_b01', type: 'body', name: '封印の盾', stat: 'def', baseVal: 10, emoji: '🛡️', skill: '必殺封印の盾', theme: 'durability' },
      { id: 'nu_durability_f01', type: 'feet', name: '守りブーツ', stat: 'dodge', baseVal: 0.06, emoji: '🥾', skill: 'なし', theme: 'durability' },
      { id: 'nu_durability_a01', type: 'accessory', name: '体力お守り', stat: 'critDmg', baseVal: 0.4, emoji: '❤️', skill: 'HP+25%', theme: 'durability' },
      { id: 'nu_combo_w01', type: 'weapon', name: '連打グローブ', stat: 'atk', baseVal: 13, emoji: '🥊', skill: 'コンボ爆撃', theme: 'combo' },
      { id: 'nu_combo_h01', type: 'head', name: '触媒メガネ', stat: 'def', baseVal: 8, emoji: '👓', skill: '触媒の祝福', theme: 'combo' },
      { id: 'nu_combo_b01', type: 'body', name: '吸血コート', stat: 'hp', baseVal: 80, emoji: '🥼', skill: '吸血', theme: 'combo' },
      { id: 'nu_combo_f01', type: 'feet', name: '触媒ブーツ改', stat: 'dodge', baseVal: 0.07, emoji: '⚗️', skill: '触媒の祝福', theme: 'combo' },
      { id: 'nu_combo_f02', type: 'feet', name: '連鎖ぐつ', stat: 'multi', baseVal: 1, emoji: '👟', skill: '連鎖共鳴', theme: 'combo' },
      { id: 'nu_combo_a01', type: 'accessory', name: '連鎖の宝珠', stat: 'critDmg', baseVal: 0.55, emoji: '🔮', skill: '連鎖共鳴', theme: 'combo' },
      { id: 'nu_special_w01', type: 'weapon', name: '血のメス', stat: 'atk', baseVal: 15, emoji: '🔪', skill: '血の契約', theme: 'special' },
      { id: 'nu_special_h01', type: 'head', name: '答案ぼうし', stat: 'hp', baseVal: 70, emoji: '🎓', skill: 'ヒント', theme: 'special' },
      { id: 'nu_special_b01', type: 'body', name: '背水の鎧', stat: 'def', baseVal: 9, emoji: '🩸', skill: '排水の陣', theme: 'special' },
      { id: 'nu_special_f01', type: 'feet', name: '金のくつ', stat: 'dodge', baseVal: 0.06, emoji: '🟨', skill: 'ボーナス出現率+9%', theme: 'special' },
      { id: 'nu_special_a01', type: 'accessory', name: '錬金の金貨', stat: 'goldMul', baseVal: 0.6, emoji: '🪙', skill: '錬金術師の欲望', theme: 'special' },
      { id: 'nu_special_a02', type: 'accessory', name: '黄金の角', stat: 'goldMul', baseVal: 0.45, emoji: '🌾', skill: 'ボーナス出現率+9%', theme: 'special' },
    ];

    // ==========================================
    //   §10  SKILL_DESC / BUILD_GUIDE
    // ==========================================
    // 🧠 スキル解説（装備モーダル・ステータスポップアップで表示）
    const SKILL_DESC = {
      '必中の理': '攻撃が必ず命中する（敵の回避を無視）。代わりに攻撃力が30%下がる。',
      '賭博師の刃': '命中率が30%に下がる代わり、命中したときのダメージが5倍になる。一発逆転型。',
      '乱打の型': '1文字打つごとに1回攻撃（攻撃力÷3）。打つたびにコンボ+1。正解時の追加ダメージは無し。',
      '冷静な一撃': 'クリティカルは出ないが、すべての攻撃が確定で2倍ダメージになる。',
      '不死の誓い': '1戦闘に1度だけ、HPが0になってもHP1で踏みとどまる。',
      '排水の陣': 'HPが20%以下のとき攻撃力が3倍。HPが20%を超えているときは吸血が自傷ダメージに反転する。',
      '必殺封印の盾': 'ボスの必殺技（とそれに伴うスタン）を1戦闘に2回まで無効化する。',
      '吸血': '攻撃で与えたダメージの20%だけHPを回復する。',
      'シールド付与': '戦闘開始時、最大HPの30%ぶんのシールド（HPの盾）を張る。',
      '気絶付与': 'ボスの必殺技に正解したとき、敵をより長く気絶させる。',
      '必殺耐性': 'ボスの必殺技ダメージを30%軽減し、気絶させられる時間も短くなる。',
      'ダメージ+50%': '攻撃力が50%上がる。シンプルに強い武器向け。',
      'ダメージ+25%': '攻撃力が25%上がる。重ねて装備すると合計で上がる。',
      'HP+25%': '最大HPが25%上がる。重ねて装備すると合計で上がる。',
      'ヒント': '攻撃力が30%下がる代わり、出題にヒントが出る（タイピング＝先頭1文字を開示／選択式＝不正解を1つ暗転）。初心者向け。',
      'コンボ爆撃': '攻撃力が大きく下がる代わり、5コンボ以上でEnterキー／爆撃ボタンを押すとコンボを全消費して特大ダメージ。',
      '触媒の祝福': 'コンボバフの発動が「5回ごと」から「3回ごと」に短縮される。',
      '連鎖共鳴': 'コンボが続くほど攻撃力アップ（コンボ数×2%・最大+60%）。コンボを消費しないので「コンボ爆撃」と一緒に使うと強い。',
      '血の契約': '攻撃力+50%。ただし受けるダメージが2倍になる。ハイリスク・ハイリターン。',
      '錬金術師の欲望': 'ゴールド獲得+200%。ただし戦闘中はHPが一切回復しない。',
      'ボーナス出現率+4%': '道場でボーナスモンスター（黄金結晶オーラム）が出る確率が+4%。金策向け。',
      'ボーナス出現率+9%': '道場でボーナスモンスター（黄金結晶オーラム）が出る確率が+9%。金策ビルドの要。'
    };

    // 📖 ビルドガイド（diff = 必要なユニークスキル装備の数。0=誰でも可）
    //   why = 「どう戦う・なぜ強いか」を初心者にも分かる一言で。focus = 強化で伸ばすステータス。
    //   req のスキル名は UNIQUE_EQUIP_TEMPLATES / SKILL_DESC と一致させること（整合必須）。
    const BUILD_GUIDE = [
      { n: 1,  name: '吸血の種',       diff: 0, focus: 'HP・コンボ回復・ATK',              req: 'なし', reqSkills: [], why: '通常装備の『吸血』でHPを回復しながら殴り続ける、打たれ強い型。最初の1体めにおすすめ。' },
      { n: 2,  name: '不屈の岩',       diff: 0, focus: 'DEF・HP',                          req: 'なし', reqSkills: [], why: '防御とHPを固め、通常装備の『シールド付与』『必殺耐性』で粘る。いちばん安全＝タイピングが苦手でも生き残れる。' },
      { n: 3,  name: 'コンボの芽',     diff: 0, focus: 'コンボバフ・コンボ回復',           req: 'なし', reqSkills: [], why: '正解を続けてコンボを伸ばし、コンボバフで火力を上げる基本型。URなしで作れてゲームの土台を学べる。' },
      { n: 4,  name: '連鎖の使い手',   diff: 1, focus: 'コンボバフ・ATK',                  req: '連鎖共鳴', reqSkills: ['連鎖共鳴'], why: 'コンボが続くほど攻撃力が上がる『連鎖共鳴』型。コンボを切らさず伸ばし続けるのが強さの鍵。' },
      { n: 5,  name: '触媒師',         diff: 1, focus: 'コンボバフ・コンボ回復',           req: '触媒の祝福', reqSkills: ['触媒の祝福'], why: 'コンボバフが「5回ごと→3回ごと」に早まり、バフを盛りやすい。コンボ型の強化版。' },
      { n: 6,  name: '背水の将',       diff: 1, focus: 'ATK・クリ率・クリ倍率',            req: '排水の陣', reqSkills: ['排水の陣'], why: 'HPを20%以下に保つと攻撃力3倍。ギリギリで戦うハイリスクな一発型（HP管理に注意）。' },
      { n: 7,  name: '当たり屋',       diff: 1, focus: 'ATK・クリ倍率',                    req: '賭博師の刃', reqSkills: ['賭博師の刃'], why: '命中すれば5倍ダメージ（外れやすい）。クリ倍率を盛ってロマンを狙う博打型。' },
      { n: 8,  name: '精密射手',       diff: 1, focus: 'ATK・連撃数',                      req: '必中の理', reqSkills: ['必中の理'], why: '攻撃が必ず当たる（敵の回避を無視）。連撃数を上げて手数で押す安定型。' },
      { n: 9,  name: '黄金の亡者',     diff: 1, focus: 'ゴールド倍率・HP',                 req: '錬金術師の欲望', reqSkills: ['錬金術師の欲望'], why: 'ゴールド+200%で稼ぎ特化（戦闘中はHP回復なし）。HPを厚くして金策に回す型。' },
      { n: 10, name: '不滅の吸血鬼',   diff: 2, focus: 'HP・ATK',                          req: '血の契約＋不死の誓い', reqSkills: ['血の契約','不死の誓い'], why: '攻撃+50%（被ダメ2倍）を吸血で支え、倒れても1戦に1度だけ復活。攻防一体の上級型。' },
      { n: 11, name: '精密砲台',       diff: 2, focus: 'ATK・連撃数',                      req: '必中の理＋冷静な一撃', reqSkills: ['必中の理','冷静な一撃'], why: '必ず当たる×全攻撃が確定2倍。事故が少なく、安定して高火力を出せる型。' },
      { n: 12, name: '共鳴触媒',       diff: 2, focus: 'コンボバフ・ATK',                  req: '触媒の祝福＋連鎖共鳴', reqSkills: ['触媒の祝福','連鎖共鳴'], why: 'バフが早くたまり、連鎖共鳴でコンボが伸びるほど火力も上がる。コンボ火力を最大化する型。' },
      { n: 13, name: '黄金の要塞',     diff: 2, focus: 'ゴールド倍率・HP・DEF',            req: '錬金術師の欲望＋必殺封印の盾', reqSkills: ['錬金術師の欲望','必殺封印の盾'], why: '稼ぎながらボスの必殺技を2回まで無効化。安全に長く回せる金策の完成形。' },
      { n: 14, name: '断末魔の賭博師', diff: 3, focus: 'ATK・クリ倍率',                    req: '排水の陣＋賭博師の刃＋連鎖共鳴', reqSkills: ['排水の陣','賭博師の刃','連鎖共鳴'], why: '低HP3倍×命中5倍に連鎖共鳴のコンボ火力を重ねる超火力ロマン型。決まれば最強・難易度も最高。' },
      { n: 15, name: '永遠機関',       diff: 3, focus: 'コンボバフ・ATK・HP',              req: '排水の陣＋血の契約＋触媒の祝福', reqSkills: ['排水の陣','血の契約','触媒の祝福'], why: '吸血で回復し続けながら高火力を維持する、終わりのない戦闘マシン。最上級ビルド。' }
    ];

    // ==========================================
    //   §11  STAT_CAPS / コスト関数 / fmtChem
    // ==========================================
    // ── stat caps & upgrade cost ──
    // 全ステータス上限は一律50（STAT_META から自動生成）。
    const STAT_CAPS = {};
    Object.keys(STAT_META).forEach(k => { STAT_CAPS[k] = 50; });

    // 強化コスト: 全ステータスの「合計投資レベル」基準（どのステータスを上げても価格が共通で上がる）
    //  起点200・係数1.10。totalLevels = 全ステータスの振り合計。
    //  ※係数は元1.15。共有指数が急峻すぎて尖りステ(crit/multi/vamp等)に振る余裕が無くビルドがatk/hpに収束していたため1.10へ緩和。
    //    キャップ付きの味付けステに20〜30振れる予算が生まれ、ビルドの幅が出る（青天井ステはhp/atk/defのみ＝壊れない）。
    function getStatUpgradeCost(totalLevels) { return Math.floor(200 * Math.pow(1.10, totalLevels)); }
    // 全ステータスの合計振りレベル
    function getTotalStatLevels(stats) {
      if (!stats) return 0;
      let t = 0;
      Object.keys(STAT_META).forEach(k => { t += (stats[k] || 0); });
      return t;
    }

    // 1レベルあたりの上昇量。exp=指数カーブ / lin=定数（線形）
    function getStatGainAtLevel(key, lv) {
      const m = STAT_META[key];
      if (!m) return 0;
      if (m.mode === 'lin') return m.per;
      return m.base * Math.pow(1.05, lv);
    }
    // 0〜totalLevels-1 レベル分の累計上昇量
    function getStatGainTotal(key, totalLevels) {
      const m = STAT_META[key];
      if (!m) return 0;
      if (m.mode === 'lin') return m.per * totalLevels; // 線形は積和不要
      let sum = 0;
      for (let i = 0; i < totalLevels; i++) sum += m.base * Math.pow(1.05, i);
      return sum;
    }

    // ── ion/chem formatting ──
    const _SUP = ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'];
    const _SUB = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
    const _FMT_ION = {
      'Na+':'Na⁺','K+':'K⁺','H+':'H⁺','NH4+':'NH₄⁺','Ca2+':'Ca²⁺','Mg2+':'Mg²⁺',
      'Fe2+':'Fe²⁺','Fe3+':'Fe³⁺','Cu2+':'Cu²⁺','Zn2+':'Zn²⁺','Al3+':'Al³⁺','Ba2+':'Ba²⁺',
      'Ag+':'Ag⁺','Pb2+':'Pb²⁺','Cl-':'Cl⁻','OH-':'OH⁻','NO3-':'NO₃⁻','HCO3-':'HCO₃⁻',
      // スペースあり・なし両方対応（入力形式のゆれを吸収）
      'CO3 2-':'CO₃²⁻','SO4 2-':'SO₄²⁻','PO4 3-':'PO₄³⁻',
      'CO32-':'CO₃²⁻','SO42-':'SO₄²⁻','PO43-':'PO₄³⁻',
      'S2-':'S²⁻','O2-':'O²⁻',
    };
    function fmtChem(str) {
      if (!str || str === '????') return str;
      return str.replace(/[A-Za-z][A-Za-z0-9+\-]*/g, function(tok) {
        if (_FMT_ION[tok]) return _FMT_ION[tok];
        const m = tok.match(/^(.*?)(\d*)([+\-])$/);
        if (m) {
          const fmtBody = m[1].replace(/\d/g, d => _SUB[+d]);
          const supN = m[2] ? m[2].split('').map(d => _SUP[+d]).join('') : '';
          return fmtBody + supN + (m[3] === '+' ? '⁺' : '⁻');
        }
        return tok.replace(/\d/g, d => _SUB[+d]);
      });
    }

    // ==========================================
    //   §12  公開API
    // ==========================================
    // 受験ランク(supreme)を全ジャンルで選択可能に（外部テスト版から統合 2026-06-04）
    GENRES.forEach(function(g){ if (g.diffs && g.diffs.indexOf('supreme')<0) g.diffs.push('supreme'); });
    GENRES.forEach(function(g){ var gg=GENRE_GRADES[g.key]; if (gg && gg.supreme==null) gg.supreme=3; });

    // ランク制（学習保障報酬・2026-06-05）: 問題を解くとEXP→ランクUP→ゴールド。EXPはステ非連動。
    //  「撃破=ゴールド / 回答=EXP」の分離で後から調整しやすい。数値は夜間simで調整する。
    const RANK_CONFIG = {
      expCorrect: 12,   // 正解1問のEXP
      expWrong: 4,      // 誤答1問のEXP（努力を少し報う。怒りモード中は0＝連打対策）
      needBase: 50,     // ランク1→2に必要なEXP（序盤は早く上がって達成感を）
      needPerRank: 30,  // ランクが上がるごとの必要EXP増分
      needRampCap: 20,  // ランク21以降は必要EXPの増加が頭打ち（高ランクが無限に遠くならない）
      goldBase: 1500,   // 通常ランクUP報酬ゴールドの基準（つまずき層の「解けば報われる」を厚く）
      goldPerRank: 200, // ランクが上がるごとの報酬増分
      goldRampCap: 25,  // 通常報酬の増加上限（late-gameインフレ防止）
      maxRank: 50,      // ゴールド報酬の最終ランク。51以降はゴールド廃止→ステ更新チケット制。
      // 節目の大型報酬（ユーザー確定 2026-06-05）。type別: gold / gachaGold10(ゴールドガチャ10連券) / selectUR(選択UR券)。
      milestones: {
        5:  { gold: 50000 },
        10: { gachaGold10: 1 },
        20: { gold: 500000 },
        30: { gold: 1000000 },
        40: { gold: 500000 },
        50: { selectUR: 1 },
      },
    };
    // ランクr→r+1 に必要なEXP（needRampCapで増加を頭打ち）
    function rankExpNeeded(rank) {
      const steps = Math.min(Math.max(1, rank) - 1, RANK_CONFIG.needRampCap);
      return RANK_CONFIG.needBase + RANK_CONFIG.needPerRank * steps;
    }
    // ランクrに上がったときの通常ゴールド。ランク50超はゴールド廃止（チケット制）。
    function rankUpGold(newRank) {
      if (newRank > RANK_CONFIG.maxRank) return 0;
      const steps = Math.min(Math.max(1, newRank) - 1, RANK_CONFIG.goldRampCap);
      return RANK_CONFIG.goldBase + RANK_CONFIG.goldPerRank * steps;
    }
    // ランク50超で1ランクごとに配るステ更新チケット枚数。倍数で増量・加算しない（高いほう優先）。
    function rankUpTickets(newRank) {
      if (newRank <= RANK_CONFIG.maxRank) return 0;
      if (newRank % 100 === 0) return 100;
      if (newRank % 50 === 0) return 50;
      if (newRank % 10 === 0) return 10;
      if (newRank % 5 === 0) return 5;
      return 1;
    }
    // ランクrの節目報酬オブジェクト（無ければnull）。
    function rankMilestoneReward(rank) { return RANK_CONFIG.milestones[rank] || null; }
    // そのランクが節目（大型報酬）かどうか
    function isRankMilestone(rank) { return !!RANK_CONFIG.milestones[rank]; }

    // 🛡️ 学習保護: 1つの出題範囲(選んだ難易度×ジャンル×形式の実プール)に必要な最低問題数。
    //  これ未満の範囲は道場で挑戦不可＝「答えを覚えて荒稼ぎ」を防ぐ保護装置。先生は各範囲20問を目標に増やす。
    //  ※「20問あればOK」＝count < MIN_QUESTIONS でロック（20はOK）。21問必須にするなら 21 に。
    const MIN_QUESTIONS = 20;

    // 初心者ガイド（推奨道場レベル・ボス推奨戦闘力）。数値は夜間simでキャリブレーション済み・調整可。
    //  推奨Lv = round(ATK / recLevelAtkDivisor) を解禁上限でclamp（新規ATK10→Lv1, トップATK2000→Lv100）。
    //  推奨戦闘力 = hp×bossRecHpCoef + atk×bossRecAtkCoef（人格が各ボスに挑む時点の戦闘力に最小二乗フィット）。
    const GUIDE_CONFIG = {
      recLevelAtkDivisor: 15,
      bossRecHpCoef: 0.55,
      bossRecAtkCoef: 7.3,
      bossReadyRatio: 0.7, // 戦闘力 >= 推奨×これ で「あと少し」、未満で「まだ早い」
    };

    return {
      RANK_CONFIG, rankExpNeeded, rankUpGold, rankUpTickets, rankMilestoneReward, isRankMilestone, GUIDE_CONFIG, MIN_QUESTIONS,
      QUESTION_DB, ULTIMATE_QUIZZES, SUBJECTS, GENRES, DIFFICULTIES, getQuestions, getAvailableGenres,
      GENRE_GRADES, GENRE_EXAMPLES, getGenreGradeRange, getGenreGradeMax,
      GRADE_COLOR_STYLE, getGradeColorKey, getGradeBadgeClass,
      BOSSES_DB, ENDGAME_BOSSES_DB, getEndgameBossStats, PERMA_BUFF_CAP, getPermaBuffTotals,
      TITLES_DB, isTitleUnlocked, AVATARS_DB,
      GACHA_DB, GACHA_MILESTONE_BOSSES, getGachaPrice, gachaDiscountPct, RARITY_DB, CYAN_GLOW_CLASS,
      BASE_EQUIP_TEMPLATES, UNIQUE_EQUIP_TEMPLATES, SKILL_DESC, BUILD_GUIDE, STAT_CAPS, STAT_NAMES_JP, STAT_META,
      ALLOCATABLE_STATS, BONUS_POOL, rollBonusStats, rerollBonusStats, rerollTicketCost,
      getStatUpgradeCost, getTotalStatLevels, getStatGainAtLevel, getStatGainTotal, fmtChem,
    };
})();
