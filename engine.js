// ============================================================
// engine.js  –  GameEngine: プレイヤー状態・戦闘ロジック
// ============================================================
//
// 【目次】（エラー調査時はここを見て該当セクションへ飛ぶ）
//  §0  UIブリッジ（GameUI安全呼び出しラッパー）～ line  41
//  §1  プレイヤー初期値・戦闘状態変数          ～ line  30
//  §2  ステータス計算 getEffectiveStats         ～ line  95
//  §3  問題選択・道場解放判定                  ～ line 150
//  §4  キャラ名変更・ステータスリセット        ～ line 182
//  §5  ガチャ処理 pullGacha                    ～ line 228
//  §6  装備強化・売却・一括売却                ～ line 294
//  §7  戦闘開始 startDojo / startBoss          ～ line 404
//  §8  メインループ startBattleLoop            ～ line 533
//  §9  ボス攻撃・必殺技                        ～ line 620
//  §10 タイピング入力処理 handleKeyInput        ～ line 704
//  §11 戦闘終了 endBattle                      ～ line 906
//  §12 PvP・トーナメント                       ～ line 997
//  §13 セーブ・ロード・初期化                  ～ line 1176
//  §14 ユーティリティ（戦闘力・アバター）      ～ line 1258
//  §15 デバッグモード activateDebugMode         ～ line 1330  ← 本番配布前にボタン非表示にすること
//  §16 公開API return {}                        ～ line 1338
//
const GameEngine = (function() {
  let battleInterval = null;
  let isFeedbacking = false;
  let usedIndices = [];
  let _lastQuestion = null;
  let selectedModalItem = null;

let player = {
      name: 'アルケミスト',
      gold: 50000,
      dojoEnemyLevel: 1,
      rank: 1,          // 学習ランク（問題を解くと上がる・ステ非連動）
      rankExp: 0,       // 現ランク内のEXP進捗
      seenWelcome: false, // 初回ようこそ画面を見たか（新規プレイヤーのみ表示）
      defeatedBosses: [],
      hasClearedOnce: false,
      stats: { hp:0, atk:0, def:0, cpRecover:0, cpAtk:0, stanAtk:0, stanDef:0 },
      equipped: { weapon:null, head:null, body:null, feet:null, accessory:null },
      inventory: [],
      quizStats: {}   // 学習進捗: キー "genre|diff" → {c:正解数, t:出題数}
    };

    // ==========================================
    // §0 UIブリッジ (engine.js → GameUI 安全呼び出し用ラッパー)
    // ==========================================
    // ui.js は engine.js より後にロードされるため直接呼べない。
    // これらのラッパーを経由することで、GameUI 未ロード時も安全に動作する。
    function playSound(type)           { if (typeof GameUI !== 'undefined') GameUI.playSound(type); }
    function spawnParticles(isCrit)    { if (typeof GameUI !== 'undefined') GameUI.spawnParticles(isCrit); }
    function showGachaResults(r, m)    { if (typeof GameUI !== 'undefined') GameUI.showGachaResults(r, m); }
    function showGachaUntilResult(s)   { if (typeof GameUI !== 'undefined') GameUI.showGachaUntilResult(s); }
    function updateMenuUI()            { if (typeof GameUI !== 'undefined') GameUI.updateMenuUI(); }
    function showMenu()                { if (typeof GameUI !== 'undefined') GameUI.showMenu(); }
    function openEquipModal(item)      { if (typeof GameUI !== 'undefined') GameUI.openEquipModal(item); }
    function closeEquipModal()         { if (typeof GameUI !== 'undefined') GameUI.closeEquipModal(); }
    function updateDojoLevelUI(val)    { if (typeof GameUI !== 'undefined') GameUI.updateDojoLevelUI(val); }
    function flashPanel(kind)          { if (typeof GameUI !== 'undefined' && GameUI.flashPanel) GameUI.flashPanel(kind); }
    // 敵/ボスの登場演出（フェードイン＋ズーム）。アバター差し替え後に呼ぶ。
    function playBossEnter() {
      var el = document.getElementById('enemy-avatar');
      if (!el) return;
      el.classList.remove('boss-enter'); void el.offsetWidth; el.classList.add('boss-enter');
    }

    // 画像表示ヘルパー: imgPath が読み込めれば要素に画像を入れ、失敗時は emoji にフォールバック。
    // これにより assets/ に画像が無くても従来の絵文字で動作する。
    function setVisualImg(el, imgPath, emoji) {
      if (!el) return;
      el.textContent = emoji || '';           // まず絵文字（フォールバック既定）
      el.style.backgroundImage = '';
      if (!imgPath) return;
      const img = new Image();
      img.onload = function() {
        el.textContent = '';
        // サイズは CSS 側（#enemy-avatar img 等）で制御する。インライン指定はしない。
        img.style.objectFit = 'contain'; img.style.display = 'block';
        el.appendChild(img);
      };
      img.src = imgPath; // 失敗時は onload が呼ばれず絵文字のまま
    }

    // 戦闘画面の背景を級別に設定（画像が無ければ何もしない＝従来の暗色背景のまま）
    function setBattleBackground(tier) {
      const el = document.getElementById('screen-battle');
      if (!el) return;
      const path = 'assets/bg/bg_' + tier + '.png';
      const test = new Image();
      test.onload = function() {
        // テキストの可読性確保のため暗いオーバーレイを重ねる
        el.style.background = "linear-gradient(rgba(15,23,42,.78),rgba(15,23,42,.88)), url('" + path + "') center/cover no-repeat";
      };
      test.src = path;
    }

    // 戦闘状態
    let battle = {
      active: false,
      mode: 'dojo', 
      difficulty: 'junior',
      bossId: null,
      
      playerHp: 100,
      playerMaxHp: 100,
      enemyHp: 100,
      enemyMaxHp: 100,
      
      enemyActionGauge: 0, 
      enemyUltGauge: 0,    
      
      currentCombo: 0,
      comboBuffs: [],      
      
      currentQuestion: null,
      typedSoFar: '',
      
      isStunned: false,    
      stunTimeLeft: 0,
      
      enemyIsStunned: false, 
      enemyStunTimeLeft: 0,

      normalAttackCount: 0,
      goldEarnedInSession: 0, 
      expEarnedInSession: 0,   
      
      missCount: 0,
      isRaged: false,
      dojoEnemyLevel: 1,
      enemySlowTimeLeft: 0,

      // 出題範囲フィルタ（道場で図書館設定を反映。null=制限なし）
      filterGenres: null,   // 例 ['formula','reaction'] / null=全ジャンル
      filterType: null,     // 'typing' / 'choice' / null=両方

      // クイズ（ボス必殺技の選択式）状態。表示中はタイピングを無効化する。
      quizActive: false,
      quizCorrect: 0,
      quizChoiceCount: 0,

      // ⏸ ポーズ状態。trueの間は戦闘ループ(敵の進行)も入力も止める。
      paused: false
    };


    // ==========================================
    //            3. LOGIC & GAME ENGINE
    // ==========================================

    function getEffectiveStats(targetPlayer = player) {
      const stats = targetPlayer.stats || {};

      // 装備からの寄与を集計: メインステータスの実数値(flatMain) と ボーナス枠のレベル(bonusLv)
      const flatMain = {};   // stat → 実数加算（メインステータス）
      const bonusLv  = {};   // stat → 合計ボーナスレベル（個体値の代替）
      const skills   = new Set(); // 装備中ユニークスキル名
      Object.keys(targetPlayer.equipped).forEach(slot => {
        const item = targetPlayer.equipped[slot];
        if (!item) return;
        const upgradeBonus = 1 + (item.level * 0.01);
        const transBonus   = 1 + (item.trans * 0.25);
        flatMain[item.stat] = (flatMain[item.stat] || 0) + item.baseVal * upgradeBonus * transBonus;
        if (Array.isArray(item.bonusStats)) {
          item.bonusStats.forEach(b => { bonusLv[b.key] = (bonusLv[b.key] || 0) + b.lv; });
        }
        if (item.skill && item.skill !== 'なし') skills.add(item.skill);
      });
      const has = (name) => skills.has(name);

      // 単純明快な「％強化」スキル（初心者向け）。同名でも装備個数ぶん加算＝重ねて装備すれば伸びる。
      let dmgBonusPct = 0, hpBonusPct = 0;
      Object.values(targetPlayer.equipped).forEach(it => {
        if (!it || !it.skill) return;
        if (it.skill === 'ダメージ+50%') dmgBonusPct += 0.50;
        else if (it.skill === 'ダメージ+25%') dmgBonusPct += 0.25;
        else if (it.skill === 'HP+25%') hpBonusPct += 0.25;
      });

      // ステータス振り + ボーナス枠の合計レベルから上昇量を求める（キャップ方針を適用）
      function gain(key) {
        const m = GameData.STAT_META[key];
        let lv = (stats[key] || 0) + (bonusLv[key] || 0);
        if (m && m.cap === 'hard') lv = Math.min(50, lv); // 突破でバランスが壊れる系は頭打ち
        return GameData.getStatGainTotal(key, lv);
      }
      const main = (key) => flatMain[key] || 0;

      // 指数系（基礎値 + 振り + メイン装備）
      const hp        = 100 + Math.floor(gain('hp')  + main('hp'));
      const atk       = 10  + Math.floor(gain('atk') + main('atk'));
      const def       = 0   + Math.floor(gain('def') + main('def'));

      // ── 旧「コンボ系/防御系/スタン系」ステは廃止→コンボ機構の基準値＋スキル駆動に（返り値の項目名は維持＝戦闘コード無改修） ──
      const cpRecover = Math.max(5, Math.floor(hp * 0.01));     // コンボ回復: 最大HPの1%/発動（コンボ機構の基準値）
      const cpAtk     = Math.max(5, Math.floor(atk * 0.05));    // コンボ攻撃バフ: 攻撃力の5%/スタック（基準値）
      const comboDur  = 0;                                      // コンボ継続延長（基準0・将来スキルで延長可）
      const shield    = has('シールド付与') ? Math.floor(hp * 0.30) : 0; // スキル: 戦闘開始時シールド = 最大HP30%
      const stanAtk   = 2.0 + (has('気絶付与') ? 1.5 : 0);      // 必殺正解で敵を気絶させる秒数（スキルで延長）
      const stanDef   = has('必殺耐性') ? 1.0 : 3.0;            // 被気絶の秒数（必殺耐性スキルで短縮）
      const ultResist = has('必殺耐性') ? 0.30 : 0;             // 必殺ダメージ軽減（必殺耐性スキル）
      const vamp      = has('吸血') ? 0.20 : 0;                 // 吸血率（吸血スキル）

      // 割合・回数系（hard キャップ系は出力側でも頭打ち）。命中はプレイヤー初期100%（敵回避は「必中」スキルで対処）。
      //  crit/critDmg/multi/dodge は装備メインステ(main)も受け付ける＝装備でビルドを組める。
      let   critRate = Math.min(0.80, 0.05 + gain('crit') + main('crit'));   // クリ率: 既定5%〜最大80%
      const critMult = 1.5 + gain('critDmg') + main('critDmg');             // クリ倍率: 既定1.5×（上限なし）
      const atkCount = 1 + Math.floor(gain('multi') + main('multi'));        // 連撃数: 既定1回
      const dodge    = Math.min(0.50, gain('dodge') + main('dodge'));        // 回避率
      let   goldMul  = 1.0 + gain('goldMul') + main('goldMul');              // ゴールド倍率

      // ── ユニークスキルの静的効果（ステータスに直接反映するもの） ──
      let atkVal = atk;             // 攻撃力（スキルで増減）
      let hitDmgMult = 1.0;         // 命中ごとのダメージ倍率（賭博師の刃）
      let takenMult = 1.0;          // 被ダメージ倍率（血の契約）
      let forceDoubleHit = false;   // 冷静な一撃: クリ無しで全打撃2倍
      let noHeal = false;           // 錬金術師の欲望: 戦闘中回復不可
      let ignoreEvade = false;      // 必中の理: 敵回避を無視して必ず命中
      let fixedHitChance = null;    // 賭博師の刃: 命中率を固定値に
      if (has('必中の理'))   { ignoreEvade = true; atkVal = Math.floor(atkVal * 0.7); }
      if (has('賭博師の刃')) { fixedHitChance = 0.30; hitDmgMult *= 5; }
      if (has('血の契約'))   { atkVal = Math.floor(atkVal * 1.5); takenMult *= 2; }
      if (has('冷静な一撃')) { critRate = 0; forceDoubleHit = true; }
      if (has('錬金術師の欲望')) { goldMul += 2.0; noHeal = true; }
      if (has('ヒント'))     { atkVal = Math.floor(atkVal * 0.7); }   // 攻撃-30%。出題ヒントは renderQuestion/renderChoiceButtons 側で表示
      if (has('コンボ爆撃')) { atkVal = Math.floor(atkVal * 0.4); }   // 攻撃-60%。コンボ消費の爆撃が火力源（comboBurst）
      if (dmgBonusPct > 0)   { atkVal = Math.floor(atkVal * (1 + dmgBonusPct)); } // 単純％強化（ダメージ+N%）

      // ボーナスモンスター出現率アップ（装備スキル 'ボーナス出現率+N%' を合算）
      let bonusSpawnRate = 0;
      skills.forEach(s => { const m = /ボーナス出現率\+(\d+)%/.exec(s); if (m) bonusSpawnRate += (+m[1]) / 100; });

      // ── 恒久バフ（裏ボス撃破のメタ進行）: 装備・振りを全部足した最終値に適用 ──
      const perma = GameData.getPermaBuffTotals(targetPlayer.defeatedEndgame);
      const hpFinal  = Math.floor(hp    * (1 + perma.hp) * (1 + hpBonusPct));
      const atkFinal = Math.floor(atkVal * (1 + perma.atk));
      const defFinal = Math.floor(def   * (1 + perma.def));
      goldMul += perma.goldMul;

      return {
        hp: hpFinal, atk: atkFinal, def: defFinal, cpRecover, cpAtk, shield,
        stanAtk, stanDef, ultResist,
        atkCount, critRate, critMult,
        vamp, dodge, comboDur, goldMul,
        // 戦闘ループ向けスキル情報
        hitDmgMult, takenMult, forceDoubleHit, noHeal, ignoreEvade, fixedHitChance, bonusSpawnRate,
        perma,
        skills: Array.from(skills)
      };
    }

    // ── 重みづけ問題選択（現在の難易度70% / 1つ下20% / 2つ下10%）──
    //  tier   : 難易度キー（'junior'/'mid'/'senior'/'supreme'）
    //  genres : 絞り込むジャンル配列（null/空=全ジャンル）
    //  type   : 'typing'/'choice'（null=両方）
    //  ※ 図書館で設定した範囲（道場の battle.filterGenres / battle.filterType）を尊重する。
    // 選んだ難易度の中で「最上位ほど出やすい」重み付け。小さいほど上に偏る（0.4=上位約6割）。
    const DIFF_TOP_BIAS = 0.4;

    // 配列で複数難易度が渡された道場用: 選択集合の中から最上位偏重で1問。
    //  単一の文字列(tier)が渡された場合は従来挙動（ボス等）に委譲する。
    function getWeightedQuestion(tier, genres, type, grades) {
      if (Array.isArray(tier)) return _weightedFromDiffSet(tier, genres, type, grades);
      const tiers = ['junior', 'mid', 'senior', 'supreme'];
      const idx = tiers.indexOf(tier);
      const r = Math.random();
      let selectedTier = tier;
      if (idx >= 1 && r > 0.7)  selectedTier = tiers[idx - 1];
      if (idx >= 2 && r > 0.9)  selectedTier = tiers[idx - 2];

      // 選んだ難易度でフィルタに合う問題を取得。空なら指定難易度のみ→さらに空なら全難易度で再取得。
      let pool = GameData.getQuestions({ diff: selectedTier, genres: genres, type: type, grades: grades });
      if (pool.length === 0) pool = GameData.getQuestions({ diff: tier, genres: genres, type: type, grades: grades });
      if (pool.length === 0) pool = GameData.getQuestions({ genres: genres, type: type, grades: grades });
      if (pool.length === 0) pool = GameData.getQuestions({ diff: tier }); // 最終フォールバック
      if (pool.length === 0) return null;

      let q, tries = 0;
      do { q = pool[Math.floor(Math.random() * pool.length)]; tries++; }
      while (q === _lastQuestion && tries < 10 && pool.length > 1);
      _lastQuestion = q;
      return q;
    }

    // 複数難易度（道場の範囲選択）から最上位偏重で1問選ぶ。grades=学年の絞り込み（任意）。
    function _weightedFromDiffSet(diffs, genres, type, grades) {
      const order = ['junior', 'mid', 'senior', 'supreme'];
      // 実際に問題が存在する難易度だけ残し、低→高に並べる
      let avail = (diffs || [])
        .filter(d => order.indexOf(d) >= 0)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .filter(d => GameData.getQuestions({ diff: d, genres: genres, type: type, grades: grades }).length > 0);
      // フォールバック: 形式を外す→ジャンルだけ→選択難易度だけ
      if (avail.length === 0) {
        let pool = GameData.getQuestions({ diffs: diffs, genres: genres, grades: grades });
        if (pool.length === 0) pool = GameData.getQuestions({ genres: genres, type: type, grades: grades });
        if (pool.length === 0) pool = GameData.getQuestions({ diffs: diffs });
        if (pool.length === 0) return null;
        let q0 = pool[Math.floor(Math.random() * pool.length)];
        _lastQuestion = q0;
        return q0;
      }
      // 最上位（配列末尾）= 重み1、下にいくほど ×DIFF_TOP_BIAS
      const weights = new Array(avail.length);
      for (let i = avail.length - 1, w = 1; i >= 0; i--, w *= DIFF_TOP_BIAS) weights[i] = w;
      const total = weights.reduce((s, x) => s + x, 0);
      let r = Math.random() * total, picked = avail[avail.length - 1];
      for (let i = avail.length - 1; i >= 0; i--) { r -= weights[i]; if (r <= 0) { picked = avail[i]; break; } }

      const pool = GameData.getQuestions({ diff: picked, genres: genres, type: type, grades: grades });
      let q, tries = 0;
      do { q = pool[Math.floor(Math.random() * pool.length)]; tries++; }
      while (q === _lastQuestion && tries < 10 && pool.length > 1);
      _lastQuestion = q;
      return q;
    }

    // 各道場のアンロック状態を取得する
    function getDojoUnlockStatus() {
      const def = player.defeatedBosses || [];
      const juniorCleared = ['b1_1', 'b1_2', 'b1_3'].every(id => def.includes(id));
      const midCleared = ['b2_1', 'b2_2', 'b2_3'].every(id => def.includes(id));
      const seniorCleared = ['b3_1', 'b3_2', 'b3_3'].every(id => def.includes(id));

      return {
        junior: true,
        mid: juniorCleared,
        senior: midCleared,
        supreme: seniorCleared
      };
    }

    // ✏️ キャラクター名の変更機能（モーダルを開く）
    function changePlayerName() {
      document.getElementById('new-player-name-input').value = player.name;
      document.getElementById('name-edit-modal').classList.remove('hidden');
    }

    // ✏️ キャラクター名変更のモーダルを閉じる
    function closeNameEditModal() {
      document.getElementById('name-edit-modal').classList.add('hidden');
    }

    // ✏️ 変更を適用して保存
    function savePlayerName() {
      const nameInput = document.getElementById('new-player-name-input').value.trim();
      if (nameInput.length > 0) {
        player.name = nameInput;
        saveUserDataLocal();
        closeNameEditModal(); // 先にモーダルを閉じる
        playSound('skill');
        updateMenuUI();       // 閉じた後にUI更新
      } else {
        alert('名前を入力してください！');
      }
    }

    // 🎓 自分の学年を保存（1=中1 / 2=中2 / 3=中3 / null=未設定）。出題範囲の警告判定に使う。
    function setPlayerGrade(g) {
      player.grade = (g === 1 || g === 2 || g === 3) ? g : null;
      saveUserDataLocal();
      updateMenuUI();
    }

    // 🔄 ステータス振り直し: 全ステータスを0に戻し、消費ゴールドの70%を返金
    //   （statPoints方式は廃止。直接強化に投じた額をコスト関数から再計算する）
    function resetStatPointsAction() {
      // 合計レベル基準のコスト曲線に沿って、0→現在合計までの総額を再計算
      const _totalLv = GameData.getTotalStatLevels(player.stats);
      let totalSpent = 0;
      for (let i = 0; i < _totalLv; i++) totalSpent += GameData.getStatUpgradeCost(i);
      if (totalSpent <= 0) { alert('振り直すステータスがありません。'); return; }
      const refund = Math.floor(totalSpent * 0.70);
      if (!confirm('全ステータスを0に戻し、' + refund.toLocaleString() + ' G を返金します。よろしいですか？')) return;

      Object.keys(player.stats).forEach(key => { player.stats[key] = 0; });
      player.gold += refund;

      saveUserDataLocal();
      playSound('skill');
      if (typeof GameUI !== 'undefined') GameUI.renderStatList();
      updateMenuUI();
      alert('ステータスを振り直しました！ ' + refund.toLocaleString() + ' G を返金しました。');
    }

    // そのガチャの最高レアリティ（10+1連の確定枠用）
    function _topRarity(db) {
      const order = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Relic'];
      let top = 'Common';
      Object.keys(db.rates).forEach(rar => {
        if (db.rates[rar] > 0 && order.indexOf(rar) > order.indexOf(top)) top = rar;
      });
      return top;
    }
    // レアリティから装備を生成しインベントリに追加（UIなし）
    //  theme: UR(Relic)排出時に UNIQUE をこの系統で絞る（攻撃/耐久/コンボ/特殊）。null=全UR。
    function _createEquip(selectedRarity, theme) {
      let pool;
      if (selectedRarity === 'Relic') {
        pool = GameData.UNIQUE_EQUIP_TEMPLATES;
        if (theme) {
          const f = pool.filter(t => t.theme === theme);
          if (f.length) pool = f;
        }
      } else {
        pool = GameData.BASE_EQUIP_TEMPLATES;
      }
      const template = pool[Math.floor(Math.random() * pool.length)];
      const newEquip = {
        uniqueId: 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
        id: template.id, type: template.type, name: template.name, stat: template.stat,
        baseVal: template.baseVal * GameData.RARITY_DB[selectedRarity].mult,
        bonusStats: GameData.rollBonusStats(selectedRarity),
        emoji: template.emoji, skill: template.skill, rarity: selectedRarity, level: 0, trans: 0
      };
      player.inventory.push(newEquip);
      return newEquip;
    }
    // ガチャ結果カードのHTML（compact=10連グリッド用 / isBonus=確定枠）
    function _gachaCardHtml(eq, compact, isBonus) {
      const rData = GameData.RARITY_DB[eq.rarity];
      const mainName = GameData.STAT_NAMES_JP[eq.stat] || eq.stat;
      const mainShown = (eq.baseVal >= 1) ? Math.floor(eq.baseVal) : eq.baseVal.toFixed(2);
      if (compact) {
        return `<div class="relative p-1 border rounded-lg text-center ${rData.color}">
          ${isBonus ? '<span class="absolute -top-1 -right-1 text-[7px] bg-yellow-500 text-slate-900 font-black px-1 rounded z-10">確定</span>' : ''}
          <div class="text-xl">${eq.emoji}</div>
          <div class="text-[7px] font-bold truncate">${eq.name}</div>
          <div class="text-[7px] opacity-80">${rData.name.split(' ')[0]}</div>
        </div>`;
      }
      const bonusHtml = (eq.bonusStats || []).map(b =>
        `<div class="text-[9px] text-emerald-300">+ ${GameData.STAT_NAMES_JP[b.key] || b.key} <span class="text-emerald-400 font-bold">Lv+${b.lv}</span></div>`
      ).join('');
      const skillHtml = (eq.skill && eq.skill !== 'なし')
        ? `<div class="text-[9px] mt-1 text-amber-300 font-bold">★ ${eq.skill}</div>` : '';
      return `<div class="p-3 border-2 rounded-xl text-center animate-bounce-once w-full max-w-xs ${rData.color}">
          <div class="text-3xl mb-1">${eq.emoji}</div>
          <div class="font-black text-white text-sm">${eq.name}</div>
          <span class="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-900/80">${rData.name}</span>
          <div class="text-[10px] text-cyan-400 mt-1 font-mono">${mainName} +${mainShown}</div>
          <div class="mt-1">${bonusHtml}</div>${skillHtml}
        </div>`;
    }

    // ── ガチャ価格（ボス撃破による逓減を反映）──
    function gachaPrice(tier) {
      const db = GameData.GACHA_DB[tier];
      if (!db) return 0;
      const cleared = GameData.GACHA_MILESTONE_BOSSES.filter(id => (player.defeatedBosses || []).indexOf(id) >= 0).length;
      return GameData.getGachaPrice(db.price, cleared);
    }
    function _rarityRank(r) { return ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Relic'].indexOf(r); }
    // 自動売却: 設定レア度以下なら、インベントリから除いて売却額を加算。売却したら売却額(>0)を返す。
    function _maybeAutoSell(eq) {
      const th = player.autoSellRarity;
      if (!th) return 0;
      if (_rarityRank(eq.rarity) <= _rarityRank(th)) {
        const idx = player.inventory.indexOf(eq);
        if (idx >= 0) player.inventory.splice(idx, 1);
        const gold = GameData.RARITY_DB[eq.rarity].sell;
        player.gold += gold;
        eq._autoSold = gold; // 結果表示用フラグ
        return gold;
      }
      return 0;
    }
    // db.rates から1個ぶんのレアリティを抽選
    function _rollRarity(db) {
      const r = Math.random(); let cum = 0;
      for (const k in db.rates) { cum += db.rates[k]; if (r <= cum) return k; }
      return 'Common';
    }

    // ── 希望ステータスが出るまで連続ガチャ ──
    //  停止条件: ①希望ステータスのメイン装備が出た / ②インベントリ満杯(200) / ③ゴールド不足
    //  自動売却が有効でも、希望ステータスの装備は売らずに残して停止する。
    function pullUntilStat(tier, targetStat) {
      const db = GameData.GACHA_DB[tier];
      if (!db) return;
      if (db.requiresClear && !player.hasClearedOnce) { alert('🔒 このガチャはラスボス撃破で解禁されます！'); return; }
      if (!targetStat) { alert('希望するステータスを選んでください。'); return; }
      let pulls = 0, spent = 0, soldGold = 0, soldCount = 0, found = null, stop = '';
      const MAX = 2000; // 暴走防止の安全上限
      while (pulls < MAX) {
        const price = gachaPrice(tier);
        if (player.gold < price) { stop = 'gold'; break; }
        if (player.inventory.length >= 200) { stop = 'full'; break; }
        player.gold -= price; spent += price; pulls++;
        const eq = _createEquip(_rollRarity(db), db.theme);
        if (eq.stat === targetStat) { found = eq; stop = 'found'; break; } // 希望ステ＝売らずに残す
        const g = _maybeAutoSell(eq);
        if (g > 0) { soldGold += g; soldCount++; }
      }
      saveUserDataLocal();
      showGachaUntilResult({ pulls, spent, soldGold, soldCount, found, stop, targetStat });
      updateMenuUI();
    }

    // 10連＋1連（11個）。費用は単発×10。最後の1個は必ずそのガチャの最高レアリティ。
    function pullGachaMulti(tier) {
      const db = GameData.GACHA_DB[tier];
      if (!db) return;
      if (db.requiresClear && !player.hasClearedOnce) {
        alert('🔒 このガチャはラスボス「アポカリプス」を撃破すると解禁されます！');
        return;
      }
      if (player.inventory.length + 11 > 200) {
        alert('インベントリの空きが足りません！（11枠必要）不要な装備を売却してください。');
        return;
      }
      const cost = gachaPrice(tier) * 10;
      if (player.gold < cost) { alert('ゴールドが足りません！（10連: 🪙' + cost.toLocaleString() + '）'); return; }

      player.gold -= cost;
      playSound('skill');
      const results = [];
      for (let i = 0; i < 10; i++) {
        const eq = _createEquip(_rollRarity(db), db.theme);
        _maybeAutoSell(eq);
        results.push(eq);
      }
      const last = _createEquip(_topRarity(db), db.theme); // ＋1（最高レア確定）
      _maybeAutoSell(last);
      results.push(last);
      saveUserDataLocal();
      showGachaResults(results, true); // 演出付きで表示
      updateMenuUI();
    }

    function pullGacha(tier) {
      const db = GameData.GACHA_DB[tier];
      if (!db) return;
      // UR専用ガチャはラスボス撃破まで解禁されない
      if (db.requiresClear && !player.hasClearedOnce) {
        alert('🔒 このガチャはラスボス「アポカリプス」を撃破すると解禁されます！');
        return;
      }
      const price = gachaPrice(tier);
      if (player.gold < price) {
        alert('ゴールドが足りません！');
        return;
      }
      // 🎒 インベントリを200枠に拡張
      if (player.inventory.length >= 200) {
        alert('インベントリがいっぱいです！不要な装備を売却してください。');
        return;
      }

      player.gold -= price;

      // レアリティ抽選 → 装備生成 → 自動売却判定
      const newEquip = _createEquip(_rollRarity(db), db.theme);
      _maybeAutoSell(newEquip);
      saveUserDataLocal();
      showGachaResults([newEquip], false); // 抽選演出付きで表示
      updateMenuUI();
    }

    function upgradeEquip(item) {
      if (item.level >= 100) {
        alert('最大レベルに達しています！');
        return;
      }
      const cost = Math.floor(100 * Math.pow(1.08, item.level));
      if (player.gold < cost) {
        alert('ゴールドが足りません！');
        return;
      }

      player.gold -= cost;
      item.level += 1;
      saveUserDataLocal();
      playSound('skill');
      openEquipModal(item);
      updateMenuUI();
    }

    function transcendEquip(item) {
      if (item.trans >= 5) {
        alert('最大超越（+5）に達しています！');
        return;
      }
      // 超越には同じ種類・同じレアリティの装備が必要（レアリティが違うものは不可）
      const idx = player.inventory.findIndex(inv => inv.id === item.id && inv.rarity === item.rarity && inv.uniqueId !== item.uniqueId);
      if (idx === -1) {
        alert('超越には、同じ種類の装備（インベントリに未装備で保管）が必要です！');
        return;
      }

      player.inventory.splice(idx, 1);
      item.trans += 1;
      saveUserDataLocal();
      playSound('skill');
      openEquipModal(item);
      updateMenuUI();
    }

    function sellEquip(item) {
      if (player.equipped[item.type] && player.equipped[item.type].uniqueId === item.uniqueId) {
        player.equipped[item.type] = null;
      }
      const invIdx = player.inventory.findIndex(inv => inv.uniqueId === item.uniqueId);
      if (invIdx !== -1) player.inventory.splice(invIdx, 1);

      const baseEarn = GameData.RARITY_DB[item.rarity].sell;
      const upgradeRefund = item.level * 30;
      const earn = baseEarn + upgradeRefund;

      player.gold += earn;
      saveUserDataLocal();
      playSound('skill');
      closeEquipModal();
      updateMenuUI();
    }

    // 🎒 一括売却機能（レアリティ選択対応版）
    function bulkSellInventory() {
      const equippedIds = Object.values(player.equipped).filter(eq => eq).map(eq => eq.uniqueId);

      // チェックボックスで選択されたレアリティを収集
      const targetRarities = [];
      const filterMap = {
        'sell-filter-common': 'Common',
        'sell-filter-uncommon': 'Uncommon',
        'sell-filter-rare': 'Rare',
        'sell-filter-epic': 'Epic',
        'sell-filter-legendary': 'Legendary',
        'sell-filter-relic': 'Relic'   // UR（旧Relic）
      };
      Object.keys(filterMap).forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) targetRarities.push(filterMap[id]);
      });

      if (targetRarities.length === 0) {
        alert('売却するレアリティを1つ以上選択してください！');
        return;
      }

      const toSell = player.inventory.filter(item =>
        targetRarities.includes(item.rarity) && !equippedIds.includes(item.uniqueId)
      );

      if (toSell.length === 0) {
        alert('選択したレアリティの未装備アイテムが見つかりません！');
        return;
      }

      let totalEarn = 0;
      toSell.forEach(item => { totalEarn += GameData.RARITY_DB[item.rarity].sell + (item.level * 30); });

      const rarityNames = targetRarities.map(r => GameData.RARITY_DB[r].name.split(' ')[0]).join('・');
      if (confirm(`[${rarityNames}] を一括売却しますか？\n対象: ${toSell.length}個 / 獲得: 🪙 ${totalEarn.toLocaleString()}`)) {
        player.inventory = player.inventory.filter(item => !toSell.includes(item));
        player.gold += totalEarn;
        saveUserDataLocal();
        playSound('skill');
        updateMenuUI();
        alert(`売却完了！🪙 ${totalEarn.toLocaleString()}ゴールドを獲得しました。`);
      }
    }

    // ==========================================
    //            4. BATTLE ENGINE (戦闘処理)
    // ==========================================

    //  difficulty : 難易度キー
    //  filterGenres : 出題ジャンル配列（null/空=全ジャンル）
    //  filterType   : 'typing'/'choice'/null（出題形式）
    function startDojo(difficulty, filterGenres, filterType, filterGrades) {
      const order = ['junior', 'mid', 'senior', 'supreme'];
      // difficulty は配列（範囲選択）または文字列（図書館など旧経路）。配列に正規化。
      // 難易度のハードロックは廃止：全難易度を最初から選べる（案内は学年警告に一本化）。
      let diffs = (Array.isArray(difficulty) ? difficulty.slice() : [difficulty])
        .filter(d => order.indexOf(d) >= 0);
      if (diffs.length === 0) diffs = ['junior'];
      diffs.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const topDiff = diffs[diffs.length - 1]; // 最上位＝報酬・敵の強さ・速度の基準

      battle.active = true;
      battle.mode = 'dojo';
      battle.diffs = diffs;
      battle.difficulty = topDiff;
      battle.filterGenres = (filterGenres && filterGenres.length) ? filterGenres : null;
      battle.filterType = filterType || null;
      battle.filterGrades = (filterGrades && filterGrades.length) ? filterGrades : null; // 学年の絞り込み（任意）
      // 道場の必殺クイズ教科: 選択ジャンルの教科から導出（混在/未指定なら null=全教科）
      battle.subject = (function(){
        if (!battle.filterGenres) return null;
        const subs = battle.filterGenres.map(k => { const g = GameData.GENRES.find(x => x.key === k); return g ? g.subject : null; });
        const uniq = subs.filter((v,i,a) => v && a.indexOf(v) === i);
        return uniq.length === 1 ? uniq[0] : null;
      })();
      battle.dojoEnemyLevel = player.dojoEnemyLevel || 1;
      battle.enemySlowTimeLeft = 0;
      battle.currentCombo = 0;
      battle.comboBuffs = [];
      battle.isStunned = false;
      battle.enemyIsStunned = false;
      battle.goldEarnedInSession = 0;
      battle.expEarnedInSession = 0;
      battle.missCount = 0;
      battle.isRaged = false;
      usedIndices = []; 

      const stats = getEffectiveStats();
      battle.playerMaxHp = stats.hp;
      battle.playerHp = stats.hp;
      initBattleSkillState(stats);

      const _dLbl = { junior:'基礎', mid:'応用', senior:'発展', supreme:'受験' };
      const _diffTitle = diffs.length > 1 ? `${_dLbl[topDiff]}まで` : _dLbl[topDiff];
      document.getElementById('battle-mode-title').textContent = `道場特訓: ${_diffTitle} (敵Lv.${player.dojoEnemyLevel})`;
      try {
        spawnNextDojoEnemy();
      } catch(e) {
        console.error('spawnNextDojoEnemy error:', e);
        document.getElementById('debug-error-box').style.display='block';
        document.getElementById('debug-error-box').textContent = '🐛 spawnNextDojoEnemy: ' + e.message;
        battle.active = false;
        return;
      }
      setBattleBackground(topDiff);
      GameUI.showBattleScreen();
      startBattleLoop();
    }

    function spawnNextDojoEnemy() {
      isFeedbacking = false;
      battle.missCount = 0;
      battle.isRaged = false;
      var _rwb = document.getElementById('rage-warning-badge'); if(_rwb) _rwb.classList.add('hidden');
      var _blp = document.getElementById('battle-left-panel'); if(_blp) _blp.classList.remove('rage-active');
      document.getElementById('enemy-avatar').classList.remove('scale-150', 'text-red-500');
      // 道場: 難易度ごとのグロー色
      const _dojoGlow = { junior:'0 0 20px #22d3ee', mid:'0 0 20px #f97316', senior:'0 0 22px #a78bfa', supreme:'0 0 25px #f43f5e' };
      const _dojoAv = document.getElementById('enemy-avatar');
      _dojoAv.style.filter = `drop-shadow(${_dojoGlow[battle.difficulty] || '0 0 20px #22d3ee'})`;

      let prob = getWeightedQuestion(battle.diffs || [battle.difficulty], battle.filterGenres, battle.filterType, battle.filterGrades);
      prob = _reduceDojoChoices(prob); // 道場の選択式は2択にやさしく
      battle.currentQuestion = prob;
      battle.qHadMiss = false; // 新しい問題＝ミスフラグをリセット（正答率用）
      battle.typedSoFar = '';

      // [TEST修正] 問題難易度は敵の強さに影響させない方針 → 敵HPは「敵レベルのみ」で決める。
      //  （旧: const mult = 難易度1/3/8/25; enemyMaxHp = 100*mult*lvScale）。ゴールド倍率は据え置き。
      const lvScale = Math.max(1, battle.dojoEnemyLevel || 1);
      battle.enemyMaxHp = 100 * lvScale;
      battle.enemyHp = battle.enemyMaxHp;
      battle.enemyActionGauge = 0;
      battle.enemyUltGauge = 0;

      // 道場の通常敵の回避率（レベル/5 ％・上限50%）
      battle.enemyEvade = Math.min(0.5, (lvScale / 5) / 100);
      battle.isBonus = false;
      battle.bonusTimeLeft = 0;

      // ✨ ボーナスモンスター抽選（基本1% + 装備の『ボーナス出現率+N%』）
      const _eff = getEffectiveStats();
      if (Math.random() < (0.01 + (_eff.bonusSpawnRate || 0))) {
        battle.isBonus = true;
        battle.enemyEvade = 0.85;   // 非常に高い回避（命中率を上げるほど狩りやすい）
        // HPは敵レベルで増加: Lv1〜10=5, Lv11〜20=6 … 10レベルごとに+1（1ダメージずつしか通らない）
        const bonusHp = 5 + Math.floor((lvScale - 1) / 10);
        battle.enemyMaxHp = bonusHp;
        battle.enemyHp = bonusHp;
        battle.bonusTimeLeft = 30.0; // 30秒で逃走
      }

      // スロー: 式の長さに応じて (選択式は文字数が無いので一律1.0秒)
      const flen = (prob && prob.formula) ? prob.formula.length : 0;
      battle.enemySlowTimeLeft = prob.type === 'choice' ? 1.0 : (flen >= 5 ? flen * 0.05 : 0.1);
      document.getElementById('slow-badge').classList.remove('hidden');

      if (battle.isBonus) {
        setVisualImg(document.getElementById('enemy-avatar'), 'assets/mob/mob_bonus.png', '🪙');
        document.getElementById('enemy-name').textContent = '黄金結晶オーラム ✨BONUS✨';
        GameUI.showDamagePopup('ボーナスモンスター出現！', true, true);
        playSound('skill');
      } else {
        // 道場通常敵: 個別画像 assets/mob/dojo_1〜6.png をランダム表示（無ければ絵文字👾）
        const _v = 1 + Math.floor(Math.random() * 6);
        setVisualImg(document.getElementById('enemy-avatar'), 'assets/mob/dojo_' + _v + '.png', '👾');
        document.getElementById('enemy-name').textContent = `道場の仮想敵 [Lv.${lvScale}]`;
      }
      playBossEnter();

      // 問題を描画（タイピング or 選択式を出し分け。道場はヒントあり）
      renderQuestion(prob, true);

      GameUI.updateBattleUI();
    }

    // ── 問題描画（タイピング/選択式の出し分け）──
    //  prob     : 問題オブジェクト
    //  showHint : true=道場（答えをヒント表示）/ false=ボス（暗記勝負）
    // タイピング入力をマス目HTMLで描画。1文字=1マス。
    //  reveal: 'all'(道場=お手本全表示) / 'first'(ヒント武器=先頭1文字) / 'none'(ボス=伏せる)
    function buildAnswerCells(formula, typedLen, reveal) {
      formula = String(formula || '');
      let html = '';
      for (let i = 0; i < formula.length; i++) {
        const ch = formula.charAt(i);
        const safe = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
        let cls = 'tcell';
        let content = '&nbsp;';
        if (i < typedLen) { cls += ' done'; content = safe; }
        else {
          if (i === typedLen) cls += ' cur';
          if (reveal === 'all' || (reveal === 'first' && i === 0)) content = safe;
        }
        html += '<span class="' + cls + '">' + content + '</span>';
      }
      return html;
    }

    // 道場の選択式は初心者にやさしく「2択」に絞る（正解＋ダミー1つ・位置はランダム）。
    //  DBは書き換えず浅いコピーを返す。ボス/図書館や2択以下の問題はそのまま。
    function _reduceDojoChoices(q) {
      if (!q || q.type !== 'choice' || !Array.isArray(q.c) || q.c.length <= 2) return q;
      const correct = q.c[q.a];
      const wrongs = q.c.filter((_, i) => i !== q.a);
      const distractor = wrongs[Math.floor(Math.random() * wrongs.length)];
      const correctFirst = Math.random() < 0.5;
      return Object.assign({}, q, {
        c: correctFirst ? [correct, distractor] : [distractor, correct],
        a: correctFirst ? 0 : 1
      });
    }

    function renderQuestion(prob, showHint) {
      const typingArea = document.getElementById('typing-area');
      const choiceArea = document.getElementById('choice-area');

      if (prob && prob.type === 'choice') {
        // 選択式: 入力経路をタイピングからクリック/数字キーへ切り替える
        typingArea.classList.add('hidden');
        choiceArea.classList.remove('hidden');
        battle.typedSoFar = '';
        renderChoiceButtons(prob);
        return;
      }

      // タイピング式
      choiceArea.classList.add('hidden');
      typingArea.classList.remove('hidden');
      battle.typedSoFar = '';
      document.getElementById('typing-question-name').textContent = prob.name;

      // plain:true（物理の計算タイピング等）は化学式整形を通さない
      const _fmt = (t) => prob.plain ? t : GameData.fmtChem(t);
      // ヒント武器: 答えの最初の1文字だけ開示（道場ヒント表示時は元から全部見えるので無関係）
      const _hintOn = !showHint && (battle.playerSkills || []).indexOf('ヒント') >= 0;
      const _reveal = showHint ? 'all' : (_hintOn ? 'first' : 'none');
      const _cells = buildAnswerCells(prob.formula, 0, _reveal);
      const _guide = document.getElementById('typing-guide');
      if (prob.display) {
        // 穴埋め問題: 式はそのまま、[ ? ] をマス目に置換
        _guide.innerHTML = _fmt(prob.display).replace('[ ? ]',
          '<span style="color:#64748b">[</span>' + _cells + '<span style="color:#64748b">]</span>');
      } else {
        // 通常問題: 答え全体をマス目で表示
        _guide.innerHTML = _cells;
      }
      document.getElementById('typing-user').textContent = '';
    }

    // ── 選択肢ボタンを描画（通常出題の選択式用）──
    function renderChoiceButtons(prob) {
      document.getElementById('choice-question-txt').textContent = prob.q;
      const box = document.getElementById('choice-buttons');
      box.innerHTML = '';
      battle.quizChoiceCount = prob.c.length;
      // ヒント武器: 不正解の選択肢を1つランダムに暗転＆選択不可にする
      let _hintKilled = -1;
      if ((battle.playerSkills || []).indexOf('ヒント') >= 0) {
        const wrongs = prob.c.map((_, i) => i).filter(i => i !== prob.a);
        if (wrongs.length > 1) _hintKilled = wrongs[Math.floor(Math.random() * wrongs.length)];
      }
      battle.hintKilledChoice = _hintKilled;  // キー入力経路でも暗転選択肢を無効化するため保持
      prob.c.forEach((choice, idx) => {
        const btn = document.createElement('button');
        if (idx === _hintKilled) {
          btn.className = 'choice-btn bg-slate-900 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm text-left border border-slate-800 opacity-40 cursor-not-allowed line-through';
          btn.disabled = true;
          btn.textContent = `${idx + 1}. ${choice}`;
        } else {
          btn.className = 'choice-btn bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm text-left transition-all border border-slate-700 active:scale-95';
          btn.textContent = `${idx + 1}. ${choice}`;
          btn.onclick = () => answerChoice(idx);
        }
        box.appendChild(btn);
      });
    }

    //  filterGenres : 出題ジャンル配列（null/空=その難易度の全ジャンル）。
    //   ※ ボス通常攻撃は必ずタイピング。実験操作(選択式専用)はボスでは出ない。
    function startBossBattle(boss, filterGenres, filterType) {
      battle.active = true;
      battle.mode = 'boss';
      battle.bossId = boss.id;
      battle.filterGenres = (filterGenres && filterGenres.length) ? filterGenres : null;
      battle.filterType = filterType || null; // 通常攻撃の出題形式（null=両方／'typing'／'choice'）。ボスも選択式可に。
      battle.currentCombo = 0;
      battle.comboBuffs = [];
      battle.isStunned = false;
      battle.enemyIsStunned = false;
      battle.goldEarnedInSession = 0;
      battle.expEarnedInSession = 0;
      battle.missCount = 0;
      battle.isRaged = false;
      usedIndices = []; 

      document.getElementById('rage-warning-badge').classList.add('hidden');
      document.getElementById('battle-left-panel').classList.remove('rage-active');
      document.getElementById('enemy-avatar').classList.remove('scale-150', 'text-red-500');

      const stats = getEffectiveStats();
      battle.playerMaxHp = stats.hp;
      battle.playerHp = stats.hp;
      initBattleSkillState(stats);

      // ボスの回避率（初級0% / 中級0〜30% / 上級20〜40% / 超級30〜50%）
      const _bossEvade = { b1_1:0, b1_2:0, b1_3:0, b2_1:0, b2_2:0.15, b2_3:0.30,
                           b3_1:0.20, b3_2:0.30, b3_3:0.40, b4_1:0.30, b4_2:0.40, b4_3:0.50 };
      battle.enemyEvade = _bossEvade[boss.id] || 0;
      battle.isBonus = false;

      battle.enemyMaxHp = boss.hp;
      battle.enemyHp = boss.hp;
      battle.enemyActionGauge = 0;
      battle.enemyUltGauge = 0;
      // ボスのステータスを battle に保持（通常/裏ボス共通の参照元にする）
      battle.bossAtk = boss.atk;
      battle.bossSpeed = boss.speed;
      battle.bossUltSpeed = boss.ultSpeed;
      battle.subject = 'chemistry'; // 通常ボス12体は化学（必殺クイズの教科）

      // ボス表示設定
      const _bossGlow = { junior:'0 0 20px #22d3ee', mid:'0 0 20px #f97316', senior:'0 0 22px #a78bfa', supreme:'0 0 25px #f43f5e' };
      const _bossAvEl = document.getElementById('enemy-avatar');
      setVisualImg(_bossAvEl, 'assets/boss/boss_' + boss.id + '.png', boss.avatar); // ボス画像／無ければ絵文字
      _bossAvEl.style.filter = `drop-shadow(${_bossGlow[boss.tier] || '0 0 20px #ef4444'})`;
      setBattleBackground(boss.tier);
      document.getElementById('enemy-name').textContent = boss.name;
      document.getElementById('battle-mode-title').textContent = `👹 ボス実践`;
      playBossEnter();

      nextQuestion();
      GameUI.showBattleScreen();
      startBattleLoop();
    }

    // ── 裏ボス戦の開始 ──
    //  levels: 範囲ボスは数値1（固定）/ エンドボス(オメガ)は {hp,atk,speed,ult}（ステ別1〜20）。
    function startEndgameBoss(bossId, levels) {
      const boss = GameData.ENDGAME_BOSSES_DB.find(b => b.id === bossId);
      if (!boss) return;
      if (!player.hasClearedOnce) { alert('裏ボスはラスボス撃破後に解禁されます。'); return; }
      // 範囲ボスは難易度なし＝固定(Lv1相当)。pureボスはステ別レベル。
      const _levels = (boss.kind === 'pure') ? (levels || player.endgameStatLevels || 10) : 1;
      const st = GameData.getEndgameBossStats(boss, _levels);

      battle.active = true;
      battle.mode = 'boss';
      battle.bossId = boss.id;
      // 出題範囲: range は subject×genres、pure は全範囲
      battle.filterGenres = (boss.kind === 'range' && boss.genres && boss.genres.length) ? boss.genres.slice() : null;
      battle.filterType = null;
      battle.currentCombo = 0;
      battle.comboBuffs = [];
      battle.isStunned = false;
      battle.enemyIsStunned = false;
      battle.goldEarnedInSession = 0;
      battle.missCount = 0;
      battle.isRaged = false;
      usedIndices = [];

      document.getElementById('rage-warning-badge').classList.add('hidden');
      document.getElementById('battle-left-panel').classList.remove('rage-active');
      document.getElementById('enemy-avatar').classList.remove('scale-150', 'text-red-500');

      const stats = getEffectiveStats();
      battle.playerMaxHp = stats.hp;
      battle.playerHp = stats.hp;
      initBattleSkillState(stats);

      battle.isEndgame = true;
      battle.subject = boss.subject || null; // 範囲ボス=その教科 / pure(オメガ)=null→全教科
      battle.enemyEvade = st.evade;
      battle.isBonus = false;
      battle.enemyMaxHp = st.hp;
      battle.enemyHp = st.hp;
      battle.enemyActionGauge = 0;
      battle.enemyUltGauge = 0;
      battle.bossAtk = st.atk;
      battle.bossSpeed = st.speed;
      battle.bossUltSpeed = st.ultSpeed;
      battle.bossStanDef = st.stanDef;

      const _avEl = document.getElementById('enemy-avatar');
      setVisualImg(_avEl, 'assets/boss/endgame_' + boss.id + '.png', boss.avatar);
      _avEl.style.filter = 'drop-shadow(0 0 28px #f472b6) drop-shadow(0 0 50px #a855f7)';
      setBattleBackground('supreme');
      // 表示名: 範囲ボスは固定なのでLv非表示 / オメガはステ別レベルを併記
      let _lvLabel = '';
      if (boss.kind === 'pure' && typeof _levels === 'object') {
        _lvLabel = '  [HP' + (_levels.hp||1) + ' ATK' + (_levels.atk||1) + ' 速' + (_levels.speed||1) + ' 必' + (_levels.ult||1) + ']';
      }
      document.getElementById('enemy-name').textContent = boss.name + _lvLabel;
      document.getElementById('battle-mode-title').textContent = (boss.kind === 'pure' ? '🌌 最強の試練' : '⚔️ 専科の試練');
      playBossEnter();

      nextQuestion();
      GameUI.showBattleScreen();
      startBattleLoop();
    }

    // 現在戦っている裏ボスの定義（無ければ null）
    function getCurrentEndgameBoss() {
      if (!battle.isEndgame) return null;
      return GameData.ENDGAME_BOSSES_DB.find(b => b.id === battle.bossId) || null;
    }

    // 裏ボスのHP30%フェーズ移行ガード。30%到達で1度だけ：HPを30%で止め・攻撃強化・必殺3連を予約。
    //  戻り値 true = フェーズ発動（呼び出し側は以降の撃破処理をスキップ）
    function checkEndgamePhase() {
      if (!battle.isEndgame || battle.endgamePhase2) return false;
      const threshold = Math.floor(battle.enemyMaxHp * 0.30);
      if (battle.enemyHp > threshold) return false;
      battle.endgamePhase2 = true;
      battle.enemyHp = threshold;            // 30%で踏みとどまる（フェーズを必ず通す）
      battle.bossAtkMult = 1.6;              // 攻撃強化バフ
      battle.enemyActionGauge = 0;
      battle.enemyIsStunned = false;
      GameUI.updateBattleUI();
      playSound('skill');
      GameUI.showDamagePopup('覚醒！攻撃強化＋必殺連撃！', true, true);
      const _avEl = document.getElementById('enemy-avatar');
      if (_avEl) _avEl.classList.add('scale-150', 'text-red-500');
      // 強制必殺3連（少し溜めてから）
      startForcedUltChain(3);
      return true;
    }

    function startBattleLoop() {
      if (battleInterval) clearInterval(battleInterval);
      
      const p = getEffectiveStats();
      let bossData = null;
      if (battle.mode === 'boss') {
        bossData = GameData.BOSSES_DB.find(b => b.id === battle.bossId);
      }

      battleInterval = setInterval(() => {
        if (!battle.active) return;
        if (battle.paused) return; // ⏸ ポーズ中は敵の進行・タイマーを全停止

        // 0. ボーナスモンスターの制限時間（30秒で逃走→次の敵へ）
        if (battle.isBonus && battle.bonusTimeLeft > 0) {
          battle.bonusTimeLeft -= 0.1;
          if (battle.bonusTimeLeft <= 0) {
            GameUI.showDamagePopup('逃げられた…', false, true);
            spawnNextDojoEnemy();
            return;
          }
        }

        // 1. プレイヤーの気絶処理
        if (battle.isStunned) {
          battle.stunTimeLeft -= 0.1;
          let slipAtk = battle.mode === 'boss' ? battle.bossAtk * 0.1 : 15;
          if (battle.isRaged) slipAtk *= 100; // ⚡ 怒り狂暴化時

          // スリップダメージ: 気絶中は回避できないが、シールド・被ダメ倍率は適用
          let slipDmg = (slipAtk * 0.1) * (p.takenMult || 1);
          if (battle.shield > 0 && slipDmg > 0) {
            const abs = Math.min(battle.shield, slipDmg);
            battle.shield -= abs; slipDmg -= abs;
          }
          battle.playerHp = Math.max(0, battle.playerHp - slipDmg);
          if (battle.playerHp <= 0) {
            GameUI.endBattle(false);
            return;
          }
          if (battle.stunTimeLeft <= 0) {
            battle.isStunned = false;
            document.getElementById('stan-indicator').classList.add('hidden');
          }
        }

        // 2. 敵の気絶処理
        if (battle.enemyIsStunned) {
          battle.enemyStunTimeLeft -= 0.1;
          if (battle.enemyStunTimeLeft <= 0) {
            battle.enemyIsStunned = false;
          }
        }

        // 3. ボスの行動・必殺技ゲージ蓄積（クイズ表示中・強制必殺連撃中は停止＝誤動作防止）
        if (!battle.enemyIsStunned && !battle.quizActive && !battle.forcedUltActive) {
          let speedFactor = 1.0;
          if (battle.mode === 'boss') {
            speedFactor = battle.bossSpeed;
            if (Object.values(player.equipped).some(item => item && item.skill === 'ボスの通常攻撃速度を10%遅延')) {
              speedFactor *= 0.9;
            }
          } else {
            // 道場: 難易度別攻撃速度（初級1.0, 中級1.5, 上級2.0, 超級2.5）
            const _dojoSpeeds = { junior:1.0, mid:1.5, senior:2.0, supreme:2.5 };
            speedFactor = _dojoSpeeds[battle.difficulty] || 1.0;
          }
          // ❄️ スロー中は速度0.2倍
          if (battle.enemySlowTimeLeft > 0) {
            battle.enemySlowTimeLeft -= 0.1;
            speedFactor *= 0.2;
            if (battle.enemySlowTimeLeft <= 0) {
              document.getElementById('slow-badge').classList.add('hidden');
            }
          }
          // ⚡ 怒り狂暴化時は行動速度100倍
          if (battle.isRaged) speedFactor *= 100;

          battle.enemyActionGauge += (5 * speedFactor * 0.1);

          let ultSpeedFactor = battle.mode === 'boss' ? battle.bossUltSpeed : 0.05;
          battle.enemyUltGauge += (10 * ultSpeedFactor * 0.1);

          if (battle.enemyActionGauge >= 100) {
            battle.enemyActionGauge = 0;
            if (battle.enemyUltGauge >= 100) {
              battle.enemyUltGauge = 0;
              triggerBossUltimate();
            } else {
              triggerBossNormalAttack();
            }
          }
        }

        // 4. コンボバフの持続時間減少
        battle.comboBuffs.forEach(buff => {
          buff.duration -= 0.1;
        });
        battle.comboBuffs = battle.comboBuffs.filter(buff => buff.duration > 0);

        GameUI.updateBattleUI();
      }, 100);
    }

    // 戦闘開始時にスキル由来の戦闘状態を初期化（シールド・必殺封印回数・不死フラグ）
    function initBattleSkillState(stats) {
      battle.playerSkills = stats.skills || [];   // ヒント/コンボ爆撃 等の判定に使う（毎戦キャッシュ）
      battle.shield = stats.shield || 0;
      battle.maxShield = stats.shield || 0;
      battle.undyingUsed = false;
      battle.sealLeft = (stats.skills && stats.skills.indexOf('必殺封印の盾') >= 0) ? 2 : 0;
      // クイズ状態リセット＋必殺技オーバーレイを閉じる（前の戦闘の残骸を消す）
      battle.quizActive = false;
      // 裏ボス用フェーズ状態（毎戦リセット）
      battle.isEndgame = false;
      battle.endgamePhase2 = false;
      battle.bossAtkMult = 1;
      battle.forcedUltActive = false;
      battle.forcedUltLeft = 0;
      const _qo = document.getElementById('quiz-overlay');
      if (_qo) _qo.classList.add('hidden');
    }

    // プレイヤーの攻撃が命中するか（敵回避 vs 命中補正）。必中の理は常に命中、賭博師の刃は固定命中率。
    function rollHit(p) {
      if (p.ignoreEvade) return true;
      if (p.fixedHitChance != null) return Math.random() < p.fixedHitChance;
      const evade = Math.max(0, battle.enemyEvade || 0);
      return Math.random() >= evade;
    }

    // 割合軽減: ダメージ = 敵atk × K/(K+def)。
    //  素引き算（atk-def）と違い、DEFは常に有効で「無敵化」も「全弾フルダメージ」も起きない（収穫逓減）。
    //  K=200 を境に def=200 で被ダメ50%。上げるほど効くが頭打ちしないので装備/振りの目的が成立する。
    const MITIGATION_K = 200;
    function mitigate(rawAtk, def) {
      const d = Math.max(0, def || 0);
      return Math.max(1, Math.round(rawAtk * MITIGATION_K / (MITIGATION_K + d)));
    }

    // プレイヤーへのダメージ適用（回避・シールド・被ダメ倍率・不死の誓いを一括処理）
    //  isUlt=必殺技由来か。戻り値は「致死だったか」(true=戦闘終了済み)
    function applyDamageToPlayer(rawDamage, p, isUlt) {
      // 回避（必殺封印の盾は別所で必殺自体を無効化するのでここは通常/必殺共通の回避のみ）
      if (rawDamage > 0 && Math.random() < (p.dodge || 0)) {
        GameUI.showDamagePopup('AVOID', false, true);
        return false;
      }
      let dmg = rawDamage * (p.takenMult || 1);
      // シールドが先に削られる
      if (battle.shield > 0 && dmg > 0) {
        const absorbed = Math.min(battle.shield, dmg);
        battle.shield -= absorbed;
        dmg -= absorbed;
      }
      battle.playerHp = Math.max(0, battle.playerHp - dmg);
      // 不死の誓い: 1戦闘に1度だけHP1で踏みとどまる
      if (battle.playerHp <= 0 && !battle.undyingUsed && p.skills && p.skills.indexOf('不死の誓い') >= 0) {
        battle.undyingUsed = true;
        battle.playerHp = 1;
        GameUI.showDamagePopup('不死!', false, true);
      }
      if (battle.playerHp <= 0) {
        GameUI.endBattle(false);
        return true;
      }
      return false;
    }

    function triggerBossNormalAttack() {
      let bossAtk = 15;
      if (battle.mode === 'boss') {
        bossAtk = battle.bossAtk * (battle.bossAtkMult || 1);
        if (battle.bossId === 'b4_3' && battle.enemyHp / battle.enemyMaxHp <= 0.3) {
          bossAtk *= 1.5;
        }
      } else {
        // [TEST修正] 問題難易度は敵の強さに影響させない方針 → 敵の攻撃力は難易度非連動の固定値。
        //  （旧: const difficultyMult = 難易度1/2/4/8; bossAtk = 30 * difficultyMult）
        bossAtk = 30;
      }
      // 怒り狂暴化時は別途100倍で済み（後続で処理）

      // ⚡ 怒り狂暴化時は通常ダメージ100倍
      if (battle.isRaged) {
        bossAtk *= 100;
      }

      const p = getEffectiveStats();
      let damage = mitigate(bossAtk, p.def);

      const area = document.getElementById('typing-box-container');
      if (area) {
        area.classList.add('shake-animation');
        setTimeout(() => area.classList.remove('shake-animation'), 400);
      }

      playSound('wrong');
      applyDamageToPlayer(damage, p, false); // 回避・シールド・被ダメ倍率・不死を内部処理
    }

    function triggerBossUltimate() {
      if (isFeedbacking) return;
      // 🛡️ 必殺封印の盾: 1戦闘に2回まで必殺技（とそれに伴うスタン）を無効化
      if (battle.sealLeft > 0) {
        battle.sealLeft--;
        playSound('skill');
        GameUI.showDamagePopup('封印! (残' + battle.sealLeft + ')', false, true);
        return;
      }
      _showUltimateQuiz();
    }

    // 必殺技クイズ（長文）を実際に画面に出す共通処理。通常必殺・強制必殺の両方から呼ぶ。
    function _showUltimateQuiz() {
      playSound('wrong');
      // 戦闘の教科に合った必殺クイズを引く（subject無印は化学扱い）。battle.subject が null（オメガ等）なら全教科から。
      let _pool = GameData.ULTIMATE_QUIZZES;
      if (battle.subject) {
        const _f = GameData.ULTIMATE_QUIZZES.filter(q => (q.subject || 'chemistry') === battle.subject);
        if (_f.length) _pool = _f;
      }
      const quiz = _pool[Math.floor(Math.random() * _pool.length)];
      document.getElementById('quiz-question-txt').textContent = quiz.q;
      const choicesBox = document.getElementById('quiz-choices-container');
      choicesBox.innerHTML = '';

      // クイズ表示中はタイピング/通常選択を無効化（必殺技中の誤操作バグ防止）
      battle.quizActive = true;
      battle.quizCorrect = quiz.a;
      battle.quizChoiceCount = quiz.c.length;

      quiz.c.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = "quiz-choice-btn bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs text-left transition-all border border-slate-700";
        btn.textContent = `${idx + 1}. ${choice}`;
        btn.onclick = () => handleQuizAnswer(idx, quiz.a);
        choicesBox.appendChild(btn);
      });

      document.getElementById('quiz-overlay').classList.remove('hidden');
    }

    // ── 強制必殺連撃（裏ボスの覚醒）──
    //  n連続で必殺クイズを出す。各回答後に次を出し、終わったら通常戦闘へ復帰。
    //  エラー対策: 戦闘終了/プレイヤー死亡/二重発火を毎ステップで確認し、必ず isFeedbacking を解除して復帰する。
    function startForcedUltChain(n) {
      if (battle.forcedUltActive) return; // 二重起動ガード
      battle.forcedUltActive = true;
      battle.forcedUltLeft = n;
      isFeedbacking = true;               // この間タイピング/通常選択を遮断
      setTimeout(showNextForcedUlt, 800);
    }
    function showNextForcedUlt() {
      if (!battle.active) { _endForcedUltChain(); return; }  // 戦闘が終わっていたら中断
      if (battle.playerHp <= 0) { _endForcedUltChain(); return; }
      if (battle.forcedUltLeft <= 0) { _endForcedUltChain(); return; }
      battle.forcedUltLeft--;
      // 封印の盾があっても強制必殺は問題を出す（問題演習が目的）。封印は通常必殺のみ消費。
      _showUltimateQuiz();
    }
    function _endForcedUltChain() {
      battle.forcedUltActive = false;
      battle.forcedUltLeft = 0;
      isFeedbacking = false;
      const _qo = document.getElementById('quiz-overlay');
      if (_qo) _qo.classList.add('hidden');
      battle.quizActive = false;
      if (battle.active && battle.playerHp > 0) {
        setTimeout(() => { if (battle.active) nextQuestion(); }, 250);
      }
    }

    function handleQuizAnswer(selectedIdx, correctIdx) {
      if (!battle.quizActive) return; // 二重入力ガード
      battle.quizActive = false;
      document.getElementById('quiz-overlay').classList.add('hidden');
      const p = getEffectiveStats();
      const inForced = battle.forcedUltActive;
      let died = false;

      if (selectedIdx === correctIdx) {
        // 強制必殺連撃中はスタンさせない（連撃を最後まで通す）。通常必殺はスタン報酬。
        if (!inForced) {
          battle.enemyIsStunned = true;
          battle.enemyStunTimeLeft = p.stanAtk;
          battle.enemyActionGauge = 0;
        }
        playSound('correct');
        GameUI.showDamagePopup(inForced ? 'GUARD!' : 'STUNNED!', false, true);
      } else {
        battle.isStunned = true;
        battle.stunTimeLeft = p.stanDef;
        document.getElementById('stan-indicator').classList.remove('hidden');
        playSound('wrong');

        let ultDamage = (battle.mode === 'boss' ? battle.bossAtk * (battle.bossAtkMult || 1) : 16) * 2.5;
        if (battle.isRaged) ultDamage *= 100; // ⚡ 怒り狂暴化時

        let ultRaw = mitigate(ultDamage, p.def);
        ultRaw *= (1 - (p.ultResist || 0)); // 必殺耐性（stanDef振り）で最大30%カット
        // 必殺ミスでフルHPから即死しないよう、被弾を最大HPの割合で頭打ちにする。
        //  通常必殺=50%（2回ミスで致命）／強制必殺3連=70%（裏ボス覚醒は厳しめ・2ミス致命）。
        const ultCapPct = inForced ? 0.70 : 0.50;
        const capFinal = battle.playerMaxHp * ultCapPct;
        ultRaw = Math.min(ultRaw, capFinal / (p.takenMult || 1));
        died = applyDamageToPlayer(ultRaw, p, true);
      }

      // 強制必殺連撃中なら次の必殺へ／終了なら通常戦闘へ復帰（戦闘終了時は中断）
      if (inForced && !died && battle.active) {
        setTimeout(showNextForcedUlt, 800);
      } else if (inForced) {
        _endForcedUltChain();
      }
    }

    // ── 通常出題の選択式回答（クリック / 1〜4キー）──
    //  正解 = タイピング正解と同じ攻撃処理（processCorrectAnswer）
    //  不正解 = ミス扱い（怒りゲージ加算）。攻撃は発生しない。
    function answerChoice(selectedIdx) {
      if (!battle.active || battle.isStunned || isFeedbacking || battle.quizActive || battle.paused) return;
      if (selectedIdx === battle.hintKilledChoice) return; // ヒントで暗転した選択肢は選べない（キー入力経路も封鎖）
      const prob = battle.currentQuestion;
      if (!prob || prob.type !== 'choice') return;

      const buttons = document.querySelectorAll('#choice-buttons .choice-btn');
      if (selectedIdx === prob.a) {
        // 正解演出: 押した選択肢を緑に
        if (buttons[selectedIdx]) buttons[selectedIdx].className =
          'choice-btn bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm text-left border border-emerald-400';
        recordQuizResult(true);
        processCorrectAnswer();
      } else {
        // 不正解: 押した選択肢を赤に、正解を緑に。ミスカウント加算。
        if (buttons[selectedIdx]) buttons[selectedIdx].className =
          'choice-btn bg-rose-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm text-left border border-rose-400';
        if (buttons[prob.a]) buttons[prob.a].className =
          'choice-btn bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm text-left border border-emerald-400';
        battle.missCount++;
        recordQuizResult(false);
        playSound('wrong');
        flashPanel('miss');
        if (battle.missCount >= 50 && !battle.isRaged) {
          battle.isRaged = true;
          document.getElementById('rage-warning-badge').classList.remove('hidden');
          document.getElementById('battle-left-panel').classList.add('rage-active');
          document.getElementById('enemy-avatar').classList.add('scale-150', 'text-red-500');
          playSound('wrong');
          alert('🚨 モンスターへの度重なる誤爆により、怒り狂暴化モードに入りました！ボスの行動速度＆攻撃力が100倍になります！');
        }
        GameUI.updateBattleUI();

        // ── 誤答ペナルティ: 2秒間すべての入力を遮断し、その後つぎの問題へ ──
        //  （適当に押して正解を押し直す抜け道を塞ぐ。isFeedbacking が click/キー入力を両方ブロック）
        isFeedbacking = true;
        const _ca = document.getElementById('choice-area');
        if (_ca) _ca.classList.add('choice-locked');
        GameUI.showDamagePopup('不正解… 2秒待機', false, true);
        setTimeout(() => {
          if (_ca) _ca.classList.remove('choice-locked');
          isFeedbacking = false;
          // クイズ/強制必殺/戦闘終了中でなければ次の問題へ
          if (battle.active && !battle.quizActive && !battle.forcedUltActive) nextQuestion();
        }, 2000);
      }
    }

    // タイピング入力イベント
    function handleKeyInput(char) {
      if (!battle.active || battle.isStunned || isFeedbacking || battle.paused) return;

      // ⑦ コンボ爆撃: Enterキーで発動（タイピング中Enterは元々無視＝衝突なし。スキル/コンボ不足なら内部で弾く）
      if (char === 'ENTER') { comboBurst(); return; }

      // ❓ ボス必殺技クイズ表示中: 1〜4キーで選択肢を回答。それ以外のキーは無効（タイピングさせない）
      if (battle.quizActive) {
        if (char >= '1' && char <= '9') {
          const n = parseInt(char) - 1;
          if (n < battle.quizChoiceCount) handleQuizAnswer(n, battle.quizCorrect);
        }
        return;
      }

      // ❓ 通常出題の選択式: 1〜4キーで回答。タイピングは受け付けない。
      if (battle.currentQuestion && battle.currentQuestion.type === 'choice') {
        if (char >= '1' && char <= '9') {
          const n = parseInt(char) - 1;
          if (n < battle.quizChoiceCount) answerChoice(n);
        }
        return;
      }

      // 入力を正規化（小文字→大文字）
      if (char !== 'BACKSPACE' && char !== 'ENTER') char = char.toUpperCase();

      // BACKSPACEで1文字削除
      if (char === 'BACKSPACE') {
        if (battle.typedSoFar.length > 0) {
          battle.typedSoFar = battle.typedSoFar.slice(0, -1);
          renderCorrectCasedInput();
        }
        return;
      }
      // ENTERは無視
      if (char === 'ENTER') return;

      const expected = battle.currentQuestion.formula;
      const currentInput = battle.typedSoFar + char;

      if (expected.toUpperCase().startsWith(currentInput.toUpperCase())) {
        battle.typedSoFar = currentInput;
        renderCorrectCasedInput();

        const ranbu = Object.values(player.equipped).some(it => it && it.skill === '乱打の型');
        // 乱打の型: 1文字ごとに1回攻撃（ATK÷3）。途中で敵を倒したら即次へ。
        if (ranbu && ranbuStrike()) return;

        if (battle.typedSoFar.toUpperCase() === expected.toUpperCase()) {
          recordQuizResult(!battle.qHadMiss); // タイピングはミス0完成で「正解」
          if (ranbu) {
            // 乱打の型は完成時の追加ダメージなし。問題を進めるだけ。
            isFeedbacking = true;
            playSound('correct');
            advanceAfterAnswer(getEffectiveStats().goldMul);
          } else {
            processCorrectAnswer();
          }
        }
      } else {
        battle.missCount++;
        battle.qHadMiss = true; // この問題でタイプミスが出た→正答率では「不正解」扱い
        playSound('wrong');
        flashPanel('miss');

        // 50回タイプミスで怒り狂暴化
        if (battle.missCount >= 50 && !battle.isRaged) {
          battle.isRaged = true;
          document.getElementById('rage-warning-badge').classList.remove('hidden');
          document.getElementById('battle-left-panel').classList.add('rage-active');
          document.getElementById('enemy-avatar').classList.add('scale-150', 'text-red-500');
          playSound('wrong');
          alert('🚨 モンスターへの度重なる誤爆により、怒り狂暴化モードに入りました！ボスの行動速度＆攻撃力が100倍になります！');
        }
        GameUI.updateBattleUI();
      }
    }

    function renderCorrectCasedInput() {
      const q = battle.currentQuestion.formula;
      const typedLen = battle.typedSoFar.length;
      const guideEl = document.getElementById('typing-guide');
      // 道場=お手本全表示 / ヒント武器=先頭 / ボス=伏せる
      const reveal = (battle.mode === 'dojo') ? 'all'
                   : ((battle.playerSkills || []).indexOf('ヒント') >= 0 ? 'first' : 'none');
      const cells = buildAnswerCells(q, typedLen, reveal);

      if (battle.currentQuestion.display) {
        const base = battle.currentQuestion.plain ? battle.currentQuestion.display : GameData.fmtChem(battle.currentQuestion.display);
        guideEl.innerHTML = base.replace('[ ? ]',
          '<span style="color:#64748b">[</span>' + cells + '<span style="color:#64748b">]</span>');
      } else {
        guideEl.innerHTML = cells;
      }
      document.getElementById('typing-user').textContent = '';
    }

    // 学習進捗の記録: 現在の問題の genre×diff ごとに 正解数/出題数 を加算。
    //  選択式=初回正誤 / タイピング=その問題をミス0で完成できたか（battle.qHadMiss）。
    //  ULTIMATE必殺クイズ(handleQuizAnswer)は対象外（genre/diffを持たないため自然に弾かれる）。
    function recordQuizResult(correct) {
      const q = battle.currentQuestion;
      if (!q || !q.genre || !q.diff) return;
      const key = q.genre + '|' + q.diff;
      let s = player.quizStats[key];
      if (!s) { s = { c: 0, t: 0 }; player.quizStats[key] = s; }
      s.t++;
      if (correct) s.c++;
      gainRankExp(correct); // ★学習保障報酬: 問題を解くたびEXP→ランクUPでゴールド（撃破ゴールドとは別軸）
    }

    // 学習ランクEXP付与。正解で多く・誤答も少し（努力を報う）。
    //  ⚠️連打対策: 怒りモード(missCount>=50)中は誤答EXPを0にする＝適当連打でEXP稼ぎ不可。
    //  ランクUP報酬はゴールド（ステータスには影響しない）。数値は GameData.RANK_CONFIG（simで調整）。
    function gainRankExp(correct) {
      const cfg = GameData.RANK_CONFIG;
      let exp = correct ? cfg.expCorrect : (battle.isRaged ? 0 : cfg.expWrong);
      if (exp <= 0) return;
      player.rankExp = (player.rankExp || 0) + exp;
      let leveled = 0, rewardGold = 0, hitMilestone = 0;
      while (player.rankExp >= GameData.rankExpNeeded(player.rank)) {
        player.rankExp -= GameData.rankExpNeeded(player.rank);
        player.rank++;
        const g = GameData.rankUpGold(player.rank);
        player.gold += g; rewardGold += g; leveled++;
        if (GameData.isRankMilestone(player.rank)) hitMilestone = player.rank;
      }
      if (leveled > 0) {
        if (typeof GameUI !== 'undefined') {
          if (hitMilestone) {
            // 節目ランク到達＝大型報酬。生徒に強く達成感を出す。
            GameUI.showDamagePopup('🏆 ランク' + hitMilestone + '到達！ +' + rewardGold + 'G', false, true);
          } else {
            GameUI.showDamagePopup('🎉ランクUP! Rank' + player.rank + ' +' + rewardGold + 'G', false, true);
          }
        }
        saveUserDataLocal(); // 報酬を即保存（タブを閉じても消えない）
        updateMenuUI();
      }
    }

    // 学習ランクの表示用情報（UIのランク報酬ビューア用）。
    function getRankInfo() {
      const cfg = GameData.RANK_CONFIG;
      const rank = player.rank || 1;
      const need = GameData.rankExpNeeded(rank);
      const milestones = Object.keys(cfg.milestones)
        .map(function(k) { return parseInt(k, 10); })
        .sort(function(a, b) { return a - b; })
        .map(function(r) { return { rank: r, gold: cfg.milestones[r], reached: rank >= r }; });
      return {
        rank: rank,
        rankExp: player.rankExp || 0,
        need: need,
        nextRankGold: GameData.rankUpGold(rank + 1),
        maxRank: cfg.maxRank,
        milestones: milestones,
      };
    }

    function processCorrectAnswer() {
      isFeedbacking = true;
      playSound('correct');
      flashPanel('correct');

      const p = getEffectiveStats();
      const skills = p.skills || [];
      const hasSk = (n) => skills.indexOf(n) >= 0;

      battle.currentCombo++;
      GameUI.updateComboBadge();

      // コンボHP回復（錬金術師の欲望は戦闘中回復不可）
      if (!p.noHeal) {
        battle.playerHp = Math.min(battle.playerMaxHp, battle.playerHp + p.cpRecover);
      }

      // コンボバフ: 通常5回ごと、触媒の祝福で3回ごと。継続時間 = 8秒 + コンボ継続時間
      // 継続時間 = (8秒 + コンボ継続時間) × 1.5。正解ごとに既存バフをリフレッシュ（重なる感じ）
      const fullBuffDur = (8.0 + (p.comboDur || 0)) * 1.5;
      battle.comboBuffs.forEach(b => { b.duration = fullBuffDur; });
      const buffInterval = hasSk('触媒の祝福') ? 3 : 5;
      if (battle.currentCombo % buffInterval === 0) {
        battle.comboBuffs.push({ duration: fullBuffDur, val: p.cpAtk });
        playSound('skill');
      }

      let activeBuffsSum = battle.comboBuffs.reduce((sum, b) => sum + b.val, 0);

      // 排水の陣: HP20%以下でATK×3
      const drain = hasSk('排水の陣');
      const lowHp = battle.playerHp <= battle.playerMaxHp * 0.20;
      let baseAtk = (drain && lowHp) ? Math.floor(p.atk * 3) : p.atk;

      let finalAtk = baseAtk + activeBuffsSum;

      // 連鎖共鳴: コンボが続くほどATKアップ（コンボを消費しない・上限+60%＝30コンボ）。コンボ爆撃と共存可。
      if (hasSk('連鎖共鳴')) finalAtk = Math.floor(finalAtk * (1 + Math.min(0.6, battle.currentCombo * 0.02)));

      // 冷静な一撃: クリ無し・全打撃確定2倍 / 通常はクリ判定
      let isCrit = false;
      if (p.forceDoubleHit) {
        finalAtk = Math.floor(finalAtk * 2);
      } else {
        isCrit = Math.random() < p.critRate;
        if (isCrit) finalAtk = Math.floor(finalAtk * p.critMult);
      }
      // 賭博師の刃: 命中ダメージ倍率
      if (p.hitDmgMult && p.hitDmgMult !== 1) finalAtk = Math.floor(finalAtk * p.hitDmgMult);

      if (battle.bossId === 'b4_1' && !battle.enemyIsStunned) {
        finalAtk = Math.max(1, Math.floor(finalAtk * 0.1));
      }

      // ボーナスモンスターには1ダメージしか通らない
      if (battle.isBonus) finalAtk = 1;

      // 命中判定（連撃ごと）。敵回避を外すと0ダメージ。
      let totalDealt = 0;
      let landedAny = false;
      for (let i = 0; i < p.atkCount; i++) {
        if (rollHit(p)) {
          totalDealt += finalAtk;
          battle.enemyHp = Math.max(0, battle.enemyHp - finalAtk);
          landedAny = true;
        }
      }

      // 吸血率: 与ダメージ×吸血率を回復。排水の陣はHP20%超のとき自傷に反転。
      if (p.vamp > 0 && totalDealt > 0) {
        const v = Math.floor(totalDealt * p.vamp);
        if (drain && !lowHp) {
          battle.playerHp = Math.max(1, battle.playerHp - v); // 排水の陣: 自傷（自分の攻撃では死なない下限1）
        } else if (!p.noHeal) {
          battle.playerHp = Math.min(battle.playerMaxHp, battle.playerHp + v);
        }
      }

      // ⚡ 敵に直接弾け飛ぶエフェクト＆クリティカル時は特大化
      spawnParticles(isCrit);
      GameUI.showDamagePopup(totalDealt > 0 ? totalDealt : 'MISS', isCrit, totalDealt === 0);
      if (isCrit) {
        // #app は存在しないため body にフォールバック（旧コードはクリティカル毎に例外を投げていた）
        const _app = document.getElementById('app') || document.body;
        if (_app) {
          _app.style.transition = 'background 0.05s';
          _app.style.background = 'rgba(251,191,36,0.08)';
          setTimeout(() => { _app.style.background = ''; }, 120);
        }
      }

      // 裏ボスHP30%フェーズ移行（発動時は撃破/次問題へ進めず強制必殺連撃に委ねる）
      if (checkEndgamePhase()) return;
      advanceAfterAnswer(p.goldMul);
    }

    // 乱打の型: 1キーストロークごとの攻撃（ATK÷3）。敵撃破時 true を返す。
    function ranbuStrike() {
      const p = getEffectiveStats();
      const sk = p.skills || [];
      battle.currentCombo++;
      GameUI.updateComboBadge();

      const fullBuffDur = (8.0 + (p.comboDur || 0)) * 1.5;
      battle.comboBuffs.forEach(b => { b.duration = fullBuffDur; });
      const bi = sk.indexOf('触媒の祝福') >= 0 ? 3 : 5;
      if (battle.currentCombo % bi === 0) {
        battle.comboBuffs.push({ duration: fullBuffDur, val: p.cpAtk });
      }
      const buffs = battle.comboBuffs.reduce((s, b) => s + b.val, 0);
      const drain = sk.indexOf('排水の陣') >= 0;
      const lowHp = battle.playerHp <= battle.playerMaxHp * 0.20;
      const base = (drain && lowHp) ? Math.floor(p.atk * 3) : p.atk;

      let hit = Math.max(1, Math.floor((base + buffs) / 3)); // ATK÷3
      // 連鎖共鳴: 乱打の型でもコンボ数に応じてATKアップ（消費なし・上限+60%）。
      if (sk.indexOf('連鎖共鳴') >= 0) hit = Math.floor(hit * (1 + Math.min(0.6, battle.currentCombo * 0.02)));
      let isCrit = false;
      if (p.forceDoubleHit) { hit = Math.floor(hit * 2); }
      else { isCrit = Math.random() < p.critRate; if (isCrit) hit = Math.floor(hit * p.critMult); }
      if (p.hitDmgMult && p.hitDmgMult !== 1) hit = Math.floor(hit * p.hitDmgMult);
      if (battle.bossId === 'b4_1' && !battle.enemyIsStunned) hit = Math.max(1, Math.floor(hit * 0.1));
      if (battle.isBonus) hit = 1; // ボーナスモンスターには1ダメージのみ

      let dealt = 0;
      if (rollHit(p)) { dealt = hit; battle.enemyHp = Math.max(0, battle.enemyHp - hit); }

      if (p.vamp > 0 && dealt > 0) {
        const v = Math.floor(dealt * p.vamp);
        if (drain && !lowHp) battle.playerHp = Math.max(1, battle.playerHp - v);
        else if (!p.noHeal) battle.playerHp = Math.min(battle.playerMaxHp, battle.playerHp + v);
      }

      spawnParticles(isCrit);
      GameUI.showDamagePopup(dealt > 0 ? dealt : 'MISS', isCrit, dealt === 0);
      GameUI.updateBattleUI();

      // 裏ボスHP30%フェーズ移行（強制必殺連撃に委ねる）
      if (checkEndgamePhase()) return false;

      if (battle.enemyHp <= 0) {
        isFeedbacking = true;
        advanceAfterAnswer(p.goldMul);
        return true;
      }
      return false;
    }

    // 正解処理の末尾共通処理: 敵撃破なら報酬→次の敵 / 生存なら次の問題へ
    function advanceAfterAnswer(goldMul) {
      if (battle.enemyHp <= 0) {
        setTimeout(() => {
          if (battle.mode === 'dojo') {
            // 難易度倍率は緩やか(1/1.5/2/3)＝範囲は自由に選べるので難易度での荒稼ぎを抑える。敵HP倍率(spawn時の1/3/8/25)とは別物。
            const rewardMult = battle.difficulty === 'junior' ? 1 : (battle.difficulty === 'mid' ? 1.5 : (battle.difficulty === 'senior' ? 2 : 3));
            // 報酬: 基本900コイン × 難易度倍率 × 敵レベルスケール
            const baseGold = 900 * rewardMult;
            // 稼ぎの主役は敵レベル(=ボス撃破で上限解禁)。カーブを急に＝+20%/Lv。Lv.1=1.0/Lv.10=2.8/Lv.100=20.8倍。
            const enemyLvScale = 1.0 + (Math.max(1, battle.dojoEnemyLevel || 1) - 1) * 0.2;
            const bonusMult = battle.isBonus ? 20 : 1; // ボーナスモンスターは20倍ゴールド
            const finalGoldEarn = Math.floor(baseGold * enemyLvScale * (goldMul || 1) * bonusMult);

            player.gold += finalGoldEarn;
            battle.goldEarnedInSession += finalGoldEarn;

            saveUserDataLocal();
            spawnNextDojoEnemy();
          } else {
            GameUI.endBattle(true);
          }
        }, 600);
      } else {
        setTimeout(() => {
          nextQuestion();
        }, 200);
      }
    }

    // ⑦ コンボ爆撃（スキル）: 5コンボ以上でコンボを全消費し特大ダメージ。Enterキー／専用ボタンから発動。
    //   攻撃力は大きく下がる代わり（getEffectiveStatsで×0.4）、この一撃が火力源。問題を解いて溜める動機づけ。
    const COMBO_BURST_MIN = 5;
    function comboBurst() {
      if (!battle.active || battle.isStunned || isFeedbacking || battle.quizActive || battle.forcedUltActive || battle.paused) return;
      if ((battle.playerSkills || []).indexOf('コンボ爆撃') < 0) return;
      if (battle.currentCombo < COMBO_BURST_MIN) return;
      const p = getEffectiveStats();
      const dmg = battle.isBonus ? 1 : Math.floor(battle.currentCombo * p.atk * 0.6);
      battle.enemyHp = Math.max(0, battle.enemyHp - dmg);
      battle.currentCombo = 0;
      battle.comboBuffs = [];
      GameUI.updateComboBadge();
      GameUI.showDamagePopup('爆撃 ' + dmg.toLocaleString() + '!', true, false);
      playSound('skill');
      spawnParticles(true);
      GameUI.updateBattleUI();
      if (typeof GameUI.updateComboBurstButton === 'function') GameUI.updateComboBurstButton();
      if (battle.enemyHp <= 0) { isFeedbacking = true; advanceAfterAnswer(p.goldMul); }
    }

    // showDamagePopup は GameUI.showDamagePopup を使用（ui.js §18）
    function checkLevelUp() { /* EXP廃止につき無効化 */ }

    function nextQuestion() {
      if (!battle.active) return;
      isFeedbacking = false;

      const isBoss = (battle.mode === 'boss');
      // 重みづけで問題選択。
      //  道場: 図書館で設定した範囲（filterGenres/filterType）を尊重。
      //  通常ボス: 通常攻撃は必ずタイピング（暗記勝負）。
      //  裏ボス: 難易度は専用def、出題形式はそのジャンルにあるもの（typing/choice両方可。実験・光音は選択式のみ）。
      let _nqTier, _type;
      if (battle.isEndgame) {
        const eb = GameData.ENDGAME_BOSSES_DB.find(b => b.id === battle.bossId);
        _nqTier = eb ? eb.diff : 'supreme';
        _type = null;
      } else if (isBoss) {
        _nqTier = GameData.BOSSES_DB.find(b => b.id === battle.bossId).tier;
        _type = battle.filterType; // 出題範囲で選んだ形式（null=両方／typing／choice）。必殺技は別枠で従来通り選択式。
      } else {
        _nqTier = battle.diffs || [battle.difficulty]; // 道場: 選択した難易度集合（最上位偏重）
        _type = battle.filterType;
      }
      const _genres = battle.filterGenres;
      const _grades = isBoss || battle.isEndgame ? null : battle.filterGrades; // 学年絞り込みは道場のみ
      battle.currentQuestion = getWeightedQuestion(_nqTier, _genres, _type, _grades);
      if (battle.mode === 'dojo') battle.currentQuestion = _reduceDojoChoices(battle.currentQuestion); // 道場のみ2択
      battle.qHadMiss = false; // 新しい問題＝ミスフラグをリセット（正答率用）
      battle.typedSoFar = '';

      // ドン！演出
      const _tbox = document.getElementById('typing-box-container');
      _tbox.classList.remove('q-appear'); void _tbox.offsetWidth;
      _tbox.classList.add('q-appear');
      setTimeout(() => _tbox.classList.remove('q-appear'), 400);

      // スロー化（選択式は文字数が無いので一律1.0秒）
      const _q = battle.currentQuestion;
      const _fl = (_q && _q.formula) ? _q.formula.length : 0;
      battle.enemySlowTimeLeft = (_q && _q.type === 'choice') ? 1.0 : (_fl >= 5 ? _fl * 0.05 : 0.1);
      document.getElementById('slow-badge').classList.remove('hidden');

      // 問題描画: 道場=ヒントあり、ボス=ヒントなし（暗記勝負）
      renderQuestion(_q, !isBoss);
    }

    function endBattle(isVictory) {
      battle.active = false;
      clearInterval(battleInterval);
      
      const bEl = document.getElementById('screen-battle');
      bEl.classList.add('hidden'); bEl.style.display = 'none';
      const rEl = document.getElementById('result-screen');
      rEl.classList.remove('hidden'); rEl.style.display = 'flex';

      const earnedG = document.getElementById('earned-points');
      const detail = document.getElementById('result-detail');
      const banner = document.getElementById('game-clear-banner');
      const emoji = document.getElementById('result-emoji');
      const title = document.getElementById('result-title');

      banner.classList.add('hidden');

      if (battle.mode === 'boss') {
        const boss = GameData.BOSSES_DB.find(b => b.id === battle.bossId);
        if (isVictory) {
          emoji.textContent = '🏆';
          title.textContent = '討伐成功！';
          
          let goldReward = boss.hp * 5;

          // 🪙 コイン獲得補正（レベルボーナス廃止）
          let goldBonus = 1.0;
          Object.values(player.equipped).forEach(item => {
            if (item) {
              if (item.skill === 'コイン獲得量+50%') goldBonus += 0.5;
              if (item.skill === 'コイン獲得量+100%') goldBonus += 1.0;
            }
          });
          const finalGoldReward = Math.floor(goldReward * goldBonus);

          player.gold += finalGoldReward;
          
          // 撃破フラグ登録
          if (!player.defeatedBosses.includes(boss.id)) {
            player.defeatedBosses.push(boss.id);
          }

          checkLevelUp();

          earnedG.textContent = finalGoldReward.toLocaleString();
          detail.innerHTML = `
            撃破ボス: <span class="text-cyan-400 font-bold">${boss.name}</span><br>
            強敵との実践に勝利しました！<br>
            装備補正(+${Math.round((goldBonus - 1) * 100)}%) が適用されました。
          `;

          // 🏆 12体目完全撃破
          if (boss.id === 'b4_3' && !player.hasClearedOnce) {
            player.hasClearedOnce = true;
            banner.classList.remove('hidden'); 
          }
        } else {
          emoji.textContent = '💀';
          title.textContent = '作戦失敗...';
          earnedG.textContent = "0";
          detail.innerHTML = `
            ボスの猛攻の前にひれ伏しました。<br>
            道場モードでステータスや装備を鍛え上げ、再挑戦しましょう。
          `;
        }
      } else {
        // 道場
        emoji.textContent = '🥋';
        title.textContent = '道場修行終了';
        earnedG.textContent = battle.goldEarnedInSession.toLocaleString();

        // 敵レベルに基づいた報酬倍率表示 (Lv.1=1.0倍, Lv.10=1.9倍)
        const dojoLevelMult = 1.0 + (Math.max(1, battle.dojoEnemyLevel || 1) - 1) * 0.1;
        detail.innerHTML = `
          道場での特訓お疲れ様でした！<br>
          <span class="text-yellow-400 font-bold">獲得ゴールド: +${battle.goldEarnedInSession.toLocaleString()}G</span> (敵レベル補正 ×${dojoLevelMult.toFixed(1)}倍込み)<br>
          <span class="text-cyan-400 font-bold">敵レベル: Lv.${battle.dojoEnemyLevel} / 次の敵は Lv.${battle.dojoEnemyLevel + 1} の予定です</span>
        `;
      }

      saveUserDataLocal();
    }

    function quitBattle() {
      GameUI.endBattle(false);
    }

    // ⏸ ポーズ開閉。battle.paused を切り替え、UI側にポーズ画面の表示/非表示を依頼する。
    //   paused=true の間は battleInterval（敵の進行）も入力ハンドラも全て早期returnで止まる。
    function pauseGame() {
      if (!battle.active || battle.paused) return;
      battle.paused = true;
      if (typeof GameUI !== 'undefined' && GameUI.showPauseScreen) {
        GameUI.showPauseScreen(battle.goldEarnedInSession || 0, player.gold || 0);
      }
    }
    function resumeGame() {
      if (!battle.paused) return;
      battle.paused = false;
      if (typeof GameUI !== 'undefined' && GameUI.hidePauseScreen) GameUI.hidePauseScreen();
      if (typeof GameUI !== 'undefined' && GameUI.focusBattleInput) GameUI.focusBattleInput();
    }

    // ==========================================
    //          5. PVP & TOURNAMENT ENGINE
    // ==========================================

    // シリアル化ハッシュ化PvPデータ構築
    function fillCurrentPvpCode(playerNum) {
      const jsonStr = JSON.stringify(player);
      const base64Str = btoa(encodeURIComponent(jsonStr));
      document.getElementById(`pvp-code-${playerNum}`).value = base64Str;
    }

    function startPvPBattle() {
      const code1 = document.getElementById('pvp-code-1').value.trim();
      const code2 = document.getElementById('pvp-code-2').value.trim();

      if (!code1 || !code2) {
        alert('両方のセーブデータコードを入力してください。');
        return;
      }

      try {
        const p1Data = JSON.parse(decodeURIComponent(atob(code1)));
        const p2Data = JSON.parse(decodeURIComponent(atob(code2)));

        const logContainer = document.getElementById('pvp-log-container');
        document.getElementById('pvp-result-area').classList.remove('hidden');
        logContainer.innerHTML = '';

        simulate1vs1(p1Data, p2Data, logContainer);
      } catch(e) {
        alert('セーブコードの解析に失敗しました。');
      }
    }

    function simulate1vs1(p1, p2, logContainer) {
      const stats1 = getEffectiveStats(p1);
      const stats2 = getEffectiveStats(p2);

      let hp1 = stats1.hp;
      let hp2 = stats2.hp;

      logContainer.innerHTML += `<div class="text-cyan-400 font-bold">⚔️ 模擬バトル開始: ${p1.name} VS ${p2.name}</div>`;
      logContainer.innerHTML += `<div class="text-slate-500">・${p1.name}: HP ${stats1.hp} / ATK ${stats1.atk} / DEF ${stats1.def}</div>`;
      logContainer.innerHTML += `<div class="text-slate-500">・${p2.name}: HP ${stats2.hp} / ATK ${stats2.atk} / DEF ${stats2.def}</div>`;

      let round = 1;
      while (hp1 > 0 && hp2 > 0 && round <= 50) {
        logContainer.innerHTML += `<div class="text-indigo-300 font-bold mt-2">-- ターン ${round} --</div>`;

        let damage1 = Math.max(5, stats1.atk - stats2.def);
        let crit1 = Math.random() < stats1.critRate;
        if (crit1) damage1 = Math.floor(damage1 * stats1.critMult);
        
        let hitSum1 = 0;
        for (let i = 0; i < stats1.atkCount; i++) hitSum1 += damage1;
        hp2 = Math.max(0, hp2 - hitSum1);
        logContainer.innerHTML += `<div class="text-slate-300">⚔️ ${p1.name} の攻撃！ ${stats1.atkCount}回ヒット ${crit1 ? '💥 クリティカル！' : ''} ${p2.name} に <span class="text-red-400 font-bold">${hitSum1}</span> ダメージ (残HP:${hp2})</div>`;

        if (hp2 <= 0) break;

        let damage2 = Math.max(5, stats2.atk - stats1.def);
        let crit2 = Math.random() < stats2.critRate;
        if (crit2) damage2 = Math.floor(damage2 * stats2.critMult);

        let hitSum2 = 0;
        for (let i = 0; i < stats2.atkCount; i++) hitSum2 += damage2;
        hp1 = Math.max(0, hp1 - hitSum2);
        logContainer.innerHTML += `<div class="text-slate-300">⚔️ ${p2.name} の攻撃！ ${stats2.atkCount}回ヒット ${crit2 ? '💥 クリティカル！' : ''} ${p1.name} に <span class="text-red-400 font-bold">${hitSum2}</span> ダメージ (残HP:${hp1})</div>`;

        round++;
      }

      const winner = hp1 > 0 ? p1.name : p2.name;
      logContainer.innerHTML += `<div class="text-yellow-400 font-black text-sm mt-3 text-center">🏆 勝者: ${winner}! (残りHP: ${hp1 > 0 ? hp1 : hp2})</div>`;
    }

    function fillSampleTournamentCSV() {
      const sample1 = { name: "ケミカルマスター", level: 20, points: 50000, defeatedBosses: [], ownedItems: ["H", "He", "Li", "Be"], collectedSymbols: [], stats: { hp: 5, atk: 10, def: 5, cpRecover: 0, cpAtk: 0, stanAtk: 0, stanDef: 0 }, equipped: {} };
      const sample2 = { name: "アボガドロの使徒", level: 15, points: 20000, defeatedBosses: [], ownedItems: ["H", "He"], collectedSymbols: [], stats: { hp: 3, atk: 5, def: 7, cpRecover: 0, cpAtk: 0, stanAtk: 0, stanDef: 0 }, equipped: {} };
      
      const code1 = btoa(encodeURIComponent(JSON.stringify(sample1)));
      const code2 = btoa(encodeURIComponent(JSON.stringify(sample2)));
      
      document.getElementById('tournament-csv-input').value = `太郎,${code1}\n花子,${code2}`;
    }

    function buildTournament() {
      const csv = document.getElementById('tournament-csv-input').value.trim();
      const size = parseInt(document.getElementById('tournament-size-select').value);

      if (!csv) {
        alert('参加者の CSV データを入力してください。');
        return;
      }

      let participants = [];
      const lines = csv.split('\n');
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          try {
            const name = parts[0].trim();
            const rawData = JSON.parse(decodeURIComponent(atob(parts[1].trim())));
            rawData.name = name; 
            participants.push(rawData);
          } catch(e) {}
        }
      });

      if (participants.length === 0) {
        alert('有効なセーブデータコードが1つも見つかりませんでした。');
        return;
      }

      while (participants.length < size) {
        let avgLvl = 0, avgHp = 0, avgAtk = 0, avgDef = 0;
        participants.forEach(p => {
          avgLvl += p.level || 1;
          avgHp += (p.stats?.hp || 0);
          avgAtk += (p.stats?.atk || 0);
          avgDef += (p.stats?.def || 0);
        });
        avgLvl = Math.floor(avgLvl / participants.length);
        avgHp = Math.floor(avgHp / participants.length);
        avgAtk = Math.floor(avgAtk / participants.length);
        avgDef = Math.floor(avgDef / participants.length);

        const aiBot = {
          name: `🤖 AI_ケミカルロボ_${Math.floor(Math.random() * 1000)}`,
          level: avgLvl,
          stats: { hp: avgHp, atk: avgAtk, def: avgDef, cpRecover: 0, cpAtk: 0, stanAtk: 0, stanDef: 0 },
          equipped: {} 
        };
        participants.push(aiBot);
      }

      const logContainer = document.getElementById('pvp-log-container');
      document.getElementById('pvp-result-area').classList.remove('hidden');
      _eBar.style.background = _ePct < 0.3
        ? 'linear-gradient(90deg,#7f1d1d,#ef4444)'
        : _ePct < 0.6
        ? 'linear-gradient(90deg,#92400e,#fbbf24)'
        : 'linear-gradient(90deg,#dc2626,#f87171)';

      document.getElementById('enemy-action-bar').style.width = `${battle.enemyActionGauge}%`;
      document.getElementById('enemy-action-label').textContent = battle.enemyIsStunned ? '気絶中！' : `${Math.floor(battle.enemyActionGauge)}%`;

      document.getElementById('enemy-ultimate-bar').style.width = `${Math.min(100, battle.enemyUltGauge)}%`;
      document.getElementById('enemy-ultimate-label').textContent = `${Math.floor(battle.enemyUltGauge)}%`;

      document.getElementById('typing-miss-gauge').textContent = battle.missCount;

      const buffList = document.getElementById('combo-buff-list');
      buffList.innerHTML = '';
      if (battle.comboBuffs.length === 0) {
        buffList.innerHTML = `<div class="text-[10px] text-slate-500">5コンボ以上繋ぐと、バフが発動します。</div>`;
      } else {
        battle.comboBuffs.forEach(buff => {
          buffList.innerHTML += `
            <div class="flex justify-between items-center bg-slate-950 p-2 rounded border border-cyan-900/30 text-[10px] text-cyan-400 font-mono">
              <span>⚔️ 攻撃バフ: +${Math.floor(buff.val)}</span>
              <span>${buff.duration.toFixed(1)}s</span>
            </div>
          `;
        });
      }

      const statsSummary = document.getElementById('battle-stats-summary');
      let activeBuffsSum = battle.comboBuffs.reduce((sum, b) => sum + b.val, 0);
      statsSummary.innerHTML = `
        <div class="flex justify-between"><span>最大HP:</span><span class="text-white">${stats.hp}</span></div>
        <div class="flex justify-between"><span>実質攻撃力:</span><span class="text-white">${stats.atk} <span class="text-cyan-400">${activeBuffsSum > 0 ? `(+${Math.floor(activeBuffsSum)})` : ''}</span></span></div>
        <div class="flex justify-between"><span>防御力:</span><span class="text-white">${stats.def}</span></div>
        <div class="flex justify-between"><span>攻撃回数:</span><span class="text-white">${stats.atkCount}回</span></div>
        <div class="flex justify-between"><span>クリティカル率:</span><span class="text-white">${(stats.critRate * 100).toFixed(0)}%</span></div>
        <div class="flex justify-between"><span>コンボ回復量:</span><span class="text-white">+${stats.cpRecover}</span></div>
        <div class="flex justify-between"><span>スタン力:</span><span class="text-white">${stats.stanAtk.toFixed(1)}秒</span></div>
        <div class="flex justify-between"><span>スタン耐性:</span><span class="text-white">${stats.stanDef.toFixed(1)}秒</span></div>
      `;
    }

    // ==========================================
    //            7. SAVE/LOAD & SYSTEM
    // ==========================================
    function saveUserDataLocal() {
      localStorage.setItem('chemical_rpg_save_v1', JSON.stringify(player));
    }

    function loadUserData() {
      const saved = localStorage.getItem('chemical_rpg_save_v1');
      if (saved) {
        try {
          player = JSON.parse(saved);
        } catch(e) {}
      }
      // ── 旧セーブデータ移行・欠損フィールド補完 ──
      if (!player.defeatedBosses) player.defeatedBosses = [];
      if (typeof player.gold !== 'number' || player.gold < 0) player.gold = 50000;
      if (!player.equipped) player.equipped = { weapon:null, head:null, body:null, feet:null, accessory:null };
      if (!player.inventory) player.inventory = [];
      if (player.level && player.level > 1) {
        player.gold = (player.gold || 0) + (player.level - 1) * 500;
      }
      if (player.statPoints > 0) {
        player.gold = (player.gold || 0) + player.statPoints * 100;
      }
      // 旧フィールド削除（hasClearedOnce は UR解禁の根幹なので絶対に消さない）
      delete player.level;
      delete player.exp;
      delete player.statPoints;
      // hasClearedOnce: 未定義なら false 補完（ラスボス撃破でのみ true になる）
      if (typeof player.hasClearedOnce !== 'undefined') player.hasClearedOnce = !!player.hasClearedOnce;
      else player.hasClearedOnce = false;
      // 新フィールド補完
      if (!player.dojoEnemyLevel) player.dojoEnemyLevel = 1;
      // 学習ランク（旧 level/exp とは別物・ステ非連動）。欠損補完。
      if (typeof player.rank !== 'number' || player.rank < 1) player.rank = 1;
      if (typeof player.rankExp !== 'number' || player.rankExp < 0) player.rankExp = 0;
      // ようこそ画面: 既存セーブ(=セーブが存在するプレイヤー)は表示済み扱い＝新規だけに出す。
      if (typeof player.seenWelcome !== 'boolean') player.seenWelcome = true;
      // 裏ボス・称号・アバター（加算的＝既存セーブ安全）
      if (!Array.isArray(player.defeatedEndgame)) player.defeatedEndgame = [];
      if (!player.endgameLevel) player.endgameLevel = 1;
      // エンドボス(オメガ)のステータス別レベル（HP/ATK/行動速度/必殺頻度を各1〜20。既定10）
      if (!player.endgameStatLevels || typeof player.endgameStatLevels !== 'object') player.endgameStatLevels = { hp:10, atk:10, speed:10, ult:10 };
      ['hp','atk','speed','ult'].forEach(k => { if (typeof player.endgameStatLevels[k] !== 'number') player.endgameStatLevels[k] = 10; });
      if (typeof player.equippedTitle !== 'string') player.equippedTitle = 'none';
      if (typeof player.equippedAvatar !== 'string') player.equippedAvatar = 'default';
      if (typeof player.autoSellRarity !== 'string') player.autoSellRarity = ''; // ''=自動売却OFF
      if (!player.quizStats || typeof player.quizStats !== 'object') player.quizStats = {}; // 学習進捗(正答率)
      // スキル改名の移行: 旧『連鎖爆発』(コンボ消費型・コンボ爆撃と重複)→『連鎖共鳴』(消費しないATK上昇)。
      //  既存セーブの装備インスタンスはskill文字列を持つため、ここで置換しないと無効スキルになる。
      const _renameSkill = (it) => { if (it && it.skill === '連鎖爆発') it.skill = '連鎖共鳴'; };
      if (Array.isArray(player.inventory)) player.inventory.forEach(_renameSkill);
      if (player.equipped) Object.keys(player.equipped).forEach(s => _renameSkill(player.equipped[s]));
      // stats: 全17ステータスを STAT_META から補完（旧7種セーブにも対応）
      if (!player.stats || typeof player.stats !== 'object') player.stats = {};
      Object.keys(GameData.STAT_META).forEach(k => {
        if (typeof player.stats[k] !== 'number') player.stats[k] = 0;
      });
      // ── ステ振り簡素化（第1段）移行: 強化可能ステを HP/ATK/DEF に限定し、
      //    旧セーブで非コアステに振っていた分はゴールド全額返金して0に戻す（べき等＝非コア0なら何もしない）。
      const _core = GameData.ALLOCATABLE_STATS;
      let _retiredLv = 0;
      Object.keys(GameData.STAT_META).forEach(k => { if (_core.indexOf(k) < 0) _retiredLv += (player.stats[k] || 0); });
      if (_retiredLv > 0) {
        let _coreLv = 0;
        _core.forEach(k => { _coreLv += (player.stats[k] || 0); });
        // 共有コストの「末尾 _retiredLv 段ぶん」を返金（保持するコア投資は据え置き＝公平）
        let _refund = 0;
        for (let i = _coreLv; i < _coreLv + _retiredLv; i++) _refund += GameData.getStatUpgradeCost(i);
        player.gold = (player.gold || 0) + _refund;
        Object.keys(GameData.STAT_META).forEach(k => { if (_core.indexOf(k) < 0) player.stats[k] = 0; });
        console.error('[ステ簡素化] 非コアステ ' + _retiredLv + 'Lv分を返金: +' + _refund + 'G');
      }
      // 旧装備の掃除: 個体値(iv)を持つ／bonusStats未設定の旧装備は廃止（未公開のため削除でOK）
      const _isLegacyEquip = (it) => it && (typeof it.iv !== 'undefined' || !Array.isArray(it.bonusStats));
      let _removed = 0;
      if (Array.isArray(player.inventory)) {
        const before = player.inventory.length;
        player.inventory = player.inventory.filter(it => !_isLegacyEquip(it));
        _removed += before - player.inventory.length;
      }
      Object.keys(player.equipped).forEach(slot => {
        if (_isLegacyEquip(player.equipped[slot])) { player.equipped[slot] = null; _removed++; }
      });
      if (_removed > 0) console.error('[旧装備廃止] 個体値仕様の旧装備 ' + _removed + ' 個を削除しました（仕様変更のため）');
      updateMenuUI();
      // スライダーUIを初期化
      setTimeout(() => updateDojoLevelUI(player.dojoEnemyLevel), 0);
    }

    // ── 全データ初期化 ──
    function resetAllData() {
      if (!confirm('⚠️ 本当に全データを削除しますか？\n\nゴールド・装備・ステータス・進行状況がすべて消えます。\nこの操作は元に戻せません。')) return;
      if (!confirm('本当によろしいですか？\n（この確認が最後です）')) return;
      localStorage.removeItem('chemical_rpg_save_v1');
      // playerオブジェクトを初期状態にリセット
      player = {
        name: 'アルケミスト',
        gold: 50000,
        dojoEnemyLevel: 1,
        rank: 1,
        rankExp: 0,
        seenWelcome: false,
        defeatedBosses: [],
        hasClearedOnce: false,
        defeatedEndgame: [],
        endgameLevel: 1,
        endgameStatLevels: { hp:10, atk:10, speed:10, ult:10 },
        equippedTitle: 'none',
        equippedAvatar: 'default',
        autoSellRarity: '',
        stats: { hp:0, atk:0, def:0, cpRecover:0, cpAtk:0, stanAtk:0, stanDef:0 },
        equipped: { weapon:null, head:null, body:null, feet:null, accessory:null },
        inventory: [],
        quizStats: {}
      };
      saveUserDataLocal();
      playSound('skill');
      alert('✅ 全データを初期化しました。最初からスタートです！');
      showMenu();
    }

    function exportSave() {
      try {
        const jsonStr = JSON.stringify(player);
        const base64Str = btoa(encodeURIComponent(jsonStr));
        prompt('⬇️ あなたのセーブデータコードです。コピーして保管・対戦にお使いください：', base64Str);
      } catch(e) { alert('セーブデータのシリアル化に失敗しました。'); }
    }

    function importSave() {
      const code = prompt('📂 保管したセーブデータコード（文字列）を入力してください：');
      if (!code) return;
      if (applySaveCode(code)) { alert('📂 ロード成功！データを復元しました。'); showMenu(); }
      else { alert('無効なセーブデータコードです。'); }
    }

    // セーブコード（base64）を取得。モーダルからのコピー用。
    function getSaveCode() {
      try { return btoa(encodeURIComponent(JSON.stringify(player))); }
      catch(e) { return ''; }
    }
    // セーブコードを適用。localStorage経由で loadUserData の全補完ロジックを通す（importの取りこぼし防止）。
    function applySaveCode(code) {
      if (!code) return false;
      try {
        const parsed = JSON.parse(decodeURIComponent(atob(code.trim())));
        if (parsed && typeof parsed.gold === 'number') {
          localStorage.setItem('chemical_rpg_save_v1', JSON.stringify(parsed));
          loadUserData(); // 17ステータス補完・hasClearedOnce正規化・旧装備掃除を通す
          return true;
        }
      } catch(e) {}
      return false;
    }


  // ── 戦闘力計算 ──
  function getMaxDojoEnemyLevel() {
    const u = getDojoUnlockStatus();
    if (u.supreme) return 100; if (u.senior) return 70;
    if (u.mid) return 40; return 20;
  }

  function getTotalStrength() {
    const s = getEffectiveStats();
    let power = Math.floor(s.hp / 5) + s.atk * 4 + s.def * 6;
    Object.values(player.equipped).forEach(function(item) {
      if (!item) return;
      const rMult = GameData.RARITY_DB[item.rarity] ? GameData.RARITY_DB[item.rarity].mult : 1;
      power += Math.floor(item.baseVal * rMult * (1 + item.level * 0.01) * (1 + item.trans * 0.25) * 3);
    });
    return Math.floor(power);
  }

  // 推奨道場レベル（初心者ガイド）。攻撃力ベース＝敵HP(100×Lv)を妥当な手数で倒せるLv。
  //  解禁上限でclampするので、進度を超える無理なLvは出ない。
  function getRecommendedDojoLevel() {
    const atk = getEffectiveStats().atk;
    const div = GameData.GUIDE_CONFIG.recLevelAtkDivisor;
    const cap = getMaxDojoEnemyLevel();
    return Math.max(1, Math.min(cap, Math.round(atk / div)));
  }

  // ボスの推奨戦闘力（初心者ガイド）。100単位に丸める。
  function getBossRecommendedPower(boss) {
    if (!boss) return 0;
    const g = GameData.GUIDE_CONFIG;
    const raw = (boss.hp || 0) * g.bossRecHpCoef + (boss.atk || 0) * g.bossRecAtkCoef;
    return Math.round(raw / 100) * 100;
  }

  // 現在の戦闘力でボスに挑めるか。'ready'(緑)/'soon'(あと少し)/'early'(まだ早い)。
  function getBossReadiness(boss) {
    const rec = getBossRecommendedPower(boss);
    if (rec <= 0) return { level: 'ready', rec: rec };
    const power = getTotalStrength();
    if (power >= rec) return { level: 'ready', rec: rec };
    if (power >= rec * GameData.GUIDE_CONFIG.bossReadyRatio) return { level: 'soon', rec: rec };
    return { level: 'early', rec: rec };
  }

  function updateCharAvatar() {
    const power = getTotalStrength();
    const avatar = document.getElementById('char-avatar');
    const ring = document.getElementById('char-avatar-ring');
    if (!avatar) return;
    var glow = '', ringStyle = '';
    if (power >= 10000) {
      glow = '0 0 30px #fbbf24, 0 0 60px #f97316';
      ringStyle = 'opacity:0.7;background:linear-gradient(270deg,#ff007f,#7f00ff,#00f0ff,#ffea00,#ff007f);background-size:400% 400%;border-radius:50%;animation:rgb-gaming 2s ease infinite;';
    } else if (power >= 5000) {
      glow = '0 0 24px #a78bfa, 0 0 48px #7c3aed';
      ringStyle = 'opacity:0.8;background:conic-gradient(#a78bfa,#7c3aed,#a78bfa);border-radius:50%;animation:rgb-gaming 3s linear infinite;';
    } else if (power >= 2000) {
      glow = '0 0 20px #60a5fa';
      ringStyle = 'opacity:0.6;background:radial-gradient(circle,#60a5fa,transparent);border-radius:50%;animation:pulse-light 1.5s infinite;';
    } else if (power >= 500) {
      glow = '0 0 14px #22d3ee';
      ringStyle = 'opacity:0.4;background:radial-gradient(circle,#22d3ee,transparent);border-radius:50%;animation:pulse-light 2s infinite;';
    } else if (power >= 100) {
      glow = '0 0 8px #34d399'; ringStyle = 'opacity:0;';
    }
    // 選択中アバター（種類）を表示。画像 assets/ui/avatar_<id>.png があれば使用、無ければ絵文字。
    const av = (GameData.AVATARS_DB.find(a => a.id === player.equippedAvatar)) || GameData.AVATARS_DB[0];
    setVisualImg(avatar, 'assets/ui/avatar_' + av.id + '.png', av.emoji);
    avatar.style.filter = glow ? 'drop-shadow(' + glow.split(',')[0] + ')' : '';
    if (ring) { ring.style.cssText = ringStyle; }
  }


  function autoSortInventory() {
    GameEngine.player.inventory.sort(function(a, b) {
      var rarities = ['Common','Uncommon','Rare','Epic','Legendary','Relic'];
      return rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity);
    });
    GameEngine.saveUserDataLocal();
    GameUI.updateMenuUI();
  }

  function upgradeStatWithGold(key) {
    var lv = player.stats[key];
    var cap = GameData.STAT_CAPS[key];
    if (lv >= cap) { alert('このステータスは最大レベルに達しています！'); return; }
    var cost = GameData.getStatUpgradeCost(GameData.getTotalStatLevels(player.stats));
    if (player.gold < cost) { alert('ゴールドが不足しています！'); return; }
    player.gold -= cost;
    player.stats[key]++;
    saveUserDataLocal();
    playSound('skill');
    if (typeof GameUI !== 'undefined') { GameUI.renderStatList(); GameUI.updateMenuUI(); }
  }


  // ==========================================
  // §15 デバッグモード (開発・テスト専用)
  // ==========================================
  // 使い方: 画面下のデバッグボタンを押す
  // ※本番（生徒配布時）にはボタンを非表示にすること
  function activateDebugMode() {
    player.gold = 100000000;                              // ゴールド: 1億
    player.defeatedBosses = GameData.BOSSES_DB.map(b => b.id); // 全ボス撃破済み → 全道場解放
    player.dojoEnemyLevel = 1;
    player.hasClearedOnce = true;                         // UR(ケイオス)ガチャ解禁

    // 全UR装備を「最大強化版」と「未強化版」で入手。
    //  デバッグ装備のボーナス枠は「その系統(theme)にとって理想のステ」を全て上限ロール(=虹色)で付与。
    const urMult = GameData.RARITY_DB.Relic.mult;
    const _maxRoll = GameData.RARITY_DB.Relic.rollMax; // 上限ロール(7)
    const IDEAL = {
      attack:     ['crit', 'critDmg', 'atk'],
      durability: ['hp', 'def', 'dodge'],
      combo:      ['atk', 'crit', 'dodge'],
      special:    ['goldMul', 'atk', 'hp']
    };
    const idealBonus = (theme) => (IDEAL[theme] || ['atk', 'hp', 'crit']).map(key => ({ key, lv: _maxRoll }));
    GameData.UNIQUE_EQUIP_TEMPLATES.forEach(t => {
      [{ level: 100, trans: 5 }, { level: 0, trans: 0 }].forEach(s => {
        player.inventory.push({
          uniqueId: 'dbg_' + t.id + '_' + s.level + '_' + Math.floor(Math.random() * 1e6),
          id: t.id, type: t.type, name: t.name, stat: t.stat,
          baseVal: t.baseVal * urMult,
          bonusStats: idealBonus(t.theme),
          emoji: t.emoji, skill: t.skill, rarity: 'Relic',
          level: s.level, trans: s.trans
        });
      });
    });

    saveUserDataLocal();
    if (typeof GameUI !== 'undefined') GameUI.updateMenuUI();
    alert('🛠️ デバッグモード有効化！\n✅ ゴールド: 1億\n✅ 全ボス解放\n✅ 全道場解放\n✅ UR解禁\n✅ 全UR装備（最大強化＋未強化）入手');
  }

  return {
    get player() { return player; }, set player(v) { player = v; },
    get battle() { return battle; },
    getEffectiveStats, getTotalStrength, getDojoUnlockStatus, getMaxDojoEnemyLevel, updateCharAvatar, getRankInfo,
    getRecommendedDojoLevel, getBossRecommendedPower, getBossReadiness,
    startDojo, startBossBattle, startEndgameBoss, getCurrentEndgameBoss, spawnNextDojoEnemy, nextQuestion,
    processCorrectAnswer, handleKeyInput, handleQuizAnswer, answerChoice, comboBurst, quitBattle, endBattle, pauseGame, resumeGame,
    upgradeEquip, transcendEquip, sellEquip, bulkSellInventory,
    autoSortInventory, saveUserDataLocal, loadUserData, resetAllData,
    pullGacha, pullGachaMulti, pullUntilStat, gachaPrice, exportSave, importSave, getSaveCode, applySaveCode, changePlayerName, closeNameEditModal, savePlayerName, setPlayerGrade,
    upgradeStatWithGold, resetStatPointsAction, fillCurrentPvpCode, startPvPBattle,
    fillSampleTournamentCSV, buildTournament, activateDebugMode,
    get isFeedbacking() { return isFeedbacking; }, set isFeedbacking(v) { isFeedbacking = v; },
    get battleInterval() { return battleInterval; }, set battleInterval(v) { battleInterval = v; },
    get selectedModalItem() { return selectedModalItem; }, set selectedModalItem(v) { selectedModalItem = v; },
  };
})();