// ============================================================
// ui.js  –  GameUI
// ============================================================
//
// 【目次】（エラー調査時はここを見て該当セクションへ飛ぶ）
//  §1  変数・ショートカット定義              ～ line  15
//  §2  メニュー画面更新 updateMenuUI         ～ line  16
//  §3  装備スロット表示 renderEquippedSlots   ～ line 106
//  §4  インベントリ管理（開閉・グリッド）    ～ line 132
//  §5  ステータスポップアップ                ～ line 164
//  §6  ステータス強化UI upgradeStatWithGold  ～ line 209
//  §7  道場ポップアップ（開閉・難度選択）    ～ line 233
//  §8  装備モーダル（装備・強化・売却）      ～ line 331
//  §9  サウンド再生 playSound                ～ line 398
//  §10 メニュー→各画面への遷移              ～ line 506
//  §11 ボス選択画面 openBossSelection        ～ line 519
//  §12 ガチャ画面 openGachaScreen            ～ line 578
//  §13 図書館画面 openLibraryScreen          ～ line 654
//  §14 PvP画面 openPvPScreen                 ～ line 748
//  §15 戦闘画面 showBattleScreen             ～ line 753
//  §16 戦闘UI更新 updateBattleUI             ～ line 779
//  §17 戦闘終了・撤退 endBattle / quitBattle ～ line 849
//  §18 ユーティリティ（パーティクル等）     ～ line 931
//  §19 公開API return {}                     ～ line末尾
//
const GameUI = (function() {

  // ── DB・Engineへのショートカット ──
  const _P = () => GameEngine.player;
  const _B = () => GameEngine.battle;
  const _D = GameData;

  // ── モバイル判定（ソフトキーボードが立ち上がる端末か）──
  //  スマホ＝タッチ＋粗いポインタ、またはUAがモバイル。選択問題でのキーボード抑止と推奨注記に使う。
  const IS_MOBILE = (function() {
    try {
      const ua = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');
      const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      return ua || (touch && coarse);
    } catch (e) { return false; }
  })();

  // 出題形式トグルの下に出す「スマホは選択式推奨」の注記（PCでは空文字＝非表示）。
  function _mobileChoiceNote() {
    if (!IS_MOBILE) return '';
    return '<div class="basis-full w-full text-[10px] text-amber-300/90 mt-1 leading-snug">'
      + '📱 スマホは「🔘 選択式」がおすすめ（⌨️ タイピングはキーボード入力のためPC向け）</div>';
  }

  // ui.js内のローカル変数（エンジン側に保持するものはGameEngine経由）
  let _dojoPopupDifficulty = 'junior';
  let libraryCurrentTier = 'junior';
  // 図書館の絞り込み状態（解説閲覧＋道場への引き継ぎに使用）
  let _libSubject = 'chemistry'; // 教科（'chemistry'/'physics'）
  let _libGenres = [];        // 選択中ジャンルキー（空=その教科の全ジャンル）
  let _libType = '';          // ''=両方 / 'typing' / 'choice'
  // 道場ポップアップの絞り込み状態
  let _dojoSubject = 'chemistry'; // 教科
  let _gachaIndex = 0;            // ガチャカルーセルの現在位置
  let _dojoGenres = [];       // 空=その教科の全ジャンル
  let _dojoType = '';         // ''=両方 / 'typing' / 'choice'
  // 出題範囲フルウィンドウ（道場・難易度複数選択）の確定済み状態
  let _rangeDiffs = ['junior'];  // 選択中の難易度（複数・最上位ほど出やすい）
  let _rangeGenres = [];         // 選択中ジャンル（教科混在可・空=全ジャンル）
  let _rangeType = '';           // ''=両方 / 'typing' / 'choice'
  let _rangeGrades = [];         // 選択中の学年(1/2/3)・空=全学年
  // レアリティ文字色（§12 openGachaRateModal で使用）
  const RARITY_TEXT_COLORS = {
    'Common':    'text-slate-300',
    'Uncommon':  'text-green-400',
    'Rare':      'text-blue-400',
    'Epic':      'text-purple-400',
    'Legendary': 'text-yellow-400',
    'Relic':     'text-indigo-400'   // UR
  };


    function updateMenuUI() {
      const power = GameEngine.getTotalStrength();
      document.getElementById('header-gold').textContent = GameEngine.player.gold.toLocaleString();
      document.getElementById('header-level').textContent = power;
      const _rankEl = document.getElementById('header-rank');
      if (_rankEl) _rankEl.textContent = GameEngine.player.rank || 1;
      // 名前＋称号フレーム
      const _nameEl = document.getElementById('menu-player-name');
      const _tid = GameEngine.player.equippedTitle || 'none';
      const _t = GameData.TITLES_DB.find(t => t.id === _tid);
      if (_t && _t.frame) {
        _nameEl.className = 'name-frame ' + _t.frame + ' text-sm';
        _nameEl.textContent = GameEngine.player.name;
      } else {
        _nameEl.className = 'font-black text-white text-sm';
        _nameEl.textContent = GameEngine.player.name;
      }
      renderPlayerGradeLabel();
      const bpEl = document.getElementById('menu-battle-power');
      if (bpEl) bpEl.textContent = power.toLocaleString();
      const spEl = document.getElementById('menu-stat-pts');
      if (spEl) spEl.textContent = power.toLocaleString();
      const expEl = document.getElementById('menu-exp-bar');
      if (expEl) expEl.textContent = power.toLocaleString();
      if (document.getElementById('inv-count')) document.getElementById('inv-count').textContent = GameEngine.player.inventory.length;

      // キャラアバター演出更新
      GameEngine.updateCharAvatar();

      // 道場スライダー同期
      if (document.getElementById('dojo-enemy-level-slider')) updateDojoLevelUI(GameEngine.player.dojoEnemyLevel || 1);

      // 道場ボタン（非表示コンテナ）
      const dojoBtnContainer = document.getElementById('dojo-buttons-container');
      if (dojoBtnContainer) dojoBtnContainer.innerHTML = '';

      // 次のボスプレビュー
      const nextBossPreview = document.getElementById('next-boss-preview');
      if (nextBossPreview) {
        const def = GameEngine.player.defeatedBosses || [];
        const nextBoss = GameData.BOSSES_DB.find(b => !def.includes(b.id));
        if (nextBoss) {
          nextBossPreview.innerHTML = `<span class="text-slate-300 font-bold">${nextBoss.avatar} ${nextBoss.name}</span>
            <span class="ml-2 text-rose-400 font-mono text-[8px]">HP:${nextBoss.hp.toLocaleString()}</span>`;
        } else {
          nextBossPreview.innerHTML = '<span class="text-yellow-400 font-bold">🏆 全ボス撃破済！</span>';
        }
      }

      // 進捗ヒント
      const hintBox = document.getElementById('progress-hint-box');
      if (hintBox) {
        const def2 = GameEngine.player.defeatedBosses || [];
        const nb = GameData.BOSSES_DB.find(b => !def2.includes(b.id));
        if (!nb) {
          hintBox.innerHTML = '<span class="text-yellow-400 font-bold">🎉 おめでとう！全ボス撃破達成！</span><br><span class="text-slate-400">超級道場でさらなる高みを目指そう！</span>';
        } else {
          // 戦闘力の現在地と次ボスの目安を並べて「戦闘力とは何か・どれだけ足りないか」を伝える。
          const power = GameEngine.getTotalStrength();
          const rec = GameEngine.getBossRecommendedPower(nb);
          const pclass = power >= rec ? 'text-emerald-400' : 'text-amber-400';
          const powerLine = `<div class="mt-1.5 pt-1.5 border-t border-slate-800/60 text-slate-400">`
            + `あなたの戦闘力 <b class="${pclass}">${power.toLocaleString()}</b> ／ ${nb.avatar}撃破の目安 <b class="text-rose-300">${rec.toLocaleString()}</b>`
            + `<br><span class="text-[8px] text-slate-500">※「戦闘力」＝あなたの強さ。道場でコインを稼ぎ、ステータス強化や装備で上げよう。</span></div>`;
          if ((def2.length) === 0) {
            // 新規プレイヤーには「まず道場」だけを一点で示す（情報を出しすぎない）。
            hintBox.innerHTML = `<span class="text-emerald-400 font-bold">📌 まず最初に:</span> <span class="text-white font-bold">🥋 道場で問題を解いてコインを稼ごう！</span>` + powerLine;
          } else {
            const hints = {
              junior: '道場でコインを集め、ステータス強化やガチャで装備を集めましょう！',
              mid: '道場でコインを集め、ステータス強化やガチャで装備を集めましょう！中級道場で化学反応式を練習しよう！',
              senior: '道場でコインを集め、ステータス強化やガチャで装備を集めましょう！図書館でイオン式を確認しておこう！',
              supreme: '道場でコインを集め、ステータス強化やガチャで装備を集めましょう！ガチャで高レアリティ装備を目指そう！'
            };
            hintBox.innerHTML = `<span class="text-cyan-400 font-bold">📌 次の目標:</span> <span class="text-white font-bold">${nb.avatar} ${nb.name}を倒す</span><br>`
              + `<span class="text-slate-400">💡 ヒント: ${hints[nb.tier]}</span>` + powerLine;
          }
        }
      }

      // コンパクトステータス表示（総戦力＋初級ステータスのみ。タップで全表示ポップアップ）
      const statDisplay = document.getElementById('menu-stat-display');
      if (statDisplay) {
        const s = GameEngine.getEffectiveStats();
        const power = GameEngine.getTotalStrength();
        statDisplay.style.cursor = 'pointer';
        statDisplay.onclick = () => openStatPopup();
        const _row = ([label, val]) => `<div class="flex justify-between"><span class="text-slate-400">${label}</span><span class="text-white font-bold">${val}</span></div>`;
        // 初級ステータス(攻防HP)は常に表示。上級(クリ/連撃/回避)はボス1体撃破後に表示＝新規はシンプルに。
        const _basic = [['❤️ HP', s.hp], ['🗡️ ATK', s.atk], ['🛡️ DEF', s.def]].map(_row).join('');
        const _showAdvanced = (GameEngine.player.defeatedBosses || []).length >= 1 || GameEngine.player.hasClearedOnce;
        const _advanced = _showAdvanced
          ? `<div class="text-[8px] text-purple-300 font-bold mt-1 mb-0.5 border-t border-slate-800/60 pt-1">上級ステータス</div>`
            + [['💥 クリティカル率', Math.round(s.critRate*100)+'%'], ['🔁 連撃数', s.atkCount+'回'], ['💨 回避率', Math.round(s.dodge*100)+'%']].map(_row).join('')
          : '';
        statDisplay.innerHTML =
          `<div class="flex justify-between items-center pb-1 mb-1 border-b border-slate-700/50"><span class="text-slate-300 font-bold">💪 総戦力</span><span class="text-yellow-400 font-black text-sm">${power.toLocaleString()}</span></div>`
          + _basic + _advanced
          + `<div class="text-center text-[8px] text-cyan-400 mt-1 font-bold">▶ タップで${_showAdvanced ? '全ステータス' : '上級ステータス'}・スキルも表示</div>`;
      }

      // 装備スロット (ホーム画面)
      const slotsContainer = document.getElementById('equipped-slots-container');
      if (slotsContainer) renderEquippedSlots(slotsContainer);

      // インベントリポップアップが開いているなら同期
      const invPopupEq = document.getElementById('inv-popup-equipped');
      if (invPopupEq && !document.getElementById('inventory-popup').classList.contains('hidden')) {
        renderEquippedSlots(invPopupEq);
        renderInventoryGrid();
      }

      // ステータスポップアップが開いているなら同期
      if (!document.getElementById('stat-popup').classList.contains('hidden')) {
        renderStatList();
      }

      // 進度に応じて上級コンテンツを表示/非表示（新規プレイヤーに情報を出しすぎない）
      applyProgressiveDisclosure();
      // 新規プレイヤーには初回ようこそ画面を一度だけ
      maybeShowWelcome();
    }

    // 進度ゲート: data-gate 属性を持つボタンを進度に応じて表示。
    //  played=道場で数問解いた等で解放 / boss1=ボス1体撃破 / boss4=中級解禁(4体) / cleared=ラスボス撃破。
    function applyProgressiveDisclosure() {
      const p = GameEngine.player;
      const bossCount = (p.defeatedBosses || []).length;
      const cleared = !!p.hasClearedOnce;
      // 「少し遊んだ」= 道場で5問以上 / ランク2以上 / ボス撃破済。ガチャ・図書館はこの後に出す。
      let answered = 0;
      const qs = p.quizStats || {};
      Object.keys(qs).forEach(function(k) { answered += (qs[k] && qs[k].t) ? qs[k].t : 0; });
      const played = answered >= 5 || (p.rank || 1) >= 2 || bossCount >= 1;
      const ok = { played: played, boss1: bossCount >= 1, boss4: bossCount >= 4, cleared: cleared };
      document.querySelectorAll('[data-gate]').forEach(function(el) {
        const need = el.getAttribute('data-gate');
        const show = (need in ok) ? ok[need] : true;
        el.classList.toggle('hidden', !show);
      });
    }

    // ── 初回ようこそ（チュートリアル導入） ──
    function maybeShowWelcome() {
      if (GameEngine.player.seenWelcome) return;
      // メニュー以外を開いている最中は出さない（戦闘復帰時など）
      const menu = document.getElementById('screen-menu');
      if (menu && menu.classList.contains('hidden')) return;
      openWelcomeModal();
    }
    function openWelcomeModal() {
      const m = document.getElementById('welcome-modal');
      if (m) m.classList.remove('hidden');
    }
    function _dismissWelcome() {
      GameEngine.player.seenWelcome = true;
      try { GameEngine.saveUserDataLocal(); } catch (e) {}
    }
    function closeWelcomeModal() {
      _dismissWelcome();
      const m = document.getElementById('welcome-modal');
      if (m) m.classList.add('hidden');
    }
    function startTutorialDojo() {
      closeWelcomeModal();
      openDojoPopup();
    }

    // 部位アイコン（装備カード右下に表示）と部位ラベル
    const SLOT_ICON = { weapon: '⚔️', head: '🪖', body: '🥼', feet: '🥾', accessory: '💍' };
    const SLOT_LABEL = { weapon: '武器', head: '頭', body: '胴', feet: '足', accessory: '装飾' };
    const RARITY_BADGE_BG = { Common:'#475569', Uncommon:'#059669', Rare:'#2563eb', Epic:'#9333ea', Legendary:'#d97706', Relic:'#6366f1' };
    function _rarityShort(rarity) { const n = GameData.RARITY_DB[rarity]; return n ? n.name.split(' ')[0] : '?'; }
    // 完全強化（強化MAX＝Lv100 ＆ 超越+5MAX）か
    function _isMaxed(item) { return (item.level || 0) >= 100 && (item.trans || 0) >= 5; }
    // レアリティ別の輝きアニメクラス（SR以上）。最大強化は _equipCardClass 側で特別演出
    function _equipAnimClass(item) {
      if (_isMaxed(item)) return '';
      if (item.rarity === 'Relic')     return 'equip-ur equip-sweep';
      if (item.rarity === 'Legendary') return 'equip-ssr equip-sweep';
      if (item.rarity === 'Epic')      return 'equip-sr';
      return '';
    }
    // 強化レベル・超越段階に応じた輝き強度 --glow（0〜2）
    function _equipGlow(item) { return ((item.level || 0) / 100 + (item.trans || 0) / 5).toFixed(2); }
    // 装備カードのソシャゲ風オーバーレイ（左上=レアリティ文字バッジ / 右下=部位アイコン）
    function _equipBadges(item) {
      const bg = RARITY_BADGE_BG[item.rarity] || '#475569';
      return '<span class="rarity-badge" style="background:' + bg + '">' + _rarityShort(item.rarity) + '</span>'
           + '<span class="slot-badge">' + (SLOT_ICON[item.type] || '') + '</span>';
    }
    // 装備アイコンは「個別画像 assets/equip/<id>.png」方式（シート切り出しはズレるため廃止）。
    // 画像があれば表示、無ければ絵文字へ自動フォールバック（onerror）。ボス/アバターと同じ方式に統一
    // ＝どの画面・モーダルでも確実に描画される（旧プリロード方式はモーダルを再描画できず絵文字のままになった）。
    function _equipIcon(item, px) {
      const fs = Math.round(px * 0.8);
      // [TEST最適化] loading=lazy / decoding=async で画面外カードの画像読み込み・デコードを遅延。
      //  大量インベントリでも「見えているカードだけ」読むので初期表示が軽くなる（非対応ブラウザは従来どおり）。
      return `<img src="assets/equip/${item.id}.png" loading="lazy" decoding="async" style="width:${px}px;height:${px}px;object-fit:contain;display:inline-block" `
        + `onerror="this.replaceWith(Object.assign(document.createElement('span'),{style:'font-size:${fs}px;line-height:1;display:inline-block',textContent:'${item.emoji}'}))">`;
    }

    // 装備カードの共通クラス（色＋輝き）。最大強化のSSR/URは専用演出。
    function _equipCardClass(item) {
      const rData = GameData.RARITY_DB[item.rarity];
      if (_isMaxed(item) && item.rarity === 'Relic') {
        // UR最大強化: オパール風ゲーミング虹背景＋白虹光彩
        return 'gacha-legend-bg equip-ur-max text-white border-2 border-white/70';
      }
      if (_isMaxed(item) && item.rarity === 'Legendary') {
        // SSR完全強化: 赤く光る
        return rData.color + ' equip-ssr-max';
      }
      return rData.color + ' ' + _equipAnimClass(item);
    }

    function renderEquippedSlots(container) {
      container.innerHTML = '';
      const slots = [
        { type: 'weapon', label: '武器', emoji: '⚔️' },
        { type: 'head', label: '頭', emoji: '🥽' },
        { type: 'body', label: '胴', emoji: '🥼' },
        { type: 'feet', label: '足', emoji: '🥾' },
        { type: 'accessory', label: '装飾', emoji: '💎' }
      ];
      // [TEST最適化] フラグメントにまとめて1回挿入。
      const _frag = document.createDocumentFragment();
      slots.forEach(slot => {
        const item = GameEngine.player.equipped[slot.type];
        const btn = document.createElement('button');
        if (item) {
          btn.className = `relative rounded-xl p-1.5 flex flex-col items-center text-center border transition-all hover:scale-105 active:scale-95 ${_equipCardClass(item)}`;
          btn.setAttribute('style', '--glow:' + _equipGlow(item));
          btn.onclick = () => openEquipModal(item);
          btn.innerHTML = `${_equipBadges(item)}${_equipIcon(item, 34)}<span class="text-[8px] font-bold leading-tight mt-0.5 truncate w-full">${item.name}</span><span class="text-[8px] text-yellow-400">+${item.level}</span>`;
        } else {
          btn.className = 'rounded-xl p-1 flex flex-col items-center text-center border border-dashed border-slate-700 text-slate-600 hover:border-slate-500 transition-all';
          btn.onclick = () => openInventoryPopup();
          btn.innerHTML = `<span class="text-xl opacity-30">${slot.emoji}</span><span class="text-[7px] mt-0.5">${slot.label}</span><span class="text-[6px]">空き</span>`;
        }
        _frag.appendChild(btn);
      });
      container.appendChild(_frag);
    }

    let _invSlotFilter = 'all'; // インベントリの部位フィルタ
    let _invStatFilter = 'all'; // インベントリのメインステータスフィルタ

    // メインステータスフィルタのチップ列を描画（希望ステータスで絞り込み）
    function renderInvStatFilter() {
      const bar = document.getElementById('inv-stat-filter');
      if (!bar) return;
      bar.innerHTML = '';
      const opts = [['all', 'すべて']].concat(_equipMainStatKeys().map(k => [k, GameData.STAT_NAMES_JP[k] || k]));
      opts.forEach(([key, label]) => {
        const b = document.createElement('button');
        const active = _invStatFilter === key;
        b.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all '
          + (active ? 'bg-emerald-700 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700');
        b.textContent = label;
        b.onclick = () => { _invStatFilter = key; renderInvStatFilter(); renderInventoryGrid(); };
        bar.appendChild(b);
      });
    }

    // 部位フィルタのボタン列を描画
    function renderInvSlotFilter() {
      const bar = document.getElementById('inv-slot-filter');
      if (!bar) return;
      bar.innerHTML = '';
      const opts = [['all', 'すべて'], ['weapon', '⚔️武器'], ['head', '🪖頭'], ['body', '🥼胴'], ['feet', '🥾足'], ['accessory', '💍装飾']];
      opts.forEach(([key, label]) => {
        const b = document.createElement('button');
        const active = _invSlotFilter === key;
        b.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all '
          + (active ? 'bg-cyan-700 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700');
        b.textContent = label;
        b.onclick = () => { _invSlotFilter = key; renderInvSlotFilter(); renderInventoryGrid(); };
        bar.appendChild(b);
      });
    }

    function renderInventoryGrid() {
      const grid = document.getElementById('inventory-grid');
      if (!grid) return;
      grid.innerHTML = '';
      const list = GameEngine.player.inventory.filter(it =>
        (_invSlotFilter === 'all' || it.type === _invSlotFilter) &&
        (_invStatFilter === 'all' || it.stat === _invStatFilter));
      if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-5 text-center text-slate-500 text-[10px] py-4">該当する装備がありません。</div>';
        return;
      }
      // [TEST最適化] 装備中uniqueIdを1回だけ集合化（毎カードでの Object.values(...).some を回避）。
      const _equippedIds = new Set(Object.values(GameEngine.player.equipped).filter(Boolean).map(e => e.uniqueId));
      // [TEST最適化] DocumentFragment にまとめてから1回だけ挿入（カードごとのリフローを回避）。
      const _frag = document.createDocumentFragment();
      list.forEach(item => {
        const btn = document.createElement('button');
        btn.className = `relative rounded-xl p-2 flex flex-col items-center text-center border transition-all hover:scale-105 active:scale-95 ${_equipCardClass(item)}`;
        btn.setAttribute('style', '--glow:' + _equipGlow(item));
        btn.onclick = () => openEquipModal(item);
        const isEq = _equippedIds.has(item.uniqueId);
        btn.innerHTML = `${_equipBadges(item)}${_equipIcon(item, 40)}<span class="text-[8px] font-bold leading-tight truncate w-full mt-0.5">${item.name}</span><span class="text-[8px] ${isEq ? 'text-cyan-400' : 'text-yellow-400'}">${isEq ? '装備中' : '+'+item.level}</span>`;
        _frag.appendChild(btn);
      });
      grid.appendChild(_frag);
    }

    // ✨ おまかせ装備（初心者向け）: 各部位で戦闘力が最大になる装備を自動装備。
    //  自滅系スキル（被ダメ増・自傷・回復不可）は表示戦闘力に下振れが出ないため数値だけだと掴んでしまう。
    //  安全な装備を優先し、その部位に安全な選択肢が一つも無い時だけ危険装備にフォールバックする（素手回避）。
    const AUTO_AVOID_SKILLS = ['血の契約', '排水の陣', '錬金術師の欲望'];
    function autoEquipBest() {
      const types = ['weapon', 'head', 'body', 'feet', 'accessory'];
      let skippedRisky = false;
      // 指定プールの中で getTotalStrength が最大になる装備を返す（無ければ null）
      const pickBest = (t, pool) => {
        let best = null, bestPow = -1;
        pool.forEach(c => {
          GameEngine.player.equipped[t] = c;
          const pow = GameEngine.getTotalStrength();
          if (pow > bestPow) { bestPow = pow; best = c; }
        });
        return best;
      };
      types.forEach(t => {
        const orig = GameEngine.player.equipped[t];
        const all  = GameEngine.player.inventory.filter(it => it.type === t);
        const safe = all.filter(it => AUTO_AVOID_SKILLS.indexOf(it.skill) < 0);
        if (orig) safe.push(orig); // 現在装備が安全なら基準に含める（無駄な着け替え防止）
        const safeBest = pickBest(t, safe.filter(it => AUTO_AVOID_SKILLS.indexOf(it.skill) < 0));
        if (safeBest) {
          GameEngine.player.equipped[t] = safeBest;
        } else if (all.length) {
          // 安全な選択肢が無い部位だけ、素手より良い危険装備を着ける
          GameEngine.player.equipped[t] = pickBest(t, all) || orig;
          skippedRisky = true;
        } else {
          GameEngine.player.equipped[t] = orig;
        }
      });
      GameEngine.saveUserDataLocal();
      playSound('skill');
      renderEquippedSlots(document.getElementById('inv-popup-equipped'));
      renderInventoryGrid();
      updateMenuUI();
      alert('✨ おまかせ装備しました！（血の契約・背水など"自滅系"スキルは安全のため自動では選びません。上級者は手動でどうぞ）');
    }

    function openInventoryPopup() {
      const popup = document.getElementById('inventory-popup');
      popup.classList.remove('hidden');
      renderEquippedSlots(document.getElementById('inv-popup-equipped'));
      renderInvSlotFilter();
      renderInvStatFilter();
      renderInventoryGrid();
      document.getElementById('inv-count').textContent = GameEngine.player.inventory.length;
    }

    function closeInventoryPopup() {
      document.getElementById('inventory-popup').classList.add('hidden');
      updateMenuUI();
    }

    function openStatPopup() {
      document.getElementById('stat-popup').classList.remove('hidden');
      renderStatList();
    }

    function closeStatPopup() {
      document.getElementById('stat-popup').classList.add('hidden');
      updateMenuUI(); // ステータスを閉じた後にヘッダーの戦闘力・ゴールドを同期
    }

    // ── 学習ランク報酬ビューア ──
    function openRankModal() {
      renderRankModal();
      document.getElementById('rank-modal').classList.remove('hidden');
    }
    function closeRankModal() {
      document.getElementById('rank-modal').classList.add('hidden');
    }
    // ランク報酬オブジェクトを表示用ラベルに（gold/ゴールドガチャ10連券/選択UR券）。
    function _rankRewardLabel(reward) {
      if (!reward) return '';
      const parts = [];
      if (reward.gold) parts.push('+' + reward.gold.toLocaleString() + 'G');
      if (reward.gachaGold10) parts.push('🎟️ゴールドガチャ10連券×' + reward.gachaGold10);
      if (reward.selectUR) parts.push('🎫選択UR券×' + reward.selectUR);
      return parts.join(' / ');
    }
    function renderRankModal() {
      const body = document.getElementById('rank-modal-body');
      if (!body) return;
      const info = GameEngine.getRankInfo();
      const pct = Math.max(0, Math.min(100, Math.round(info.rankExp / info.need * 100)));
      const nextReward = info.nextRankTickets > 0
        ? ('🔧ステ更新券×' + info.nextRankTickets)
        : ('+' + info.nextRankGold.toLocaleString() + 'G');
      let html = '';
      // 現在ランク＋次ランクまでの進捗バー
      html += '<div class="bg-slate-950 rounded-xl p-3 border border-amber-700/40">';
      html += '<div class="flex items-end justify-between mb-1">';
      html += '<div><span class="text-[10px] text-amber-400 font-bold">現在のランク</span><div class="text-2xl font-black text-amber-300 leading-none">' + info.rank + '</div></div>';
      html += '<div class="text-right text-[9px] text-slate-400">次のランクで<br><b class="text-amber-300">' + nextReward + '</b></div>';
      html += '</div>';
      html += '<div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden"><div class="bg-amber-500 h-2.5 rounded-full" style="width:' + pct + '%"></div></div>';
      html += '<div class="text-[9px] text-slate-500 mt-1 text-right">次のランクまで ' + info.rankExp + ' / ' + info.need + ' EXP</div>';
      html += '</div>';
      // 所持している券（使えるものは使用ボタン）
      const tk = info.tickets || {};
      html += '<div><div class="text-[10px] text-cyan-400 font-bold mb-1.5">🎟️ 所持している券</div><div class="space-y-1.5">';
      html += '<div class="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-1.5 border border-slate-800"><span class="text-[11px] text-slate-300">🔧 ステ更新券 <b class="text-cyan-300">' + (tk.statReroll || 0) + '</b></span><span class="text-[8px] text-slate-500">装備の🎒変更・管理 →装備→更新</span></div>';
      html += '<div class="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-1.5 border border-slate-800"><span class="text-[11px] text-slate-300">🎟️ ゴールドガチャ10連券 <b class="text-yellow-300">' + (tk.gachaGold10 || 0) + '</b></span>'
        + ((tk.gachaGold10 || 0) > 0 ? '<button onclick="useGachaGold10()" class="bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg active:scale-95">回す</button>' : '<span class="text-[8px] text-slate-600">なし</span>') + '</div>';
      html += '<div class="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-1.5 border border-slate-800"><span class="text-[11px] text-slate-300">🎫 選択UR券 <b class="text-fuchsia-300">' + (tk.selectUR || 0) + '</b></span>'
        + ((tk.selectUR || 0) > 0 ? '<button onclick="openURPicker()" class="bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg active:scale-95">選ぶ</button>' : '<span class="text-[8px] text-slate-600">なし</span>') + '</div>';
      html += '</div></div>';
      // 節目報酬リスト
      html += '<div><div class="text-[10px] text-amber-400 font-bold mb-1.5">🏆 節目の大型報酬</div><div class="space-y-1">';
      info.milestones.forEach(function(m) {
        const reached = m.reached;
        html += '<div class="flex items-center justify-between rounded-lg px-3 py-1.5 border ' +
          (reached ? 'bg-amber-900/30 border-amber-600/50' : 'bg-slate-950 border-slate-800') + '">';
        html += '<span class="text-xs font-bold shrink-0 ' + (reached ? 'text-amber-300' : 'text-slate-300') + '">' +
          (reached ? '✅ ' : '🔒 ') + 'ランク ' + m.rank + '</span>';
        html += '<span class="text-[11px] font-black text-right ' + (reached ? 'text-amber-300' : 'text-slate-400') + '">' + _rankRewardLabel(m.reward) + '</span>';
        html += '</div>';
      });
      html += '</div></div>';
      html += '<p class="text-[9px] text-slate-500">ランク' + info.maxRank + 'まではゴールド、<b class="text-cyan-300">それ以降は1ランクごとに🔧ステ更新券</b>（5の倍数で5枚／10の倍数で10枚／50で50枚／100で100枚）。ステ更新券は装備のボーナスステータスを引き直せます。</p>';
      body.innerHTML = html;
    }

    // ── セーブ/ロード モーダル ──
    function openSaveLoadModal() {
      const ta = document.getElementById('save-load-textarea');
      if (ta) ta.value = GameEngine.getSaveCode();
      document.getElementById('save-load-modal').classList.remove('hidden');
    }
    function closeSaveLoadModal() {
      document.getElementById('save-load-modal').classList.add('hidden');
    }
    function copySaveCode() {
      const ta = document.getElementById('save-load-textarea');
      if (!ta) return;
      ta.value = GameEngine.getSaveCode(); // 最新を反映
      ta.select();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value);
        else document.execCommand('copy');
      } catch (e) { document.execCommand('copy'); }
      alert('✅ セーブコードをコピーしました！\nメモ帳などに貼り付けて保管してください。');
    }
    function loadSaveCode() {
      const ta = document.getElementById('save-load-textarea');
      const code = ta ? ta.value : '';
      if (!code.trim()) { alert('復元するコードを枠に貼り付けてください。'); return; }
      if (!confirm('⚠️ 現在のデータを、入力したコードで上書きします。\nよろしいですか？')) return;
      if (GameEngine.applySaveCode(code)) {
        alert('📂 ロード成功！データを復元しました。');
        closeSaveLoadModal();
        showMenu();
      } else {
        alert('❌ コードの形式が正しくありません。\nコピーミス（前後の空白や欠落）がないか確認してください。');
      }
    }

    // ステータス強化UIの表示設定（icon / label / 上昇量の表示書式）
    const STAT_UI = {
      hp:        { icon: '❤️', label: '体力',         fmt: 'int' },
      atk:       { icon: '🗡️', label: '攻撃力',       fmt: 'int' },
      def:       { icon: '🛡️', label: '防御力',       fmt: 'int' },
      cpRecover: { icon: '🧪', label: 'コンボ回復',   fmt: 'int' },
      cpAtk:     { icon: '⚡', label: 'コンボ攻撃',   fmt: 'int' },
      shield:    { icon: '🔰', label: 'シールド',     fmt: 'int' },
      stanAtk:   { icon: '🔮', label: 'スタン力',     fmt: 'pct' },
      stanDef:   { icon: '🧲', label: 'スタン耐性',   fmt: 'pct' },
      crit:      { icon: '💥', label: 'クリティカル率',   fmt: 'pct' },
      critDmg:   { icon: '✴️', label: 'クリティカル倍率', fmt: 'mult' },
      multi:     { icon: '🔁', label: '連撃数',       fmt: 'count' },
      vamp:      { icon: '🩸', label: '吸血率',       fmt: 'pct' },
      dodge:     { icon: '💨', label: '回避率',       fmt: 'pct' },
      comboDur:  { icon: '⏱️', label: 'コンボ継続',   fmt: 'sec' },
      goldMul:   { icon: '🪙', label: 'ゴールド倍率', fmt: 'pct' }
    };
    function _fmtGain(fmt, g) {
      if (fmt === 'pct')   return '+' + (g * 100).toFixed(1) + '%';
      if (fmt === 'mult')  return '+' + g.toFixed(2) + '×';
      if (fmt === 'count') return '+' + g.toFixed(2);
      if (fmt === 'sec')   return '+' + g.toFixed(2) + '秒';
      return '+' + Math.floor(g);
    }

    // ボーナス枠を「実数値＋色分け」で1行表示。廃止ステ(STAT_META外=旧セーブのcomboHit等)はスキップ。
    //  強さ(元レベル)に応じて 灰→緑→青→紫→金 に色分け＝良いステほど良い色。
    // 全レアリティ中のボーナス枠の最大ロール値（＝上限）。これに達した枠は虹色表示。
    let _BONUS_MAX_ROLL = 0;
    function _bonusMaxRoll() {
      if (_BONUS_MAX_ROLL) return _BONUS_MAX_ROLL;
      let mx = 0; const RD = GameData.RARITY_DB || {};
      Object.keys(RD).forEach(k => { if (RD[k].rollMax > mx) mx = RD[k].rollMax; });
      _BONUS_MAX_ROLL = mx || 7; return _BONUS_MAX_ROLL;
    }
    function _fmtBonusStat(b) {
      const m = GameData.STAT_META[b.key];
      if (!m) return '';
      const name = GameData.STAT_NAMES_JP[b.key] || b.key;
      const val = GameData.getStatGainTotal(b.key, b.lv);
      let txt;
      if (b.key === 'crit' || b.key === 'dodge' || b.key === 'goldMul') txt = '+' + (val * 100).toFixed(1) + '%';
      else if (b.key === 'critDmg') txt = '+' + val.toFixed(2) + '×';
      else if (b.key === 'multi') txt = '+' + val.toFixed(2) + '連撃';
      else txt = '+' + Math.floor(val);
      const lv = b.lv;
      // 上限ロールに達したら虹色＋★MAX（最高の引き＝特別表示）
      if (lv >= _bonusMaxRoll()) {
        return '<div class="text-[10px] font-black" style="background:linear-gradient(90deg,#f87171,#fbbf24,#34d399,#22d3ee,#a78bfa,#f472b6);-webkit-background-clip:text;background-clip:text;color:transparent">'
          + name + ' ' + txt + ' ★MAX</div>';
      }
      const col = lv >= 6 ? 'text-amber-300' : lv >= 5 ? 'text-sky-300' : lv >= 3 ? 'text-emerald-300' : 'text-slate-400';
      return '<div class="text-[10px] ' + col + '">' + name + ' <span class="font-bold">' + txt + '</span></div>';
    }

    // 初心者向けステータス（最初から表示）。残り10種は「上級」として折りたたむ。
    const BASIC_STATS = ['hp', 'atk', 'def', 'cpRecover', 'cpAtk', 'stanAtk', 'stanDef'];
    let _showAdvancedStats = false;

    function _appendStatRow(statList, key, cost) {
      const ui = STAT_UI[key] || { icon: '•', label: key, fmt: 'int' };
      const lv = GameEngine.player.stats[key];
      const cap = GameData.STAT_CAPS[key];
      const canUp = lv < cap && GameEngine.player.gold >= cost;
      const maxed = lv >= cap;
      const g = lv < cap ? GameData.getStatGainAtLevel(key, lv) : 0;
      const nextGain = lv < cap ? _fmtGain(ui.fmt, g) : '';
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center px-2 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 font-mono transition-all text-xs hover:bg-slate-900/40';
      const btnHtml = maxed
        ? '<span class="text-[8px] text-yellow-500 font-black px-1.5 py-0.5 rounded bg-yellow-950/30 border border-yellow-900/40">MAX</span>'
        : '<button onclick="GameEngine.upgradeStatWithGold(\x27' + key + '\x27)" class="' + (canUp ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed') + ' font-black px-2 py-1 rounded text-[8px] transition-all active:scale-95" ' + (canUp ? '' : 'disabled') + '><span class="text-[7px] text-emerald-300">' + nextGain + '</span> ↑ 🪙' + cost.toLocaleString() + '</button>';
      row.innerHTML = '<div class="text-[10px]"><span class="text-slate-300">' + ui.icon + ' ' + ui.label + '</span><span class="text-[8px] text-slate-500 ml-1">Lv.' + lv + '/' + cap + '</span></div><div class="flex items-center gap-1.5">' + btnHtml + '</div>';
      statList.appendChild(row);
    }

    function _statSectionHeader(text, colorCls) {
      const h = document.createElement('div');
      h.className = 'text-[10px] font-black ' + (colorCls || 'text-cyan-300') + ' mt-2 mb-0.5';
      h.textContent = text;
      return h;
    }

    // 読み取り専用の能力行（装備・スキル由来で決まる値を表示するだけ。強化ボタンは無し）
    function _appendDerivedRow(grid, icon, label, valueStr) {
      const d = document.createElement('div');
      d.className = 'flex justify-between items-center px-2 py-1 rounded-lg border border-slate-800 bg-slate-950/40 font-mono text-[10px]';
      d.innerHTML = '<span class="text-slate-300">' + icon + ' ' + label + '</span><span class="text-emerald-300 font-bold">' + valueStr + '</span>';
      grid.appendChild(d);
    }

    function renderStatList() {
      const statList = document.getElementById('menu-stat-list');
      if (!statList) return;
      statList.innerHTML = '';
      // 強化できるのは3コア（HP/ATK/DEF）のみ。価格は3コアの合計レベルで共通上昇。
      const cost = GameData.getStatUpgradeCost(GameData.getTotalStatLevels(GameEngine.player.stats));
      const coreKeys = GameData.ALLOCATABLE_STATS;

      // 1段目: 強化できる3コア
      statList.appendChild(_statSectionHeader('🔧 強化する（ゴールド）'));
      const note = document.createElement('div');
      note.className = 'text-[8px] text-slate-500 px-1 mb-0.5';
      note.textContent = '※ 強化できるのは体力・攻撃力・防御力の3つ。次の強化費用 🪙' + cost.toLocaleString();
      statList.appendChild(note);
      const g1 = document.createElement('div'); g1.className = 'grid grid-cols-1 gap-1';
      coreKeys.forEach(k => _appendStatRow(g1, k, cost));
      statList.appendChild(g1);

      // 2段目: 現在の能力（装備・スキル・ボーナス枠で決まる＝読むだけ）
      statList.appendChild(_statSectionHeader('📊 現在の能力（装備・スキル由来）', 'text-purple-300'));
      const desc = document.createElement('div');
      desc.className = 'text-[8px] text-slate-500 px-1 mb-0.5';
      desc.textContent = '※ これらは装備・スキル・ボーナス枠で伸びます（直接の強化はありません）';
      statList.appendChild(desc);
      const eff = GameEngine.getEffectiveStats();
      const g2 = document.createElement('div'); g2.className = 'grid grid-cols-2 gap-1';
      _appendDerivedRow(g2, '💥', 'クリティカル率',   Math.round(eff.critRate * 100) + '%');
      _appendDerivedRow(g2, '✴️', 'クリティカル倍率', eff.critMult.toFixed(2) + '×');
      _appendDerivedRow(g2, '🔁', '連撃数',       eff.atkCount + '回');
      _appendDerivedRow(g2, '🩸', '吸血率',       Math.round(eff.vamp * 100) + '%');
      _appendDerivedRow(g2, '💨', '回避率',       Math.round(eff.dodge * 100) + '%');
      _appendDerivedRow(g2, '🔰', 'シールド',     Math.floor(eff.shield));
      _appendDerivedRow(g2, '🧪', 'コンボ回復',   Math.floor(eff.cpRecover));
      _appendDerivedRow(g2, '⚡', 'コンボ攻撃',   Math.floor(eff.cpAtk));
      _appendDerivedRow(g2, '⏱️', 'コンボ継続',   '+' + eff.comboDur.toFixed(1) + '秒');
      _appendDerivedRow(g2, '🔮', 'スタン力',     eff.stanAtk.toFixed(1) + '秒');
      _appendDerivedRow(g2, '🧲', '必殺軽減',     Math.round((eff.ultResist || 0) * 100) + '%');
      _appendDerivedRow(g2, '🪙', 'ゴールド倍率', Math.round(eff.goldMul * 100) + '%');
      statList.appendChild(g2);

      // 3段目以降: 装備中のユニークスキル一覧（解説付き・2列）
      statList.appendChild(_statSectionHeader('★ 装備中のスキル', 'text-amber-300'));
      const eqSkills = GameEngine.getEffectiveStats().skills || [];
      if (eqSkills.length === 0) {
        const none = document.createElement('div');
        none.className = 'text-[9px] text-slate-500 px-1';
        none.textContent = '（スキル付き装備を装備していません）';
        statList.appendChild(none);
      } else {
        const g3 = document.createElement('div'); g3.className = 'grid grid-cols-2 gap-1';
        eqSkills.forEach(sk => {
          const d = document.createElement('div');
          d.className = 'text-[9px] bg-slate-950/60 border border-slate-800 rounded-lg p-1.5';
          d.innerHTML = '<span class="text-amber-300 font-bold">★ ' + sk + '</span>'
            + '<div class="text-slate-400 leading-snug mt-0.5">' + (GameData.SKILL_DESC[sk] || '') + '</div>';
          g3.appendChild(d);
        });
        statList.appendChild(g3);
      }
    }

    function allocateStatPointCustom(key, amount) { /* 旧API: statPoints廃止 */ }

    // ── コイン直接強化 ──
    function upgradeStatWithGold(key) {
      const lv = GameEngine.player.stats[key];
      const cap = GameData.STAT_CAPS[key];
      if (lv >= cap) { alert('このステータスは最大レベルに達しています！'); return; }
      const cost = GameData.getStatUpgradeCost(GameData.getTotalStatLevels(GameEngine.player.stats));
      if (GameEngine.player.gold < cost) { alert('ゴールドが不足しています！'); return; }
      GameEngine.player.gold -= cost;
      GameEngine.player.stats[key]++;
      GameEngine.saveUserDataLocal();
      playSound('skill');
      renderStatList();
      updateMenuUI();
    }

    // ── 道場入場ポップアップ ──

    const _dojoList = [
      { key: 'junior',  label: '基礎', sub: 'やさしい',   color: 'bg-emerald-800 hover:bg-emerald-700', locked_desc: '最初から解放' },
      { key: 'mid',     label: '応用', sub: 'ふつう',     color: 'bg-teal-800 hover:bg-teal-700',     locked_desc: '初級ボス3体全員撃破' },
      { key: 'senior',  label: '発展', sub: 'むずかしい', color: 'bg-indigo-800 hover:bg-indigo-700', locked_desc: '中級ボス3体全員撃破' },
      { key: 'supreme', label: '受験', sub: '最難関',     color: 'bg-purple-800 hover:bg-purple-700', locked_desc: '上級ボス3体全員撃破' }
    ];
    // [TEST修正] 敵HPは難易度非連動（敵レベルのみ）＝ engine-test.js の方針に合わせて全難易度×1。
    //  ゴールドの難易度倍率は据え置き（難易度→ゴールドのみ反映）。
    const _dojoHpMult   = { junior:1, mid:1,   senior:1, supreme:1 };
    const _dojoGoldMult = { junior:1, mid:1.5, senior:2, supreme:3 };
    // 敵レベル→報酬カーブ（engine.js と一致：+20%/Lv）
    const _dojoLvScale  = (lv) => 1.0 + (Math.max(1, lv) - 1) * 0.2;

    function openDojoPopup() {
      // 難易度ロック廃止：保存済み選択をそのまま使う（空なら基礎へ）。
      if (!_rangeDiffs.length) _rangeDiffs = ['junior'];

      const maxLv = GameEngine.getMaxDojoEnemyLevel();
      const slider = document.getElementById('dojo-popup-lv-slider');
      slider.max = maxLv;
      slider.value = GameEngine.player.dojoEnemyLevel || 1;
      document.getElementById('dojo-popup-lv-max').textContent = maxLv;
      updateDojoPopupLevel(slider.value);

      renderDojoRangeSummary();

      document.getElementById('dojo-popup').classList.remove('hidden');
    }

    // 道場popの「範囲を選ぶ」ボタンの要約表示
    function renderDojoRangeSummary() {
      const el = document.getElementById('dojo-range-summary');
      if (!el) return;
      const order = ['junior', 'mid', 'senior', 'supreme'];
      const diffs = _rangeDiffs.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const dLabels = GameData.DIFFICULTIES.filter(d => diffs.indexOf(d.key) >= 0).map(d => d.label).join('・');
      const total = GameData.getQuestions({ diffs: diffs, genres: _rangeGenres.length ? _rangeGenres : null, type: _rangeType || null, grades: _rangeGrades }).length;
      const gtxt = _rangeGenres.length ? _rangeGenres.map(k => (GameData.GENRES.find(g => g.key === k) || {}).label).join('・') : '全ジャンル';
      const gradeTxt = _rangeGrades.length ? '・' + _rangeGrades.slice().sort().map(g => '中' + g).join('/') : '';
      el.textContent = `${dLabels}${gradeTxt}・${gtxt}（${total}問）`;
    }

    // ── 出題範囲フルウィンドウ ── 作業用state（確定前）
    let _rwDiffs = new Set(), _rwGenres = new Set(), _rwType = '', _rwGrades = new Set();
    const _RANGE_SUBJ_TEXT = { chemistry:'text-teal-300', physics:'text-indigo-300', biology:'text-green-300', earth:'text-amber-300' };
    const _RANGE_DIFF_DESC = { junior:'習いたての基本。まずはここから。', mid:'基礎の次。少しひねった問題。', senior:'発展的な内容。応用が解けたら。', supreme:'入試レベル。最難関。' };

    function openRangeWindow() {
      _rwDiffs = new Set(_rangeDiffs);
      if (_rwDiffs.size === 0) _rwDiffs.add('junior');
      _rwGenres = new Set(_rangeGenres);
      _rwType = _rangeType;
      _rwGrades = new Set(_rangeGrades);
      renderRangeDiffTabs(); renderRangeGradeRow(); renderRangeTypeRow(); renderRangeBody(); renderRangePreview();
      document.getElementById('range-window').classList.remove('hidden');
    }

    function closeRangeWindow(confirm) {
      if (confirm) {
        const order = ['junior', 'mid', 'senior', 'supreme'];
        _rangeDiffs = [..._rwDiffs].sort((a, b) => order.indexOf(a) - order.indexOf(b));
        if (!_rangeDiffs.length) _rangeDiffs = ['junior'];
        _rangeGenres = [..._rwGenres];
        _rangeType = _rwType;
        _rangeGrades = [..._rwGrades].sort();
        renderDojoRangeSummary();
        const sl = document.getElementById('dojo-popup-lv-slider');
        if (sl) updateDojoPopupLevel(sl.value); // 報酬は最上位難易度で再計算
      }
      document.getElementById('range-window').classList.add('hidden');
    }

    function _rangeTopDiff() {
      const order = ['junior', 'mid', 'senior', 'supreme'];
      return [..._rwDiffs].sort((a, b) => order.indexOf(a) - order.indexOf(b)).pop() || 'junior';
    }

    function renderRangeDiffTabs() {
      const box = document.getElementById('range-diff-tabs');
      let html = '<span class="text-xs text-slate-400 mr-1 font-bold">難易度:</span>';
      GameData.DIFFICULTIES.forEach(d => {
        const on = _rwDiffs.has(d.key);
        html += `<button onclick="GameUI.toggleRangeDiff('${d.key}')" class="${on ? d.color + ' text-white ring-2 ring-white/30' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-3 rounded-lg text-xs">${on ? '✓ ' : ''}${d.label}</button>`;
      });
      html += `<div class="w-full text-[10px] text-slate-400 mt-1">💡 ${_RANGE_DIFF_DESC[_rangeTopDiff()] || ''}</div>`;
      box.innerHTML = html;
    }

    // 学年フィルタ行（色は日付連動。今年度 中1=緑/中2=黄/中3=赤、毎年4/1に巡回）
    function renderRangeGradeRow() {
      const box = document.getElementById('range-grade-row');
      if (!box) return;
      let html = '<span class="text-xs text-slate-400 mr-1 font-bold">学年:</span>';
      const allOn = _rwGrades.size === 0;
      html += `<button onclick="GameUI.toggleRangeGrade(0)" class="${allOn ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-2.5 rounded-lg text-[10px]">すべて</button>`;
      [1, 2, 3].forEach(g => {
        const on = _rwGrades.has(g);
        const cls = on ? GameData.getGradeBadgeClass(g) + ' ring-2 ring-white/40' : 'bg-slate-800 text-slate-300';
        html += `<button onclick="GameUI.toggleRangeGrade(${g})" class="${cls} font-bold py-1 px-2.5 rounded-lg text-[10px]">中${g}</button>`;
      });
      box.innerHTML = html;
    }

    function renderRangeTypeRow() {
      const box = document.getElementById('range-type-row');
      let html = '<span class="text-xs text-slate-400 mr-1 font-bold">形式:</span>';
      [['', '両方'], ['typing', '⌨️ タイピング'], ['choice', '🔘 選択式']].forEach(([val, label]) => {
        const on = _rwType === val;
        html += `<button onclick="GameUI.setRangeType('${val}')" class="${on ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-2.5 rounded-lg text-[10px]">${label}</button>`;
      });
      html += _mobileChoiceNote();
      box.innerHTML = html;
    }

    function renderRangeBody() {
      const body = document.getElementById('range-body');
      const diffs = [..._rwDiffs];
      const grades = [..._rwGrades];
      let html = '';
      GameData.SUBJECTS.forEach(sub => {
        const genres = GameData.GENRES.filter(g => g.subject === sub.key);
        const cards = genres.map(g => {
          const cnt = GameData.getQuestions({ diffs: diffs, genres: [g.key], type: _rwType || null, grades: grades }).length;
          const grade = GameData.getGenreGradeRange(g.key, diffs);
          // またぐ時は「上の学年」で色付け（要望どおり）
          const gradeBadgeCls = GameData.getGradeBadgeClass(GameData.getGenreGradeMax(g.key, diffs));
          const exs = (GameData.GENRE_EXAMPLES[g.key] || []).slice(0, 3).join('・');
          if (cnt === 0) {
            return `<div class="bg-slate-800/70 rounded-xl p-2.5 opacity-40">
              <div class="flex items-center gap-1.5"><span class="text-base">${g.icon}</span>
                <span class="font-bold text-slate-400 text-xs">${g.label}</span>
                ${grade ? `<span class="text-[8px] bg-slate-700 text-slate-300 px-1 rounded">${grade}</span>` : ''}
                <span class="ml-auto text-[8px] text-slate-500">この範囲には無し</span></div></div>`;
          }
          const on = _rwGenres.has(g.key);
          return `<div onclick="GameUI.toggleRangeGenre('${g.key}')" class="rounded-xl p-2.5 cursor-pointer transition-all ${on ? 'bg-cyan-900 ring-2 ring-cyan-400' : 'bg-slate-800 hover:bg-slate-700'}">
            <div class="flex items-center gap-1.5 mb-1"><span class="text-base">${g.icon}</span>
              <span class="font-bold text-white text-xs">${g.label}</span>
              <span class="text-[8px] ${gradeBadgeCls} px-1 rounded font-bold">${grade}</span>
              <span class="ml-auto text-[10px] font-mono ${on ? 'text-cyan-200' : 'text-cyan-400'}">${cnt}問</span>
              ${on ? '<span class="text-cyan-300 text-xs">✓</span>' : ''}</div>
            <div class="text-[10px] text-slate-400 pl-6">例) ${exs}</div></div>`;
        }).join('');
        const selCnt = genres.filter(g => _rwGenres.has(g.key)).length;
        html += `<div class="mb-4">
          <div class="flex items-center gap-2 mb-2"><span class="text-sm">${sub.icon}</span>
            <span class="font-black ${_RANGE_SUBJ_TEXT[sub.key] || 'text-slate-300'} text-sm">${sub.label}</span>
            ${selCnt ? `<span class="text-[9px] bg-cyan-900 text-cyan-300 px-1.5 py-0.5 rounded">${selCnt}個選択中</span>` : ''}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${cards}</div></div>`;
      });
      body.innerHTML = html;
    }

    function renderRangePreview() {
      const diffs = [..._rwDiffs];
      const grades = [..._rwGrades];
      const el = document.getElementById('range-preview');
      const genres = [..._rwGenres];
      const total = GameData.getQuestions({ diffs: diffs, genres: genres.length ? genres : null, type: _rwType || null, grades: grades }).length;
      if (total === 0) { el.innerHTML = '<span class="text-rose-300">選んだ範囲に合う問題がありません。難易度・学年・形式を見直してください。</span>'; return; }
      // 実際に問題があるジャンルだけ（教科またぎの明示に使う）
      const pickList = genres.length ? genres : GameData.GENRES.map(g => g.key);
      const have = pickList.filter(k => GameData.getQuestions({ diffs: diffs, genres: [k], type: _rwType || null, grades: grades }).length > 0);
      const subs = [...new Set(have.map(k => (GameData.GENRES.find(g => g.key === k) || {}).subject))].filter(Boolean)
        .map(s => (GameData.SUBJECTS.find(x => x.key === s) || {}).label);
      const dLabels = GameData.DIFFICULTIES.filter(d => diffs.indexOf(d.key) >= 0).map(d => d.label).join('・');
      const names = have.map(k => (GameData.GENRES.find(g => g.key === k) || {}).label).join('・');
      const scope = genres.length ? names : '全ジャンル';
      const cross = subs.length > 1 ? `<span class="text-yellow-300 font-bold">${subs.join('＋')}をまたいで</span> ` : '';
      el.innerHTML = `難易度 <b>${dLabels}</b> ／ ${cross}<b>${scope}</b> から <b class="text-yellow-300">${total}問</b>`;
    }

    function toggleRangeDiff(key) {
      if (_rwDiffs.has(key)) { if (_rwDiffs.size > 1) _rwDiffs.delete(key); } // 最低1つは残す
      else _rwDiffs.add(key);
      renderRangeDiffTabs(); renderRangeBody(); renderRangePreview();
    }
    function toggleRangeGenre(key) {
      if (_rwGenres.has(key)) _rwGenres.delete(key); else _rwGenres.add(key);
      renderRangeBody(); renderRangePreview();
    }
    function toggleRangeGrade(g) {
      if (g === 0) { _rwGrades.clear(); }
      else if (_rwGrades.has(g)) _rwGrades.delete(g); else _rwGrades.add(g);
      renderRangeGradeRow(); renderRangeBody(); renderRangePreview();
    }
    function setRangeType(val) { _rwType = val; renderRangeTypeRow(); renderRangeBody(); renderRangePreview(); }

    // ── 学年を超える範囲の警告 ──
    // 現在の選択（_rangeDiffs/_rangeGenres/_rangeType/_rangeGrades）の中で、生徒の学年より上の内容を含むジャンル一覧。
    function _outOfGradeGenres(pg) {
      const diffs = _rangeDiffs.slice();
      const genres = _rangeGenres.length ? _rangeGenres : GameData.GENRES.map(g => g.key);
      const res = [];
      genres.forEach(k => {
        const above = [];
        [1, 2, 3].forEach(gr => {
          if (gr <= pg) return;
          if (_rangeGrades.length && _rangeGrades.indexOf(gr) < 0) return; // 学年フィルタを尊重
          if (GameData.getQuestions({ diffs: diffs, genres: [k], type: _rangeType || null, grades: [gr] }).length > 0) above.push(gr);
        });
        if (above.length) { const g = GameData.GENRES.find(x => x.key === k); res.push({ key: k, label: g ? g.label : k, icon: g ? g.icon : '', grades: above }); }
      });
      return res;
    }
    function _showGradeWarn(list, pg) {
      document.getElementById('grade-warn-sub').textContent = `あなたは中${pg}。下の範囲は、それより上の学年の内容を含みます。`;
      document.getElementById('grade-warn-list').innerHTML = list.map(it => {
        const cls = GameData.getGradeBadgeClass(Math.max.apply(null, it.grades));
        return `<div class="flex items-center gap-2 text-xs text-white"><span>${it.icon}</span><span class="font-bold">${it.label}</span>`
          + `<span class="ml-auto text-[9px] ${cls} px-1.5 py-0.5 rounded font-bold">${it.grades.map(g => '中' + g).join('/')}</span></div>`;
      }).join('');
      document.getElementById('grade-warn-popup').classList.remove('hidden');
    }
    function closeGradeWarn() { document.getElementById('grade-warn-popup').classList.add('hidden'); }
    function _doEnterDojo(gradesOverride) {
      closeGradeWarn();
      closeDojoPopup();
      GameEngine.startDojo(_rangeDiffs.slice(), _rangeGenres.slice(), _rangeType || null, gradesOverride || _rangeGrades.slice());
    }
    function challengeKeepingOverGrade() { _doEnterDojo(_rangeGrades.slice()); } // 外さずそのまま
    function challengeRemovingOverGrade() {
      const pg = GameEngine.player.grade || 1;
      let capped = (_rangeGrades.length ? _rangeGrades : [1, 2, 3]).filter(g => g <= pg);
      if (!capped.length) capped = [pg];
      _doEnterDojo(capped); // 自分の学年以下にキャップ＝範囲外を外す
    }

    // ── 学年設定モーダル ──
    function openGradeModal() { renderGradeButtons(); document.getElementById('grade-edit-modal').classList.remove('hidden'); }
    function closeGradeModal() { document.getElementById('grade-edit-modal').classList.add('hidden'); }
    function renderGradeButtons() {
      const cur = GameEngine.player.grade;
      document.getElementById('grade-edit-buttons').innerHTML = [1, 2, 3].map(g => {
        const on = cur === g;
        const cls = on ? GameData.getGradeBadgeClass(g) + ' ring-2 ring-white/60' : 'bg-slate-800 text-slate-300 hover:bg-slate-700';
        return `<button onclick="GameUI.setPlayerGradeFromModal(${g})" class="${cls} font-black py-3 rounded-xl text-sm transition-all">中${g}</button>`;
      }).join('');
    }
    function setPlayerGradeFromModal(g) {
      GameEngine.setPlayerGrade(g);
      renderGradeButtons();
      renderPlayerGradeLabel();
      if (g) closeGradeModal();
    }
    function renderPlayerGradeLabel() {
      const el = document.getElementById('menu-player-grade');
      if (!el) return;
      const g = GameEngine.player && GameEngine.player.grade;
      if (!g) { el.textContent = '学年: 未設定'; el.className = 'text-[10px] text-slate-400 font-bold'; return; }
      el.innerHTML = `学年: <span class="${GameData.getGradeBadgeClass(g)} px-1.5 py-0.5 rounded">中${g}</span>`;
      el.className = 'text-[10px] font-bold';
    }

    // 道場ポップアップ: ジャンル＋形式の絞り込みチップ
    function renderDojoPopupFilters() {
      const box = document.getElementById('dojo-popup-filters');
      if (!box) return;
      let html = '';
      // 教科セレクタ
      html += '<div class="flex flex-wrap items-center gap-1.5 mb-2">';
      html += '<span class="text-xs text-slate-400 mr-1 font-bold">教科:</span>';
      GameData.SUBJECTS.forEach(s => {
        const active = _dojoSubject === s.key;
        html += `<button onclick="GameUI.setDojoSubject('${s.key}')" class="${active ? s.color + ' text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-2.5 rounded-lg text-[10px]">${s.icon} ${s.label}</button>`;
      });
      // ジャンル（選択中教科のもののみ）
      html += '</div><div class="flex flex-wrap items-center gap-1.5 mb-2">';
      html += '<span class="text-xs text-slate-400 mr-1 font-bold">ジャンル:</span>';
      const allActive = _dojoGenres.length === 0;
      html += `<button onclick="GameUI.toggleDojoGenre('')" class="${allActive ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-2.5 rounded-lg text-[10px]">すべて</button>`;
      GameData.GENRES.filter(g => g.subject === _dojoSubject).forEach(g => {
        const active = _dojoGenres.indexOf(g.key) >= 0;
        html += `<button onclick="GameUI.toggleDojoGenre('${g.key}')" class="${active ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1.5 px-3 rounded-lg text-xs">${g.icon} ${g.label}</button>`;
      });
      html += '</div><div class="flex flex-wrap items-center gap-1.5">';
      html += '<span class="text-xs text-slate-400 mr-1 font-bold">形式:</span>';
      [['','両方'],['typing','⌨️ タイピング'],['choice','🔘 選択式']].forEach(([val, label]) => {
        const active = _dojoType === val;
        html += `<button onclick="GameUI.setDojoType('${val}')" class="${active ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-2.5 rounded-lg text-[10px]">${label}</button>`;
      });
      html += _mobileChoiceNote();
      html += '</div>';
      box.innerHTML = html;
    }
    // 教科を切り替えるとジャンル選択はリセット（別教科のジャンルが残らないように）
    function setDojoSubject(key) { _dojoSubject = key; _dojoGenres = []; renderDojoPopupFilters(); }
    function toggleDojoGenre(key) {
      if (key === '') { _dojoGenres = []; }
      else {
        const i = _dojoGenres.indexOf(key);
        if (i >= 0) _dojoGenres.splice(i, 1); else _dojoGenres.push(key);
      }
      renderDojoPopupFilters();
    }
    function setDojoType(val) { _dojoType = val; renderDojoPopupFilters(); }

    function selectDojoPopupDifficulty(key) {
      _dojoPopupDifficulty = key;
      _dojoList.forEach(d => {
        const btn = document.getElementById(`dojo-popup-btn-${d.key}`);
        if (!btn || btn.disabled) return;
        btn.classList.toggle('ring-2', d.key === key);
        btn.classList.toggle('ring-white/60', d.key === key);
        btn.classList.toggle('border-white/40', d.key === key);
      });
      updateDojoPopupLevel(document.getElementById('dojo-popup-lv-slider').value);
    }

    function updateDojoPopupLevel(val) {
      val = parseInt(val);
      const maxLv = GameEngine.getMaxDojoEnemyLevel();
      val = Math.min(val, maxLv);
      GameEngine.player.dojoEnemyLevel = val;
      document.getElementById('dojo-popup-lv-display').textContent = 'Lv.' + val;
      // 報酬・敵HPは選択した中で最上位の難易度を基準にする
      const _order = ['junior', 'mid', 'senior', 'supreme'];
      const _topDiff = _rangeDiffs.slice().sort((a, b) => _order.indexOf(a) - _order.indexOf(b)).pop() || 'junior';
      const est = Math.floor(900 * (_dojoGoldMult[_topDiff] || 1) * _dojoLvScale(val));
      document.getElementById('dojo-popup-reward').textContent = `推定報酬: 🪙 ${est.toLocaleString()}/敵`;
      document.getElementById('dojo-popup-hp').textContent = `敵HP: ${(100 * (_dojoHpMult[_topDiff] || 1) * Math.max(1, val)).toLocaleString()}`;
      // 推奨レベル表示（今の選択が推奨と一致しているか分かるように）
      const recEl = document.getElementById('dojo-rec-level');
      if (recEl) {
        const rec = GameEngine.getRecommendedDojoLevel();
        recEl.textContent = 'Lv.' + rec + (val === rec ? ' ✓' : '');
      }
      // メイン画面の表示も同期
      if (document.getElementById('dojo-enemy-level-display')) updateDojoLevelUI(val);
    }

    // 推奨レベルにスライダーを合わせる（初心者ガイド）
    function useDojoRecommendedLevel() {
      const rec = GameEngine.getRecommendedDojoLevel();
      const slider = document.getElementById('dojo-popup-lv-slider');
      if (slider) slider.value = rec;
      updateDojoPopupLevel(rec);
    }

    function closeDojoPopup() {
      document.getElementById('dojo-popup').classList.add('hidden');
    }

    function enterDojoFromPopup() {
      // 学年を設定済みで、選択範囲が自分の学年より上を含むなら確認ポップを出す（入場は保留）
      const pg = GameEngine.player.grade;
      const oog = pg ? _outOfGradeGenres(pg) : [];
      if (oog.length) { _showGradeWarn(oog, pg); return; }
      _doEnterDojo(_rangeGrades.slice());
    }
    // 教科に属するジャンルキーの配列
    function _genreKeysForSubject(subject) {
      return GameData.GENRES.filter(g => g.subject === subject).map(g => g.key);
    }

    // ── 道場レベルスライダー更新 ──
    // ホームの道場スライダーは廃止（レベルは道場入場ポップアップで設定）。
    // 値の保存だけ行い、表示要素は存在すれば更新（null安全）。
    function updateDojoLevelUI(val) {
      val = parseInt(val);
      const maxLv = GameEngine.getMaxDojoEnemyLevel();
      val = Math.min(val, maxLv);
      GameEngine.player.dojoEnemyLevel = val;
      const _set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      _set('dojo-enemy-level-display', 'Lv.' + val);
      const slider = document.getElementById('dojo-enemy-level-slider');
      if (slider) { slider.max = maxLv; slider.value = val; }
      _set('dojo-enemy-level-max', maxLv);
      const est = Math.floor(900 * _dojoLvScale(val));
      _set('dojo-reward-preview', '推定報酬: 🪙 ' + est.toLocaleString() + '/敵');
      _set('dojo-hp-preview', '敵HP: ' + (100 * Math.max(1, val)).toLocaleString());
      GameEngine.saveUserDataLocal();
    }

    function autoSortInventory() {
      GameEngine.player.inventory.sort((a, b) => {
        const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Relic'];
        return rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity);
      });
      GameEngine.saveUserDataLocal();
      updateMenuUI();
    }

    // ==========================================
    //          EQUIPMENT DETAIL MODAL UI
    // ==========================================

    function openEquipModal(item) {
      GameEngine.selectedModalItem = item;
      const modal = document.getElementById('equip-detail-modal');
      modal.classList.remove('hidden');

      document.getElementById('modal-equip-icon').innerHTML = _equipIcon(item, 150); // ボス級に大きく表示
      document.getElementById('modal-equip-name').textContent = item.name;
      
      const rData = GameData.RARITY_DB[item.rarity];
      const rarityLabel = document.getElementById('modal-equip-rarity');
      rarityLabel.textContent = rData.name.toUpperCase();
      // UR が超越+5MAX かつ 強化MAX のとき cyan演出（旧LR相当）を付与
      // 最大強化のSSR=赤 / UR=オパール虹、それ以外は通常レアリティ色
      let _labelCls = rData.color;
      if (_isMaxed(item) && item.rarity === 'Relic') _labelCls = 'gacha-legend-bg text-white border border-white/70';
      else if (_isMaxed(item) && item.rarity === 'Legendary') _labelCls = rData.color + ' equip-ssr-max';
      rarityLabel.className = `px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${_labelCls}`;

      document.getElementById('modal-equip-type').textContent = item.type === 'weapon' ? '武器' : (item.type === 'head' ? '頭防具' : (item.type === 'body' ? '胴体防具' : (item.type === 'feet' ? '足防具' : '装飾品')));

      // メインステータス（固定値）＋ ボーナス枠（+Nレベル分）を表示
      const jpStatName = GameData.STAT_NAMES_JP[item.stat] || item.stat;
      const _mult = (1 + item.level * 0.01) * (1 + item.trans * 0.25);
      const _eff = item.baseVal * _mult;
      const _fmtVal = (v) => (Math.abs(v) >= 1 ? Math.floor(v) : Number(v.toFixed(2)));
      let statHtml = '<div class="text-cyan-300">' + jpStatName + ' +' + _fmtVal(item.baseVal)
        + ' <span class="text-slate-400">(実効値: ' + _fmtVal(_eff) + ')</span></div>';
      if (Array.isArray(item.bonusStats) && item.bonusStats.length) {
        statHtml += item.bonusStats.map(_fmtBonusStat).join('');
      }
      document.getElementById('modal-equip-stat-effect').innerHTML = statHtml;
      const _skillEl = document.getElementById('modal-equip-skill');
      const _skillDesc = GameData.SKILL_DESC[item.skill];
      if (item.skill && item.skill !== 'なし') {
        _skillEl.innerHTML = '<span class="text-amber-300 font-bold">★ ' + item.skill + '</span>'
          + (_skillDesc ? '<div class="text-[9px] text-slate-400 mt-0.5 leading-snug text-left">' + _skillDesc + '</div>' : '');
      } else {
        _skillEl.textContent = 'なし';
      }
      document.getElementById('modal-equip-level').textContent = `+${item.level} / 100`;

      let starStr = '';
      for (let i = 1; i <= 5; i++) {
        starStr += (i <= item.trans) ? '★' : '☆';
      }
      document.getElementById('modal-equip-trans').textContent = `${starStr} (${item.trans}/5超越)`;

      const upgradeCost = Math.floor(100 * Math.pow(1.08, item.level));
      const upBtn = document.getElementById('modal-upgrade-btn');
      const upCostLabel = document.getElementById('modal-upgrade-cost');
      
      if (item.level >= 100) {
        upBtn.className = "bg-slate-800 text-slate-500 font-bold py-2 rounded-lg text-[10px] cursor-not-allowed flex flex-col items-center justify-center w-full";
        upBtn.disabled = true;
        upCostLabel.textContent = '最大レベル';
      } else if (GameEngine.player.gold < upgradeCost) {
        upBtn.className = "bg-slate-800 text-slate-500 font-bold py-2 rounded-lg text-[10px] cursor-not-allowed flex flex-col items-center justify-center w-full";
        upBtn.disabled = true;
        upCostLabel.textContent = `🪙 ${upgradeCost.toLocaleString()}`;
      } else {
        upBtn.className = "bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-[10px] flex flex-col items-center justify-center w-full transition-all active:scale-95";
        upBtn.disabled = false;
        upCostLabel.textContent = `🪙 ${upgradeCost.toLocaleString()}`;
      }

      const duplicatesCount = GameEngine.player.inventory.filter(inv => inv.id === item.id && inv.uniqueId !== item.uniqueId).length;
      const transBtn = document.getElementById('modal-trans-btn');
      
      if (item.trans >= 5) {
        transBtn.className = "bg-slate-800 text-slate-500 font-bold py-2 rounded-lg text-[10px] cursor-not-allowed flex flex-col items-center justify-center w-full";
        transBtn.disabled = true;
      } else if (duplicatesCount === 0) {
        transBtn.className = "bg-slate-800 text-slate-500 font-bold py-2 rounded-lg text-[10px] cursor-not-allowed flex flex-col items-center justify-center w-full";
        transBtn.disabled = true;
      } else {
        transBtn.className = "bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg text-[10px] flex flex-col items-center justify-center w-full transition-all active:scale-95";
        transBtn.disabled = false;
      }

      // 装備/はずすボタンの見た目とラベル（背景クラスが無いと枠が消えて見えるため動的に設定）
      const _eqToggle = document.getElementById('modal-equip-toggle-btn');
      if (_eqToggle) {
        const _isEq = Object.values(GameEngine.player.equipped).some(eq => eq && eq.uniqueId === item.uniqueId);
        _eqToggle.textContent = _isEq ? 'この装備をはずす' : 'この装備をつける';
        _eqToggle.className = 'w-full font-bold py-2.5 rounded-xl text-xs mt-3 transition-all active:scale-95 '
          + (_isEq ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white');
      }
      // 🔧 ボーナス更新ボタン（ボーナスステータスを持つ装備だけ表示）
      const _rrBtn = document.getElementById('modal-reroll-btn');
      if (_rrBtn) {
        const _hasBonus = Array.isArray(item.bonusStats) && item.bonusStats.length > 0;
        _rrBtn.classList.toggle('hidden', !_hasBonus);
        _rrBtn.querySelector('.rr-have').textContent = '所持 ' + ((GameEngine.player.tickets || {}).statReroll || 0);
      }
    }

    // ── ボーナスステータス更新（リロール）モーダル ──
    let _rerollLocks = []; // ロック中のstatキー（最大2）
    function openRerollModal() {
      const item = GameEngine.selectedModalItem;
      if (!item || !(item.bonusStats || []).length) return;
      _rerollLocks = [];
      renderRerollModal();
      document.getElementById('reroll-modal').classList.remove('hidden');
    }
    function closeRerollModal() { document.getElementById('reroll-modal').classList.add('hidden'); }
    function toggleRerollLock(key) {
      const i = _rerollLocks.indexOf(key);
      if (i >= 0) _rerollLocks.splice(i, 1);
      else { if (_rerollLocks.length >= 2) { alert('ロックは最大2つまでです。'); return; } _rerollLocks.push(key); }
      renderRerollModal();
    }
    function renderRerollModal() {
      const item = GameEngine.selectedModalItem;
      const body = document.getElementById('reroll-modal-body');
      if (!item || !body) return;
      const have = (GameEngine.player.tickets || {}).statReroll || 0;
      const cost = GameData.rerollTicketCost(_rerollLocks.length);
      let html = '<div class="text-center mb-2"><div class="text-xs font-bold text-white">' + item.emoji + ' ' + item.name + '</div>'
        + '<div class="text-[9px] text-slate-400">ロックした枠は残し、残りを引き直します。鍵🔒で固定（最大2つ）。</div></div>';
      html += '<div class="space-y-1.5 mb-3">';
      (item.bonusStats || []).forEach(function(b) {
        const locked = _rerollLocks.indexOf(b.key) >= 0;
        const name = GameData.STAT_NAMES_JP[b.key] || b.key;
        html += '<button onclick="toggleRerollLock(\'' + b.key + '\')" class="w-full flex items-center justify-between rounded-lg px-3 py-2 border transition-all '
          + (locked ? 'bg-amber-900/40 border-amber-500' : 'bg-slate-950 border-slate-700 hover:border-slate-500') + '">'
          + '<span class="text-xs font-bold ' + (locked ? 'text-amber-300' : 'text-emerald-300') + '">' + (locked ? '🔒 ' : '🔓 ') + name + '</span>'
          + '<span class="text-[10px] ' + (locked ? 'text-amber-200' : 'text-slate-400') + '">Lv+' + b.lv + '</span></button>';
      });
      html += '</div>';
      const enough = have >= cost;
      html += '<div class="flex items-center justify-between text-[10px] mb-2 px-1">'
        + '<span class="text-slate-400">消費: <b class="' + (enough ? 'text-cyan-300' : 'text-rose-400') + '">🔧' + cost + '枚</b>（ロック' + _rerollLocks.length + '）</span>'
        + '<span class="text-slate-400">所持: <b class="text-cyan-300">' + have + '枚</b></span></div>';
      html += '<button onclick="confirmReroll()" ' + (enough ? '' : 'disabled')
        + ' class="w-full font-black py-2.5 rounded-xl text-xs transition-all active:scale-95 '
        + (enough ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed') + '">🔧 更新する（🔧' + cost + '枚）</button>';
      body.innerHTML = html;
    }
    function confirmReroll() {
      const item = GameEngine.selectedModalItem;
      if (!item) return;
      const res = GameEngine.rerollEquipBonus(item.uniqueId, _rerollLocks.slice());
      if (!res.ok) { alert(res.msg || '更新できませんでした。'); return; }
      playSound('skill');
      _rerollLocks = [];
      renderRerollModal();
      openEquipModal(item); // 装備モーダルの表示を更新
      // インベントリ表示中なら同期
      if (!document.getElementById('inventory-popup').classList.contains('hidden')) {
        renderEquippedSlots(document.getElementById('inv-popup-equipped'));
        renderInventoryGrid();
      }
    }

    // ── ランク報酬の券を使う ──
    function useGachaGold10() {
      GameEngine.redeemGachaGold10();
      if (!document.getElementById('rank-modal').classList.contains('hidden')) renderRankModal();
    }
    // 選択UR券: UR装備カタログから1つ選んで確定入手
    function openURPicker() {
      const body = document.getElementById('ur-picker-body');
      if (!body) return;
      const themeLabel = { attack: '⚔️ 攻撃', durability: '🛡️ 耐久', combo: '🔁 コンボ', special: '✨ 特殊' };
      const byTheme = {};
      GameData.UNIQUE_EQUIP_TEMPLATES.forEach(function(t) { (byTheme[t.theme] = byTheme[t.theme] || []).push(t); });
      let html = '';
      Object.keys(byTheme).forEach(function(theme) {
        html += '<div class="text-[10px] font-bold text-fuchsia-300 mt-2 mb-1">' + (themeLabel[theme] || theme) + '</div><div class="grid grid-cols-2 gap-1.5">';
        byTheme[theme].forEach(function(t) {
          const sName = GameData.STAT_NAMES_JP[t.stat] || t.stat;
          html += '<button onclick="pickUR(\'' + t.id + '\')" class="bg-slate-950 hover:bg-slate-800 border border-indigo-800/60 hover:border-indigo-500 rounded-lg p-2 text-left transition-all active:scale-95">'
            + '<div class="text-base">' + t.emoji + '</div>'
            + '<div class="text-[10px] font-bold text-indigo-200 leading-tight truncate">' + t.name + '</div>'
            + '<div class="text-[8px] text-amber-300 truncate">★' + t.skill + '</div>'
            + '<div class="text-[8px] text-slate-500">主' + sName + '</div></button>';
        });
        html += '</div>';
      });
      body.innerHTML = html;
      document.getElementById('ur-picker-modal').classList.remove('hidden');
    }
    function closeURPicker() { document.getElementById('ur-picker-modal').classList.add('hidden'); }
    function pickUR(templateId) {
      const tmpl = GameData.UNIQUE_EQUIP_TEMPLATES.find(function(t) { return t.id === templateId; });
      if (!tmpl) return;
      if (!confirm('🎫 選択UR券で「' + tmpl.name + '」を入手しますか？（券を1枚使います）')) return;
      if (GameEngine.redeemSelectUR(templateId)) {
        closeURPicker();
        if (!document.getElementById('rank-modal').classList.contains('hidden')) renderRankModal();
      }
    }

    // ==========================================
    //   SOUND & VISUAL EFFECTS
    // ==========================================

    let _audioCtx = null;
    function getAudioCtx() {
      if (!_audioCtx) {
        try { _audioCtx = new AudioContext(); } catch(e) {}
      }
      return _audioCtx;
    }

    function playSound(type) {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        if (type === 'correct') {
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.12);
          osc.start(now); osc.stop(now + 0.12);
        } else if (type === 'wrong') {
          osc.type = 'sawtooth';
          osc.frequency.value = 180;
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.18);
          osc.start(now); osc.stop(now + 0.18);
        } else if (type === 'skill') {
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now); osc.stop(now + 0.2);
        }
      } catch(e) {}
    }

        function spawnParticles(isCrit = false) {
      try {
        // 攻撃ヒットエフェクト画像（あれば screen 合成でフラッシュ。無ければ何もしない＝従来の粒子のみ）
        _playHitFx(isCrit);
        const container = document.getElementById('damage-popup-container');
        if (!container) return;
        const count = isCrit ? 12 : 6;
        for (let i = 0; i < count; i++) {
          const p = document.createElement('div');
          const dx = (Math.random()-0.5)*80;
          const dy = (Math.random()-1)*60;
          p.style.cssText = `position:absolute;width:6px;height:6px;border-radius:50%;background:${isCrit?'#fbbf24':'#f87171'};pointer-events:none;z-index:20;left:50%;top:40%;`;
          p.className = 'damage-popup';
          container.appendChild(p);
          setTimeout(() => p.remove(), 500);
        }
      } catch(e) {}
    }

    // 攻撃ヒットエフェクト: 純黒背景の fx 画像を screen 合成で一瞬重ねる。画像が無ければ非表示のまま。
    let _fxHitOK = { normal: null, crit: null }; // プリロード結果キャッシュ（null=未判定/false=無し/true=有り）
    function _playHitFx(isCrit) {
      const layer = document.getElementById('fx-hit-layer');
      if (!layer) return;
      const kind = isCrit ? 'crit' : 'normal';
      const path = 'assets/fx/fx_' + kind + '.png';
      const fire = () => {
        layer.src = path;
        layer.classList.remove('fx-play'); void layer.offsetWidth; // リフロー強制で再生し直す
        layer.classList.add('fx-play');
        layer.style.display = 'block';
      };
      if (_fxHitOK[kind] === true) { fire(); return; }
      if (_fxHitOK[kind] === false) return;
      const test = new Image();
      test.onload = function() { _fxHitOK[kind] = true; fire(); };
      test.onerror = function() { _fxHitOK[kind] = false; };
      test.src = path;
    }

    // ==========================================
    //   EQUIPMENT MODAL ACTIONS
    // ==========================================

    function closeEquipModal() {
      document.getElementById('equip-detail-modal').classList.add('hidden');
      GameEngine.selectedModalItem = null; // GameEngineの参照を正しくクリア
    }

    function upgradeEquipAction() {
      if (!GameEngine.selectedModalItem) return;
      const item = GameEngine.selectedModalItem;
      const cost = Math.floor(100 * Math.pow(1.08, item.level));
      if (item.level >= 100) { alert('最大レベルに達しています！'); return; }
      if (GameEngine.player.gold < cost) { alert('ゴールドが不足しています！'); return; }
      GameEngine.player.gold -= cost;
      item.level++;
      GameEngine.saveUserDataLocal();
      playSound('skill');
      openEquipModal(item);
      updateMenuUI();
    }

    function transcendEquipAction() {
      if (!GameEngine.selectedModalItem) return;
      GameEngine.transcendEquip(GameEngine.selectedModalItem);
      renderInventoryGrid(); // 消費された装備を即時反映
    }

    function sellEquipAction() {
      if (!GameEngine.selectedModalItem) return;
      const item = GameEngine.selectedModalItem;
      const baseEarn = GameData.RARITY_DB[item.rarity].sell;
      const upgradeRefund = item.level * 30;
      const earn = baseEarn + upgradeRefund;
      if (!confirm('この装備を売却しますか？\n獲得: ' + earn.toLocaleString() + ' コイン')) return;
      GameEngine.sellEquip(item);
      renderInventoryGrid(); // 売却後にインベントリ表示を更新
    }

    function toggleEquipStateFromModal() {
      if (!GameEngine.selectedModalItem) return;
      const item = GameEngine.selectedModalItem;
      const isEquipped = Object.values(GameEngine.player.equipped).some(eq => eq && eq.uniqueId === item.uniqueId);
      if (isEquipped) {
        GameEngine.player.equipped[item.type] = null;
      } else {
        GameEngine.player.equipped[item.type] = item;
      }
      playSound('skill');
      GameEngine.saveUserDataLocal();
      closeEquipModal();        // 装備操作後はウィンドウを閉じる（扱いやすさ向上）
      renderInventoryGrid();    // 装備状態変更後にインベントリ表示を更新
      updateMenuUI();
    }


  // ── 戦闘・ナビゲーション画面 (engine.jsから移植) ──
      function showMenu() {
      document.getElementById('screen-menu').classList.remove('hidden');
      document.getElementById('screen-boss-select').classList.add('hidden');
      document.getElementById('screen-gacha').classList.add('hidden');
      document.getElementById('screen-library').classList.add('hidden');
      document.getElementById('screen-pvp').classList.add('hidden');
      const bEl2 = document.getElementById('screen-battle');
      bEl2.classList.add('hidden'); bEl2.style.display = 'none';
      const rEl2 = document.getElementById('result-screen');
      rEl2.classList.add('hidden'); rEl2.style.display = 'none';
      GameEngine.loadUserData(); // § プレフィックスなしで呼ぶとスコープ外でクラッシュするため修正
      updateMenuUI();            // § loadUserData後に明示的にUI更新
      _applyHomeBackground();    // ホーム背景（画像があれば設定）
    }

    // ホーム背景: assets/bg/title.png があれば暗オーバーレイ付きで main に設定（無ければ何もしない）
    function _applyHomeBackground() {
      const el = document.getElementById('main-area');
      if (!el) return;
      const path = 'assets/bg/title.png';
      const test = new Image();
      test.onload = function() {
        el.style.background = "linear-gradient(rgba(15,23,42,.86),rgba(15,23,42,.92)), url('" + path + "') center/cover fixed no-repeat";
      };
      test.src = path;
    }

      function openBossSelection() {
      document.getElementById('screen-menu').classList.add('hidden');
      document.getElementById('screen-boss-select').classList.remove('hidden');
      
      const container = document.getElementById('boss-selection-container');
      container.innerHTML = '';

      const tiers = { junior: '初級', mid: '中級', senior: '上級', supreme: '超級' };
      const def = GameEngine.player.defeatedBosses || [];
      
      Object.keys(tiers).forEach(tierKey => {
        const block = document.createElement('div');
        block.className = "bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2";
        block.innerHTML = `<h3 class="font-black text-cyan-400 text-xs border-b border-slate-800 pb-1.5 mb-2">${tiers[tierKey]}ボス</h3>`;
        
        const bosses = GameData.BOSSES_DB.filter(b => b.tier === tierKey);
        bosses.forEach((boss, idx) => {
          const isDefeated = def.includes(boss.id);
          
          const bossGlobalIdx = GameData.BOSSES_DB.findIndex(b => b.id === boss.id);
          let isLocked = false;
          if (bossGlobalIdx > 0) {
            const previousBossId = GameData.BOSSES_DB[bossGlobalIdx - 1].id;
            if (!def.includes(previousBossId)) {
              isLocked = true;
            }
          }

          const btn = document.createElement('button');
          if (isLocked) {
            btn.className = "w-full bg-slate-950/40 border border-slate-900 p-2.5 rounded-xl text-left flex items-center gap-3 opacity-40 cursor-not-allowed";
            btn.disabled = true;
            btn.innerHTML = `
              <span class="text-2xl filter grayscale">🔒</span>
              <div class="flex-1 overflow-hidden">
                <div class="font-black text-slate-500 text-[11px] truncate">${boss.name}</div>
                <div class="text-[8px] text-rose-500">前のボスを倒すと解放</div>
              </div>
            `;
          } else {
            btn.className = "w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl text-left transition-all flex items-center gap-3 relative";
            btn.onclick = () => openBossRangePopup(boss);
            // 推奨戦闘力ガイド（初心者向け）。今の戦闘力との比較で色分け。
            const _rd = GameEngine.getBossReadiness(boss);
            const _rdStyle = { ready: ['text-emerald-400', '✓ 挑戦OK'], soon: ['text-amber-400', 'あと少し'], early: ['text-rose-400', 'まだ早い'] }[_rd.level] || ['text-slate-400', ''];
            btn.innerHTML = `
              <span class="text-2xl">${boss.avatar}</span>
              <div class="flex-1 overflow-hidden">
                <div class="font-black text-white text-[11px] truncate flex items-center gap-1.5">
                  <span>${boss.name}</span>
                  ${isDefeated ? '<span class="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 py-0.2 rounded font-normal">撃破済</span>' : ''}
                </div>
                <div class="text-[9px] ${_rdStyle[0]} font-bold">推奨戦闘力 ${_rd.rec.toLocaleString()} <span class="font-normal">${_rdStyle[1]}</span></div>
                <div class="text-[9px] text-slate-400 truncate">${boss.desc}</div>
              </div>
            `;
          }
          block.appendChild(btn);
        });
        container.appendChild(block);
      });
    }

    // ── ボス出題範囲ポップアップ ──
    let _bossRangeTarget = null;   // 対象ボス
    let _bossRangeGenres = [];     // 選択中ジャンル（空=全ジャンル）
    let _bossRangeType = '';       // 出題形式（''=両方／'typing'／'choice'）

    function openBossRangePopup(boss) {
      _bossRangeTarget = boss;
      _bossRangeGenres = [];
      _bossRangeType = '';
      document.getElementById('boss-range-title').textContent = `👹 ${boss.name}`;
      const dLabel = (GameData.DIFFICULTIES.find(d => d.key === boss.tier) || {}).label || '';
      document.getElementById('boss-range-sub').textContent = `難易度: ${dLabel}（固定）／ 教科・ジャンル・形式を選べます。得意分野で挑戦OK`;
      renderBossRangeType();
      renderBossRangeGenres();
      document.getElementById('boss-range-popup').classList.remove('hidden');
    }

    function renderBossRangeType() {
      const box = document.getElementById('boss-range-type');
      if (!box) return;
      let html = '<span class="text-xs text-slate-400 mr-1 font-bold">形式:</span>';
      [['', '両方'], ['typing', '⌨️ タイピング'], ['choice', '🔘 選択式']].forEach(([val, label]) => {
        const on = _bossRangeType === val;
        html += `<button onclick="GameUI.setBossRangeType('${val}')" class="${on ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1 px-2.5 rounded-lg text-xs">${label}</button>`;
      });
      html += _mobileChoiceNote();
      box.innerHTML = html;
    }

    function setBossRangeType(val) {
      _bossRangeType = val;
      // 形式を変えると、対応するジャンルが変わりうるので、消えたジャンルは選択解除
      _bossRangeGenres = _bossRangeGenres.filter(k =>
        GameData.getQuestions({ diff: _bossRangeTarget.tier, genres: [k], type: _bossRangeType || null }).length > 0);
      renderBossRangeType();
      renderBossRangeGenres();
    }

    // 全教科のジャンルを、道場と同じ豊かなカード（問題数・例・学年バッジ）で表示。
    // 難易度はボス固定。形式は _bossRangeType。生物/地学/物理も選べる＝得意分野で戦える。
    function renderBossRangeGenres() {
      const box = document.getElementById('boss-range-genres');
      const tier = _bossRangeTarget.tier;
      const allOn = _bossRangeGenres.length === 0;
      let html = `<div onclick="GameUI.toggleBossRangeGenre('')" class="rounded-xl p-2.5 mb-2 cursor-pointer transition-all ${allOn ? 'bg-cyan-900 ring-2 ring-cyan-400' : 'bg-slate-800 hover:bg-slate-700'}">
          <div class="flex items-center gap-1.5"><span class="text-base">🎲</span>
            <span class="font-bold text-white text-xs">すべて（全教科・全ジャンルからランダム）</span>
            ${allOn ? '<span class="ml-auto text-cyan-300 text-xs">✓</span>' : ''}</div></div>`;
      GameData.SUBJECTS.forEach(sub => {
        const genres = GameData.GENRES.filter(g => g.subject === sub.key);
        const cards = genres.map(g => {
          const cnt = GameData.getQuestions({ diff: tier, genres: [g.key], type: _bossRangeType || null }).length;
          if (cnt === 0) return '';
          const grade = GameData.getGenreGradeRange(g.key, [tier]);
          const gradeCls = GameData.getGradeBadgeClass(GameData.getGenreGradeMax(g.key, [tier]));
          const exs = (GameData.GENRE_EXAMPLES[g.key] || []).slice(0, 3).join('・');
          const on = _bossRangeGenres.indexOf(g.key) >= 0;
          return `<div onclick="GameUI.toggleBossRangeGenre('${g.key}')" class="rounded-xl p-2.5 cursor-pointer transition-all ${on ? 'bg-cyan-900 ring-2 ring-cyan-400' : 'bg-slate-800 hover:bg-slate-700'}">
            <div class="flex items-center gap-1.5 mb-1"><span class="text-base">${g.icon}</span>
              <span class="font-bold text-white text-xs">${g.label}</span>
              ${grade ? `<span class="text-[8px] ${gradeCls} px-1 rounded font-bold">${grade}</span>` : ''}
              <span class="ml-auto text-[10px] font-mono ${on ? 'text-cyan-200' : 'text-cyan-400'}">${cnt}問</span>
              ${on ? '<span class="text-cyan-300 text-xs">✓</span>' : ''}</div>
            ${exs ? `<div class="text-[10px] text-slate-400 pl-6">例) ${exs}</div>` : ''}</div>`;
        }).filter(Boolean).join('');
        if (!cards) return; // この教科にこの難易度/形式の問題が無ければ節ごと省略
        const selCnt = genres.filter(g => _bossRangeGenres.indexOf(g.key) >= 0).length;
        html += `<div class="mb-3">
          <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">${sub.icon}</span>
            <span class="font-black text-slate-200 text-sm">${sub.label}</span>
            ${selCnt ? `<span class="text-[9px] bg-cyan-900 text-cyan-300 px-1.5 py-0.5 rounded">${selCnt}個選択中</span>` : ''}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${cards}</div></div>`;
      });
      box.innerHTML = html;
      renderBossRangePreview();
    }

    // ボス範囲の下部プレビュー（難易度＝固定・形式＝選択値）
    function renderBossRangePreview() {
      const el = document.getElementById('boss-range-preview');
      if (!el || !_bossRangeTarget) return;
      const tier = _bossRangeTarget.tier;
      const dLabel = (GameData.DIFFICULTIES.find(d => d.key === tier) || {}).label || '';
      const genres = _bossRangeGenres.length ? _bossRangeGenres : null;
      const total = GameData.getQuestions({ diff: tier, genres: genres, type: _bossRangeType || null }).length;
      const gtxt = _bossRangeGenres.length ? _bossRangeGenres.map(k => (GameData.GENRES.find(g => g.key === k) || {}).label).join('・') : '全教科・全ジャンル';
      const tLabel = _bossRangeType === 'typing' ? 'タイピング' : (_bossRangeType === 'choice' ? '選択式' : 'タイピング＋選択式');
      el.textContent = `${dLabel}・${gtxt}・${tLabel}（${total}問）`;
    }

    function toggleBossRangeGenre(key) {
      if (key === '') { _bossRangeGenres = []; }
      else {
        const i = _bossRangeGenres.indexOf(key);
        if (i >= 0) _bossRangeGenres.splice(i, 1); else _bossRangeGenres.push(key);
      }
      renderBossRangeGenres();
    }

    function closeBossRangePopup() {
      document.getElementById('boss-range-popup').classList.add('hidden');
    }

    function startBossFromRange() {
      const boss = _bossRangeTarget;
      closeBossRangePopup();
      GameEngine.startBossBattle(boss, _bossRangeGenres.length ? _bossRangeGenres.slice() : null, _bossRangeType || null);
    }

    // ── 専科の試練（範囲限定の裏ボス）ポップアップ ── 難易度設定なし・固定（Lv1相当）
    function openEndgamePopup() {
      renderEndgameBossList();
      document.getElementById('endgame-popup').classList.remove('hidden');
      if (!GameEngine.player.hasClearedOnce) {
        document.getElementById('endgame-boss-list').innerHTML = '<div class="text-center text-slate-400 text-xs py-6">🔒 ラスボス「アポカリプス」を撃破すると解禁されます。</div>';
      }
    }
    function closeEndgamePopup() { document.getElementById('endgame-popup').classList.add('hidden'); }
    function _endgameSubjLabel(key) { const s = GameData.SUBJECTS.find(x => x.key === key); return s ? s.label : ''; }
    function renderEndgameBossList() {
      if (!GameEngine.player.hasClearedOnce) return;
      const list = document.getElementById('endgame-boss-list');
      const defeated = GameEngine.player.defeatedEndgame || [];
      const genreLabel = k => { const g = GameData.GENRES.find(x => x.key === k); return g ? g.label : k; };
      // 範囲ボスのみ表示（pureボス=オメガは「最強の試練」ボタンへ）
      list.innerHTML = GameData.ENDGAME_BOSSES_DB.filter(b => b.kind === 'range').map(b => {
        const done = defeated.indexOf(b.id) >= 0;
        const range = _endgameSubjLabel(b.subject) + '・' + (b.genres || []).map(genreLabel).join('/');
        const r = b.reward || {};
        const buff = `ATK+${Math.round((r.atk||0)*100)}% HP+${Math.round((r.hp||0)*100)}% DEF+${Math.round((r.def||0)*100)}% 🪙+${Math.round((r.goldMul||0)*100)}%`;
        const bvis = `<img src="assets/boss/endgame_${b.id}.png" class="w-10 h-10 object-contain shrink-0" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'text-2xl',textContent:'${b.avatar}'}))">`;
        return `<div class="bg-slate-950/70 border border-purple-800/50 rounded-xl p-3">
          <div class="flex items-center gap-2 mb-1">
            ${bvis}
            <div class="flex-1 min-w-0">
              <div class="font-black text-white text-xs flex items-center gap-1">${b.name} ${done?'<span class="text-[8px] text-emerald-400">✓撃破済</span>':''}</div>
              <div class="text-[9px] text-slate-400">出題: ${range}</div>
            </div>
          </div>
          <div class="text-[8px] text-emerald-300/80 mb-2">恒久バフ: ${buff}</div>
          <button onclick="GameUI.startEndgameFromList('${b.id}')" class="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all active:scale-95">⚔️ 挑戦する</button>
        </div>`;
      }).join('');
    }
    function startEndgameFromList(bossId) {
      closeEndgamePopup();
      GameEngine.startEndgameBoss(bossId, 1); // 範囲ボスは固定（Lv1相当）
    }

    // ── 最強の試練（エンドコンテンツボス=オメガ）ポップアップ ── ステ別に1〜20で調整
    const _OMEGA_STATS = [['hp','💗 HP'],['atk','⚔️ 攻撃力'],['speed','💨 行動速度'],['ult','🌀 必殺技の頻度']];
    function openOmegaPopup() {
      renderOmegaPopup();
      document.getElementById('omega-popup').classList.remove('hidden');
    }
    function closeOmegaPopup() { document.getElementById('omega-popup').classList.add('hidden'); }
    function renderOmegaPopup() {
      const boss = GameData.ENDGAME_BOSSES_DB.find(b => b.kind === 'pure');
      const box = document.getElementById('omega-body');
      if (!boss || !box) return;
      if (!GameEngine.player.hasClearedOnce) {
        box.innerHTML = '<div class="text-center text-slate-400 text-xs py-6">🔒 ラスボス「アポカリプス」を撃破すると解禁されます。</div>';
        return;
      }
      const lv = GameEngine.player.endgameStatLevels || { hp:10, atk:10, speed:10, ult:10 };
      const done = (GameEngine.player.defeatedEndgame || []).indexOf(boss.id) >= 0;
      const bvis = `<img src="assets/boss/endgame_${boss.id}.png" class="w-16 h-16 object-contain mx-auto" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'text-5xl block text-center',textContent:'${boss.avatar}'}))">`;
      const r = boss.reward || {};
      let html = `<div class="text-center mb-2">${bvis}
        <div class="font-black text-fuchsia-300 text-sm mt-1">${boss.name} ${done?'<span class="text-[9px] text-emerald-400">✓撃破済</span>':''}</div>
        <div class="text-[9px] text-slate-400">全教科・全範囲から出題。恒久バフ ATK+${Math.round((r.atk||0)*100)}% HP+${Math.round((r.hp||0)*100)}% DEF+${Math.round((r.def||0)*100)}% 🪙+${Math.round((r.goldMul||0)*100)}%</div></div>`;
      html += '<div class="space-y-2 mb-3">';
      _OMEGA_STATS.forEach(([key, label]) => {
        html += `<div class="bg-slate-950/70 rounded-lg p-2 border border-fuchsia-900/40">
          <div class="flex justify-between text-[10px] mb-1"><span class="text-slate-300 font-bold">${label}</span><span class="font-mono font-black text-fuchsia-300"><span id="omega-lv-${key}">${lv[key]}</span> / 20</span></div>
          <input type="range" min="1" max="20" value="${lv[key]}" oninput="GameUI.setOmegaStatLevel('${key}', this.value)" class="w-full h-2 rounded-full cursor-pointer" style="accent-color:#e879f9">
        </div>`;
      });
      html += '</div>';
      html += `<div class="flex gap-2">
        <button onclick="GameUI.setOmegaAll(20)" class="flex-1 bg-rose-800 hover:bg-rose-700 text-white font-bold py-1.5 rounded-lg text-[10px]">全部MAX(20)</button>
        <button onclick="GameUI.setOmegaAll(1)" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 rounded-lg text-[10px]">全部1</button>
      </div>
      <button onclick="GameUI.startOmega()" class="w-full bg-fuchsia-700 hover:bg-fuchsia-600 text-white font-black py-2.5 rounded-xl text-sm mt-2 transition-all active:scale-95">🌌 挑戦する</button>
      <p class="text-[9px] text-slate-500 mt-2">各ステータスを1〜20で調整できます。全て20＝検証済み最高難度。今の最強装備で倒せるか倒せないかの頂点です。</p>`;
      box.innerHTML = html;
    }
    function setOmegaStatLevel(key, val) {
      val = Math.max(1, Math.min(20, parseInt(val) || 1));
      if (!GameEngine.player.endgameStatLevels) GameEngine.player.endgameStatLevels = { hp:10, atk:10, speed:10, ult:10 };
      GameEngine.player.endgameStatLevels[key] = val;
      const el = document.getElementById('omega-lv-' + key); if (el) el.textContent = val;
      GameEngine.saveUserDataLocal();
    }
    function setOmegaAll(val) {
      ['hp','atk','speed','ult'].forEach(k => { GameEngine.player.endgameStatLevels[k] = val; });
      GameEngine.saveUserDataLocal();
      renderOmegaPopup();
    }
    function startOmega() {
      const boss = GameData.ENDGAME_BOSSES_DB.find(b => b.kind === 'pure');
      if (!boss) return;
      closeOmegaPopup();
      GameEngine.startEndgameBoss(boss.id, GameEngine.player.endgameStatLevels);
    }

    // ── 称号ポップアップ ──
    function openTitlePopup() { renderTitleList(); document.getElementById('title-popup').classList.remove('hidden'); }
    function closeTitlePopup() { document.getElementById('title-popup').classList.add('hidden'); }
    function renderTitleList() {
      const list = document.getElementById('title-list');
      const cur = GameEngine.player.equippedTitle || 'none';
      list.innerHTML = GameData.TITLES_DB.map(t => {
        const unlocked = GameData.isTitleUnlocked(t, GameEngine.player);
        const equipped = cur === t.id;
        const preview = t.frame ? `<span class="name-frame ${t.frame} text-[11px]">${GameEngine.player.name}</span>` : `<span class="font-black text-white text-[11px]">${GameEngine.player.name}</span>`;
        return `<div class="bg-slate-950/70 border ${equipped?'border-amber-500':'border-slate-800'} rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="mb-1">${unlocked ? preview : '<span class="text-slate-600 text-[11px] font-bold">🔒 ???</span>'}</div>
            <div class="text-[9px] text-slate-400">${unlocked ? t.desc : t.desc}</div>
          </div>
          ${unlocked
            ? `<button onclick="GameUI.equipTitle('${t.id}')" class="${equipped?'bg-amber-600':'bg-slate-700 hover:bg-slate-600'} text-white font-bold px-3 py-1.5 rounded-lg text-[10px] shrink-0 transition-all">${equipped?'装備中':'装備'}</button>`
            : `<span class="text-[9px] text-slate-600 shrink-0">未解禁</span>`}
        </div>`;
      }).join('');
    }
    function equipTitle(id) {
      GameEngine.player.equippedTitle = id;
      GameEngine.saveUserDataLocal();
      renderTitleList();
      updateMenuUI();
    }

    // ── アバターポップアップ ──
    function openAvatarPopup() { renderAvatarList(); document.getElementById('avatar-popup').classList.remove('hidden'); }
    function closeAvatarPopup() { document.getElementById('avatar-popup').classList.add('hidden'); }
    function renderAvatarList() {
      const list = document.getElementById('avatar-list');
      const cur = GameEngine.player.equippedAvatar || 'default';
      list.innerHTML = GameData.AVATARS_DB.map(a => {
        const sel = cur === a.id;
        // 画像 assets/ui/avatar_<id>.png があれば表示、無ければ絵文字
        const visual = `<img src="assets/ui/avatar_${a.id}.png" class="w-14 h-14 object-contain" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'text-4xl',textContent:'${a.emoji}'}))">`;
        return `<button onclick="GameUI.equipAvatar('${a.id}')" class="flex flex-col items-center gap-1 p-2 rounded-xl border ${sel?'border-sky-400 bg-sky-950/40':'border-slate-800 bg-slate-950/60 hover:bg-slate-800'} transition-all">
          ${visual}
          <span class="text-[8px] ${sel?'text-sky-300 font-bold':'text-slate-400'}">${a.name}</span>
        </button>`;
      }).join('');
    }
    function equipAvatar(id) {
      GameEngine.player.equippedAvatar = id;
      GameEngine.saveUserDataLocal();
      renderAvatarList();
      GameEngine.updateCharAvatar();
    }

      function openGachaScreen() {
      document.getElementById('screen-menu').classList.add('hidden');
      document.getElementById('screen-gacha').classList.remove('hidden');
      renderGachaCarousel();
      renderGachaTools();
    }

      // 倒した節目ボス数（価格逓減・割引%表示に使う）
      function _gachaMilestones() {
      return GameData.GACHA_MILESTONE_BOSSES.filter(id => (GameEngine.player.defeatedBosses || []).indexOf(id) >= 0).length;
    }
      function gachaCarouselPrev() {
      const n = Object.keys(GameData.GACHA_DB).length;
      _gachaIndex = (_gachaIndex - 1 + n) % n; renderGachaCarousel();
    }
      function gachaCarouselNext() {
      const n = Object.keys(GameData.GACHA_DB).length;
      _gachaIndex = (_gachaIndex + 1) % n; renderGachaCarousel();
    }
      // カルーセル: 1ガチャだけ大きく表示＋ドット
      function renderGachaCarousel() {
      const keys = Object.keys(GameData.GACHA_DB);
      if (_gachaIndex >= keys.length) _gachaIndex = 0;
      const key = keys[_gachaIndex];
      const machine = GameData.GACHA_DB[key];
      const milestones = _gachaMilestones();
      const price = GameEngine.gachaPrice(key);
      const pct = GameData.gachaDiscountPct(milestones);
      const locked = machine.requiresClear && !GameEngine.player.hasClearedOnce;
      const canAfford = GameEngine.player.gold >= price;
      const canAfford10 = GameEngine.player.gold >= price * 10;

      let bgStyle = "bg-slate-900 border-slate-800", textShadow = "";
      if (machine.theme) {
        // UR系統別ガチャ: 系統ごとに背景色を変える（画像は共通）
        const _tbg = {
          attack:     'bg-gradient-to-br from-rose-900 to-orange-900 border-rose-400 text-white shadow-xl shadow-rose-500/40',
          durability: 'bg-gradient-to-br from-sky-900 to-blue-900 border-sky-400 text-white shadow-xl shadow-sky-500/40',
          combo:      'bg-gradient-to-br from-fuchsia-900 to-purple-900 border-fuchsia-400 text-white shadow-xl shadow-fuchsia-500/40',
          special:    'bg-gradient-to-br from-amber-900 to-yellow-900 border-amber-400 text-white shadow-xl shadow-amber-500/40'
        };
        bgStyle = _tbg[machine.theme] || "gacha-legend-bg border-indigo-400 text-white shadow-xl shadow-indigo-500/40";
        textShadow = "style='text-shadow:0 2px 4px rgba(0,0,0,0.9);'";
      }
      else if (key === 'gold') { bgStyle = "gacha-gold-bg border-amber-300 text-amber-950 shadow-lg shadow-amber-400/30"; textShadow = "style='text-shadow:0 1px 2px rgba(255,255,255,0.6);font-weight:900;'"; }
      else if (key === 'silver') { bgStyle = "gacha-silver-bg border-slate-300 text-slate-900"; }
      else if (key === 'bronze') { bgStyle = "gacha-bronze-bg border-amber-700 text-amber-950"; }
      else if (key === 'iron') { bgStyle = "gacha-iron-bg border-slate-600 text-slate-200 shadow-inner"; }

      const btnClass = (canAfford && !locked) ? "bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black shadow-md transition-all active:scale-95" : "bg-slate-800 text-slate-500 font-bold cursor-not-allowed";
      const btnLabel = locked ? '🔒 ラスボス撃破で解禁' : (canAfford ? '🎰 1回 回す' : 'ゴールド不足');
      const discountBadge = (pct < 100) ? `<span class="absolute top-1 left-1 text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-full z-10">${pct}%</span>` : '';

      document.getElementById('gacha-carousel-card').innerHTML = `
        <div class="${bgStyle} border-2 rounded-2xl p-4 flex flex-col justify-between text-center relative min-h-[15rem]">
          ${discountBadge}
          <div ${textShadow} class="relative">
            <button onclick="openGachaRateModal('${key}')" class="absolute top-0 right-0 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white text-[11px] font-black flex items-center justify-center border border-slate-700 z-10" title="排出率を見る">？</button>
            ${locked ? '<span class="text-5xl block mb-1">🔒</span>'
              : `<img src="assets/ui/gacha_${machine.img||key}.png" alt="${machine.name}" class="block mx-auto mb-1 object-contain" style="height:120px;width:auto" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'text-6xl block mb-1',textContent:'🎰'}))">`}
            <h4 class="font-black text-sm tracking-wider">${machine.name}</h4>
            <div class="text-[12px] font-bold mt-1 font-mono">🪙 ${price.toLocaleString()} ${pct<100?`<span class="opacity-60 line-through text-[9px]">${machine.price.toLocaleString()}</span>`:''}</div>
          </div>
          <div class="flex flex-col gap-1.5 mt-3">
            <button onclick="pullGacha('${key}')" class="${btnClass} py-2 rounded-xl text-xs w-full" ${(canAfford && !locked)?'':'disabled'}>${btnLabel}</button>
            <button onclick="pullGachaMulti('${key}')" class="${(canAfford10 && !locked)?'bg-orange-500 hover:bg-orange-400 text-slate-950 font-black shadow active:scale-95':'bg-slate-800 text-slate-500 cursor-not-allowed font-bold'} py-2 rounded-xl text-[11px] w-full transition-all" ${(canAfford10 && !locked)?'':'disabled'}>${locked?'🔒':'10+1連 🪙'+(price*10).toLocaleString()}</button>
          </div>
        </div>`;

      // ドット
      document.getElementById('gacha-dots').innerHTML = keys.map((k,i) =>
        `<button onclick="GameUI.gachaCarouselGo(${i})" class="w-2.5 h-2.5 rounded-full ${i===_gachaIndex?'bg-amber-400':'bg-slate-600 hover:bg-slate-500'} transition-all"></button>`
      ).join('');
    }
      function gachaCarouselGo(i) { _gachaIndex = i; renderGachaCarousel(); }

      // 便利機能: 自動売却の設定＋希望ステータスまで連続ガチャ
      function renderGachaTools() {
      const box = document.getElementById('gacha-tools');
      if (!box) return;
      const keys = Object.keys(GameData.GACHA_DB);
      const curKey = keys[_gachaIndex];
      // 自動売却の選択肢（レア度しきい値）
      const rarOpts = [['','OFF（売却しない）'],['Common','C 以下'],['Uncommon','UC 以下'],['Rare','R 以下'],['Epic','SR 以下'],['Legendary','SSR 以下']];
      const cur = GameEngine.player.autoSellRarity || '';
      // 希望ステータスの選択肢（装備のメインステータスとして実在するもの）
      const statKeys = _equipMainStatKeys();
      box.innerHTML = `
        <div class="mb-3">
          <div class="text-[10px] font-bold text-slate-300 mb-1">🗑️ 自動売却（排出後すぐ売る）</div>
          <select onchange="GameUI.setAutoSellRarity(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white">
            ${rarOpts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}
          </select>
          <p class="text-[9px] text-slate-500 mt-1">設定したレア度以下の装備は、ガチャから出た瞬間に自動で売却します。</p>
        </div>
        <div class="border-t border-slate-800 pt-3">
          <div class="text-[10px] font-bold text-slate-300 mb-1">🎯 希望ステータスが出るまで回す</div>
          <div class="flex gap-2">
            <select id="gacha-target-stat" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white">
              ${statKeys.map(k=>`<option value="${k}">${GameData.STAT_NAMES_JP[k]||k}</option>`).join('')}
            </select>
            <button onclick="GameUI.pullUntilStatAction('${curKey}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg text-[11px] whitespace-nowrap active:scale-95 transition-all">🔁 まわす</button>
          </div>
          <p class="text-[9px] text-slate-500 mt-1">今表示中のガチャを、希望ステのメイン装備が出るまで連続で回します。<br>停止＝出た／インベ満杯(200)／コイン不足。希望ステの装備は自動売却されません。</p>
        </div>`;
    }
      // 装備のメインステータスとして実在するキー一覧（重複排除・STAT_META順）
      function _equipMainStatKeys() {
      const set = {};
      (GameData.BASE_EQUIP_TEMPLATES || []).concat(GameData.UNIQUE_EQUIP_TEMPLATES || []).forEach(t => { if (t && t.stat) set[t.stat] = true; });
      return Object.keys(GameData.STAT_META).filter(k => set[k]);
    }
      function setAutoSellRarity(val) {
      GameEngine.player.autoSellRarity = val || '';
      GameEngine.saveUserDataLocal();
    }
      function pullUntilStatAction(tier) {
      const sel = document.getElementById('gacha-target-stat');
      if (!sel) return;
      GameEngine.pullUntilStat(tier, sel.value);
    }
      function closeGachaResultPopup() { document.getElementById('gacha-result-popup').classList.add('hidden'); }
      // 連続ガチャの結果サマリーをポップアップ表示
      function showGachaUntilResult(s) {
      document.getElementById('gacha-result-popup').classList.remove('hidden');
      const log = document.getElementById('gacha-output-log');
      const stopMsg = s.stop === 'found' ? '<span class="text-emerald-400 font-black">✅ 希望のステータスが出ました！</span>'
        : s.stop === 'full' ? '<span class="text-amber-400 font-black">🎒 インベントリが満杯になりました</span>'
        : '<span class="text-rose-400 font-black">🪙 ゴールドが足りなくなりました</span>';
      const foundHtml = s.found ? '<div class="card-reveal w-full flex justify-center mt-2">' + _gachaCard(s.found, false, false) + '</div>' : '';
      log.innerHTML = `<div class="w-full text-center text-xs space-y-1">
          ${stopMsg}
          <div class="text-slate-300">回した回数: <b class="text-white">${s.pulls}</b> 回</div>
          <div class="text-slate-300">使ったコイン: <b class="text-yellow-300">🪙 ${s.spent.toLocaleString()}</b></div>
          <div class="text-slate-300">自動売却: <b class="text-white">${s.soldCount}</b> 個（+🪙 ${s.soldGold.toLocaleString()}）</div>
        </div>${foundHtml}`;
      renderGachaCarousel(); renderGachaTools();
    }

      function openGachaRateModal(key) {
      const machine = GameData.GACHA_DB[key];
      document.getElementById('gacha-rate-modal-title').textContent = machine.name + ' 排出率';
      const list = document.getElementById('gacha-rate-modal-list');
      list.innerHTML = '';
      Object.entries(machine.rates).forEach(([rarity, rate]) => {
        if (rate <= 0) return;
        const rData = GameData.RARITY_DB[rarity];
        const color = RARITY_TEXT_COLORS[rarity] || 'text-white';
        const pct = (rate * 100).toFixed(2);
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800';
        row.innerHTML = `<span class="${color} font-bold">${rData.name.split(' ')[0]}</span>
          <div class="flex items-center gap-2">
            <div class="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full bg-current ${color}" style="width:${Math.min(100, rate*500)}%"></div>
            </div>
            <span class="font-mono font-black text-white">${pct}%</span>
          </div>`;
        list.appendChild(row);
      });
      document.getElementById('gacha-rate-modal').classList.remove('hidden');
    }

      function closeGachaRateModal() {
      document.getElementById('gacha-rate-modal').classList.add('hidden');
    }

    // ── 🎰 ガチャ抽選演出（capsule → flash → 順次オープン） ──
    const _RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Relic'];
    function _gachaCard(eq, compact, isBonus) {
      const rData = GameData.RARITY_DB[eq.rarity];
      const mainName = GameData.STAT_NAMES_JP[eq.stat] || eq.stat;
      const mainShown = (eq.baseVal >= 1) ? Math.floor(eq.baseVal) : eq.baseVal.toFixed(2);
      const soldBadge = eq._autoSold ? '<span class="absolute -bottom-1 -left-1 text-[6px] bg-rose-600 text-white font-black px-1 rounded z-10">売却</span>' : '';
      if (compact) {
        return `<div class="relative p-1 border rounded-lg text-center ${rData.color} ${eq._autoSold?'opacity-60':''}">
          ${isBonus ? '<span class="absolute -top-1 -right-1 text-[7px] bg-yellow-500 text-slate-900 font-black px-1 rounded z-10">確定</span>' : ''}${soldBadge}
          <div class="flex justify-center">${_equipIcon(eq, 44)}</div>
          <div class="text-[8px] font-bold truncate">${eq.name}</div>
          <div class="text-[7px] opacity-80">${rData.name.split(' ')[0]}</div>
        </div>`;
      }
      const bonusHtml = (eq.bonusStats || []).map(_fmtBonusStat).join('');
      const skillHtml = (eq.skill && eq.skill !== 'なし') ? `<div class="text-[9px] mt-1 text-amber-300 font-bold">★ ${eq.skill}</div>` : '';
      return `<div class="p-3 border-2 rounded-xl text-center w-full max-w-xs ${rData.color}">
          <div class="flex justify-center mb-1">${_equipIcon(eq, 110)}</div>
          <div class="font-black text-white text-sm">${eq.name}</div>
          <span class="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-900/80">${rData.name}</span>
          <div class="text-[10px] text-cyan-400 mt-1 font-mono">${mainName} +${mainShown}</div>
          <div class="mt-1">${bonusHtml}</div>${skillHtml}
          ${eq._autoSold ? '<div class="text-[9px] text-rose-300 font-bold mt-1">🗑️ 自動売却 +🪙'+eq._autoSold.toLocaleString()+'</div>' : ''}
        </div>`;
    }
    function _flashScreen(rarity) {
      const f = document.createElement('div');
      f.className = 'gacha-flash';
      if (rarity === 'Relic') {
        f.style.background = 'linear-gradient(270deg,#ff007f,#7f00ff,#00f0ff,#00ff7f,#ffea00)';
        f.style.backgroundSize = '400% 400%';
      } else {
        const c = { Common:'rgba(148,163,184,.45)', Uncommon:'rgba(16,185,129,.5)', Rare:'rgba(37,99,235,.55)', Epic:'rgba(147,51,234,.6)', Legendary:'rgba(245,158,11,.7)' };
        f.style.background = c[rarity] || c.Common;
      }
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 700);
    }
    // ── 📖 ビルドガイド / 📋 排出装備一覧 ──
    function closeGuideModal() { document.getElementById('guide-modal').classList.add('hidden'); }
    function openBuildGuide() {
      document.getElementById('guide-modal-title').textContent = '📖 ビルドガイド';
      // ★の少ない順（diff昇順）に並べ、難易度グループの見出しを付ける＝作りやすい順＝おすすめ順。
      const groups = [
        { diff: 0, label: '★ まず作れる（UR装備なし・最初におすすめ）', color: 'text-emerald-300' },
        { diff: 1, label: '★★ UR装備を1個そろえる', color: 'text-cyan-300' },
        { diff: 2, label: '★★★ UR装備を2個そろえる', color: 'text-violet-300' },
        { diff: 3, label: '★★★★ UR装備を3個（最上級・ロマン）', color: 'text-rose-300' }
      ];
      // スキル名→代表となるUR装備（前提装備にアイコン表示するため）。
      const skillEquip = {};
      GameData.UNIQUE_EQUIP_TEMPLATES.forEach(t => { if (t.skill && t.skill !== 'なし' && !skillEquip[t.skill]) skillEquip[t.skill] = t; });
      const reqHtml = b => {
        if (!b.reqSkills || !b.reqSkills.length) return '<span class="text-slate-400">なし（通常装備でOK）</span>';
        return b.reqSkills.map(sk => {
          const t = skillEquip[sk];
          if (!t) return `<span class="text-amber-300">${sk}</span>`;
          return `<span class="inline-flex items-center gap-1 bg-slate-900/70 border border-slate-700 rounded-lg pl-0.5 pr-1.5 py-0.5 mr-1 mb-1">`
            + `${_equipIcon(t, 22)}<span class="text-[11px] text-slate-200 font-bold">${t.name}</span><span class="text-[9px] text-amber-300/80">${sk}</span></span>`;
        }).join('');
      };
      const card = b => `<div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <div class="flex justify-between items-center gap-2">
            <span class="font-black text-white text-sm">${b.n}. ${b.name}</span>
            <span class="text-yellow-400 text-xs shrink-0">${'★'.repeat(b.diff + 1)}</span>
          </div>
          <div class="text-[13px] text-slate-200 mt-1.5 leading-relaxed">${b.why}</div>
          <div class="text-xs text-cyan-200 mt-2">🔧 強化で伸ばす: <span class="text-white font-bold">${b.focus}</span></div>
          <div class="text-xs text-amber-300/90 mt-1">⭐ 前提のUR装備:</div>
          <div class="flex flex-wrap mt-1">${reqHtml(b)}</div>
        </div>`;
      let html = `<div class="text-[13px] text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-3 leading-relaxed">
        <b class="text-white">読み方</b>：上から順に作りやすい（★が少ないほど簡単）。<b class="text-emerald-300">まずは★のビルド</b>から始めよう。<br>
        <b class="text-amber-300">⭐ 前提のUR装備</b>は、ラスボスを倒すと解禁される<b>「ケイオスガチャ」</b>（攻撃／耐久／コンボ／特殊の系統別）で手に入ります。狙った系統のガチャを引くと集めやすいです。
      </div>`;
      groups.forEach(g => {
        const items = GameData.BUILD_GUIDE.filter(b => b.diff === g.diff);
        if (!items.length) return;
        html += `<div class="text-sm font-black ${g.color} mt-3 mb-1.5">${g.label}</div>`
          + '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' + items.map(card).join('') + '</div>';
      });
      document.getElementById('guide-modal-content').innerHTML = html;
      document.getElementById('guide-modal').classList.remove('hidden');
    }
    function openEquipList() {
      document.getElementById('guide-modal-title').textContent = '📋 ガチャ排出装備 一覧';
      const slotJp = { weapon: '武器', head: '頭', body: '胴', feet: '足', accessory: '装飾' };
      const row = (t, tag) => {
        const sk = (t.skill && t.skill !== 'なし')
          ? `<span class="text-amber-300">★ ${t.skill}</span>` : '<span class="text-slate-500">スキルなし</span>';
        return `<div class="bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
          ${_equipIcon(t, 32)}
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-bold text-white truncate">${t.name} <span class="text-[8px] text-slate-400">[${slotJp[t.type]}]</span> ${tag}</div>
            <div class="text-[9px] text-slate-400 truncate">メイン: ${GameData.STAT_NAMES_JP[t.stat] || t.stat} / ${sk}</div>
          </div></div>`;
      };
      const base = GameData.BASE_EQUIP_TEMPLATES.map(t => row(t, '<span class="text-[8px] text-emerald-400">通常</span>')).join('');
      const uniq = GameData.UNIQUE_EQUIP_TEMPLATES.map(t => row(t, '<span class="text-[8px] text-indigo-300">UR専用</span>')).join('');
      document.getElementById('guide-modal-content').innerHTML =
        '<div class="text-[10px] font-black text-emerald-300 mb-1">● 通常装備（すべてのガチャから排出）</div><div class="grid grid-cols-1 md:grid-cols-2 gap-1.5">' + base + '</div>'
        + '<div class="text-[10px] font-black text-indigo-300 mt-3 mb-1">● UR専用ユニーク装備（ケイオスガチャ限定）</div><div class="grid grid-cols-1 md:grid-cols-2 gap-1.5">' + uniq + '</div>';
      document.getElementById('guide-modal').classList.remove('hidden');
    }

    function showGachaResults(results, isMulti) {
      const log = document.getElementById('gacha-output-log');
      if (!log) return;
      document.getElementById('gacha-result-popup').classList.remove('hidden'); // 結果はポップアップで表示
      // ガチャ画面の価格/在庫表示を更新（ゴールド消費を反映）
      renderGachaCarousel(); renderGachaTools();
      let top = results.reduce((t, e) => _RARITY_ORDER.indexOf(e.rarity) > _RARITY_ORDER.indexOf(t) ? e.rarity : t, 'Common');
      const topIdx = _RARITY_ORDER.indexOf(top);
      const high = topIdx >= 3; // SR以上は予兆演出
      // 1. 抽選中カプセル（高レア予兆ならゲーミング/ゴールド＋振動）
      const premo = topIdx >= 5 ? 'gacha-legend-bg' : (topIdx >= 4 ? 'gacha-gold-bg' : '');
      const capsuleInner = `<img src="assets/ui/gacha_capsule.png" alt="capsule" class="w-full h-full object-contain p-1" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'text-3xl',textContent:'🎁'}))">`;
      log.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-2">
          <div class="w-16 h-16 rounded-full ${premo} ${high ? 'capsule-shake' : 'capsule-spin'} flex items-center justify-center text-3xl border-2 border-white/40 overflow-hidden" style="${premo ? '' : 'background:#334155;'}">${capsuleInner}</div>
          <div class="text-[10px] font-bold ${high ? 'text-yellow-300' : 'text-slate-400'}">${high ? '✦ 何か光ってる…！ ✦' : '✦ 抽選中… ✦'}</div>
        </div>`;
      playSound('skill');
      setTimeout(() => {
        _flashScreen(top);
        if (topIdx >= 5) { playSound('skill'); setTimeout(() => playSound('skill'), 120); }
        if (isMulti) {
          log.innerHTML = '<div class="text-[9px] text-yellow-300 font-bold mb-1 w-full text-center">🎉 10+1連！（最後の1個は最高レア確定）</div><div class="grid grid-cols-4 gap-1 w-full" id="gacha-reveal-grid"></div>';
          const grid = document.getElementById('gacha-reveal-grid');
          results.forEach((eq, i) => {
            setTimeout(() => {
              if (!grid) return;
              const d = document.createElement('div');
              d.className = 'card-reveal';
              d.innerHTML = _gachaCard(eq, true, i === results.length - 1);
              grid.appendChild(d);
              if (eq.rarity === 'Legendary' || eq.rarity === 'Relic') playSound('skill');
            }, i * 90);
          });
        } else {
          log.innerHTML = '<div class="card-reveal w-full flex justify-center">' + _gachaCard(results[0], false, false) + '</div>';
        }
      }, 900);
    }

      function openLibraryScreen() {
      document.getElementById('screen-menu').classList.add('hidden');
      document.getElementById('screen-library').classList.remove('hidden');
      renderLibraryTabs();
      renderLibraryFilters();
      renderLibraryContent(libraryCurrentTier);
    }

      // 難易度タブ（基礎/応用/発展/受験）。ロック廃止＝全て閲覧・挑戦できる。
      function renderLibraryTabs() {
      const tabContainer = document.getElementById('library-tabs');
      tabContainer.innerHTML = '';
      GameData.DIFFICULTIES.forEach(d => {
        const btn = document.createElement('button');
        const isActive = d.key === libraryCurrentTier;
        btn.className = (isActive ? d.color + ' text-white ring-2 ring-white/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300')
          + ' font-bold py-1.5 px-3 rounded-xl text-xs transition-all';
        btn.textContent = d.label;
        btn.onclick = () => {
          libraryCurrentTier = d.key;
          renderLibraryTabs();
          renderLibraryContent(d.key);
        };
        tabContainer.appendChild(btn);
      });
    }

      // 教科＋ジャンル＋形式の絞り込みチップ
      function renderLibraryFilters() {
      const box = document.getElementById('library-filters');
      if (!box) return;
      // 教科セレクタ
      let html = '<div class="flex flex-wrap items-center gap-1.5 mb-1">';
      html += '<span class="text-xs text-slate-400 mr-1 font-bold">教科:</span>';
      GameData.SUBJECTS.forEach(s => {
        const active = _libSubject === s.key;
        html += `<button onclick="GameUI.setLibSubject('${s.key}')" class="${active ? s.color + ' text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1.5 px-3 rounded-lg text-xs">${s.icon} ${s.label}</button>`;
      });
      // ジャンル（選択中教科のもののみ）
      html += '</div><div class="flex flex-wrap items-center gap-1.5 mb-1">';
      html += '<span class="text-xs text-slate-400 mr-1 font-bold">ジャンル:</span>';
      const allActive = _libGenres.length === 0;
      html += `<button onclick="GameUI.toggleLibGenre('')" class="${allActive ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1.5 px-3 rounded-lg text-xs">すべて</button>`;
      GameData.GENRES.filter(g => g.subject === _libSubject).forEach(g => {
        const active = _libGenres.indexOf(g.key) >= 0;
        html += `<button onclick="GameUI.toggleLibGenre('${g.key}')" class="${active ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1.5 px-3 rounded-lg text-xs">${g.icon} ${g.label}</button>`;
      });
      html += '</div><div class="flex flex-wrap items-center gap-1.5">';
      html += '<span class="text-xs text-slate-400 mr-1 font-bold">形式:</span>';
      [['','両方'],['typing','⌨️ タイピング'],['choice','🔘 選択式']].forEach(([val, label]) => {
        const active = _libType === val;
        html += `<button onclick="GameUI.setLibType('${val}')" class="${active ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-300'} font-bold py-1.5 px-3 rounded-lg text-xs">${label}</button>`;
      });
      html += _mobileChoiceNote();
      html += '</div>';
      box.innerHTML = html;
    }

      // 教科を切り替えるとジャンル選択はリセット
      function setLibSubject(key) {
      _libSubject = key;
      _libGenres = [];
      renderLibraryFilters();
      renderLibraryContent(libraryCurrentTier);
    }
      function toggleLibGenre(key) {
      if (key === '') { _libGenres = []; }
      else {
        const i = _libGenres.indexOf(key);
        if (i >= 0) _libGenres.splice(i, 1); else _libGenres.push(key);
      }
      renderLibraryFilters();
      renderLibraryContent(libraryCurrentTier);
    }
      function setLibType(val) {
      _libType = val;
      renderLibraryFilters();
      renderLibraryContent(libraryCurrentTier);
    }

      function renderLibraryContent(tierKey) {
      const container = document.getElementById('library-content');
      const dInfo = GameData.DIFFICULTIES.find(d => d.key === tierKey);
      const questions = GameData.getQuestions({
        subject: _libSubject,
        diff: tierKey,
        genres: _libGenres.length ? _libGenres : null,
        type: _libType || null
      });

      // ジャンルのラベル/色は GENRES から引く（ハードコードしない：ジャンル追加に追従）
      const _g = k => GameData.GENRES.find(g => g.key === k);
      const genreLabel = k => (_g(k) ? _g(k).label : k);
      const _genreColorMap = { formula:'text-cyan-400', reaction:'text-orange-400', ion:'text-violet-400', experiment:'text-emerald-400', light_sound:'text-yellow-400', force:'text-rose-400', electricity:'text-amber-400', motion:'text-sky-400', bio_plant:'text-green-400', bio_human:'text-pink-400', bio_cell:'text-lime-400', bio_eco:'text-teal-400', earth_land:'text-orange-300', earth_weather:'text-sky-300', earth_space:'text-indigo-300' };
      const genreColor = k => _genreColorMap[k] || 'text-slate-400';

      let html = '';
      // 📊 学習進捗ダッシュボード（教科のジャンル別 正答率＋復習導線）
      html += _renderProgressDashboard();
      // ヘッダー＋「この範囲で道場に挑戦」ボタン（難易度ロックは廃止＝問題があれば常に挑戦可）
      const canChallenge = questions.length > 0;
      html += `<div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div class="text-xs text-slate-300 flex items-center gap-2">
          <span class="px-2.5 py-1 rounded ${dInfo.color} text-white font-bold text-[13px]">${dInfo.label}</span>
          <span class="font-bold">${questions.length}問</span>
        </div>
        ${canChallenge
          ? `<button onclick="GameUI.challengeFromLibrary()" class="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all active:scale-95">🥋 この範囲で道場に挑戦</button>`
          : `<span class="text-xs text-slate-500">該当する問題がありません</span>`}
      </div>`;

      if (questions.length === 0) {
        html += '<div class="text-center text-slate-500 text-xs py-8">条件に合う問題がありません。フィルタを変えてみてください。</div>';
        container.innerHTML = html;
        return;
      }

      html += '<div class="space-y-2">';
      questions.forEach(q => {
        const gLabel = `<span class="text-[11px] ${genreColor(q.genre)} font-bold">${genreLabel(q.genre)}</span>`;
        if (q.type === 'choice') {
          // 選択式: 問題文・選択肢（正解を強調）・解説
          const choicesHtml = q.c.map((c, i) =>
            `<span class="${i === q.a ? 'text-emerald-400 font-bold' : 'text-slate-400'}">${i === q.a ? '✓ ' : ''}${c}</span>`
          ).join('<span class="text-slate-700 mx-1">/</span>');
          html += `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="flex items-center gap-2 mb-1">🔘 ${gLabel}<span class="text-[11px] text-slate-500">選択式</span></div>
            <div class="text-sm text-white font-bold mb-2 leading-relaxed">${q.q}</div>
            <div class="text-[13px] mb-2">${choicesHtml}</div>
            ${q.desc ? `<div class="text-[12px] text-slate-300 bg-slate-900/60 rounded-lg p-2.5 leading-relaxed">💡 ${q.desc}</div>` : ''}
          </div>`;
        } else {
          // タイピング: 問題名・式（穴埋めは反応式表示）・解説
          const displayStr = q.display
            ? GameData.fmtChem(q.display).replace('[ ? ]', `<span class="text-yellow-400 font-black bg-yellow-950/40 px-1 rounded">[${GameData.fmtChem(q.formula)}]</span>`)
            : `<span class="text-cyan-400 font-black">${GameData.fmtChem(q.formula)}</span>`;
          html += `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-2">⌨️ ${gLabel}<span class="text-[13px] text-slate-200 font-bold">${q.name}</span></div>
            </div>
            <div class="font-mono text-base text-slate-100 leading-relaxed mb-2">${displayStr}</div>
            ${q.desc ? `<div class="text-[12px] text-slate-300 bg-slate-900/60 rounded-lg p-2.5 leading-relaxed">💡 ${q.desc}</div>` : ''}
          </div>`;
        }
      });
      html += '</div>';
      container.innerHTML = html;
    }

      // 図書館の絞り込みをそのまま道場に引き継いで入場
      function challengeFromLibrary() {
      // 難易度ロック廃止＝そのまま入場（案内は学年警告に一本化）
      // ジャンル未選択（すべて）でも教科の範囲に限定
      const genres = _libGenres.length ? _libGenres.slice() : _genreKeysForSubject(_libSubject);
      GameEngine.startDojo(libraryCurrentTier, genres, _libType || null);
    }

      // 苦手範囲のワンタップ復習: ダッシュボードの「復習」から、そのジャンル1本で道場へ。
      function reviewGenre(genreKey) {
      GameEngine.startDojo(libraryCurrentTier, [genreKey], _libType || null);
    }

      // ジャンルの正答率を quizStats から集計（難易度をまたいで合算）。{c,t,rate|null} を返す。
      function _genreAccuracy(genreKey) {
      const qs = (GameEngine.player && GameEngine.player.quizStats) || {};
      let c = 0, t = 0;
      Object.keys(qs).forEach(k => {
        if (k.slice(0, k.indexOf('|')) === genreKey) { c += qs[k].c || 0; t += qs[k].t || 0; }
      });
      return { c, t, rate: t > 0 ? c / t : null };
    }

      // 正答率→色（弱い所ほど目立つ赤・未挑戦はグレー）。北極星: 苦手を可視化して復習へ導く。
      function _accuracyColor(rate) {
      if (rate === null) return '#475569';        // 未挑戦=スレート
      if (rate < 0.5)  return '#ef4444';           // 50%未満=赤
      if (rate < 0.8)  return '#f59e0b';           // 80%未満=黄
      return '#22c55e';                            // 80%以上=緑
    }

      // 学習進捗ダッシュボード: 選択中教科のジャンルごとに正答率バー＋復習ボタン。
      function _renderProgressDashboard() {
      const subjGenres = GameData.GENRES.filter(g => g.subject === _libSubject);
      let rows = subjGenres.map(g => {
        const a = _genreAccuracy(g.key);
        const pct = a.rate === null ? 0 : Math.round(a.rate * 100);
        const color = _accuracyColor(a.rate);
        const label = a.rate === null
          ? '<span class="text-slate-500">未挑戦</span>'
          : `<span style="color:${color}">${pct}%</span> <span class="text-slate-500">(${a.c}/${a.t})</span>`;
        return `<div class="flex items-center gap-2 py-1">
          <span class="text-[13px] font-bold text-slate-200 w-28 shrink-0 truncate">${g.icon} ${g.label}</span>
          <div class="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div class="h-full rounded-full transition-all" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="text-[12px] font-mono w-24 text-right shrink-0">${label}</span>
          <button onclick="GameUI.reviewGenre('${g.key}')" class="bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-1 px-2.5 rounded-lg text-[12px] shrink-0 active:scale-95">復習</button>
        </div>`;
      }).join('');
      return `<div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 mb-3">
        <div class="text-sm font-black text-cyan-300 mb-1.5 flex items-center gap-2">📊 学習進捗 <span class="text-[11px] text-slate-400 font-normal">ジャンル別の正答率（苦手は赤・「復習」でその範囲だけ練習）</span></div>
        ${rows}
      </div>`;
    }

      function openPvPScreen() {
      document.getElementById('screen-menu').classList.add('hidden');
      document.getElementById('screen-pvp').classList.remove('hidden');
    }

      function showBattleScreen() {
      ['screen-menu','screen-boss-select','screen-library','screen-gacha','screen-pvp','result-screen'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.style.display = ''; }
      });
      var battleEl = document.getElementById('screen-battle');
      if (battleEl) {
        battleEl.classList.remove('hidden');
        battleEl.style.display = 'flex';
      }
      // 戦闘中はホーム背景を消す（戦闘画面が独自背景を持つため）
      var mainArea = document.getElementById('main-area');
      if (mainArea) mainArea.style.background = '';
      setTimeout(focusHiddenInput, 100);
    }

      function updateComboBadge() {
      const badge = document.getElementById('conbo-meter');
      const c = GameEngine.battle.currentCombo;
      if (c > 0) {
        badge.textContent = `${c} COMBO`;
        // コンボが伸びるほど熱い色に（10/20/30で段階変化）
        badge.style.background = c >= 30 ? 'linear-gradient(90deg,#ef4444,#f59e0b)'
                               : c >= 20 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                               : c >= 10 ? 'linear-gradient(90deg,#8b5cf6,#22d3ee)'
                               :           'linear-gradient(90deg,#06b6d4,#3b82f6)';
        badge.style.opacity = '1';
        badge.classList.remove('combo-bounce');
        void badge.offsetWidth;
        badge.classList.add('combo-bounce');
      } else {
        badge.style.opacity = '0';
      }
      updateComboBurstButton();
    }

    // ⑦ コンボ爆撃ボタン: スキル所持時のみ表示。5コンボ以上で有効化（押すと engine.comboBurst）。
    function updateComboBurstButton() {
      const btn = document.getElementById('combo-burst-btn');
      if (!btn) return;
      const has = Object.values(GameEngine.player.equipped).some(it => it && it.skill === 'コンボ爆撃');
      if (!has || !GameEngine.battle.active) { btn.classList.add('hidden'); return; }
      btn.classList.remove('hidden');
      const combo = GameEngine.battle.currentCombo || 0;
      const ready = combo >= 5;
      btn.disabled = !ready;
      btn.className = 'w-full mt-3 font-black py-2.5 rounded-xl text-sm transition-all active:scale-95 ' +
        (ready ? 'bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
               : 'bg-slate-800 text-slate-500 cursor-not-allowed');
      btn.textContent = ready ? `💥 コンボ爆撃！(${combo}) [Enter]` : `💥 コンボ爆撃 (あと${5 - combo})`;
    }

      function updateBattleUI() {
      if (!GameEngine.battle.active) return;
      updateComboBurstButton(); // ⑦ 爆撃ボタンの表示/有効状態を同期（戦闘開始時もここで出す）
      const stats = GameEngine.getEffectiveStats();
      
      document.getElementById('player-hp-text').textContent = `${Math.floor(GameEngine.battle.playerHp)} / ${GameEngine.battle.playerMaxHp}`;
      const _pPct = GameEngine.battle.playerHp / GameEngine.battle.playerMaxHp;
      const _pBar = document.getElementById('player-hp-bar');
      _pBar.style.width = `${_pPct * 100}%`;
      _pBar.style.background = _pPct < 0.3
        ? 'linear-gradient(90deg,#7f1d1d,#ef4444)'
        : _pPct < 0.6
        ? 'linear-gradient(90deg,#92400e,#fbbf24)'
        : 'linear-gradient(90deg,#059669,#34d399)';
      // HP低下時に画面を赤くビネット
      const _leftPanel = document.getElementById('battle-left-panel');
      if (_pPct < 0.3) {
        _leftPanel.style.boxShadow = 'inset 0 0 40px rgba(220,38,38,0.4)';
        _leftPanel.style.borderColor = 'rgba(220,38,38,0.6)';
      } else {
        _leftPanel.style.boxShadow = '';
        _leftPanel.style.borderColor = '';
      }
      
      document.getElementById('enemy-hp-text').textContent = `${Math.floor(GameEngine.battle.enemyHp)} / ${GameEngine.battle.enemyMaxHp}`;
      const _ePct = GameEngine.battle.enemyHp / GameEngine.battle.enemyMaxHp;
      const _eBar = document.getElementById('enemy-hp-bar');
      _eBar.style.width = `${_ePct * 100}%`;
      _eBar.style.background = _ePct < 0.3
        ? 'linear-gradient(90deg,#7f1d1d,#ef4444)'
        : _ePct < 0.6
        ? 'linear-gradient(90deg,#92400e,#fbbf24)'
        : 'linear-gradient(90deg,#dc2626,#f87171)';

      // 行動ゲージ（=敵の攻撃まで）。満タン近くで赤く点滅して「まもなく攻撃」を予告
      const _actG = GameEngine.battle.enemyActionGauge;
      const _aBar = document.getElementById('enemy-action-bar');
      const _aLbl = document.getElementById('enemy-action-label');
      const _aWrap = _aBar.parentElement;
      _aBar.style.width = `${_actG}%`;
      if (GameEngine.battle.enemyIsStunned) {
        _aLbl.textContent = '気絶中！'; _aLbl.className = 'text-amber-300';
        _aWrap.classList.remove('gauge-warn'); _aBar.style.background = '';
      } else if (_actG >= 80) {
        _aLbl.textContent = 'まもなく攻撃!'; _aLbl.className = 'text-rose-400 font-black';
        _aWrap.classList.add('gauge-warn'); _aBar.style.background = 'linear-gradient(90deg,#f43f5e,#fb7185)';
      } else {
        _aLbl.textContent = `${Math.floor(_actG)}%`; _aLbl.className = 'text-cyan-400';
        _aWrap.classList.remove('gauge-warn'); _aBar.style.background = '';
      }

      // 必殺ゲージ（=必殺技まで）。満タン近くで紫点滅で予告
      const _ultG = Math.min(100, GameEngine.battle.enemyUltGauge);
      const _uBar = document.getElementById('enemy-ultimate-bar');
      const _uLbl = document.getElementById('enemy-ultimate-label');
      const _uWrap = _uBar.parentElement;
      _uBar.style.width = `${_ultG}%`;
      if (_ultG >= 80) {
        _uLbl.textContent = 'まもなく必殺!'; _uLbl.className = 'text-fuchsia-300 font-black';
        _uWrap.classList.add('gauge-warn');
      } else {
        _uLbl.textContent = `${Math.floor(_ultG)}%`; _uLbl.className = 'text-purple-400';
        _uWrap.classList.remove('gauge-warn');
      }

      document.getElementById('typing-miss-gauge').textContent = GameEngine.battle.missCount;

      // コンボバフ: 自分HPのすぐ下に小さいアイコンで「乗っている」ことを示す（詳細は出さず軽く）
      const buffList = document.getElementById('combo-buff-list');
      if (GameEngine.battle.comboBuffs.length === 0) {
        buffList.innerHTML = '';
      } else {
        const totalBuff = Math.floor(GameEngine.battle.comboBuffs.reduce((s, b) => s + b.val, 0));
        buffList.innerHTML =
          `<span class="inline-flex items-center gap-0.5 bg-cyan-950/80 border border-cyan-700 text-cyan-300 text-[11px] font-black px-2 py-0.5 rounded-full" title="コンボ攻撃バフ発動中">`
          + `⚔️+${totalBuff}<span class="text-[9px] text-cyan-500/80 ml-0.5">x${GameEngine.battle.comboBuffs.length}</span></span>`;
      }

      const statsSummary = document.getElementById('battle-stats-summary');
      let activeBuffsSum = GameEngine.battle.comboBuffs.reduce((sum, b) => sum + b.val, 0);
      if (statsSummary) statsSummary.innerHTML = `
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

      function endBattle(isVictory) {
      GameEngine.battle.active = false;
      GameEngine.battle.paused = false; // ⏸ ポーズ状態を必ず解除（撤退や次戦で固まらないように）
      hidePauseScreen();
      clearInterval(GameEngine.battleInterval);

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

      if (GameEngine.battle.isEndgame) {
        // ── 裏ボス（専科の試練）──
        const boss = GameData.ENDGAME_BOSSES_DB.find(b => b.id === GameEngine.battle.bossId);
        if (isVictory) {
          const firstClear = GameEngine.player.defeatedEndgame.indexOf(boss.id) < 0;
          const _gm = GameEngine.getEffectiveStats().goldMul || 1.0;
          const goldReward = Math.floor(GameEngine.battle.enemyMaxHp * 3 * _gm);
          GameEngine.player.gold += goldReward;
          emoji.textContent = '👑';
          title.textContent = '試練突破！';
          earnedG.textContent = goldReward.toLocaleString();

          let buffMsg = '';
          let titleMsg = '';
          if (firstClear) {
            GameEngine.player.defeatedEndgame.push(boss.id);
            const r = boss.reward || {};
            buffMsg = `恒久バフ獲得: ATK+${Math.round((r.atk||0)*100)}% / HP+${Math.round((r.hp||0)*100)}% / DEF+${Math.round((r.def||0)*100)}% / 🪙+${Math.round((r.goldMul||0)*100)}%`;
            const t = GameData.TITLES_DB.find(t => t.unlock && t.unlock.type === 'endgame' && t.unlock.boss === boss.id);
            if (t) titleMsg = `称号「${t.name}」を獲得！`;
            banner.classList.add('hidden');
          } else {
            buffMsg = '（このボスの恒久バフは取得済み）';
          }
          detail.innerHTML = `
            撃破: <span class="text-pink-400 font-bold">${boss.name}</span><br>
            ${titleMsg ? '<span class="text-yellow-300 font-bold">'+titleMsg+'</span><br>' : ''}
            <span class="text-emerald-300">${buffMsg}</span>
          `;
        } else {
          emoji.textContent = '💀';
          title.textContent = '試練失敗...';
          earnedG.textContent = '0';
          detail.innerHTML = `裏ボスは桁違いの強さです。<br>レベルを下げる・装備とステータスを鍛えて再挑戦しましょう。`;
        }
        GameEngine.saveUserDataLocal();
        updateMenuUI();
        return;
      }

      if (GameEngine.battle.mode === 'boss') {
        const boss = GameData.BOSSES_DB.find(b => b.id === GameEngine.battle.bossId);
        if (isVictory) {
          emoji.textContent = '🏆';
          title.textContent = '討伐成功！';

          let goldReward = boss.hp * 5;

          // 🪙 ゴールド倍率（ステータス＋ボーナス枠＋錬金術師の欲望）を反映
          const _gm = GameEngine.getEffectiveStats().goldMul || 1.0;
          const finalGoldReward = Math.floor(goldReward * _gm);

          GameEngine.player.gold += finalGoldReward;
          
          // 撃破フラグ登録
          if (!GameEngine.player.defeatedBosses.includes(boss.id)) {
            GameEngine.player.defeatedBosses.push(boss.id);
          }

          earnedG.textContent = finalGoldReward.toLocaleString();
          detail.innerHTML = `
            撃破ボス: <span class="text-cyan-400 font-bold">${boss.name}</span><br>
            強敵との実践に勝利しました！<br>
            ゴールド倍率(+${Math.round((_gm - 1) * 100)}%) が適用されました。
          `;

          // 🏆 12体目完全撃破
          if (boss.id === 'b4_3' && !GameEngine.player.hasClearedOnce) {
            GameEngine.player.hasClearedOnce = true;
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
        earnedG.textContent = GameEngine.battle.goldEarnedInSession.toLocaleString();
        
        detail.innerHTML = `
          道場での特訓お疲れ様でした！<br>
          <span class="text-yellow-400 font-bold">獲得ゴールド: +${GameEngine.battle.goldEarnedInSession.toLocaleString()}G</span>
        `;
      }

      GameEngine.saveUserDataLocal();
    }

      function quitBattle() {
      endBattle(false);
    }

      function showDamagePopup(val, isCrit = false, isStunMsg = false) {
      const container = document.getElementById('damage-popup-container');
      const el = document.createElement('div');
      el.className = `absolute text-center select-none z-30 font-black tracking-wider damage-popup ${isCrit ? 'text-4xl' : 'text-2xl'}`;if(!isStunMsg){el.style.color=isCrit?'#fbbf24':'#f87171';if(isCrit)el.style.textShadow='0 0 10px #fbbf24';};
      if (isStunMsg) {
        el.className = 'absolute text-center select-none z-30 font-black tracking-wider damage-popup text-purple-400 text-xl';
        el.textContent = val;
      } else {
        el.textContent = `-${val}${isCrit ? ' CRITICAL!' : ''}`;
      }
      container.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }


  // 現在の出題が「タップで答える」ものか（選択式 or ボス必殺技クイズ）。
  //  スマホではこの瞬間に隠し入力欄へフォーカスせず、ソフトキーボードを出さない。
  function _isTapAnswerMoment() {
    var b = (typeof GameEngine !== 'undefined') && GameEngine.battle;
    if (!b) return false;
    if (b.quizActive) return true; // ボス必殺技クイズ（1〜4タップ）
    return !!(b.currentQuestion && b.currentQuestion.type === 'choice');
  }

  function focusHiddenInput() {
    var inp = document.getElementById('hidden-input');
    if (!inp) return;
    inp.value = '';
    // スマホの選択問題ではフォーカスを当てず、ソフトキーボードを抑止（回答はボタンのタップ）。
    if (IS_MOBILE && _isTapAnswerMoment()) { inp.blur(); return; }
    inp.focus();
  }
  // engine.js から resumeGame 後に入力欄へフォーカスを戻すためのブリッジ名
  function focusBattleInput() { focusHiddenInput(); }

  // ⏸ ポーズ画面の表示。engine.pauseGame から、今戦闘で稼いだコインと総コインを受け取る。
  function showPauseScreen(earnedThisBattle, totalGold) {
    var e = document.getElementById('pause-earned-gold');
    if (e) e.textContent = (earnedThisBattle || 0).toLocaleString();
    var t = document.getElementById('pause-total-gold');
    if (t) t.textContent = (totalGold || 0).toLocaleString();

    // 戦闘ステータス（実質攻撃力はコンボバフ込みで表示＝盛る楽しさ）
    var ps = document.getElementById('pause-stats');
    if (ps) {
      var s = GameEngine.getEffectiveStats();
      var buffSum = Math.floor((GameEngine.battle.comboBuffs || []).reduce(function(a, b){ return a + b.val; }, 0));
      var atkTotal = s.atk + buffSum;
      function row(label, val, hi) {
        return '<div class="flex justify-between"><span class="text-slate-400">' + label + '</span><span class="' + (hi ? 'text-cyan-300 font-bold' : 'text-white') + '">' + val + '</span></div>';
      }
      ps.innerHTML =
        row('⚔️ 実質攻撃力', s.atk.toLocaleString() + (buffSum > 0 ? ' <span class="text-cyan-400">+' + buffSum + '</span> = ' + atkTotal.toLocaleString() : ''), true) +
        row('❤️ 最大HP', s.hp.toLocaleString()) +
        row('🛡️ 防御力', s.def.toLocaleString()) +
        row('🔁 攻撃回数', s.atkCount + '回') +
        row('💥 クリティカル率', (s.critRate * 100).toFixed(0) + '%') +
        row('💚 コンボ回復量', '+' + s.cpRecover) +
        row('😵 スタン力', s.stanAtk.toFixed(1) + '秒') +
        row('🛡 スタン耐性', s.stanDef.toFixed(1) + '秒');
    }

    var ov = document.getElementById('pause-overlay');
    if (ov) { ov.classList.remove('hidden'); ov.classList.add('flex'); }
  }
  function hidePauseScreen() {
    var ov = document.getElementById('pause-overlay');
    if (ov) { ov.classList.add('hidden'); ov.classList.remove('flex'); }
  }

  // 正解/ミスの手応え: HUDパネルを一瞬光らせる（'correct' 緑 / 'miss' 赤）
  function flashPanel(kind) {
    var p = document.getElementById('hud-panel');
    if (!p) return;
    var cls = kind === 'miss' ? 'flash-miss' : 'flash-correct';
    p.classList.remove('flash-correct', 'flash-miss');
    void p.offsetWidth;
    p.classList.add(cls);
  }


  return {
    // 画面遷移
    showMenu, showBattleScreen,
    openBossSelection, openBossRangePopup, toggleBossRangeGenre, setBossRangeType, closeBossRangePopup, startBossFromRange,
    openEndgamePopup, closeEndgamePopup, startEndgameFromList,
    openOmegaPopup, closeOmegaPopup, setOmegaStatLevel, setOmegaAll, startOmega,
    openTitlePopup, closeTitlePopup, equipTitle, openAvatarPopup, closeAvatarPopup, equipAvatar,
    openGachaScreen, openLibraryScreen, renderLibraryTabs, renderLibraryContent,
    renderLibraryFilters, setLibSubject, toggleLibGenre, setLibType, challengeFromLibrary, reviewGenre,
    openPvPScreen,
    // メニューUI
    updateMenuUI,
    // 戦闘UI
    updateBattleUI, updateComboBadge, updateComboBurstButton, showDamagePopup, endBattle, quitBattle,
    showPauseScreen, hidePauseScreen, focusBattleInput, flashPanel,
    // ガチャ
    openGachaRateModal, closeGachaRateModal, showGachaResults, showGachaUntilResult,
    gachaCarouselPrev, gachaCarouselNext, gachaCarouselGo, renderGachaCarousel, renderGachaTools,
    setAutoSellRarity, pullUntilStatAction, closeGachaResultPopup,
    openBuildGuide, openEquipList, closeGuideModal,
    // 装備モーダル
    openEquipModal, closeEquipModal,
    upgradeEquipAction, transcendEquipAction, sellEquipAction, toggleEquipStateFromModal,
    // 道場ポップアップ
    openDojoPopup, closeDojoPopup, enterDojoFromPopup,
    selectDojoPopupDifficulty, updateDojoPopupLevel, updateDojoLevelUI,
    renderDojoPopupFilters, setDojoSubject, toggleDojoGenre, setDojoType,
    // 出題範囲フルウィンドウ（道場・難易度複数選択）
    openRangeWindow, closeRangeWindow, toggleRangeDiff, toggleRangeGenre, setRangeType, toggleRangeGrade,
    // 学年: 設定モーダル・警告ポップ・メニュー表示
    openGradeModal, closeGradeModal, setPlayerGradeFromModal, renderPlayerGradeLabel,
    closeGradeWarn, challengeKeepingOverGrade, challengeRemovingOverGrade,
    // ステータスポップアップ
    openStatPopup, closeStatPopup, renderStatList,
    openRankModal, closeRankModal, useDojoRecommendedLevel,
    openRerollModal, closeRerollModal, toggleRerollLock, confirmReroll,
    useGachaGold10, openURPicker, closeURPicker, pickUR,
    openWelcomeModal, closeWelcomeModal, startTutorialDojo, applyProgressiveDisclosure,
    openSaveLoadModal, closeSaveLoadModal, copySaveCode, loadSaveCode,
    // インベントリ
    openInventoryPopup, closeInventoryPopup, renderEquippedSlots, renderInventoryGrid, autoEquipBest,
    // ユーティリティ
    playSound, focusHiddenInput, spawnParticles,
  };
})();
