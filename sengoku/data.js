/* ============================================================
   戦国トレーナー 〜天下統一への道〜  data.js
   ------------------------------------------------------------
   §1 ジャンル定義（育成コマンド⇔クイズジャンル対応）
   §2 家臣（サポートカード簡易版）
   §2.5 武将ロスター
   §2.6 合戦絵巻（実況セリフ・采配・小競り合い）
   §2.7 勢力図（領地マップ）
   §2.8 スキル定義
   §2.85 追憶の章（全偉人共通のクリア後ボーナス）
   §2.9 偉人パック（エンジンが参照する単位。偉人追加=パック追加）
   §3 年表イベント（織田信長 1551-1582）
   §4 クイズDB（シード問題。Codex生成分は QUESTIONS_EXTRA に追記）
   ------------------------------------------------------------
   設計書: rpg_v3/PLAN_SENGOKU_IKUSEI.md
   スキーマ: {genre,diff(1-3),q,c[4],a(0-3),desc}
   ============================================================ */

const SENGOKU_DATA = (function(){

  /* ===== §1 ジャンル定義 ===== */
  // 表示名は偉人をまたぐ普遍名（武力/知力/政治/人望・2026-06-14決定）。内部キーは不変。
  // sub: 鍛錬の副次上昇先（主100%+副30%・特化育成の詰み対策）。seijiの副次は石高（経済）
  // label=文中の正式名 / short=ステ枠の1文字表示（2026-06-13 ユーザー要望でステ枠は1文字に）
  const GENRES = {
    buyu:     { label:'武力', short:'武', icon:'⚔️', train:'武力の鍛錬', quizLabel:'合戦・戦乱', sub:'ninbo' },
    chiryaku: { label:'知力', short:'知', icon:'🧠', train:'知力の鍛錬', quizLabel:'流れ・因果', sub:'seiji' },
    seiji:    { label:'政治力', short:'政', icon:'🏛️', train:'政務',       quizLabel:'政策・制度', sub:'koku' },
    ninbo:    { label:'人望', short:'人', icon:'🤝', train:'交流',       quizLabel:'文化・人物', sub:'chiryaku' },
  };

  /* ===== §2 家臣 =====
     fav: 得意ジャンル（絆80+で友情特訓）。bonus: 同席時の上昇量加算 */
  const RETAINERS = [
    { id:'hideyoshi', name:'木下藤吉郎', icon:'🐒', fav:'seiji', img:'assets/r_hideyoshi.png',
      perk:{ type:'kokuSub', label:'同席した政務の石高2倍' },
      skill:{ id:'sk_zeni_hana', icon:'👃', name:'銭の嗅覚', desc:'視察で得る石高が4割増える', fx:{ tripKoku:1.4 } },
      midText:'「殿、銭は生き物ですぞ。回せば回すほど太りまする」（藤吉郎が金勘定のコツを教えてくれた）',
      intro:'草履取りから取り立てられた知恵者。のちの豊臣秀吉。',
      maxText:'「殿のためなら、この藤吉郎、どこまでも知恵を絞りますぞ！」（のちに天下人となる男が、あなたの背中を見ている）',
      maxFx:{ seiji:10, koku:30 } },
    { id:'katsuie', name:'柴田勝家', icon:'🛡️', fav:'buyu', img:'assets/r_katsuie.png',
      perk:{ type:'cost', v:5, label:'同席した鍛錬の体力-5' },
      skill:{ id:'sk_kakare', icon:'⚔️', name:'かかれ柴田', desc:'合戦の武力の采配が強くなる', fx:{ battleStat:'buyu' } },
      midText:'「鍛えるとは、昨日の己に勝つことよ」（猛将の稽古は厳しいが、体の使い方が身についてきた）',
      intro:'「かかれ柴田」と呼ばれる猛将。武勇の鍛錬が得意。',
      maxText:'「殿の武勇、もはやわしを超えたわ！がっはっは！」（織田家随一の猛将が、心から認めてくれた）',
      maxFx:{ buyu:10, stamina:30 } },
    { id:'mitsuhide', name:'明智光秀', icon:'📜', fav:'chiryaku', img:'assets/r_mitsuhide.png',
      perk:{ type:'gain', v:2, label:'同席した鍛錬の上昇+2' },
      skill:{ id:'sk_kikyo', icon:'🔮', name:'桔梗の軍配', desc:'合戦の知力の采配が強くなる', fx:{ battleStat:'chiryaku' } },
      midText:'「書を読み、地を読み、人を読む。すべては学びにございます」（光秀の講義は驚くほどわかりやすい）',
      intro:'教養豊かな知将。鉄砲の名手でもある。',
      maxText:'「殿ほど学問を大切になさるお方は初めてです」（知将の信頼を得た。……歴史が変わるかもしれない）',
      maxFx:{ chiryaku:10, ninbo:5 } },
    { id:'kicho', name:'帰蝶（濃姫）', icon:'🦋', fav:'ninbo', img:'assets/r_kicho.png',
      perk:{ type:'mood', label:'同席時、やる気低下を半分防ぐ' },
      skill:{ id:'sk_yasuragi', icon:'🍵', name:'蝶のやすらぎ', desc:'休息の回復量が増える', fx:{ restPlus:12 } },
      midText:'「気を張りつめてばかりでは、弓も切れますよ」（帰蝶の点てた茶で、心がほどけた）',
      intro:'美濃の斎藤道三の娘にして信長の妻。「まむしの娘」。',
      maxText:'「うつけ殿が、ここまでの大将になるとはな」（誰よりも近くで、あなたの成長を見てきた人の言葉）',
      maxFx:{ ninbo:10, mood:2 } },
    { id:'toshiie', name:'前田利家', icon:'🗡️', fav:'buyu', img:'assets/r_toshiie.png',
      perk:{ type:'skillpt', v:1, label:'同席正解でスキルP+1' },
      skill:{ id:'sk_yari', icon:'🗡️', name:'槍働きの誉', desc:'すべての鍛錬の上昇が少し増える', fx:{ trainAll:1 } },
      midText:'「殿と稽古する日は、飯がうまい！」（又左の明るさに、家中の空気が軽くなる）',
      intro:'「槍の又左」と呼ばれた若き猛者。のちの加賀百万石の祖。',
      maxText:'「殿の槍さばき、この又左より上やもしれませぬな！」（生涯の友となる男が、隣で笑っている）',
      maxFx:{ buyu:8, koku:20 } },
    { id:'kazumasu', name:'滝川一益', icon:'🎯', fav:'chiryaku', img:'assets/r_kazumasu.png',
      perk:{ type:'gain', v:2, label:'同席した鍛錬の上昇+2' },
      skill:{ id:'sk_shintai', icon:'🎯', name:'進退自在', desc:'合戦の政治の采配（鉄砲・兵站）が強くなる', fx:{ battleStat:'seiji' } },
      midText:'「攻め時より、退き時を知る者が生き残りまする」（寡黙な一益が、ぽつりと極意を漏らした）',
      intro:'「進むも退くも滝川」。鉄砲と忍びに通じた知略の士。',
      maxText:'「殿の読みの深さ、それがしの忍びより速うございます」（寡黙な男が、最大級の賛辞を口にした）',
      maxFx:{ chiryaku:8, stamina:20 } },
  ];

  /* ===== §2.5 武将ロスター（編成画面の予定表示・βでは信長のみ育成可） =====
     buff は将来の戦争モード/育成解放時の持ち味（現状は表示のみ・未実装） */
  const WARLORDS = [
    { id:'nobunaga',  name:'織田信長', icon:'⚡', title:'第六天魔王',
      buff:'友情特訓の効果が大きい', playable:true },
    { id:'hideyoshi', name:'豊臣秀吉', icon:'🐒', title:'人たらしの天下人',
      buff:'側近との絆が上がりやすい', playable:true },
    { id:'ieyasu',    name:'徳川家康', icon:'🦅', title:'忍耐の大御所',
      buff:'体力の消耗が少ない', playable:true },
    { id:'shingen',   name:'武田信玄', icon:'🐯', title:'甲斐の虎',
      buff:'武勇の鍛錬が伸びやすい', playable:false },
    { id:'kenshin',   name:'上杉謙信', icon:'🐉', title:'越後の軍神',
      buff:'合戦の軍配がはずれにくい', playable:false },
  ];

  /* ===== §2.6 合戦絵巻（実況・采配） =====
     設計: rpg_v3/DESIGN_SENGOKU_BATTLE_V2.md（2026-06-12 生徒FB対応）
     合戦は3ラウンドの「戦況→采配→クイズ→結果4階調」。采配opt:
       stat: 参照ステ（UIに数値表示） / genre: 出題ジャンル
       style: safe(堅実=中効果・安全) / risky(博打=大効果・外すと痛い) / trick(搦め手=ステ90+で化ける)
       fit: 戦況との合致 0-2（非表示。文章から推理させる） / hist: 史実采配=確定会心 */

  /* 実況キャラ「物見の佐助」のセリフ素材（tierごとの汎用行） */
  const BATTLE_LINES = {
    caster: '📣 物見の佐助',
    casterIntro: '実況はわたくし、足だけが自慢の物見・佐助でお送りしますッ！',
    kaishin: ['会心の采配だあーっ！！ 戦場の流れが一気に傾いたぞ！', 'なんという一手！ 敵陣から悲鳴が聞こえてくるーっ！'],
    yuko:    ['有効打！ 着実に敵を削っていくっ！', '悪くない悪くない、確実に前に出ているぞ！'],
    fuhatsu: ['うーん、戦果はいまひとつだあ…！', '空振りだ…！ だがまだ立て直せるッ！'],
    shikujiri:['痛恨の采配ミス！ 逆に押し込まれたあーっ！', 'しまったあ！ 敵の反撃をまともに食らったぞ…！'],
    mid:     ['両軍、一進一退の攻防だ！', '土煙が上がる！ 押して押されての大乱戦！', '矢が、礫（つぶて）が、怒号が飛び交うーっ！'],
    hist:    '📜 これぞ史実の一手！ 本物の信長と同じ決断だ！',
    winSeq:  ['敵が崩れた…総崩れだあーっ！！', '勝鬨（かちどき）を上げろーっ！ えい、えい、おーっ！！'],
    loseSeq: ['味方が…味方が崩れていく…！', '無念…！ ここまでかあ…！'],
  };

  /* 小競り合い（任意参加のミニ合戦＝1ラウンド版の合戦絵巻） */
  const SKIRMISH_FOES = [
    { icon:'👹', name:'野盗の討伐',       army:600,  text:'領内を荒らす野盗の群れが現れた！' },
    { icon:'🏴', name:'国境の小競り合い', army:900,  text:'隣国の兵が国境の村に手を出してきた！' },
    { icon:'🗼', name:'敵方の砦攻め',     army:1100, text:'敵方の小さな砦が街道をふさいでいる！' },
    { icon:'⛵', name:'川筋の水賊退治',   army:700,  text:'川の水運を荒らす水賊ども、討伐の願いが届いた！' },
  ];
  const SKIRMISH_SITUS = [
    { sky:'🌾 開けた野原', bg:'assets/bg_field.jpg',
      situ:'敵は野原のど真ん中で隊列を組んでいる！ よく見ると正面が薄いぞ…！',
      opts:[
        { icon:'⚔️', label:'薄い正面へ一点突破', stat:'buyu', genre:'buyu', style:'safe', fit:2,
          ok:'まっすぐ貫いたーっ！ 敵の隊列が真っ二つだ！' },
        { icon:'🌫️', label:'大回りして背後から', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:1,
          ok:'背後を取った！ 敵は大慌てで向きを変えるが、もう遅い！' },
        { icon:'🤝', label:'戦わずに投降を呼びかける', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
          ok:'敵から白旗だ！ 人望が刃より強いこともある！' },
      ] },
    { sky:'⛰️ 険しい山道', bg:'assets/bg_mountain.jpg',
      situ:'敵は細い山道を一列になって進んでいる。仕掛けるなら今しかない！',
      opts:[
        { icon:'🌫️', label:'崖の上から一斉に奇襲', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
          ok:'頭上から岩と矢の雨だ！ 細い道では逃げ場がないーっ！' },
        { icon:'⚔️', label:'正面から道を塞いで叩く', stat:'buyu', genre:'buyu', style:'risky', fit:1,
          ok:'狭い道での白兵戦！ 一騎当千の働きだ！' },
        { icon:'💥', label:'狙いを定めて鉄砲を放つ', stat:'seiji', genre:'seiji', style:'trick', fit:1,
          ok:'一列の敵に鉄砲が刺さる刺さる！ 銭で揃えた甲斐があった！' },
      ] },
    { sky:'🏞️ 川辺の浅瀬', bg:'assets/bg_river.jpg',
      situ:'敵が川を渡り始めた！ 半分はまだ水の中…これは好機か!?',
      opts:[
        { icon:'💥', label:'渡河中の敵を撃ちまくる', stat:'seiji', genre:'seiji', style:'safe', fit:2,
          ok:'水の中では身動きが取れない！ 一方的な展開だーっ！' },
        { icon:'🧠', label:'上流の堰（せき）を切る', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:2,
          ok:'鉄砲水だーっ！！ 敵が丸ごと押し流されていく！ 大博打、大成功！' },
        { icon:'⚔️', label:'岸で待ち構えて突撃', stat:'buyu', genre:'buyu', style:'safe', fit:1,
          ok:'上がってきた敵を片っ端から叩く！ 手堅い勝ち筋だ！' },
      ] },
    { sky:'🌫️ 深い夜霧', bg:'assets/bg_fog.jpg',
      situ:'夜霧が出てきた。敵はこちらの兵の数をつかめていない様子だ…！',
      opts:[
        { icon:'🌫️', label:'霧にまぎれて夜襲', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
          ok:'音もなく忍び寄って一斉に襲いかかる！ 敵は同士討ちを始めたぞ！' },
        { icon:'🤝', label:'大軍のふりをして降伏勧告', stat:'ninbo', genre:'ninbo', style:'trick', fit:2,
          ok:'太鼓を打ち鳴らし数千の軍勢を演出！ 敵が震え上がって降伏だーっ！' },
        { icon:'⚔️', label:'篝火（かがりび）を目印に突撃', stat:'buyu', genre:'buyu', style:'risky', fit:1,
          ok:'火を頼りに斬り込んだ！ 霧の中の混戦を制したのは武勇だ！' },
      ] },
  ];

  /* ===== §2.7 勢力図（信長シナリオ・支配国の変遷） =====
     own: その年以降は織田領（青）。ally: 同盟＝徳川（緑）。c/r: 地図グリッド位置（西=左） */
  const MAP = {
    provinces: [
      { n:'越前', c:3, r:1, own:1573 },
      { n:'信濃', c:5, r:1, own:1582 },
      { n:'京',   c:2, r:2, own:1568 },
      { n:'近江', c:3, r:2, own:1573 },
      { n:'美濃', c:4, r:2, own:1567 },
      { n:'甲斐', c:6, r:2, own:1582 },
      { n:'摂津', c:1, r:3, own:1580 },
      { n:'伊勢', c:3, r:3, own:1569 },
      { n:'尾張', c:4, r:3, own:1551 },
      { n:'三河', c:5, r:3, ally:1562 },
      { n:'駿河', c:6, r:3, own:1582 },
    ],
    battleLoc: { 1556:'尾張', 1560:'尾張', 1567:'美濃', 1570:'近江', 1575:'三河', 1582:'京' },
  };

  /* ===== §2.8 スキル（スキルPで習得・その育成1周の間だけ有効） ===== */
  const SKILLS = [
    { id:'manabi', icon:'📖', name:'学びの極意',   cost:20, desc:'鍛錬の成長量が1割増える' },
    { id:'zeni',   icon:'🌾', name:'銭の才',       cost:20, desc:'視察・小競り合いで得る石高が5割増える' },
    { id:'joubu',  icon:'🩹', name:'丈夫な体',     cost:25, desc:'鍛錬の大失敗でケガをしにくくなる（半分の確率で耐える）' },
    { id:'kokozo', icon:'⚡', name:'ここぞの度胸', cost:30, desc:'合戦の「しくじり」を1回だけ「不発」に踏みとどまる（1周に1回）' },
  ];

  /* ===== §3 年表イベント =====
     type: story（読み物）/ choice（選択肢）/ battle（合戦）/ final（本能寺）
     effects: {buyu,chiryaku,seiji,ninbo,stamina,mood,koku} 省略可 */
  const TIMELINE = [
    { year:1551, type:'story', title:'家督相続 — うつけと呼ばれた男', art:'🏯👺', artImg:'assets/ev_katoku.jpg',
      text:'父・織田信秀が亡くなり、あなた（織田信長・18歳）が家督を継いだ。だが葬儀で位牌に抹香を投げつけたあなたを、家臣たちは「尾張の大うつけ（大ばか者）」と呼ぶ。\n\n戦国時代——実力さえあれば、身分が下の者でも上の者に取って代われる「下剋上」の世。ここから、天下統一への32年が始まる。',
      effects:{ mood:1 } },

    { year:1553, type:'choice', title:'聖徳寺の会見 — まむしの道三', art:'🐍🍵', artImg:'assets/ev_dosan.jpg',
      text:'妻・帰蝶の父であり「美濃のまむし」と恐れられる斎藤道三が、会見を求めてきた。道三はうつけと噂のあなたを値踏みするつもりだ。さて、どんな姿で行く？',
      choices:[
        { label:'正装で堂々と現れ、度肝を抜く', text:'いつものうつけ姿で道中を歩き、会見の場では一転、立派な正装で現れた。道三は「わしの息子たちは、いずれあのうつけの門前に馬をつなぐ（家来になる）だろう」とうなったという。', fx:{ ninbo:8, chiryaku:5, mood:1 } },
        { label:'いつものうつけ姿のまま行く', text:'あえて普段のままで行った。道三は眉をひそめたが、護衛の鉄砲隊の数を見て「ただのうつけではない」と見抜いた。新しい武器への嗅覚は伝わったようだ。', fx:{ buyu:5, chiryaku:5 } },
      ] },

    { year:1556, type:'battle', title:'稲生の戦い — 家中をまとめろ',
      terrain:{ icon:'🌾', label:'尾張・稲生の野原' }, bg:'assets/bg_inou.jpg',
      intro:'弟・信行（信勝）を担ぐ家臣団が反旗を翻した。相手は柴田勝家ら織田家の重臣たち。まずは身内との戦いに勝ち、尾張をまとめなければ天下どころではない。',
      enemyName:'弟・信行派の軍勢', enemyIcon:'🛡️', enemyImg:'assets/foe_nobuyuki.png', enemyPower:100,
      army:{ me:700, foe:1700 }, meUnit:'🛡️', foeUnit:'⚔️',
      open:[
        'さあ始まりました、家督を懸けた身内の決戦・稲生の戦い！',
        '織田信長軍はおよそ700！ 対する弟・信行方は約1700、数では倍以上の差だあーっ！',
      ],
      rounds:[
        { situ:'敵将・林通具（みちとも）の隊が先陣を切って突っ込んでくる！ 寡兵のこちらはどう受ける!?',
          opts:[
            { icon:'⚔️', label:'こちらから先に斬り込む', stat:'buyu', genre:'buyu', style:'risky', fit:2,
              ok:'先手必勝！ 信長隊の鋭い突撃が林隊のド真ん中を貫いたーっ！' },
            { icon:'🛡️', label:'陣を固めて受け止める', stat:'buyu', genre:'buyu', style:'safe', fit:1,
              ok:'がっちり受け止めた！ 数の不利を感じさせない堅い守りだ！' },
            { icon:'🤝', label:'敵中の旧知に文を放つ', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
              ok:'おおっと、敵の一角の動きが鈍いぞ！ あの文が効いているのか!?' },
          ] },
        { situ:'猛将・柴田勝家の本隊が来たーっ！ こちらの先陣がじりじり押し込まれていく…！',
          opts:[
            { icon:'🧠', label:'柴田隊の側面へ回り込む', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
              ok:'横っ腹に食らいついた！ さしもの「かかれ柴田」も足が止まる！' },
            { icon:'⚔️', label:'真っ向から槍を合わせる', stat:'buyu', genre:'buyu', style:'risky', fit:1,
              ok:'力と力の真っ向勝負！ 押して押して押しまくるーっ！' },
            { icon:'🏛️', label:'銭をばらまき動揺を誘う', stat:'seiji', genre:'seiji', style:'trick', fit:0,
              ok:'戦の最中に銭は届かないか…！ だが敵は少し困惑している！' },
          ] },
        { situ:'敵がひるんだ、ここが勝負どころだ！ 若き信長、どう出る!?',
          opts:[
            { icon:'⚔️', label:'自ら大音声を上げて突撃', stat:'buyu', genre:'buyu', style:'risky', fit:2, hist:true,
              ok:'「うつけの大音声」一喝ッ！！ 敵兵が凍りつき、そこから総崩れが始まったーっ！' },
            { icon:'🌫️', label:'伏せておいた兵で挟み撃ち', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
              ok:'挟み撃ちが決まった！ 敵は前と後ろの敵に大混乱だ！' },
            { icon:'🤝', label:'「降れば許す」と呼びかける', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
              ok:'投降する兵が出始めた！ 戦わずして敵を崩していく！' },
          ] },
      ],
      winText:'勝利！ 反乱は鎮圧された。母の取りなしで弟を許し、柴田勝家はこの戦いを境にあなたの忠実な家臣となった。尾張統一へ大きく前進。',
      loseText:'【敗北】家中の反乱を抑えきれなかった……。「尾張のうつけ」の夢は、ここで潰えた。\n\n（育成終了。序盤から武勇や知略をしっかり鍛えて、もう一度挑もう！）',
      winFx:{ koku:80, buyu:5 } },

    { year:1560, type:'battle', title:'桶狭間の戦い — 運命の十倍の敵',
      terrain:{ icon:'🌧️', label:'桶狭間 — 豪雨の窪地' }, bg:'assets/bg_okehazama.jpg',
      intro:'駿河の大大名・今川義元が、約2万5千の大軍で尾張に攻め込んできた。こちらはわずか数千。家臣は籠城を勧めるが、あなたは「敦盛」を舞い、夜明けに出陣を決意する。狙うは、桶狭間で休む義元の本陣ただ一点——。',
      enemyName:'今川義元の大軍', enemyIcon:'👑', enemyImg:'assets/foe_yoshimoto.png', enemyPower:240,
      army:{ me:3000, foe:25000 }, meUnit:'🛡️', foeUnit:'🗡️',
      open:[
        'さあ大一番！ 駿河の太守・今川義元、2万5千の大軍で尾張へ侵攻ーっ！',
        '対する織田軍はわずか3千！ 大人と子供…いや、象とアリの戦いだあーっ！',
      ],
      rounds:[
        { situ:'丸根砦・鷲津砦、陥落の急報！ 家臣たちは「清洲に籠城を」と叫ぶが——若殿の決断は!?',
          opts:[
            { icon:'⚔️', label:'出陣！ 前線の中島砦へ進む', stat:'buyu', genre:'buyu', style:'risky', fit:2,
              ok:'まさかの出撃だあーっ！ 死中に活を求める若き信長、敦盛を舞って馬に飛び乗った！' },
            { icon:'🛡️', label:'清洲城に籠もって守る', stat:'seiji', genre:'seiji', style:'safe', fit:0,
              ok:'手堅い…手堅いが！ 2万5千を相手に籠城はジリ貧の道だぞ…！' },
            { icon:'🤝', label:'降伏すると見せかけ油断させる', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
              ok:'偽りの使者で時間を稼ぐ！ 義元が油断すれば、そこに勝機が生まれる…！' },
          ] },
        { situ:'空が真っ黒に…来た、豪雨だあーっ！ 視界はゼロ、敵もこちらも見えない！',
          opts:[
            { icon:'🌫️', label:'雨にまぎれて義元本陣の近くへ', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
              ok:'豪雨をカーテンにして接近！ 今川の物見は何も見えていないッ！' },
            { icon:'💥', label:'鉄砲を撃ちかけて威嚇する', stat:'seiji', genre:'seiji', style:'risky', fit:0,
              ok:'むむっ、火縄が湿って火がつかない！ この大雨では鉄砲は使えないかーっ！' },
            { icon:'⚔️', label:'目の前の敵部隊に斬りかかる', stat:'buyu', genre:'buyu', style:'safe', fit:1,
              ok:'小競り合いで一勝！ だが本命は別にいるぞ…兵を消耗するな！' },
          ] },
        { situ:'物見の急報ーっ！ 「義元本陣、桶狭間山にて休息中！ 酒宴を開いている模様！」',
          opts:[
            { icon:'🌫️', label:'全軍、義元本陣へ奇襲！', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:2, hist:true,
              ok:'歴史が動いたあーっ！！ 雨上がりの一瞬、織田軍3千が義元本陣へ突入だーっ！' },
            { icon:'⚔️', label:'正面の敵を蹴散らして進む', stat:'buyu', genre:'buyu', style:'risky', fit:1,
              ok:'力ずくで道を開く！ だが本陣に着く前に敵が集まってくるぞ、急げーっ！' },
            { icon:'🤝', label:'偽の降伏で本陣に近づく', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
              ok:'敵が受け入れた…！ 懐に入ってからが本当の勝負だ！' },
          ] },
      ],
      winText:'豪雨に紛れた奇襲が成功！ 今川義元を討ち取った！ この「桶狭間の戦い」で、無名だった織田信長の名は一気に全国へ轟いた。',
      loseText:'【敗北】奇襲は読まれていた。今川の大軍の前に織田軍は壊滅……。\n\n（育成終了。格上との決戦だ。それまでに体力を整え、軍配＝クイズを確実に当てられる力をつけよう！）',
      winFx:{ koku:150, buyu:8, ninbo:5 } },

    { year:1562, type:'story', title:'清洲同盟 — 生涯の盟友', art:'🤝🦅', artImg:'assets/ev_kiyosu.jpg',
      text:'今川家から独立した三河の松平元康（のちの徳川家康）と、清洲城で同盟を結んだ。背後の心配がなくなり、美濃攻めに集中できる。\n\nこの同盟は本能寺の変まで約20年間守られ、戦国時代でもまれな「裏切られなかった同盟」として知られる。',
      effects:{ ninbo:5, koku:30 } },

    { year:1567, type:'battle', title:'稲葉山城の戦い — 天下布武',
      terrain:{ icon:'⛰️', label:'稲葉山 — 山上の堅城' }, bg:'assets/bg_inabayama.jpg',
      intro:'美濃の斎藤龍興（道三の孫）との長い戦いも大詰め。木下藤吉郎が敵の城下に一夜で砦を築いた（墨俣一夜城の伝説）。決戦のときだ。',
      enemyName:'斎藤龍興の美濃勢', enemyIcon:'🐍', enemyImg:'assets/foe_tatsuoki.png', enemyPower:280,
      army:{ me:10000, foe:7000 }, meUnit:'🛡️', foeUnit:'🏹',
      open:[
        '美濃攻め、ついに最終局面！ 舞台は天下の堅城・稲葉山城だあーっ！',
        '攻める織田軍1万、籠もる斎藤勢7千！ だが山城の守りは数字以上だぞ…！',
      ],
      rounds:[
        { situ:'切り立った山の上の城だ…！ 力攻めをすれば損害は計り知れない。どう攻める!?',
          opts:[
            { icon:'🏛️', label:'墨俣に砦を築き補給路を断つ', stat:'seiji', genre:'seiji', style:'safe', fit:2,
              ok:'藤吉郎の一夜城だあーっ！ 敵の喉元に楔（くさび）を打ち込んだ！' },
            { icon:'⚔️', label:'かまわず正面から力攻め', stat:'buyu', genre:'buyu', style:'risky', fit:0,
              ok:'登る登る！ …だが頭上から石と矢の雨だ！ 損害覚悟の力押しになっているぞ！' },
            { icon:'🧠', label:'間道を探して搦め手から', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
              ok:'裏の細道を発見！ 少数精鋭なら忍び込めるかもしれない！' },
          ] },
        { situ:'「美濃三人衆が斎藤に愛想を尽かしている」…そんな噂が陣中に届いた！',
          opts:[
            { icon:'🤝', label:'三人衆へ調略の文を送る', stat:'ninbo', genre:'ninbo', style:'safe', fit:2, hist:true,
              ok:'美濃三人衆、寝返ったああーっ！！ 城内は今ごろ上を下への大騒ぎだ！' },
            { icon:'⚔️', label:'噂は捨て置き攻め続ける', stat:'buyu', genre:'buyu', style:'risky', fit:1,
              ok:'攻め手は緩めない！ この圧力も立派な交渉材料だ！' },
            { icon:'🏛️', label:'商人から城内の内情を買う', stat:'seiji', genre:'seiji', style:'trick', fit:1,
              ok:'「米びつの底が見えてきた」との情報！ 城内の士気は下がる一方だ！' },
          ] },
        { situ:'城内の動揺は頂点に達した！ さあ、総仕上げのときだーっ！',
          opts:[
            { icon:'⚔️', label:'全軍一斉に総攻撃', stat:'buyu', genre:'buyu', style:'safe', fit:2,
              ok:'怒涛の総攻撃ーっ！ 動揺した城兵に、もう支える力は残っていない！' },
            { icon:'🧠', label:'夜陰に乗じ天守へ斬り込む', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:1,
              ok:'夜襲が刺さった！ 闇の中、城内は同士討ち寸前の大混乱だ！' },
            { icon:'🤝', label:'「城兵の命は取らぬ」と勧告', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
              ok:'白旗が上がり始めた！ 血を流さずに城が落ちていく…！' },
          ] },
      ],
      winText:'稲葉山城を攻め落とした！ 城を「岐阜」と改名し、「天下布武」（武力で天下を統一する）の印を使い始める。あなたの目は、もう京の都を見ている。',
      loseText:'【敗北】美濃の堅城はあまりに固かった……。天下布武の夢、ここまで。\n\n（育成終了。鍛錬の積み重ねが軍の強さになる。次はもっと育ててから挑もう！）',
      winFx:{ koku:150, chiryaku:5, seiji:5 } },

    { year:1568, type:'choice', title:'上洛 — 将軍を奉じて京へ', art:'⛩️🏇', artImg:'assets/ev_joraku.jpg',
      text:'室町幕府13代将軍の弟・足利義昭が「兄の仇を討ち、自分を将軍にしてほしい」と頼ってきた。京に上る大義名分になるが……。',
      choices:[
        { label:'義昭を奉じて上洛する', text:'義昭を15代将軍に立て、堂々と京へ入った。「将軍を助ける織田」の名分はあなたの力を一気に高めた。ただし義昭はやがて、あなたの言いなりになるのを嫌がり始める……。', fx:{ seiji:8, koku:100, ninbo:3 } },
        { label:'美濃の足場固めを優先する', text:'上洛を1年遅らせ、領国を固めた。石高は増えたが、その間に他の大名が義昭を担ぐ動きを見せ、慌てて京へ向かうことになった。', fx:{ seiji:5, koku:60, mood:-1 } },
      ] },

    { year:1570, type:'battle', title:'姉川の戦い — 裏切りの代償',
      terrain:{ icon:'🏞️', label:'姉川 — 浅瀬の河原' }, bg:'assets/bg_anegawa.jpg',
      intro:'妹・お市の方を嫁がせた浅井長政が、よりによって朝倉攻めの最中に裏切った！ 挟み撃ちの危機を辛くも脱出（金ヶ崎の退き口）。徳川家康と共に、姉川で浅井・朝倉連合軍と決着をつける。',
      enemyName:'浅井・朝倉連合軍', enemyIcon:'💔', enemyImg:'assets/foe_nagamasa.png', enemyPower:360,
      army:{ me:28000, foe:18000 }, meUnit:'🛡️', foeUnit:'🗡️',
      open:[
        '裏切りの清算、姉川の戦い！ 織田・徳川連合2万8千、対する浅井・朝倉連合1万8千！',
        '浅瀬を挟んでにらみ合う両軍…先に動くのはどっちだあーっ！？',
      ],
      rounds:[
        { situ:'川を挟んで対峙中！ 先に渡れば足場は悪いが、機先は制せる…どうする!?',
          opts:[
            { icon:'🛡️', label:'敵の渡河を待って叩く', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
              ok:'読みが当たった！ 渡河中の敵を半包囲、川面は大混乱だあーっ！' },
            { icon:'⚔️', label:'こちらから一気に渡河攻撃', stat:'buyu', genre:'buyu', style:'risky', fit:1,
              ok:'水しぶきを上げて突撃ーっ！ 勢いで敵の出鼻をくじいた！' },
            { icon:'🏛️', label:'徳川勢と攻め口をすり合わせる', stat:'seiji', genre:'seiji', style:'trick', fit:1,
              ok:'連携の段取りが整った！ 同盟軍の動きが見違えるようだ！' },
          ] },
        { situ:'浅井勢、決死の猛攻ーっ！ 13段構えの陣が11段まで破られた！ 本陣が危ないぞ！',
          opts:[
            { icon:'⚔️', label:'旗本を投入して支える', stat:'buyu', genre:'buyu', style:'safe', fit:2,
              ok:'本陣の精鋭が踏みとどまったあーっ！ ここが我慢のしどころだ！' },
            { icon:'🌫️', label:'一旦引いて陣形を立て直す', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
              ok:'下がりながら陣を組み直す！ 慌てない、慌てない…！' },
            { icon:'🤝', label:'長政に「降れば妹は返す」と叫ぶ', stat:'ninbo', genre:'ninbo', style:'risky', fit:0,
              ok:'長政の表情が揺れた…が、浅井の兵は止まらない！ 戦場は情に訴えるには熱すぎる！' },
          ] },
        { situ:'徳川勢が朝倉勢を押し返したーっ！ 見ろ、浅井勢の横腹がガラ空きだ！',
          opts:[
            { icon:'⚔️', label:'浅井勢の側面へ総攻撃！', stat:'buyu', genre:'buyu', style:'safe', fit:2, hist:true,
              ok:'横殴りの一撃が決まったあーっ！ 浅井の陣形が音を立てて崩れていく！' },
            { icon:'💥', label:'鉄砲隊で追い撃ちをかける', stat:'seiji', genre:'seiji', style:'safe', fit:1,
              ok:'轟音が川原に響く！ 崩れかけた敵に容赦ない追い打ちだ！' },
            { icon:'🧠', label:'退路の橋を先回りして断つ', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:1,
              ok:'退き口を塞いだ！ 敵は袋のネズミ…だが窮鼠（きゅうそ）も噛むぞ、油断するな！' },
          ] },
      ],
      winText:'徳川軍の奮戦もあり勝利！ 浅井・朝倉に大打撃を与えた。だが包囲網はまだ続く。武田・本願寺・将軍義昭……敵は四方にいる。',
      loseText:'【敗北】裏切りの代償はあまりに大きく、姉川で織田軍は崩れ去った……。\n\n（育成終了。軍学帳でまちがえた問題を復習して、リベンジだ！）',
      winFx:{ koku:120, buyu:5 } },

    { year:1571, type:'choice', title:'比叡山焼き討ち — 鬼か、王か', art:'🔥⛰️', artImg:'assets/ev_hieizan.jpg',
      text:'比叡山延暦寺は浅井・朝倉をかくまい、仏の権威を盾に織田軍に立ちはだかる。家臣の中にも「寺を攻めるなど罰当たり」とためらう声があるが……。',
      choices:[
        { label:'容赦なく焼き討ちする（史実）', text:'全山を焼き払った。「仏敵」と恐れられ人望は下がったが、「織田に逆らえば寺社も容赦しない」という意思は天下に轟き、宗教勢力の武装に大きな楔を打ち込んだ。', fx:{ buyu:8, chiryaku:5, ninbo:-8, koku:50 } },
        { label:'包囲して兵糧攻めにする（IF）', text:'時間はかかったが、戦わずして延暦寺を降伏させた。「うつけ、存外慈悲深し」と民の評判は上々。ただし浅井・朝倉に立て直しの時間を与えてしまった。', fx:{ ninbo:8, seiji:5, koku:-20 } },
      ] },

    { year:1573, type:'story', title:'室町幕府、滅ぶ', art:'🏯💨', artImg:'assets/ev_muromachi.jpg',
      text:'ついに将軍・足利義昭を京から追放した。1338年の足利尊氏から約240年続いた室町幕府は、ここに滅亡。\n\n同じ年、浅井長政・朝倉義景も滅ぼした。お市の方と三人の娘（茶々・初・江）は保護した。この三姉妹がのちに歴史を大きく動かすことになる。',
      effects:{ seiji:8, koku:100 } },

    { year:1575, type:'battle', title:'長篠の戦い — 鉄砲三千挺',
      terrain:{ icon:'🛡️', label:'設楽原 — 馬防柵の平野' }, bg:'assets/bg_nagashino.jpg',
      intro:'「戦国最強」と謳われた武田の騎馬軍団が、後継者・武田勝頼に率いられ長篠城に迫る。あなたの答えは——大量の鉄砲と馬防柵。戦の常識を変えるときだ。',
      enemyName:'武田勝頼の騎馬軍団', enemyIcon:'🐴', enemyImg:'assets/foe_katsuyori.png', enemyPower:470,
      army:{ me:38000, foe:15000 }, meUnit:'🛡️', foeUnit:'🐴',
      open:[
        '決戦・長篠！ 織田・徳川連合3万8千、対する武田勝頼1万5千！',
        'だが油断するなーっ、武田の騎馬軍団は「戦国最強」！ 数字だけでは測れないぞ！',
      ],
      rounds:[
        { situ:'武田騎馬軍団の襲来は時間の問題！ 決戦の前に、どう備える!?',
          opts:[
            { icon:'🏛️', label:'馬防柵を築き鉄砲3千を集める', stat:'seiji', genre:'seiji', style:'safe', fit:2, hist:true,
              ok:'銭の力ここにありーっ！ 柵と鉄砲3千挺、戦の常識を変える布陣が完成だ！' },
            { icon:'⚔️', label:'柵などいらん、野戦で迎え撃つ', stat:'buyu', genre:'buyu', style:'risky', fit:0,
              ok:'漢気あふれる選択！ …だが最強騎馬軍団と真っ向勝負は、さすがに分が悪いぞ！' },
            { icon:'🧠', label:'鳶ヶ巣山の敵砦へ別働隊', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
              ok:'背後を突く別働隊が出発！ 敵の退路と補給に圧力をかける！' },
          ] },
        { situ:'敵は柵を警戒して動かない…にらみ合いが続く！ どう誘い出す!?',
          opts:[
            { icon:'🌫️', label:'背後の鳶ヶ巣山砦を奇襲', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
              ok:'鳶ヶ巣山、陥落の報ーっ！ 武田勢に「後ろを取られた」と動揺が走る！' },
            { icon:'⚔️', label:'少数で柵から出て挑発', stat:'buyu', genre:'buyu', style:'risky', fit:1,
              ok:'挑発に乗った！ 敵の先鋒が柵に向かって動き出したぞーっ！' },
            { icon:'🤝', label:'武田の重臣に偽の密書', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
              ok:'疑心暗鬼の種をまいた！ 敵の軍議が荒れている模様だ！' },
          ] },
        { situ:'来たああーっ！ 武田騎馬隊の総突撃！ 地響きがこちらまで届くぞ！',
          opts:[
            { icon:'💥', label:'三段撃ちで迎え撃て！', stat:'seiji', genre:'seiji', style:'safe', fit:2,
              ok:'轟音三連ッ！ 途切れない銃声が騎馬の波を打ち砕くーっ！ これが新時代の戦だ！' },
            { icon:'⚔️', label:'柵際で槍衾（やりぶすま）を組む', stat:'buyu', genre:'buyu', style:'safe', fit:1,
              ok:'槍の壁が騎馬を受け止めた！ 柵と槍の二段構えだ！' },
            { icon:'🧠', label:'柵を開けて誘い込み袋叩き', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:1,
              ok:'わざと開けた口に敵が飛び込んだ！ 三方から袋叩きだあーっ！' },
          ] },
      ],
      winText:'鉄砲隊の一斉射撃が騎馬隊を打ち砕いた！ 「長篠の戦い」は、鉄砲が戦の主役になったことを天下に示した。武田家はこの敗北から立ち直れない。',
      loseText:'【敗北】雨に濡れた鉄砲は火を噴かず、戦国最強の騎馬隊が柵を破った……。\n\n（育成終了。ここまで来たきみなら、次はきっと勝てる！）',
      winFx:{ koku:180, buyu:8, chiryaku:5 } },

    { year:1576, type:'story', title:'安土城 — 天下統一の本拠地', art:'🏯✨', artImg:'assets/ev_azuchi.jpg',
      text:'琵琶湖のほとりに、五層七階・金箔瓦の壮大な安土城を築き始めた。山頂にそびえる豪華な天主（天守）は、城が「戦いの砦」から「権力を見せつける宮殿」へ変わったことを象徴している。\n\nこの時代の豪華で力強い文化を、安土城と桃山（伏見城）の名から「桃山文化」と呼ぶ。',
      effects:{ seiji:5, ninbo:5, koku:80 } },

    { year:1577, type:'choice', title:'楽市・楽座 — 銭が天下を回す', art:'💰🏪', artImg:'assets/ev_rakuichi.jpg',
      text:'安土の城下町をどう栄えさせるか。これまでの町では「座」（商工業者の組合）が営業を独占し、市場には税がかかっていた。あなたの方針は？',
      choices:[
        { label:'楽市・楽座！ 税を免除し座を廃止（史実）', text:'「誰でも自由に商売してよし、市の税は取らぬ」——楽市令を出した。関所も廃止して人と物の流れを促すと、安土は爆発的に栄え、莫大な銭が織田家に流れ込むようになった。', fx:{ seiji:10, koku:150 } },
        { label:'座を保護して確実に税を取る', text:'手堅く税収を確保した。だが商人たちは自由な堺や他の町へ流れ、安土の市はいまひとつ栄えない。「銭は囲うより回せ、だったか……」', fx:{ seiji:3, koku:50, mood:-1 } },
      ] },

    { year:1580, type:'story', title:'石山本願寺との和睦', art:'🕊️🏯', artImg:'assets/ev_honganji.jpg',
      text:'10年にわたり戦い続けた石山本願寺（大阪）と、ついに和睦。各地の一向一揆に苦しめられた長い戦いだった。\n\n跡地にはのちに豊臣秀吉が大坂城を築く。残る大敵は中国地方の毛利、関東の北条、そして……。',
      effects:{ ninbo:5, koku:100 } },

    { year:1582, type:'final', title:'本能寺の変 — 敵は本能寺にあり', art:'🔥🏯', artImg:'assets/ev_honnoji.jpg',
      text:'天下統一は目前。中国地方で毛利と戦う羽柴（木下）秀吉を助けるため、あなたはわずかな供回りと京の本能寺に泊まった。\n\nその夜——明智光秀の軍勢1万3千が、本能寺を包囲する。',
      // 判定はエンジン側: 知略・人望が閾値以上なら変を察知するIFルート
      survive:{
        title:'【IF】夜明け前の脱出',
        text:'「……妙だ。森の鳥が一斉に飛び立った」\n長年の学びで磨いた知略が、空気の変化を察知した。そして日頃の人望が生んだ密告——「明智様の軍勢が、京へ向かっております！」\n\nあなたは囲みが完成する前に本能寺を脱出。堺から船で岐阜へ戻り、態勢を立て直して光秀を討った。\n\n数年後——毛利・北条・島津を従え、あなたは史実より早く天下統一を成し遂げた。これは、あなたが育てた「もう一つの歴史」である。' },
        fall:{
        title:'本能寺、炎上',
        text:'「是非に及ばず（あれこれ言ってもしかたない）」\nあなたは弓を取り、槍を取り、最後まで戦って炎の中に消えた。享年49。\n\nだが、あなたが進めた天下統一・楽市楽座・鉄砲の活用は、豊臣秀吉、そして徳川家康へと受け継がれ、260年続く泰平の世の礎となった。\n\nその名は歴史に永遠に刻まれている。' },
      },
  ];

  /* ===== §4 クイズDB（シード20問） =====
     Codex生成分は index.html 読み込み後に QUESTIONS へ結合される */
  const QUESTIONS = [
    // --- buyu 武勇（合戦・戦乱） ---
    { genre:'buyu', diff:1, q:'1560年、織田信長が桶狭間の戦いで破った駿河の大名は誰？',
      c:['今川義元','武田信玄','上杉謙信','北条氏康'], a:0,
      desc:'今川義元は約2万5千の大軍で尾張に侵攻したが、信長の奇襲により桶狭間で討ち取られた。信長の名を全国に知らしめた戦い。' },
    { genre:'buyu', diff:1, q:'1575年の長篠の戦いで、織田・徳川連合軍が鉄砲を大量に使って破った相手は？',
      c:['武田勝頼','今川氏真','毛利輝元','上杉景勝'], a:0,
      desc:'武田信玄の子・勝頼の騎馬隊を、馬防柵と大量の鉄砲で打ち破った。鉄砲が戦いの主役になったことを示す戦い。' },
    { genre:'buyu', diff:2, q:'1467年に京都で始まり、約11年続いて戦国時代のきっかけとなった戦乱は？',
      c:['応仁の乱','保元の乱','壬申の乱','島原・天草一揆'], a:0,
      desc:'室町幕府8代将軍・足利義政のあとつぎ争いに守護大名の対立がからんで起きたのが応仁の乱。京都は焼け野原になり、幕府の力は衰えて戦国時代へ。' },
    { genre:'buyu', diff:1, q:'1600年、「天下分け目」と呼ばれた関ヶ原の戦いで、徳川家康率いる東軍と戦った西軍の中心人物は？',
      c:['石田三成','真田幸村','伊達政宗','前田利家'], a:0,
      desc:'豊臣秀吉の死後、家臣だった石田三成が西軍を集めて家康と戦ったが、半日で東軍が勝利。家康は1603年に征夷大将軍となり江戸幕府を開く。' },
    { genre:'buyu', diff:3, q:'次の資料文が説明する戦いはどれ？\n「この戦いで勝った側は、足軽の鉄砲隊を有効に使い、当時最強といわれた騎馬隊を破った。これ以降、戦い方や城のつくりが大きく変化した。」',
      c:['長篠の戦い','桶狭間の戦い','川中島の戦い','関ヶ原の戦い'], a:0,
      desc:'「鉄砲隊」対「騎馬隊」がキーワードなら長篠の戦い(1575)。資料問題では武器・戦法の変化に注目しよう。' },

    // --- chiryaku 知略（流れ・因果・年代順） ---
    { genre:'chiryaku', diff:2, q:'次の出来事を古い順に並べたとき、2番目に来るのはどれ？\n【桶狭間の戦い／室町幕府の滅亡／長篠の戦い／本能寺の変】',
      c:['室町幕府の滅亡','桶狭間の戦い','長篠の戦い','本能寺の変'], a:0,
      desc:'桶狭間(1560)→室町幕府滅亡(1573)→長篠(1575)→本能寺(1582)。信長の人生の流れで覚えると年代並べ替えに強くなる。' },
    { genre:'chiryaku', diff:2, q:'織田信長が15代将軍・足利義昭を京都から追放し、室町幕府が滅亡した年は？',
      c:['1573年','1560年','1582年','1543年'], a:0,
      desc:'信長は1568年に義昭を立てて上洛したが、対立して1573年に追放。約240年続いた室町幕府はここで滅んだ。' },
    { genre:'chiryaku', diff:1, q:'本能寺の変の後、「中国大返し」で素早く引き返し、山崎の戦いで明智光秀を破った武将は？',
      c:['豊臣（羽柴）秀吉','徳川家康','柴田勝家','前田利家'], a:0,
      desc:'毛利と戦っていた秀吉は、信長の死を知ると驚異的な速さで引き返して光秀を討ち、信長の後継者の地位を固めた。' },
    { genre:'chiryaku', diff:1, q:'戦国時代に見られた、身分が下の者が実力で上の者を倒して成り上がる風潮を何という？',
      c:['下剋上','尊王攘夷','大政奉還','王政復古'], a:0,
      desc:'「下が上に剋（か）つ」で下剋上。守護大名の家臣や地方の武士が実力で戦国大名にのし上がった。' },
    { genre:'chiryaku', diff:3, q:'1543年に種子島に鉄砲が伝わったことは、戦国時代にどんな変化をもたらした？最も適切なものを選べ。',
      c:['足軽鉄砲隊が活躍し、戦いが集団戦になり、天下統一の動きが早まった','騎馬隊が中心となり、戦いが長期化した','刀が不要になり、武士の身分がなくなった','海外との貿易が禁止された'], a:0,
      desc:'鉄砲は堺や国友で大量生産され、戦いは騎馬中心から足軽の集団戦へ。城も鉄砲に備えた造りに変わり、統一への動きが加速した。' },

    // --- seiji 政治（政策・制度） ---
    { genre:'seiji', diff:1, q:'織田信長が安土城下で行った、市場の税を免除し、座（商工業者の組合）の特権を廃止した政策は？',
      c:['楽市・楽座','太閤検地','刀狩','参勤交代'], a:0,
      desc:'楽市・楽座で誰でも自由に商売できるようにし、関所も廃止。商業をさかんにして経済力で天下を取る信長の代表政策。' },
    { genre:'seiji', diff:2, q:'豊臣秀吉が行った太閤検地の説明として正しいものは？',
      c:['田畑の面積や収穫量を調べ、耕作者に年貢を納めさせた','百姓から刀や鉄砲を取り上げた','大名を1年おきに江戸へ住まわせた','キリスト教の宣教師を国外追放した'], a:0,
      desc:'ものさしやますを統一して全国の田畑を測量し、収穫量を石高で表した。年貢を確実に取る仕組みで、武士と百姓の身分が分かれていく。' },
    { genre:'seiji', diff:2, q:'豊臣秀吉が刀狩を行った最大の目的は？',
      c:['百姓の一揆を防ぎ、武士と百姓の身分をはっきり分けるため','鉄砲の生産を増やすため','大仏を作る鉄を集めるため（本当の狙い）','戦のない平和な世を作ると宣言するため'], a:0,
      desc:'表向きは「大仏のくぎにする」だったが、本当の狙いは一揆防止と兵農分離。太閤検地とセットで身分制社会の土台を作った。' },
    { genre:'seiji', diff:2, q:'「石高（こくだか）」とは何を表すもの？',
      c:['土地の生産力を米の量（石）で表したもの','武士の位の高さ','城の大きさ','家臣の人数'], a:0,
      desc:'1石は大人が1年に食べる米の量とほぼ同じ。大名の力は「加賀百万石」のように石高で表され、軍役（出す兵の数）も石高で決まった。' },
    { genre:'seiji', diff:3, q:'16世紀後半の南蛮貿易について、日本の主な輸入品と輸出品の組み合わせとして正しいものは？',
      c:['輸入: 鉄砲・火薬・中国産の生糸 ／ 輸出: 銀','輸入: 米・木材 ／ 輸出: 鉄砲','輸入: 銀・銅 ／ 輸出: 生糸','輸入: 毛織物・時計 ／ 輸出: 茶'], a:0,
      desc:'ポルトガル・スペインとの南蛮貿易では、鉄砲・火薬・中国の生糸を輸入し、石見銀山などの銀を輸出した。当時の日本は世界有数の銀産出国。' },

    // --- ninbo 人望（文化・宗教・人物） ---
    { genre:'ninbo', diff:1, q:'1549年、鹿児島に上陸して日本に初めてキリスト教を伝えた宣教師は？',
      c:['フランシスコ・ザビエル','ウィリアム・アダムズ','ルイス・フロイス','ペリー'], a:0,
      desc:'イエズス会のザビエルが伝えたキリスト教は西日本を中心に広まり、信仰する大名（キリシタン大名）も現れた。' },
    { genre:'ninbo', diff:1, q:'質素な茶室で心を通わせる「わび茶」を大成させた、堺の商人出身の人物は？',
      c:['千利休','狩野永徳','出雲の阿国','雪舟'], a:0,
      desc:'千利休は信長・秀吉に仕えて茶の湯を大成した。豪華さを誇る桃山文化の中で、あえて質素・静かさに美を見いだしたのが特徴。' },
    { genre:'ninbo', diff:2, q:'安土桃山時代に栄えた「桃山文化」の特徴として最も適切なものは？',
      c:['新しく力をつけた大名や大商人の気風を反映した、豪華で壮大な文化','貴族中心の、日本の風土に合ったやさしい文化','武士と禅宗の影響を受けた、簡素で深みのある文化','庶民が担い手の、こっけいで皮肉のきいた文化'], a:0,
      desc:'天守を持つ壮大な城、金箔のふすま絵（障壁画）など、豪華・雄大が桃山文化のキーワード。担い手が大名と大商人である点も重要。' },
    { genre:'ninbo', diff:2, q:'「唐獅子図屏風」など、城のふすまや屏風に豪華な絵を描いた桃山文化の画家は？',
      c:['狩野永徳','葛飾北斎','歌川広重','菱川師宣'], a:0,
      desc:'狩野永徳は信長・秀吉に仕え、金地に力強い障壁画を描いた。北斎・広重は江戸時代後期の浮世絵師なので時代が違う。' },
    { genre:'ninbo', diff:2, q:'17世紀の初めごろ、出雲の阿国（いずものおくに）が京都で始めて人気を集めた芸能は？',
      c:['かぶき踊り','能','狂言','人形浄瑠璃'], a:0,
      desc:'阿国のかぶき踊りはのちの歌舞伎のもとになった。能・狂言は室町時代に観阿弥・世阿弥らが大成したもので、時代の区別がよく問われる。' },
  ];

  /* ===== §2.85 追憶の章（全偉人共通のクリア後ボーナスゾーン） =====
     ウマ娘のURAファイナルズ（全キャラ共通の最終章・勝つと全ステ+30〜40）に相当。
     完走者だけが入れる。この周の記憶（解いた問題・まちがい帳）から5問の回想クイズ →
     正解数（人生の輝き）で総括が変わり、ポジティブなほど全ステ大幅アップ → ランクに反映 */
  const EPILOGUE = {
    intro:{ title:'📜 追憶の章 — 人生をふり返る', art:'🕯️📜', artImg:'assets/bg_epilogue.jpg',
      text:'すべての戦いが終わった。\n\n静かな夜、あなたは歩んできた長い道のりを、ゆっくりとふり返る——あの戦。あの出会い。あの決断。\n\nこれより記憶を一つずつ確かめる（全5問）。鮮やかに思い出せるほど、人生の輝きが増していく。' },
    memories:{
      buyu:     { label:'⚔️ いくさ場の記憶', flavor:'土煙、馬のいななき、軍配の重み——あの戦場の朝がよみがえる。' },
      chiryaku: { label:'🧠 策をめぐらせた夜の記憶', flavor:'地図を広げ、敵の動きを読み続けた、眠れない夜々を思い出す。' },
      seiji:    { label:'🏛️ 国づくりの記憶', flavor:'検地の帳面、市場のにぎわい、銭の流れ——築き上げた仕組みを思い出す。' },
      ninbo:    { label:'🤝 人びとの記憶', flavor:'側近たちの顔、交わした言葉、結んだ縁——出会った人びとを思い出す。' },
    },
    okLines:[
      '✨ 記憶が鮮やかによみがえった！ 人生の輝きが増した！',
      '✨ あの日の決断は、まちがっていなかった。',
      '✨ 思い出が、誇りに変わっていく。',
    ],
    ngLines:[
      '…ほろ苦い記憶も、また人生だ。（解説を読んで確かめておこう）',
      '…思い出せないこともある。それもまた人生よ。',
    ],
    tiers:[
      { min:5, title:'🌟 大成功の人生！', boost:30, koku:100,
        text:'「——何ひとつ悔いはない。大成功の人生であった！」\n\nあなたは満ち足りた笑みを浮かべ、静かに目を閉じた。\n\nその生き様は伝説となり、子から孫へ、永遠に語り継がれていく。' },
      { min:4, title:'🎉 成功の人生', boost:20, koku:50,
        text:'「胸を張って言える。成功の人生だった」\n\n多くを成し、多くを学んだ。あなたは穏やかな顔で目を閉じ、物語は幕を下ろした。' },
      { min:2, title:'😊 良い人生', boost:12, koku:20,
        text:'「良い人生だった…心からそう思える」\n\n勝った日も負けた日も、すべてがあなたの宝物だ。物語は静かに幕を下ろした。' },
      { min:0, title:'🍵 まあまあの人生', boost:5, koku:0,
        text:'「まあまあの人生…いや、それで十分よ」\n\n思い出せない記憶もあった。だが、確かに駆け抜けた。物語は幕を下ろした——次は、もっと鮮やかに。' },
    ],
  };

  /* ===== §2.9 偉人パック =====
     エンジンはシナリオ固有データをすべて「偉人パック」経由で参照する（偉人トレーナー構想・PLAN §9）。
     偉人を追加するとき＝このパックを1つ書くだけ（年表・側近・勢力図・小競り合い・開始ステ・IF条件） */
  const HEROES = {
    nobunaga: {
      id:'nobunaga', name:'織田信長', armyIcon:'🔵', armyName:'織田軍',
      crest:'⚡', subtitle:'尾張のうつけ、天下布武へ',
      img:'assets/hero_nobunaga.png',
      faceImgs:{ up:'assets/hero_nobunaga_up.png', down:'assets/hero_nobunaga_down.png' },
      kamon:'assets/kamon_oda.png',
      uniqueSkill:{ id:'uq_tenkafubu', icon:'⚡', name:'天下布武', desc:'合戦で「博打」の采配が決まったとき、戦果がさらに増す（偉人固有）', fx:{ riskyBoost:1.15 } },
      castleImgs:['assets/castle_1.png','assets/castle_2.png','assets/castle_3.png','assets/castle_4.png','assets/castle_5.png'],
      // 全画面の城背景（第4便・縦長9:16）。石高tierで切替。立ち絵はこの手前に立つ（レイアウトB）
      sceneImgs:['assets/scene_n1.jpg','assets/scene_n2.jpg','assets/scene_n3.jpg','assets/scene_n4.jpg','assets/scene_n5.jpg'],
      // era出題バイアス（G2-②）: その偉人の生きた時代を優先。省略eraは'sengoku'扱い
      eraPref:{ sengoku:3, azuchi:2, edo:0.4 },
      startYear:1551, endYear:1582,
      start:{ buyu:20, chiryaku:24, seiji:14, ninbo:8, koku:100 },
      finalReq:{ chiryaku:115, ninbo:100 },  // 最終イベントのIF生存条件（本能寺を察知）
      legacyNames:{ buyu:'攻めてこそ道は開ける', chiryaku:'敵を知り己を知れば百戦危うからず',
        seiji:'銭は囲うより回せ', ninbo:'人は城、人は石垣' },
      endTexts:{
        survived:'🌟 <b>本能寺の変を生き延び、天下統一を成し遂げた！（IFルート達成）</b>',
        completed:'🏁 32年を完走！ 本能寺に散るも、その志は秀吉・家康に受け継がれた。' },
      castles:[ [0,'⛺','陣屋'], [250,'🏘️','館'], [500,'🏯','城'], [900,'🏯','大天守'], [1500,'🏯','黄金の天守'] ],
      seasons:['🌸','☀️','🍂','⛄'],
      retainers:RETAINERS, timeline:TIMELINE, map:MAP,
      skirmishFoes:SKIRMISH_FOES, skirmishSitus:SKIRMISH_SITUS,
    },

    /* ---- 偉人2人目: 豊臣秀吉（農民→天下人の成り上がり・2026-06-13） ---- */
    hideyoshi: {
      id:'hideyoshi', name:'豊臣秀吉', armyIcon:'🟡', armyName:'羽柴軍',
      crest:'🐒', subtitle:'草履取りから天下人へ・史上最大の成り上がり',
      img:'assets/hero_hideyoshi.png',
      faceImgs:{ up:'assets/hero_hideyoshi_up.png', down:'assets/hero_hideyoshi_down.png' },
      kamon:'assets/kamon_toyotomi.png',
      castleImgs:['assets/castle_h1.png','assets/castle_h2.png','assets/castle_h3.png','assets/castle_h4.png','assets/castle_h5.png'],
      sceneImgs:['assets/scene_h1.jpg','assets/scene_h2.jpg','assets/scene_h3.jpg','assets/scene_h4.jpg','assets/scene_h5.jpg'],
      uniqueSkill:{ id:'uq_hitotarashi', icon:'🐒', name:'人たらし', desc:'側近との絆がふつうより早く深まる（偉人固有）', fx:{ bondPlus:2 } },
      eraPref:{ sengoku:2, azuchi:3, edo:0.8 },
      startYear:1554, endYear:1590,
      start:{ buyu:8, chiryaku:20, seiji:16, ninbo:26, koku:5 },
      finalReq:{ seiji:155, ninbo:135 },  // IF: 唐入り（朝鮮出兵）を思いとどまる（37ターン分強気の閾値）
      halfReqScale:1.6, // 半年制のIF倍率（既定1.75。元の閾値が強気なぶん低め・simで校正 2026-06-14）
      legacyNames:{ buyu:'戦は数と速さよ', chiryaku:'敵の城は頭で落とせ',
        seiji:'検地と算盤が国を作る', ninbo:'人たらしこそ最強の武器' },
      endTexts:{
        survived:'🌟 <b>唐入りを思いとどまり、長く続く「豊臣の平和」を築いた！（IFルート達成）</b>',
        completed:'🏁 37年を完走！ 百姓の子から天下人へ——史上最大の成り上がりを成し遂げた！' },
      castles:[ [0,'🛖','百姓家'], [150,'🏠','足軽長屋'], [400,'🏯','長浜城'], [800,'🏯','大坂城'], [1500,'🏯','黄金の大坂城'] ],
      seasons:['🌸','☀️','🍂','⛄'],
      skirmishFoes:SKIRMISH_FOES, skirmishSitus:SKIRMISH_SITUS,
      retainers:[
        { id:'nene', name:'寧々（ねね）', icon:'🌸', fav:'ninbo', img:'assets/r_nene.png',
      perk:{ type:'mood', label:'同席時、やる気低下を半分防ぐ' },
      skill:{ id:'sk_okaka', icon:'🍙', name:'おかかの台所', desc:'すべての鍛錬の上昇が少し増える', fx:{ trainAll:1 } },
      midText:'「あなた様の夢は、わたくしの夢でもありますからね」（寧々の笑顔が、何よりの薬だ）',
          intro:'あなたの妻にして、家中の「母」。恋愛結婚はこの時代きわめて珍しい。',
          maxText:'「あなた様の人たらし、わたくしには通じませぬよ」（笑いながら、誰よりあなたを信じてくれている）',
          maxFx:{ ninbo:10, mood:2 } },
        { id:'hanbei', name:'竹中半兵衛', icon:'🎐', fav:'chiryaku', img:'assets/r_hanbei.png',
      perk:{ type:'gain', v:2, label:'同席した鍛錬の上昇+2' },
      skill:{ id:'sk_imakomei', icon:'🎐', name:'今孔明の策', desc:'合戦の知力の采配が強くなる', fx:{ battleStat:'chiryaku' } },
      midText:'「策とは、戦わずに勝つ道を探すことにございます」（病弱な軍師の言葉は静かで重い）',
          intro:'「今孔明」と呼ばれた天才軍師。病弱だが、その頭脳は無双。',
          maxText:'「殿の夢に、この命を使い切りましょう」（若き軍師は、あなたの中に天下を見ている）',
          maxFx:{ chiryaku:10, ninbo:5 } },
        { id:'kanbei', name:'黒田官兵衛', icon:'📿', fav:'chiryaku', img:'assets/r_kanbei.png',
      perk:{ type:'gain', v:2, label:'同席した鍛錬の上昇+2' },
      skill:{ id:'sk_ryobei', icon:'📿', name:'両兵衛の調略', desc:'合戦の人望の采配（調略）が強くなる', fx:{ battleStat:'ninbo' } },
      midText:'「城は石垣より、人の心から崩れまする」（官兵衛の人間観察は、敵も味方も丸裸にする）',
          intro:'半兵衛と並び称される軍師。「両兵衛」の片翼。',
          maxText:'「殿は人の心を攻める名人。それがしは城を攻めるだけにございます」（最強の参謀が隣にいる）',
          maxFx:{ chiryaku:8, seiji:5 } },
        { id:'mitsunari', name:'石田三成', icon:'📋', fav:'seiji', img:'assets/r_mitsunari.png',
      perk:{ type:'kokuSub', label:'同席した政務の石高2倍' },
      skill:{ id:'sk_soroban', icon:'🧮', name:'算盤奉行', desc:'視察で得る石高が4割増える', fx:{ tripKoku:1.4 } },
      midText:'「米一粒まで数えてこそ、二十万の兵が飢えませぬ」（三成の帳面は芸術品のように美しい）',
          intro:'算術と段取りの天才。「三杯の茶」の気配りであなたに見出された小姓。',
          maxText:'「殿下の天下を、それがしは算盤で支えまする」（生涯裏切らぬ忠臣の誓い）',
          maxFx:{ seiji:10, koku:30 } },
        { id:'hidenaga', name:'豊臣秀長', icon:'🤲', fav:'seiji', img:'assets/r_hidenaga.png',
      perk:{ type:'cost', v:5, label:'同席した鍛錬の体力-5' },
      skill:{ id:'sk_naijo', icon:'🤲', name:'内助の銘', desc:'休息の回復量が増える', fx:{ restPlus:12 } },
      midText:'「兄者は前だけ見ていればよい。後ろはわしが守る」（弟の言葉ほど心強いものはない）',
          intro:'あなたの弟。敵からも信頼される、天下一の補佐役。',
          maxText:'「兄者は表を、わしは内を」（この弟がいる限り、豊臣家は安泰だ）',
          maxFx:{ seiji:8, stamina:30 } },
        { id:'kiyomasa', name:'加藤清正', icon:'🗡️', fav:'buyu', img:'assets/r_kiyomasa.png',
      perk:{ type:'skillpt', v:1, label:'同席正解でスキルP+1' },
      skill:{ id:'sk_tora', icon:'🐯', name:'虎退治の槍', desc:'合戦の武力の采配が強くなる', fx:{ battleStat:'buyu' } },
      midText:'「殿下！ 今日も一番槍は俺がもらいます！」（清正の闘志は見ているだけで力が湧く）',
          intro:'寧々が育てた子飼いの猛将。のちの「賤ヶ岳の七本槍」。',
          maxText:'「殿下のためなら、虎とでも戦いまする！」（忠義の塊のような若武者だ）',
          maxFx:{ buyu:10, stamina:20 } },
      ],
      map:{
        provinces:[
          { n:'近江', c:4, r:1, own:1573 },
          { n:'北陸', c:5, r:1, own:1583 },
          { n:'関東', c:6, r:1, own:1590 },
          { n:'播磨', c:2, r:2, own:1580 },
          { n:'摂津', c:3, r:2, own:1583 },
          { n:'京',   c:4, r:2, own:1582 },
          { n:'美濃', c:5, r:2, own:1583 },
          { n:'尾張', c:6, r:2, ally:1554 },
          { n:'九州', c:1, r:3, own:1587 },
          { n:'備中', c:2, r:3, own:1582 },
          { n:'四国', c:3, r:3, own:1585 },
        ],
        battleLoc:{ 1566:'美濃', 1570:'北陸', 1582:'京', 1583:'近江', 1587:'九州', 1590:'関東' },
      },
      timeline:[
        { year:1554, type:'story', title:'仕官 — 草履取りの猿', art:'🐒🩴', artImg:'assets/ev_shikan.jpg',
          text:'尾張の百姓の子・日吉丸（あなた）は、織田信長に仕えることになった。冬の朝、懐で温めておいた草履を差し出すと、信長は「猿、気が利くわ」と笑った。\n\n名は木下藤吉郎。持ち物は、よく回る頭と人に好かれる才覚だけ。ここから、日本史上最大の成り上がりが始まる。',
          effects:{ mood:1 } },

        { year:1558, type:'choice', title:'清洲城の三日普請', art:'🧱🔨', artImg:'assets/ev_kiyosufushin.jpg',
          text:'清洲城の塀が嵐で崩れた。奉行たちが20日かけても直らない。「猿、お前がやってみよ」——信長の目が試している。さて、どう直す？',
          choices:[
            { label:'組ごとに競わせ、早い組に褒美を弾む', text:'人足を10組に分け、持ち場を競わせた。褒美の銭が飛び交い、塀はわずか三日で直った。「銭は使うほど人を動かす」——あなたの工夫に城中が驚いた。', fx:{ seiji:8, koku:10, mood:1 } },
            { label:'自ら泥まみれで先頭に立つ', text:'親方が誰より働くなら、人足は休めない。塀は五日で直り、「木下様のためなら」という人足が増えた。あなたの名は下々の語り草になった。', fx:{ ninbo:8, buyu:3 } },
          ] },

        { year:1561, type:'story', title:'寧々との祝言', art:'🌸🍶', artImg:'assets/ev_nene.jpg',
          text:'足軽組頭の養女・寧々（ねね）と恋に落ち、祝言を挙げた。家同士が決めるのが当たり前のこの時代、身分の低い者同士の恋愛結婚はきわめて珍しい。\n\n寧々は生涯あなたを支え、子飼いの家臣たちの「母」となる。のちに天下人となっても、あなたは寧々に頭が上がらない。',
          effects:{ ninbo:5, mood:1 } },

        { year:1566, type:'battle', title:'墨俣一夜城 — 敵地に城を建てろ',
          terrain:{ icon:'🏞️', label:'長良川のほとり・墨俣' }, bg:'assets/bg_sunomata.jpg',
          intro:'美濃攻めの足がかりに、敵地のド真ん中へ砦を築く大役を拝命した。失敗すれば命はない。だが成功すれば——出世の階段が見える。',
          enemyName:'斎藤方の妨害部隊', enemyIcon:'🏹', enemyPower:90,
          army:{ me:2000, foe:3000 }, meUnit:'🛡️', foeUnit:'🏹',
          open:[
            '出ました大仕事！ 敵地のド真ん中に砦を築く「墨俣築城作戦」！',
            '守る木下隊はわずか2千、斎藤方の妨害部隊は3千！ 完成が先か、潰されるのが先か！？',
          ],
          rounds:[
            { situ:'川の上流から資材を運び込む手はず。だが敵の物見がうろついているぞ…！',
              opts:[
                { icon:'🪵', label:'資材を筏で一気に流し込む', stat:'seiji', genre:'seiji', style:'safe', fit:2, hist:true,
                  ok:'組み立てるだけの状態で資材が続々到着！ プレハブ工法の先取りだあーっ！' },
                { icon:'🌫️', label:'夜陰にまぎれて運び込む', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'敵に気づかれず搬入成功！ 静かに、だが確実に進んでいる！' },
                { icon:'⚔️', label:'物見を蹴散らして堂々と運ぶ', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'力ずくで道を開いた！ だが敵本隊に気づかれたか…！？' },
              ] },
            { situ:'敵の妨害部隊が川を渡って攻めてきた！ 普請を続けながら戦うしかない！',
              opts:[
                { icon:'⚔️', label:'半数で迎え撃ち、半数で普請続行', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'戦いながらも槌音は止まらない！ 見事な二刀流だあーっ！' },
                { icon:'🤝', label:'人足に銭と飯を振る舞い励ます', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'「親方のためなら！」人足たちの槌が倍速になったーっ！' },
                { icon:'🧠', label:'柵を先に立てて敵を足止め', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'即席の柵が敵を阻む！ 貴重な時間を稼いだ！' },
              ] },
            { situ:'夜が明ける…朝までに城がそびえ立っていれば、敵は戦意を失うはずだ！',
              opts:[
                { icon:'🏛️', label:'夜通しで外観だけ一気に仕上げる', stat:'seiji', genre:'seiji', style:'risky', fit:2,
                  ok:'朝霧の中に城影がそびえ立つ！ 「一夜で城が…！」敵は腰を抜かしたーっ！' },
                { icon:'🤝', label:'旗を並べ大軍がいると見せかける', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'旗指物の数に敵が動揺！ 中身はスカスカでも見た目は大軍だ！' },
                { icon:'⚔️', label:'完成を待たず打って出る', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'まさかの夜襲！ 敵は混乱して退いていく！' },
              ] },
          ],
          winText:'墨俣一夜城、完成！ この砦が楔となり美濃攻めは大きく前進。「猿はただの人たらしではない」——あなたの名が織田家中に轟いた。',
          loseText:'【敗北】砦は完成を待たず焼け落ちた……。\n\n（育成終了。築城は政治＝銭と段取りの戦い。政務を鍛えて出直そう！）',
          winFx:{ koku:60, seiji:8, ninbo:3 } },

        { year:1570, type:'battle', title:'金ヶ崎の退き口 — 殿軍を志願す',
          terrain:{ icon:'⛰️', label:'越前・金ヶ崎 — 退路の隘路' }, bg:'assets/bg_kanegasaki.jpg',
          intro:'浅井長政の裏切りで、織田軍は挟み撃ちの大ピンチ！ 全軍撤退の中、あなたは最も危険な殿軍（しんがり）を自ら志願した。本隊が逃げ切るまで、追撃を食い止めろ！',
          enemyName:'浅井・朝倉の追撃軍', enemyIcon:'💔', enemyPower:240,
          army:{ me:5000, foe:15000 }, meUnit:'🛡️', foeUnit:'🗡️',
          open:[
            '一大事ーっ！ 浅井長政の裏切りで織田軍は挟み撃ち！ 全軍撤退が始まった！',
            'そして木下藤吉郎、自ら殿軍（しんがり）に志願！ 5千で1万5千の追撃を食い止めるーっ！',
          ],
          rounds:[
            { situ:'本隊が逃げる時間を稼げ！ 追撃の先鋒がもう見えている！',
              opts:[
                { icon:'⚔️', label:'隘路で槍衾を組み正面を塞ぐ', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'狭い道では数の差は出ない！ 鉄壁の殿軍だあーっ！' },
                { icon:'🧠', label:'山肌に偽の伏兵の旗を立てる', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
                  ok:'「伏兵がいるぞ！」敵の追撃の足が鈍った！' },
                { icon:'🤝', label:'地元の民に間道の案内を頼む', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'裏道を教えてもらった！ 撤退路に余裕ができたぞ！' },
              ] },
            { situ:'追撃が苛烈になってきた！ 兵たちの顔に疲れと恐怖が見える…！',
              opts:[
                { icon:'🤝', label:'「わしが最後に逃げる」と先頭に立つ', stat:'ninbo', genre:'ninbo', style:'safe', fit:2, hist:true,
                  ok:'大将が一番危ない場所に立った！ 兵たちの目に光が戻ったーっ！' },
                { icon:'⚔️', label:'反転して一撃を加える', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'逃げると見せて反撃！ 敵の出鼻をくじいた！' },
                { icon:'🏛️', label:'銭で農民を雇い偽の噂を流す', stat:'seiji', genre:'seiji', style:'trick', fit:1,
                  ok:'「織田の援軍が来る」の噂が敵陣に！ 追撃が慎重になった！' },
              ] },
            { situ:'あと一里で安全圏！ 最後の追撃を振り切れ！',
              opts:[
                { icon:'🧠', label:'橋を落とし退路を断ちながら下がる', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
                  ok:'追撃路を一つずつ消していく！ 教科書のような撤退戦だーっ！' },
                { icon:'⚔️', label:'最後尾で自ら槍を振るう', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'大将自ら殿軍の最後尾！ 命がけの一里だ！' },
                { icon:'🤝', label:'兵を励まし隊列を崩さない', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'恐慌を起こさず整然と撤退！ 実はこれが一番難しい！' },
              ] },
          ],
          winText:'殿軍、完遂！ 織田本隊は無事に京へ帰還した。「藤吉郎、よくぞ生きて戻った」——最も危険な役目をやり遂げ、あなたの評価は不動のものになった。',
          loseText:'【敗北】追撃を支えきれず、殿軍は崩壊……。\n\n（育成終了。撤退戦は人望と知略がものを言う。側近との絆も大切に！）',
          winFx:{ koku:100, ninbo:8, buyu:5 } },

        { year:1573, type:'story', title:'長浜城主 — 羽柴秀吉、誕生', art:'🏯✨', artImg:'assets/ev_nagahama.jpg',
          text:'浅井攻めの功績で、近江長浜12万石の城主に大出世！ 名も「羽柴秀吉」と改めた。丹羽長秀の「羽」と柴田勝家の「柴」を一字ずつもらった、いかにも世渡り上手なあなたらしい名前だ。\n\n百姓の子が、ついに一国一城の主になった。',
          effects:{ seiji:8, koku:150 } },

        { year:1577, type:'story', title:'中国方面軍司令官 — 大抜擢', art:'🗺️⚔️', artImg:'assets/ev_chugoku.jpg',
          text:'信長から、中国地方の毛利攻めを一任された。方面軍司令官は織田家でも数人しかいない大役。竹中半兵衛・黒田官兵衛という二人の天才軍師も、あなたの下にいる。\n\n「いずれ毛利の領地はお前にやろう」——出世競争の先頭に立った。',
          effects:{ chiryaku:5, koku:80 } },

        { year:1582, type:'battle', title:'中国大返し — 弔い合戦・山崎へ',
          terrain:{ icon:'🏯', label:'山崎 — 天王山のふもと' }, bg:'assets/bg_yamazaki.jpg',
          intro:'備中高松城を水攻めの最中、急報が飛び込んだ。「信長様、本能寺にて横死」——。悲しむ暇はない。毛利と和睦し、京へ取って返す。主君の仇・明智光秀を討つのは、自分しかいない！',
          enemyName:'明智光秀の軍勢', enemyIcon:'📜', enemyPower:400,
          army:{ me:27000, foe:16000 }, meUnit:'🛡️', foeUnit:'🗡️',
          open:[
            '備中高松城・水攻めの最中、衝撃の報せ——「信長様、本能寺にて横死」！',
            '悲しむ暇はない！ 弔い合戦へ、史上最速の大撤退「中国大返し」が始まるーっ！',
          ],
          rounds:[
            { situ:'目の前には毛利の大軍。背を向ければ追撃される…どうやって兵を返す!?',
              opts:[
                { icon:'🧠', label:'本能寺の報を隠し、毛利と即和睦', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2, hist:true,
                  ok:'情報を制した！ 毛利が変を知る前に和睦成立——これで背中は安全だーっ！' },
                { icon:'⚔️', label:'一戦して毛利を叩いてから返す', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'勝ったが時間を失った…明智の備えが固まってしまうぞ！' },
                { icon:'🤝', label:'使者を立てて正直に事情を話す', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'毛利の小早川隆景「その義、見届けた」——追撃せずの約束を取り付けた！' },
              ] },
            { situ:'京まで約200km！ 2万の兵を10日で走らせる大強行軍…兵の心と足が持つか!?',
              opts:[
                { icon:'🏛️', label:'街道に銭と米と松明を先回りで用意', stat:'seiji', genre:'seiji', style:'safe', fit:2,
                  ok:'走れば飯がある、夜も松明で走れる！ 銭の力で道ができたーっ！' },
                { icon:'🤝', label:'「殿の仇を討つのは我らぞ」と訴える', stat:'ninbo', genre:'ninbo', style:'safe', fit:2,
                  ok:'兵たちの目が燃えている！ 疲れを忘れさせる大義名分だ！' },
                { icon:'⚔️', label:'遅れる者は置いていく強行軍', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'速い！ が、兵が次々と脱落していく…！' },
              ] },
            { situ:'山崎に布陣！ 天王山を制した方が勝つ——明智光秀との決戦だ！',
              opts:[
                { icon:'⚔️', label:'天王山へ先駆けし、一気に決める', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'天王山を取ったあーっ！ 高所から雪崩を打って明智勢を押し潰す！' },
                { icon:'💥', label:'雨上がりを待って鉄砲を斉射', stat:'seiji', genre:'seiji', style:'safe', fit:1,
                  ok:'銃声が谷に響く！ 明智勢の前線が崩れていく！' },
                { icon:'🧠', label:'淀川沿いから側面を突く', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:1,
                  ok:'川沿いの奇襲が刺さった！ 敵は二正面に対応できない！' },
              ] },
          ],
          winText:'山崎の戦い、勝利！ 主君の仇・明智光秀を討った！ 「信長様の後継ぎにふさわしいのは誰か」——天下の目が、いま一斉にあなたを見ている。',
          loseText:'【敗北】大返しの疲れが残る軍は、天王山で崩れた……。\n\n（育成終了。決戦は始まる前の段取り＝政治と人望で決まる！）',
          winFx:{ koku:250, chiryaku:8, ninbo:5 } },

        { year:1583, type:'battle', title:'賤ヶ岳の戦い — 後継者決定戦',
          terrain:{ icon:'⛰️', label:'近江・賤ヶ岳 — 湖北の山なみ' }, bg:'assets/bg_shizugatake.jpg',
          intro:'信長亡き後の織田家の主導権を懸け、筆頭家老・柴田勝家とついに激突。あの「かかれ柴田」が相手だ。勝った方が、天下への切符をつかむ。',
          enemyName:'柴田勝家の軍勢', enemyIcon:'🛡️', enemyPower:470,
          army:{ me:25000, foe:20000 }, meUnit:'🛡️', foeUnit:'⚔️',
          open:[
            '信長亡き後の主導権を懸け、織田家筆頭家老・柴田勝家と激突！',
            '舞台は琵琶湖の北・賤ヶ岳！ 「かかれ柴田」の猛攻をどうさばくーっ！？',
          ],
          rounds:[
            { situ:'敵将・佐久間盛政が突出してきた！ だがあなたの本隊は52km離れた大垣にいる…！',
              opts:[
                { icon:'🧠', label:'即断！ 全軍で「美濃大返し」', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2, hist:true,
                  ok:'52kmをわずか半日ーっ！！ 「まさか今日戻るはずが…」敵の度肝を抜いた！' },
                { icon:'🏛️', label:'街道の村々に炊き出しを命じておく', stat:'seiji', genre:'seiji', style:'safe', fit:1,
                  ok:'走る兵に握り飯が手渡されていく！ 補給の勝利だ！' },
                { icon:'⚔️', label:'先発隊だけで突っ込ませる', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'勇敢！ だが数が足りない…本隊到着まで持ちこたえろ！' },
              ] },
            { situ:'戻ったその足で決戦！ 突出した佐久間隊が孤立しているぞ！',
              opts:[
                { icon:'⚔️', label:'子飼いの若武者たちで総攻撃', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'のちの「賤ヶ岳の七本槍」だ！ 清正らの槍が敵陣を切り裂くーっ！' },
                { icon:'🌫️', label:'退路に回り込んで包囲', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:1,
                  ok:'袋の口を閉じた！ 佐久間隊は袋のネズミ！' },
                { icon:'🤝', label:'投降を呼びかける', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'戦意を失った敵兵が次々と投降してくる！' },
              ] },
            { situ:'勝家本隊が後退を始めた！ おまけに前田利家隊が戦線を離れた模様…勝負どころだ！',
              opts:[
                { icon:'🤝', label:'利家に使者「旧友よ、咎めはせぬ」', stat:'ninbo', genre:'ninbo', style:'safe', fit:2,
                  ok:'人たらしの真骨頂！ 利家は完全に矛を収め、敵戦線に大穴が空いたーっ！' },
                { icon:'⚔️', label:'北ノ庄まで一気に追撃', stat:'buyu', genre:'buyu', style:'safe', fit:1,
                  ok:'追撃の手は緩めない！ 勝家は北ノ庄城へ追い詰められた！' },
                { icon:'🏛️', label:'敵将に恩賞を約束して切り崩す', stat:'seiji', genre:'seiji', style:'trick', fit:1,
                  ok:'銭と所領の約束が効いた！ 寝返りが続出だ！' },
              ] },
          ],
          winText:'賤ヶ岳に勝利！ 柴田勝家は北ノ庄に散った。織田家の後継争いは決着——天下人への道が、まっすぐに開けた。翌年には石山本願寺の跡地に大坂城の築城を始める。',
          loseText:'【敗北】「かかれ柴田」の猛攻に屋台骨が砕けた……。\n\n（育成終了。大一番の前に、ステータスと体力を整えておこう！）',
          winFx:{ koku:250, buyu:8, seiji:5 } },

        { year:1584, type:'choice', title:'小牧・長久手 — 家康との知恵比べ', art:'🦅🤝', artImg:'assets/ev_komaki.jpg',
          text:'信長の次男・信雄が、徳川家康と組んで兵を挙げた。戦上手の家康との全面対決は、長期戦の気配……。さて、どう決着をつける？',
          choices:[
            { label:'和睦し、政治で取り込む（史実）', text:'戦は引き分けたが、外交で勝った。信雄と単独講和して家康の戦う名分を消し、のちには妹と母を人質に送る思い切った手で家康を上洛・臣従させた。「戦わずして勝つ」の極みである。', fx:{ seiji:10, ninbo:5, koku:100 } },
            { label:'決戦で雌雄を決する', text:'長久手で手痛い敗北を喫し、損害がかさんだ。やはり家康と正面から戦うのは分が悪い……結局、和睦の道を探ることになった。', fx:{ buyu:8, koku:-50, mood:-1 } },
          ] },

        { year:1585, type:'story', title:'関白就任 — 前例なき頂点', art:'👑🐒', artImg:'assets/ev_kanpaku.jpg',
          text:'朝廷から関白に任じられた！ 武士として、そして百姓出身として、まったく前例のない頂点だ。翌年には「豊臣」の姓を賜り、太政大臣にも就く。\n\n刀ではなく官位と政治で天下に号令する——あなたが作る、新しい統一のかたちだ。',
          effects:{ seiji:10, ninbo:5, koku:200 } },

        { year:1586, type:'story', title:'大坂城と黄金の茶室', art:'🏯✨', artImg:'assets/ev_ogon.jpg',
          text:'石山本願寺の跡地に築いた大坂城が、ついに偉容を現した。本丸には組み立て式の黄金の茶室——成金趣味と笑う者もいるが、これは「新しい天下人の力」を誰の目にもわかる形で見せる演出だ。\n\n千利休を茶頭に迎え、茶の湯は政治の舞台にもなっていく。',
          effects:{ koku:150, ninbo:3 } },

        { year:1587, type:'battle', title:'九州平定 — 太閤流・兵站の戦',
          terrain:{ icon:'🌋', label:'九州 — 島津の本領へ' }, bg:'assets/bg_kyushu.jpg',
          intro:'天下統一へ残る大物、九州の島津義久を討つ。動員兵力はなんと20万。これだけの大軍を飢えさせず動かすこと自体が、史上最大級の挑戦だ。',
          enemyName:'島津義久の軍勢', enemyIcon:'🌋', enemyImg:'assets/foe_yoshihisa.png', enemyPower:540,
          army:{ me:200000, foe:50000 }, meUnit:'🛡️', foeUnit:'🗡️',
          open:[
            '天下統一へ最後の大物、九州の島津義久を討つ！ 動員兵力、なんと20万！',
            '「数も銭も段取りも、すべてが戦」——太閤流の戦争、とくと見よーっ！',
          ],
          rounds:[
            { situ:'20万の大軍。だが大軍は腹が減る…兵糧の段取りこそが勝敗を分けるぞ！',
              opts:[
                { icon:'🏛️', label:'三成に兵站を一任し、海路で米を運ぶ', stat:'seiji', genre:'seiji', style:'safe', fit:2, hist:true,
                  ok:'港に米俵の山、山、山！ 20万人が飢えない——これ自体が歴史的偉業だあーっ！' },
                { icon:'⚔️', label:'速攻で決めれば兵糧は要らぬ', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'威勢はいいが九州は広い！ 補給線が伸び切っているぞ…！' },
                { icon:'🧠', label:'肥後と日向の二手で挟撃', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'二方向からの挟み撃ち！ 島津は両面対応を強いられる！' },
              ] },
            { situ:'出た、島津のお家芸「釣り野伏せ」！ わざと退いて誘い込む罠だ…乗るな！',
              opts:[
                { icon:'🧠', label:'罠を見抜き、深追いを禁ずる', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
                  ok:'「追うな、それは餌だ」——釣り野伏せ、完全に空振りーっ！' },
                { icon:'⚔️', label:'罠ごと正面から踏み潰す', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'伏兵ごと数で押し潰す！ これが20万の力だ！' },
                { icon:'🤝', label:'地元の国人衆を調略して道案内に', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'地元の侍が次々こちらへ！ 罠の位置は筒抜けだ！' },
              ] },
            { situ:'島津は本国・薩摩へ後退した。さあ、この大戦をどう締めくくる!?',
              opts:[
                { icon:'🤝', label:'義久の降伏を受け入れ、本領を安堵', stat:'ninbo', genre:'ninbo', style:'safe', fit:2,
                  ok:'「寛大なる関白殿下」！ 島津は心服し、九州に平和が戻ったーっ！' },
                { icon:'⚔️', label:'薩摩の奥まで総攻撃', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'最後まで力攻め！ さすがの島津も力尽きた！' },
                { icon:'🏛️', label:'戦後の国割りを先に発表してしまう', stat:'seiji', genre:'seiji', style:'trick', fit:1,
                  ok:'戦の後の絵図を先に見せる！ 戦い続ける理由が消えていく！' },
              ] },
          ],
          winText:'九州平定！ 島津は降伏し、本領安堵で心服させた。帰り道、長崎が教会領になっていると知り、バテレン追放令を出した（ただし南蛮貿易は継続）。残るは関東の北条のみ——天下統一は目前だ！',
          loseText:'【敗北】広い九州に、大軍が飲み込まれていった……。\n\n（育成終了。大軍は政治力＝兵站が命。政務を鍛えて出直そう！）',
          winFx:{ koku:300, seiji:8 } },

        { year:1588, type:'story', title:'刀狩令 — 新しい世の土台', art:'⚔️🚫', artImg:'assets/ev_kenchi.jpg',
          text:'刀狩令を出した。「百姓は耕し、武士は守る」——身分の役割をはっきり分け、一揆と戦乱の芽を摘む。全国で進める太閤検地とあわせて、戦のない世の土台づくりだ。\n\n百姓出身のあなたが、百姓から刀を取り上げる。その複雑な気持ちは、胸の奥にしまった。',
          effects:{ seiji:8, koku:100 } },

        { year:1590, type:'final', title:'小田原平定 — 天下統一、そして', art:'🏯🚩', artImg:'assets/ev_tenka.jpg',
          text:'20万の大軍が小田原城を囲んだ。北条方は籠城を選んだが、城内の評定は何も決められないまま（世にいう「小田原評定」）。落城は時間の問題だ。\n\n天下統一を目前に、あなたは「その先」を考え始める——この巨大な力を、次にどこへ向けるのか。',
          survive:{
            title:'【IF】太閤の平和',
            text:'小田原は開城し、奥州も従った。天下統一である！\n\n諸大名が「次は唐入り（朝鮮出兵）を」と勧める中、あなたは静かに首を横に振った。「これからの戦は、銭と米で国を富ませる戦じゃ」\n\n検地と刀狩で世を整え、湊を開き、銭を回した。豊臣の平和は長く続き、百姓出身の天下人は「太閤様」と呼ばれ、民に愛され続けた——あなたが育てた、もう一つの歴史である。' },
          fall:{
            title:'天下統一 — 百姓の子、頂点へ',
            text:'小田原開城。奥州も従い、ついに天下統一が成った！ 百姓の子が天下人へ——日本の歴史上、これほどの成り上がりは他にない。\n\nだがこの後、史実のあなたは朝鮮出兵へと踏み出し、その重い負担がやがて豊臣家に影を落としていく。\n\nそれでも「豊臣秀吉」の名は、立身出世の代名詞として永遠に語り継がれている。' },
        },
      ],
    },

    /* ---- 偉人3人目: 徳川家康（人質→江戸幕府・忍耐の天下取り・2026-06-14夜 G2） ---- */
    ieyasu: {
      id:'ieyasu', name:'徳川家康', armyIcon:'🟢', armyName:'徳川軍',
      crest:'🦅', subtitle:'人質の子、泰平の世を開く',
      img:'assets/hero_ieyasu.png',
      faceImgs:{ up:'assets/hero_ieyasu_up.png', down:'assets/hero_ieyasu_down.png' },
      kamon:'assets/kamon_tokugawa.png',
      uniqueSkill:{ id:'uq_nintai', icon:'🦅', name:'忍耐', desc:'すべての鍛錬の体力消耗が少ない（偉人固有）', fx:{ costAll:3 } },
      castleImgs:['assets/castle_i1.png','assets/castle_i2.png','assets/castle_i3.png','assets/castle_i4.png','assets/castle_i5.png'],
      sceneImgs:['assets/scene_i1.jpg','assets/scene_i2.jpg','assets/scene_i3.jpg','assets/scene_i4.jpg','assets/scene_i5.jpg'],
      eraPref:{ sengoku:1.5, azuchi:2, edo:3 },
      startYear:1560, endYear:1603,
      start:{ buyu:14, chiryaku:16, seiji:12, ninbo:18, koku:30 },
      finalReq:{ seiji:165, ninbo:150 },  // IF: 豊臣家と共存し、戦なき泰平を早める（44ターン分の強気閾値）
      halfReqScale:1.62,    // 半年制のIF倍率（simで校正 2026-06-14夜）
      halfScoreScale:1.48,  // 半年制の評価点割り係数（自由ターンが多く既定1.38では足りない・simで校正）
      scoreNorm:1.19,    // 44年と長く年数割り正規化が過剰になるぶんの校正（simで他偉人の評価点カーブに合わせた）
      legacyNames:{ buyu:'負けて学ぶが徳川の強さ', chiryaku:'急がば回れ、待つも戦',
        seiji:'倹約こそ最強の武器', ninbo:'家臣は宝、信は力なり' },
      endTexts:{
        survived:'🌟 <b>豊臣家と戦わずして泰平の世を開いた！（IFルート達成）</b>',
        completed:'🏁 44年を完走！ 人質の子が征夷大将軍へ——260年続く江戸の泰平が、ここから始まる。' },
      castles:[ [0,'🛖','人質の離れ'], [200,'🏠','岡崎城'], [450,'🏯','浜松城'], [900,'🏯','駿府城'], [1500,'🏯','江戸城'] ],
      seasons:['🌸','☀️','🍂','⛄'],
      skirmishFoes:SKIRMISH_FOES, skirmishSitus:SKIRMISH_SITUS,
      retainers:[
        { id:'tadakatsu', name:'本多忠勝', icon:'🦌', fav:'buyu', img:'assets/r_tadakatsu.png',
          perk:{ type:'gain', v:2, label:'同席した鍛錬の上昇+2' },
          skill:{ id:'sk_tonbokiri', icon:'🦌', name:'蜻蛉切', desc:'合戦の武力の采配が強くなる', fx:{ battleStat:'buyu' } },
          midText:'「殿、戦場ではそれがしの後ろにお立ちくだされ」（57度の戦でかすり傷ひとつ負わぬ男の言葉だ）',
          intro:'鹿角の兜の最強武者。生涯57回の戦でかすり傷ひとつ負わなかったという。',
          maxText:'「家康に過ぎたるものが二つあり、唐の頭に本多平八」（敵にまで讃えられた豪傑が、あなたの矛となる）',
          maxFx:{ buyu:10, stamina:20 } },
        { id:'naomasa', name:'井伊直政', icon:'🔴', fav:'buyu', img:'assets/r_naomasa.png',
          perk:{ type:'skillpt', v:1, label:'同席正解でスキルP+1' },
          skill:{ id:'sk_akazonae', icon:'🔴', name:'赤備えの誉', desc:'すべての鍛錬の上昇が少し増える', fx:{ trainAll:1 } },
          midText:'「武田の赤を、徳川の誇りに変えてみせまする」（若き猛将の目は燃えている）',
          intro:'「井伊の赤鬼」。武田の赤備えを受け継いだ、最年少の重臣。',
          maxText:'「先陣はいつでもこの直政に！」（赤き軍団が、あなたのために駆ける）',
          maxFx:{ buyu:10, mood:1 } },
        { id:'yasumasa', name:'榊原康政', icon:'🚩', fav:'chiryaku', img:'assets/r_yasumasa.png',
          perk:{ type:'gain', v:2, label:'同席した鍛錬の上昇+2' },
          skill:{ id:'sk_munohata', icon:'🚩', name:'無の旗', desc:'合戦の知力の采配が強くなる', fx:{ battleStat:'chiryaku' } },
          midText:'「敵を知るには、まず敵の身になって考えることです」（筆も立てば槍も立つ、頼れる男だ）',
          intro:'「無」の旗印を掲げる知勇兼備の将。文章の名手でもある。',
          maxText:'「殿の天下取りの絵図、それがしが清書いたしましょう」（戦も政も任せられる柱だ）',
          maxFx:{ chiryaku:10, seiji:5 } },
        { id:'hanzo', name:'服部半蔵', icon:'🥷', fav:'chiryaku', img:'assets/r_hanzo.png',
          perk:{ type:'cost', v:5, label:'同席した鍛錬の体力-5' },
          skill:{ id:'sk_igamichi', icon:'🥷', name:'伊賀の抜け道', desc:'視察で得る石高が4割増える', fx:{ tripKoku:1.4 } },
          midText:'「……影は、語りませぬ」（多くを語らないが、いつも一番危ない場所にいる）',
          intro:'伊賀忍びを束ねる「鬼半蔵」。情報こそ最大の武器と知る男。',
          maxText:'「殿の影として、地の果てまで」（闇のすべてが、あなたの味方になった）',
          maxFx:{ chiryaku:8, stamina:25 } },
        { id:'tadatsugu', name:'酒井忠次', icon:'🍶', fav:'ninbo', img:'assets/r_sakai.png',
          perk:{ type:'mood', label:'同席時、やる気低下を半分防ぐ' },
          skill:{ id:'sk_ebisukui', icon:'🍶', name:'海老すくいの宴', desc:'休息の回復量が増える', fx:{ restPlus:12 } },
          midText:'「殿、たまには宴でも。ほれ、海老すくい！」（重臣筆頭の踊りに、家中が笑いに包まれた）',
          intro:'徳川四天王の筆頭格。宴会芸「海老すくい」で家中の心をほぐす盛り上げ役。',
          maxText:'「殿が生まれる前から、わしは松平家の家臣ですぞ」（苦労時代をすべて知る、最古参の支え）',
          maxFx:{ ninbo:10, mood:2 } },
        { id:'acha', name:'阿茶局', icon:'🍵', fav:'seiji', img:'assets/r_acha.png',
          perk:{ type:'kokuSub', label:'同席した政務の石高2倍' },
          skill:{ id:'sk_waginocha', icon:'🍵', name:'和議の茶', desc:'合戦の人望の采配（調略）が強くなる', fx:{ battleStat:'ninbo' } },
          midText:'「戦の前に、まず茶を一服。話はそれからにございます」（聡明な側室は、交渉の達人でもある）',
          intro:'家康の側室にして外交役。のちに大坂の陣の和議をまとめる才女。',
          maxText:'「殿の天下は、刀より言葉で守ってみせましょう」（その弁舌は一軍に値する）',
          maxFx:{ seiji:10, koku:30 } },
      ],
      map:{
        provinces:[
          { n:'信濃', c:4, r:1, own:1582 },
          { n:'甲斐', c:5, r:1, own:1582 },
          { n:'関東', c:6, r:1, own:1590 },
          { n:'京',   c:2, r:2, own:1600 },
          { n:'美濃', c:3, r:2, own:1600 },
          { n:'尾張', c:4, r:2, ally:1562 },
          { n:'三河', c:5, r:2, own:1560 },
          { n:'江戸', c:6, r:2, own:1590 },
          { n:'大坂', c:2, r:3, own:1600 },
          { n:'遠江', c:4, r:3, own:1570 },
          { n:'駿河', c:5, r:3, own:1582 },
        ],
        battleLoc:{ 1563:'三河', 1572:'遠江', 1575:'三河', 1584:'尾張', 1600:'美濃' },
      },
      timeline:[
        { year:1560, type:'story', title:'桶狭間の報 — 人質、故郷へ帰る', art:'🛖🌅', artImg:'assets/ev_hitojichi.jpg',
          text:'駿府で人質として育ったあなた（松平元康・19歳）に、衝撃の報せが届いた。「今川義元殿、桶狭間にて討死」。\n\n今川の支配が揺らいだいま、誰の指図も受けず、生まれ故郷の岡崎城に入った。6歳から続いた人質生活は終わり。ここから、自分の足で立つ人生が始まる。',
          effects:{ mood:1, ninbo:3 } },

        { year:1562, type:'story', title:'清洲同盟 — 信長と握手', art:'🤝⚡', artImg:'assets/ev_kiyosu.jpg',
          text:'尾張の織田信長と同盟を結んだ。かつて今川方として戦った相手だが、これからは背中を預け合う仲だ。\n\nこの同盟は信長が本能寺に倒れるまで約20年、戦国では奇跡的なほど長く守られる。「約束を守る男」——それがあなたの最初の看板になった。',
          effects:{ ninbo:5, koku:20 } },

        { year:1563, type:'battle', title:'三河一向一揆 — 家中、真っ二つ',
          terrain:{ icon:'🏯', label:'三河 — 寺と城下' },
          intro:'三河で一向一揆が爆発した。恐ろしいのは敵の数ではない——家臣の半分が、信仰のために一揆側についたことだ。家中が真っ二つに割れる、最初で最大の内輪の試練。',
          enemyName:'一向一揆と離反家臣', enemyIcon:'🏮', enemyPower:100,
          army:{ me:3000, foe:4000 }, meUnit:'🛡️', foeUnit:'🏮',
          open:[
            '一大事！ 三河で一向一揆が蜂起！ なんと家臣の半分が一揆側についたーっ！',
            '敵は昨日までの家族同然の家臣たち…これは槍より心が痛む戦いだ！',
          ],
          rounds:[
            { situ:'一揆勢が城下に迫る！ だが先頭にいるのは見知った家臣の顔ばかり…！',
              opts:[
                { icon:'⚔️', label:'心を鬼にして正面から打ち破る', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'非情の決断！ だが迷いのない一撃が、かえって被害を最小にしたーっ！' },
                { icon:'🤝', label:'「戻れば咎めぬ」と呼びかける', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'矛を収める家臣が出始めた！ 殿の器が試されている！' },
                { icon:'🧠', label:'一揆の補給路だけを断つ', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
                  ok:'兵糧が尽きれば一揆は続かない！ じわじわ効いてきたぞ！' },
              ] },
            { situ:'敵陣に旧臣・本多正信の姿が！ 撃つべきか、惜しむべきか…！',
              opts:[
                { icon:'🤝', label:'あえて見逃し、退路を開ける', stat:'ninbo', genre:'ninbo', style:'trick', fit:2,
                  ok:'「殿は俺たちを殺したくないのだ」——敵の士気がガタガタに崩れていく！' },
                { icon:'⚔️', label:'容赦なく突撃を命じる', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'力で押し切った！ だが家中のしこりが残らないか…！' },
                { icon:'🏛️', label:'寺側に矛を収める条件を示す', stat:'seiji', genre:'seiji', style:'safe', fit:1,
                  ok:'落としどころを先に見せた！ 戦う理由が薄れていく！' },
              ] },
            { situ:'一揆の勢いが衰えてきた。この内輪の戦を、どう締めくくる！？',
              opts:[
                { icon:'🤝', label:'降った者をすべて赦し、元の職に戻す', stat:'ninbo', genre:'ninbo', style:'safe', fit:2, hist:true,
                  ok:'「殿のためなら命も要らぬ」——赦された家臣たちは、生涯の忠臣に変わったーっ！' },
                { icon:'⚔️', label:'首謀者だけを厳罰に処す', stat:'buyu', genre:'buyu', style:'safe', fit:1,
                  ok:'けじめはつけた。三河に静けさが戻っていく。' },
                { icon:'🧠', label:'寺の力を削ぐ取り決めを結ぶ', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
                  ok:'二度と火種にならぬよう、根を断った！' },
              ] },
          ],
          winText:'一揆は収まった。あなたは戻った家臣を一切咎めず元の役職に戻し、彼らは生涯の忠臣となった。「三河武士の結束」はこの赦しから生まれたのだ。',
          loseText:'【敗北】家中の分裂を収めきれなかった……。\n\n（育成終了。内輪の戦いは人望がものを言う。側近との絆を大切に！）',
          winFx:{ koku:50, ninbo:8, buyu:3 } },

        { year:1566, type:'choice', title:'徳川改姓 — 三河の国主へ', art:'🦅📜', artImg:'assets/ev_kaisei.jpg',
          text:'三河を平定し、朝廷から「徳川」への改姓を許された。松平元康あらため、徳川家康。名実ともに三河の国主だ。さて、国づくりの第一歩は？',
          choices:[
            { label:'家臣団を組み直し、結束を固める', text:'旗本を東西に分け、酒井忠次と石川数正に預けた。誰が何を守るのかが明確になり、三河武士団は戦国屈指の結束を誇る軍団へ育っていく。', fx:{ ninbo:8, buyu:3 } },
            { label:'検地と倹約で内政を固める', text:'田畑を調べ、城の台所を切り詰めた。地味だが、この「倹約と蓄え」こそ生涯の武器になる。三河の小さな国が、少しずつ豊かになっていく。', fx:{ seiji:8, koku:30 } },
          ] },

        { year:1570, type:'story', title:'浜松移転 — 遠江への進出', art:'🏯🌊', artImg:'assets/ev_hamamatsu.jpg',
          text:'武田信玄と取り決めて今川領を切り取り、遠江（とおとうみ）を手に入れた。本拠も岡崎から浜松へ前進。\n\nだがこれで、最強と恐れられる武田と国境を接することになった。嵐の前の静けさが、浜松の城に漂っている。',
          effects:{ seiji:5, koku:80 } },

        { year:1572, type:'battle', title:'三方ヶ原の戦い — 生涯最大の負け戦',
          terrain:{ icon:'⛄', label:'三方ヶ原 — 雪まじりの台地' }, bg:'assets/bg_mikatagahara.jpg',
          intro:'武田信玄が2万7千の大軍で西上を開始。浜松城を素通りして挑発する信玄に、あなたは1万1千で打って出た——これは、生き残ることが勝利の戦いだ。',
          enemyName:'武田信玄の本隊', enemyIcon:'🐯', enemyPower:265,
          army:{ me:11000, foe:27000 }, meUnit:'🛡️', foeUnit:'🐴',
          open:[
            '出たーっ、戦国最強・武田信玄！ その数2万7千、こちらは1万1千！',
            '城を素通りする信玄を追って三方ヶ原へ…これは罠か!? 生きて浜松に帰る戦いだ！',
          ],
          rounds:[
            { situ:'台地に上がると武田軍は魚鱗の陣で待ち構えていた！ 完全に誘い込まれた…！',
              opts:[
                { icon:'🧠', label:'即座に退き太鼓を打たせる', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2,
                  ok:'恥も外聞もない、即撤退！ 引き際の早さが命を救う！' },
                { icon:'⚔️', label:'先手を取って斬り込む', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'捨て身の一撃で敵の出足を一瞬止めた！ その隙に体勢を立て直せ！' },
                { icon:'🤝', label:'殿軍を募り、自らは中央を固める', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'「殿を死なせるな！」家臣たちが次々と名乗りを上げる！' },
              ] },
            { situ:'退却戦のさなか、武田の騎馬が追いすがる！ 浜松への道はまだ遠い…！',
              opts:[
                { icon:'⚔️', label:'忠勝らに殿軍を任せ走り抜ける', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'本多忠勝が踏みとどまる！ 「あの鹿角には近寄るな」と敵が怯んだーっ！' },
                { icon:'🧠', label:'枝道に分かれて追手を散らす', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
                  ok:'どれが本隊かわからない！ 追撃の槍が空を切る！' },
                { icon:'🏛️', label:'村々に銭を撒き、偽の方角を流す', stat:'seiji', genre:'seiji', style:'trick', fit:1,
                  ok:'「徳川様は東へ逃げた」——嘘の声が敵を惑わす！' },
              ] },
            { situ:'浜松城が見えた！ だが追手も目前…最後の賭けだ！',
              opts:[
                { icon:'🧠', label:'城門を開け放ち、篝火を焚く（空城の計）', stat:'chiryaku', genre:'chiryaku', style:'risky', fit:2, hist:true,
                  ok:'開け放たれた城門に武田軍が足を止めた！ 「罠か…？」——空城の計、成功だあーっ！' },
                { icon:'⚔️', label:'城門前で反転し、一矢報いる', stat:'buyu', genre:'buyu', style:'risky', fit:1,
                  ok:'最後の意地の一撃！ 敵も深追いをためらった！' },
                { icon:'🤝', label:'城兵総出で味方を収容する', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'ひとりでも多く城へ！ 兵たちの命が明日の徳川を作る！' },
              ] },
          ],
          winText:'命からがら浜松城に帰り着いた。あなたは恐怖に歪んだ自分の顔を絵師に描かせ、生涯の戒めとして手元に置いたと伝わる。「負けを忘れぬ者が、最後に勝つ」——この大敗こそ、天下人・家康の原点だ。',
          loseText:'【敗北】三方ヶ原の雪に、徳川の旗が沈んだ……。\n\n（育成終了。格上との戦いは知力＝引き際がすべて。無理は禁物！）',
          winFx:{ koku:30, chiryaku:8, ninbo:5 } },

        { year:1575, type:'battle', title:'長篠の戦い — 織田徳川連合、武田を破る',
          terrain:{ icon:'🛡️', label:'設楽原 — 馬防柵の平野' }, bg:'assets/bg_nagashino.jpg',
          intro:'信玄亡きあとの武田勝頼が、長篠城に襲いかかった。織田の援軍3万と合流し、設楽原に馬防柵を築いて決戦に臨む。三方ヶ原の借りを返すときだ！',
          enemyName:'武田勝頼の騎馬軍団', enemyIcon:'🐴', enemyImg:'assets/foe_katsuyori.png', enemyPower:305,
          army:{ me:38000, foe:15000 }, meUnit:'🛡️', foeUnit:'🐴',
          open:[
            '織田徳川連合軍3万8千、設楽原に布陣！ 対する武田の騎馬軍団1万5千！',
            '幾重にも連なる馬防柵と三千挺の鉄砲…新しい戦と古い戦、激突の時だーっ！',
          ],
          rounds:[
            { situ:'まずは前哨戦。長篠城は落城寸前…包囲を崩す一手は!?',
              opts:[
                { icon:'⚔️', label:'別働隊で鳶ヶ巣山砦を奇襲', stat:'buyu', genre:'buyu', style:'risky', fit:2, hist:true,
                  ok:'酒井忠次の別働隊が背後の砦を急襲！ 包囲が解け、長篠城が息を吹き返したーっ！' },
                { icon:'🤝', label:'城兵に「援軍近し」を伝える使者を送る', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'磔を覚悟で伝えた鳥居強右衛門の魂！ 城兵の心が折れない！' },
                { icon:'🏛️', label:'兵糧を城へ撃ち込む算段を整える', stat:'seiji', genre:'seiji', style:'trick', fit:1,
                  ok:'わずかでも腹がふくれれば城は持つ！ 段取りの勝利！' },
              ] },
            { situ:'武田の騎馬隊が動いた！ 馬防柵まで一直線に駆けてくる…引きつけろ…！',
              opts:[
                { icon:'💥', label:'柵まで引きつけて鉄砲を斉射', stat:'seiji', genre:'seiji', style:'safe', fit:2,
                  ok:'轟音！ 銃弾の壁が騎馬の突撃を打ち砕くーっ！ 戦の常識が変わる瞬間だ！' },
                { icon:'🧠', label:'柵の隙間へ誘い込み、槍で迎える', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'入った敵から各個撃破！ 柵は最強の味方だ！' },
                { icon:'⚔️', label:'柵から打って出て白兵戦', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'勇ましいが柵の意味が…！ それでも押し返した！' },
              ] },
            { situ:'武田軍の突撃が止まった！ 崩れかけた敵に、どう止めを刺す!?',
              opts:[
                { icon:'⚔️', label:'全軍で柵を出て追撃', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'反撃の総攻撃！ 武田の名だたる重臣たちが次々と討たれていく！' },
                { icon:'🧠', label:'退路の橋に先回りする', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
                  ok:'逃げ道で待ち伏せ！ 敵の被害が雪だるま式に膨らむ！' },
                { icon:'🤝', label:'降る者は受け入れると触れを出す', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'戦意を失った敵兵が武器を置いていく。' },
              ] },
          ],
          winText:'長篠に大勝！ 戦国最強と謳われた武田の騎馬軍団は、この日を境に衰えていく。三方ヶ原の借りは返した——そしてあなたは「鉄砲と段取りの時代」の到来を、誰よりも深く心に刻んだ。',
          loseText:'【敗北】騎馬の突撃が柵を越えてきた……。\n\n（育成終了。新しい戦は政治力＝鉄砲と銭の戦。政務を鍛えよう！）',
          winFx:{ koku:120, buyu:8, seiji:5 } },

        { year:1582, type:'story', title:'本能寺の変 — 決死の伊賀越え', art:'🥷🌙', artImg:'assets/ev_igagoe.jpg',
          text:'堺見物の最中、信長横死の報が届いた。供はわずか30余人、周りは落ち武者狩りだらけ。絶体絶命のあなたを救ったのは、服部半蔵が手引きする伊賀の山道だった。\n\n三日三晩、山を駆けて岡崎へ生還。この「神君伊賀越え」ののち、空白地帯となった甲斐・信濃を素早く切り取った。',
          effects:{ chiryaku:8, ninbo:5, koku:150 } },

        { year:1584, type:'battle', title:'小牧・長久手 — 秀吉と知恵比べ',
          terrain:{ icon:'🚩', label:'小牧山 — にらみ合いの陣' }, bg:'assets/bg_komaki.jpg',
          intro:'信長の次男・信雄に味方し、天下取りへ突き進む羽柴秀吉と対決することになった。敵は10万、こちらは1万6千。だが、数で勝てぬなら知恵で勝つまでだ。',
          enemyName:'羽柴秀吉の大軍', enemyIcon:'🐒', enemyPower:425,
          army:{ me:16000, foe:60000 }, meUnit:'🛡️', foeUnit:'🗡️',
          open:[
            '相手はあの羽柴秀吉、兵力差はなんと4倍！ 小牧山でにらみ合いが続く！',
            'だが徳川殿は慌てない…これは我慢と知恵の戦いだーっ！',
          ],
          rounds:[
            { situ:'秀吉方の別働隊2万が、留守の三河を狙って密かに南下を始めた…！',
              opts:[
                { icon:'🥷', label:'忍びの報せを信じ、先回りして待ち伏せ', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:2, hist:true,
                  ok:'敵の動き、すべて筒抜けーっ！ 長久手で待ち伏せ完成！ 別働隊は袋のネズミだ！' },
                { icon:'⚔️', label:'小牧山の敵本隊に総攻撃', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'本陣は固い！ 攻めきれない…だが敵の注意は引いた！' },
                { icon:'🏛️', label:'三河の城々に早馬で備えさせる', stat:'seiji', genre:'seiji', style:'safe', fit:1,
                  ok:'守りは固めた！ さあ、敵はどう動く！？' },
              ] },
            { situ:'長久手で敵別働隊を捕捉！ 池田恒興・森長可ら名将ぞろいだ…仕掛けるなら今！',
              opts:[
                { icon:'⚔️', label:'疲れた行軍の横腹へ一斉攻撃', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'横から雪崩を打って突撃！ 敵の隊列が寸断されたーっ！ 完勝だ！' },
                { icon:'🧠', label:'先頭と後尾を分断する', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'頭と尻尾を切り離した！ 各個撃破の形ができた！' },
                { icon:'🤝', label:'降伏勧告で無駄な血を避ける', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'敵の足が止まった！ 戦わずに崩れる隊も出てきた！' },
              ] },
            { situ:'局地戦は大勝利！ だが敵本隊10万は健在…この戦をどう終わらせる!?',
              opts:[
                { icon:'🏛️', label:'勝ち星を手土産に、有利な和睦へ', stat:'seiji', genre:'seiji', style:'safe', fit:2,
                  ok:'「勝ってから和睦する」——負けていないという事実が、何よりの交渉材料だーっ！' },
                { icon:'⚔️', label:'勢いに乗って追撃する', stat:'buyu', genre:'buyu', style:'risky', fit:0,
                  ok:'深追いは危険だ！ それでも一矢は報いた！' },
                { icon:'🤝', label:'秀吉の顔を立てつつ実を取る', stat:'ninbo', genre:'ninbo', style:'trick', fit:1,
                  ok:'頭は下げても損はしない！ したたかな引き際だ！' },
              ] },
          ],
          winText:'長久手で秀吉軍の別働隊を撃破！ 「秀吉に勝った唯一の男」の名声を手にしたまま、有利な条件で矛を収めた。のちに秀吉に臣従しても、この勝ち星があなたの格を守り続ける。',
          loseText:'【敗北】4倍の兵力差は、やはり重かった……。\n\n（育成終了。格上との対決は知力と政治＝情報と引き際で勝つ！）',
          winFx:{ koku:150, chiryaku:8, ninbo:5 } },

        { year:1586, type:'choice', title:'秀吉への臣従 — 耐える決断', art:'🐒🙇', artImg:'assets/ev_shinju.jpg',
          text:'関白となった秀吉が、妹を嫁がせ、実の母まで人質に送ってきた。「ここまでされて上洛せねば、こちらが悪者よ」。大坂城で秀吉に頭を下げるか——三河武士たちは「殿、戦いましょうぞ」と息巻いているが…。',
          choices:[
            { label:'頭を下げ、時を待つ（史実）', text:'大坂城で諸大名の前で臣従の礼を取った。屈辱に見えるが、これで徳川は安泰のまま力を蓄えられる。「いまは負けるが、最後に勝つ」——忍耐こそ、あなたの戦い方だ。', fx:{ seiji:8, ninbo:8, mood:-1 } },
            { label:'断固拒否し、戦の構えを見せる', text:'三河武士の意地を見せたが、結局は周囲の説得で上洛することに。胸はすいたが、秀吉の心証はやや悪くなった……それでも徳川の結束は固い。', fx:{ buyu:8, ninbo:3, koku:-30 } },
          ] },

        { year:1590, type:'story', title:'関東移封 — 江戸の街づくり', art:'🏗️🗾', artImg:'assets/ev_kanto.jpg',
          text:'小田原平定の後、秀吉に「関東250万石へ移れ」と命じられた。先祖代々の三河を離れる苦渋の国替え——だが、あなたは湿地だらけの寒村・江戸を見て言った。「ここを、日本一の町にする」。\n\n水路を掘り、台地を削り、家臣の屋敷を割り振る。のちの東京の原型が、いま生まれようとしている。',
          effects:{ seiji:10, koku:400 } },

        { year:1598, type:'story', title:'秀吉、死す — 五大老筆頭として', art:'🌅⚖️', artImg:'assets/ev_taiko_shi.jpg',
          text:'太閤秀吉が伏見城に没した。「秀頼のこと、くれぐれも頼み申す」——遺された幼い秀頼を支える五大老の筆頭が、あなただ。\n\nだが天下は再び動き始めている。武断派と文治派の対立、諸大名の駆け引き。嵐の前の静けさの中、あなたは静かに、しかし着実に手を打っていく。',
          effects:{ seiji:8, chiryaku:5 } },

        { year:1600, type:'battle', title:'関ヶ原の戦い — 天下分け目',
          terrain:{ icon:'🌫️', label:'関ヶ原 — 霧の盆地' }, bg:'assets/bg_sekigahara.jpg',
          intro:'石田三成が挙兵し、全国の大名が東軍と西軍に分かれた。舞台は関ヶ原——日本史上最大の野戦。この一日が、この先260年の歴史を決める。',
          enemyName:'石田三成の西軍', enemyIcon:'📋', enemyPower:590,
          army:{ me:75000, foe:80000 }, meUnit:'🛡️', foeUnit:'🗡️',
          open:[
            'ついに来た、天下分け目の関ヶ原！ 東軍7万5千、西軍8万！',
            '霧の晴れ間に旗が、旗が、見渡す限りの旗だーっ！ 日本史上最大の決戦、開幕！',
          ],
          rounds:[
            { situ:'夜明けの霧が晴れ、戦端が開かれた！ 西軍の陣形は山を背にした鶴翼…数も地形も向こうが上だ！',
              opts:[
                { icon:'⚔️', label:'福島・井伊ら先鋒に全力で当たらせる', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'井伊の赤備えが先陣を切ったーっ！ 火ぶたは東軍の勢いで始まった！' },
                { icon:'🧠', label:'敵の出方を見て後詰めを温存', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'焦らず戦況を読む…勝負所はまだ先だ！' },
                { icon:'🏛️', label:'戦いながら諸将に最後の書状を飛ばす', stat:'seiji', genre:'seiji', style:'trick', fit:1,
                  ok:'戦場でも筆は止めない！ 寝返りの種を蒔き続ける！' },
              ] },
            { situ:'松尾山の小早川秀秋、1万5千が動かない…どちらに付くか迷っている！ 決断させろ！',
              opts:[
                { icon:'💥', label:'松尾山へ向けて鉄砲を撃ちかける（問鉄砲）', stat:'seiji', genre:'seiji', style:'risky', fit:2, hist:true,
                  ok:'「早う決めよ」の催促の銃声ーっ！ 小早川勢、ついに山を下りて西軍に襲いかかった！' },
                { icon:'🤝', label:'重ねて使者を送り、恩賞を約束', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'約束の重さで心を動かす！ 小早川の旗が揺れている！' },
                { icon:'🧠', label:'動かぬなら動かぬで、別の崩し所を探す', stat:'chiryaku', genre:'chiryaku', style:'safe', fit:1,
                  ok:'戦線のほころびを見逃さない！ じわじわ押し始めた！' },
              ] },
            { situ:'小早川の寝返りで西軍が崩れ始めた！ 天下を決める最後の采配だ！',
              opts:[
                { icon:'⚔️', label:'全軍総攻撃、一気に押し切る', stat:'buyu', genre:'buyu', style:'safe', fit:2,
                  ok:'総がかりだーっ！ 西軍の陣が次々と崩れ、戦場の流れが決まった！' },
                { icon:'🤝', label:'敵将の降伏を受け入れながら進む', stat:'ninbo', genre:'ninbo', style:'safe', fit:1,
                  ok:'無駄な血を流さず勝つ！ 戦後の遺恨も少なくなる！' },
                { icon:'🧠', label:'敗走路を限定して追い込む', stat:'chiryaku', genre:'chiryaku', style:'trick', fit:1,
                  ok:'逃げ道を読み切った！ 敵主力の壊乱は決定的だ！' },
              ] },
          ],
          winText:'天下分け目の関ヶ原、わずか一日で決着！ 勝敗を分けたのは、戦の前から積み上げた調略と人脈——つまり、あなたがこれまで育ててきたすべてだった。天下は、徳川のものになった。',
          loseText:'【敗北】霧の関ヶ原に、東軍の旗が沈んだ……。\n\n（育成終了。天下分け目は総合力！ 4つのステータスをバランスよく鍛えよう！）',
          winFx:{ koku:400, buyu:5, seiji:8 } },

        { year:1603, type:'final', title:'征夷大将軍 — 泰平の世へ', art:'🏯📜',
          text:'朝廷から征夷大将軍に任じられ、江戸に幕府を開いた。人質の子が、ついに武家の頂点へ。\n\nだが大坂城には、まだ豊臣秀頼がいる。この天下を「戦のない世」として固めるために、最後の選択が残されている——。',
          survive:{
            title:'【IF】大御所の泰平 — 戦なき世',
            text:'あなたは大坂の豊臣家と争わない道を選んだ。秀頼に領国を安堵し、孫娘・千姫との縁を深め、力ではなく仕組みで天下を固める。\n\n豊臣は朝廷を支える家として残り、大坂の陣は起こらなかった。戦国は、最後の戦を待たずに静かに幕を下ろした——あなたが育てた知恵と人望が作った、もう一つの歴史である。\n\n「厭離穢土 欣求浄土」——戦乱の世を浄土に変える誓いが、ここに成就した。' },
          fall:{
            title:'江戸幕府、開く — 260年の泰平へ',
            text:'江戸幕府が開かれ、武家諸法度や参勤交代の仕組みが整えられていく。\n\n史実では、このあと大坂の陣（1614〜15）で豊臣家は滅び、戦国は完全に終わりを告げる。\n\nそれでもあなたが築いた江戸の世は260年続く、世界史でもまれな長い平和となった。「鳴くまで待とうホトトギス」——忍耐の人生が、最後にすべてを手に入れたのだ。' },
        },
      ],
    },
  };

  return { GENRES, WARLORDS, SKILLS, BATTLE_LINES, EPILOGUE, HEROES, QUESTIONS };
})();
