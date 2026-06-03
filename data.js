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
    const DIFFICULTIES = [
      { key: 'junior',  label: '基礎', color: 'bg-cyan-700',   boss: '初級' },
      { key: 'mid',     label: '応用', color: 'bg-orange-700', boss: '中級' },
      { key: 'senior',  label: '発展', color: 'bg-purple-700', boss: '上級' },
      { key: 'supreme', label: '受験', color: 'bg-rose-700',   boss: '超級' }
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
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'メタン分子',      formula: 'CH4', desc: '炭素1・水素4。天然ガスの主成分。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '炭素',            formula: 'C',   desc: '元素記号で表す単体。黒鉛やダイヤモンドは、どちらも炭素だけでできている。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '硫黄',            formula: 'S',   desc: '黄色い固体の単体。鉄と化合すると硫化鉄、燃えると二酸化硫黄になる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '銅',              formula: 'Cu',  desc: '赤色の金属。電気をよく通す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '鉄',              formula: 'Fe',  desc: '磁石につく代表的な金属。硫黄と化合すると、鉄とは性質の違う硫化鉄になる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'マグネシウム',    formula: 'Mg',  desc: '銀白色の軽い金属。燃えると強い光を出す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '亜鉛',            formula: 'Zn',  desc: '青みがかった金属。塩酸と反応して水素を出す。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '銀',              formula: 'Ag',  desc: '白くかがやく金属。電気伝導性が最も高い。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '金',              formula: 'Au',  desc: 'さびにくく加工しやすい貴金属。イオンになりにくく、化学変化を受けにくい。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'アルミニウム',    formula: 'Al',  desc: '軽くてさびにくい金属。1円玉の材料。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'バリウム',        formula: 'Ba',  desc: 'アルカリ土類金属の一つ。硫酸イオンと結びつくと、水に溶けにくい硫酸バリウムになる。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: '水銀',            formula: 'Hg',  desc: '常温で液体の金属。毒性があるため、実験や廃棄では特に注意が必要。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'カルシウム',      formula: 'Ca',  desc: '骨や歯、石灰石にふくまれる金属。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'カリウム',        formula: 'K',   desc: '水と激しく反応する金属。' },
      { genre: 'formula', diff: 'junior', type: 'typing', name: 'ケイ素',          formula: 'Si',  desc: '岩石や砂の成分に多くふくまれる元素。半導体の材料としても使われる。' },

      // ───────── 化学式 formula：応用（mid）＝化合物 ─────────
      { genre: 'formula', diff: 'mid', type: 'typing', name: '酸化銀',            formula: 'Ag2O',  desc: '銀と酸素の化合物。加熱すると銀と酸素に分解する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '炭酸カルシウム',    formula: 'CaCO3', desc: '石灰石や貝がらの主成分。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '酸化マグネシウム',  formula: 'MgO',   desc: 'マグネシウムが燃えてできる白い物質。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '酸化銅',            formula: 'CuO',   desc: '銅が酸素と結びついた黒い物質。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '塩化銅',            formula: 'CuCl2', desc: '水に溶けると青色を示す。電気分解で銅と塩素に分かれる。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫化鉄',            formula: 'FeS',   desc: '鉄と硫黄が結びついた黒い物質。磁石につかない。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '塩化ナトリウム',    formula: 'NaCl',  desc: '食塩の成分。ナトリウムと塩素の化合物。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '塩化水素(塩酸)',    formula: 'HCl',   desc: '水に溶けると塩酸になる気体。水中ではH+とCl-に電離して酸性を示す。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '水酸化ナトリウム',  formula: 'NaOH',  desc: '強いアルカリ性を示す白い固体。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '炭酸ナトリウム',    formula: 'Na2CO3', desc: '炭酸水素ナトリウムを加熱するとできる。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '炭酸水素ナトリウム', formula: 'NaHCO3', desc: '重そうの主成分。加熱すると炭酸ナトリウム・水・二酸化炭素に分解する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫化水素',          formula: 'H2S',   desc: '腐卵臭のある有毒な気体。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫酸',              formula: 'H2SO4', desc: '強い酸性を示す。水に溶けて電離する。' },
      { genre: 'formula', diff: 'mid', type: 'typing', name: '硫酸バリウム',      formula: 'BaSO4', desc: '水に溶けにくい白い沈殿。' },

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
      { genre: 'reaction', diff: 'supreme', type: 'typing', name: '希硫酸と亜鉛の反応', formula: 'ZnSO4', display: 'Zn + H2SO4 → [ ? ] + H2', desc: '亜鉛が溶けて硫酸亜鉛ができる。' },
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
      { id: 'nu_combo_f02', type: 'feet', name: '連鎖ぐつ', stat: 'multi', baseVal: 1, emoji: '👟', skill: '連鎖爆発', theme: 'combo' },
      { id: 'nu_combo_a01', type: 'accessory', name: '連鎖の宝珠', stat: 'critDmg', baseVal: 0.55, emoji: '🔮', skill: '連鎖爆発', theme: 'combo' },
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
      '連鎖爆発': 'コンボが10に達するとコンボを消費して大ダメージ。コンボは0に戻る。',
      '血の契約': '攻撃力+50%。ただし受けるダメージが2倍になる。ハイリスク・ハイリターン。',
      '錬金術師の欲望': 'ゴールド獲得+200%。ただし戦闘中はHPが一切回復しない。',
      'ボーナス出現率+4%': '道場でボーナスモンスター（黄金結晶オーラム）が出る確率が+4%。金策向け。',
      'ボーナス出現率+9%': '道場でボーナスモンスター（黄金結晶オーラム）が出る確率が+9%。金策ビルドの要。'
    };

    // 📖 ビルドガイド（diff = 必要なユニークスキル装備の数。0=誰でも可）
    const BUILD_GUIDE = [
      { n: 1,  name: '吸血の種',       diff: 0, focus: '吸血率・HP・コンボ回復',            req: 'なし' },
      { n: 2,  name: '不屈の岩',       diff: 0, focus: 'DEF・HP・シールド・スタン耐性',      req: 'なし' },
      { n: 3,  name: 'コンボの芽',     diff: 0, focus: 'コンボバフ・コンボ継続・コンボ回復',  req: 'なし' },
      { n: 4,  name: '連鎖爆弾',       diff: 1, focus: 'コンボバフ・ATK',                   req: '連鎖爆発(アクセ)' },
      { n: 5,  name: '触媒師',         diff: 1, focus: 'コンボバフ・コンボ継続・コンボ回復',  req: '触媒の祝福(足)' },
      { n: 6,  name: '背水の将',       diff: 1, focus: 'ATK・クリ率・クリ倍率',             req: '排水の陣(胴)' },
      { n: 7,  name: '当たり屋',       diff: 1, focus: 'ATK・クリ倍率',                    req: '賭博師の刃(武器)' },
      { n: 8,  name: '精密射手',       diff: 1, focus: 'ATK・連撃数',                      req: '必中の理(武器)' },
      { n: 9,  name: '黄金の亡者',     diff: 1, focus: 'ゴールド倍率・HP',                  req: '錬金術師の欲望(アクセ)' },
      { n: 10, name: '不滅の吸血鬼',   diff: 2, focus: '吸血率・HP',                       req: '血の契約＋不死の誓い' },
      { n: 11, name: '精密砲台',       diff: 2, focus: 'ATK・連撃数',                      req: '必中の理＋冷静な一撃' },
      { n: 12, name: '爆発触媒',       diff: 2, focus: 'コンボバフ・ATK',                   req: '触媒の祝福＋連鎖爆発' },
      { n: 13, name: '黄金の要塞',     diff: 2, focus: 'ゴールド倍率・HP・DEF',             req: '錬金術師の欲望＋必殺封印の盾' },
      { n: 14, name: '断末魔の賭博師', diff: 3, focus: 'ATK・クリ倍率',                    req: '排水の陣＋賭博師の刃＋連鎖爆発' },
      { n: 15, name: '永遠機関',       diff: 3, focus: '吸血率・コンボバフ・ATK',           req: '排水の陣＋血の契約＋触媒の祝福' }
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
    return {
      QUESTION_DB, ULTIMATE_QUIZZES, SUBJECTS, GENRES, DIFFICULTIES, getQuestions, getAvailableGenres,
      GENRE_GRADES, GENRE_EXAMPLES, getGenreGradeRange, getGenreGradeMax,
      GRADE_COLOR_STYLE, getGradeColorKey, getGradeBadgeClass,
      BOSSES_DB, ENDGAME_BOSSES_DB, getEndgameBossStats, PERMA_BUFF_CAP, getPermaBuffTotals,
      TITLES_DB, isTitleUnlocked, AVATARS_DB,
      GACHA_DB, GACHA_MILESTONE_BOSSES, getGachaPrice, gachaDiscountPct, RARITY_DB, CYAN_GLOW_CLASS,
      BASE_EQUIP_TEMPLATES, UNIQUE_EQUIP_TEMPLATES, SKILL_DESC, BUILD_GUIDE, STAT_CAPS, STAT_NAMES_JP, STAT_META,
      ALLOCATABLE_STATS, BONUS_POOL, rollBonusStats,
      getStatUpgradeCost, getTotalStatLevels, getStatGainAtLevel, getStatGainTotal, fmtChem,
    };
})();
