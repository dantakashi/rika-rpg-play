/* ============================================================
   story.js — ストーリーモード（先取り学習）β / ノベルゲーム版
   方針(オーナー確定 2026-06-16): 物語性は薄く・オムニバス・1話だけ史実(or日常)フック→授業・
     ナビ「リカ」・ふりがな・音声読み上げ・報酬なし・パスワード(rikarika)で限定公開。
     ノベルゲームのようにオートで文字が流れる。史実が無理な単元は「日常の課題解決」版で。
     立ち絵/概念図は生成画像の仮置き(assets/story/)。中身は Try IT を参考に必要最低限・段階的に。
   作法: data/engine/ui の後にロードする自己完結IIFE。engine/ui/data は一切変更しない。
     状態は localStorage のみ(rika_story_unlock / _ruby / _auto)。GameUI は関数内からのみ呼ぶ(全読込後=安全)。
   ============================================================ */
const StoryUI = (function () {
  const UNLOCK_KEY = 'rika_story_unlock', RUBY_KEY = 'rika_story_ruby', AUTO_KEY = 'rika_story_auto', PASS = 'rikarika';
  const CHAR_MS = 34;      // 1文字あたりの送り速度(ms)
  const AUTO_PAUSE = 1500; // 文章を出し終えてから自動で次へ行くまでの待ち(ms)

  // ── エピソード(オムニバス) ──
  //  panel: {body(html・<ruby>可), fig?(概念図キー)}  /  {quiz:{q, choices[], a, desc}}
  //  立ち絵リカは常設(assets/story/rika.png)。fig は assets/story/<fig>.png（白カードで表示・無ければ非表示）。
  const EPISODES = [
    { id: 'chem_formula', kind: '史実', icon: '⚗️', title: '化学のはじまり', subtitle: '原子 → 分子 → 化学式（史実から入る話）',
      panels: [
        { body: 'こんにちは！理科の<ruby>精霊<rt>せいれい</rt></ruby>リカだよ。きょうは、学校でならう<b>ちょっと先</b>をのぞいてみよう。テーマは「<b>もののもと</b>」。すべてのものは、何からできていると思う？' },
        { body: '2000年もむかし、ギリシャのデモクリトスという人が<b>想像</b>したんだ。「ものを切って切って、もう切れない<ruby>粒<rt>つぶ</rt></ruby>があるはず」って。だれにも分からなかったけど…ずっとあとの科学者が<b>実験でたしかめた</b>。' },
        { fig: 'fig_atoms', body: 'それが<b>原子</b>。これ以上分けられない、いちばん小さな粒だよ。<br><b>ポイント①</b>：原子は、化学変化が起きても<b>消えたり・生まれたり・種類が変わったり しない</b>。' },
        { body: '原子には、いろんな<ruby>種類<rt>しゅるい</rt></ruby>がある。その種類のことを<b>元素</b>というよ。<br><b>ポイント②</b>：元素は、アルファベット1〜2文字の<b>元素記号</b>で書く。<ruby>水素<rt>すいそ</rt></ruby>は <b>H</b>、<ruby>酸素<rt>さんそ</rt></ruby>は <b>O</b>、<ruby>炭素<rt>たんそ</rt></ruby>は <b>C</b>。' },
        { quiz: { q: 'クイズ：水素の元素記号はどれ？', choices: ['H', 'O', 'C', 'S'], a: 0, desc: '水素は <b>H</b>（ハイドロジェン）だよ。O は酸素、C は炭素。元素記号は、その原子の“あだ名”みたいなもの。' } },
        { fig: 'fig_water', body: 'つぎは、原子の<b>くっつき方</b>。原子は<b>きまった数で</b>結びつくんだ。水なら「水素2つ＋酸素1つ」。この、いちばん小さなまとまりを<b>分子</b>というよ。' },
        { fig: 'fig_water', body: '<b>ポイント③</b>：その分子を、元素記号と数で書いたものが<b>化学式</b>。水は… <b>H₂O</b>。小さな「2」は「<b>水素の原子が2個</b>」というしるし。（道場で打つときは <b>H2O</b> と書くよ）' },
        { quiz: { q: 'クイズ：水を表す化学式はどれ？（予想でOK！）', choices: ['H₂O', 'HO', 'H₂O₂', 'H₃O'], a: 0, desc: '答えは <b>H₂O</b>。水素2つ＋酸素1つだね。「HO」は数が足りない。「H₂O₂」は酸素が1つ多い<b>別の物質</b>（オキシドール）だよ。' } },
        { body: 'まとめ！<b>原子</b>（最小の粒）→ <b>分子</b>（きまった数のまとまり）→ <b>化学式</b>（記号と数で書く）。この流れがわかれば、化学はぐっと楽になるよ。学校で習ったら、<b>道場</b>でおさらいしてね！' }
      ]
    },
    { id: 'daily_condense', kind: '日常', icon: '🥤', title: '身のまわりのふしぎ', subtitle: 'つめたいコップの水てき（日常の課題から入る話）',
      panels: [
        { body: 'リカだよ。きょうは、身のまわりの<b>ふしぎ</b>を理科で解いてみよう。夏、つめたいジュースのコップ。<b>外がわ</b>に水てきがつくの、見たことない？あれ、どこから来たんだろう？' },
        { quiz: { q: '予想クイズ：コップの外がわの水てきは、どこから来た？', choices: ['コップからしみ出た', '空気の中の水', '氷がとけて外に出た', 'まほう'], a: 1, desc: 'ナイス予想！じつは<b>空気の中の水</b>なんだ。次のコマでしくみを見てみよう。（予想は外れてもOK！）' } },
        { body: 'じつは空気の中には、目に見えない水がいる。<b>水蒸気（気体の水）</b>だよ。ふだんは見えないけど、たしかにそこにあるんだ。' },
        { body: 'つめたいコップにふれると、水蒸気が<b>ひやされて</b>、目に見える<b>水（液体）</b>にもどる。これが水てきの正体！このしくみを<b>結露（けつろ）</b>というよ。' },
        { body: '<b>ポイント</b>：水は、温度ですがたを変える。<b>固体（氷）⇄ 液体（水）⇄ 気体（水蒸気）</b>。いったり来たりするんだ。これを<b>状態変化</b>というよ。' },
        { quiz: { q: 'クイズ：コップの水てきは、もとは何だった？', choices: ['空気中の水蒸気', 'コップの中の氷', 'こぼれたジュース', '雨'], a: 0, desc: '答えは<b>空気中の水蒸気</b>。冷やされて液体の水（＝結露）になったんだね。' } },
        { body: '身のまわりのふしぎも、理科で説明できる。学校で「<b>状態変化</b>」を習ったら、道場でおさらいしてね。またのぞきに来てね！' }
      ]
    }
  ];

  let epIdx = -1;   // 現在のエピソード(-1=選択画面)
  let idx = 0;      // 現在のコマ
  let answered = false;
  // タイプライタ状態
  let tokens = [], shown = '', revealIdx = 0, typing = false;
  let typingTimer = null, autoTimer = null;

  const el = id => document.getElementById(id);
  function isUnlocked() { try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; } }
  function rubyOn() { try { return localStorage.getItem(RUBY_KEY) !== '0'; } catch (e) { return true; } } // 既定ON
  function autoOn() { try { return localStorage.getItem(AUTO_KEY) !== '0'; } catch (e) { return true; } } // 既定ON
  function clearTimers() { if (typingTimer) clearTimeout(typingTimer); if (autoTimer) clearTimeout(autoTimer); typingTimer = autoTimer = null; stopTTS(); }

  function open() {
    const scr = el('screen-story'); if (!scr) return;
    scr.classList.remove('hidden');
    if (!isUnlocked()) { renderGate(); return; }
    epIdx = -1; renderSelect();
  }
  function close() { clearTimers(); const scr = el('screen-story'); if (scr) scr.classList.add('hidden'); if (window.GameUI && GameUI.showMenu) GameUI.showMenu(); }

  // ── パスワード（あいことば）──
  function renderGate() {
    el('screen-story').innerHTML = `<div class="flex-1 flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-cyan-700/60 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div class="text-4xl mb-2">🔒</div>
        <h3 class="text-white font-black text-base mb-1">ストーリー（先取り授業）βテスト</h3>
        <p class="text-[11px] text-slate-400 mb-4">先生からもらった<b>あいことば</b>を入れてね。</p>
        <input id="story-pass" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"
          class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-white text-lg tracking-widest mb-1" placeholder="あいことば">
        <div id="story-pass-msg" class="text-[11px] text-rose-400 h-4 mb-2"></div>
        <button onclick="StoryUI.submitPass()" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl text-sm active:scale-95">はいる</button>
        <button onclick="StoryUI.close()" class="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs">もどる</button>
      </div></div>`;
    const inp = el('story-pass'); if (inp) { inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') submitPass(); }; }
  }
  function submitPass() {
    const v = ((el('story-pass') || {}).value || '').trim().toLowerCase();
    if (v === PASS) { try { localStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {} epIdx = -1; renderSelect(); }
    else { const m = el('story-pass-msg'); if (m) m.textContent = 'あいことばが ちがうみたい。'; }
  }

  // ── エピソード選択（オムニバス）──
  function renderSelect() {
    clearTimers();
    const cards = EPISODES.map((ep, i) => `
      <button onclick="StoryUI.start(${i})" class="w-full text-left bg-slate-900 hover:bg-slate-800 border border-cyan-800/50 rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-95">
        <span class="text-4xl shrink-0">${ep.icon}</span>
        <div class="min-w-0">
          <div class="text-white font-black text-sm">第${i + 1}話　${ep.title} <span class="text-[9px] bg-cyan-300/20 text-cyan-200 px-1.5 py-0.5 rounded">${ep.kind}</span></div>
          <div class="text-[11px] text-slate-400 mt-0.5">${ep.subtitle}</div>
        </div>
        <span class="ml-auto text-cyan-400 text-xl shrink-0">▶</span>
      </button>`).join('');
    el('screen-story').innerHTML = `
      <div class="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <h3 class="text-cyan-200 font-black text-base">📖 ストーリー（先取り授業）<span class="text-[10px] text-slate-500">β</span></h3>
        <button onclick="StoryUI.close()" class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-300 text-sm font-bold">✕ とじる</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <p class="text-[11px] text-slate-400 mb-3 leading-relaxed">学校でまだ習っていないことを、リカと<b>先取り</b>できるよ。1話 約5分。まちがえても<b>へらない・しかられない</b>から、気らくにどうぞ。</p>
        <div class="flex flex-col gap-3 max-w-lg mx-auto">${cards}</div>
      </div>`;
  }
  function start(i) { epIdx = i; idx = 0; render(); }

  // ── タイプライタ ──
  // body(html) を「ルビ/タグ=即時」「文字=1つずつ」に分けて流す
  function tokenize(html) {
    const out = []; let i = 0;
    while (i < html.length) {
      if (html[i] === '<') {
        if (html.substr(i, 5) === '<ruby') { const e = html.indexOf('</ruby>', i); if (e >= 0) { out.push({ t: 'h', s: html.slice(i, e + 7) }); i = e + 7; continue; } }
        const gt = html.indexOf('>', i); if (gt >= 0) { out.push({ t: 'h', s: html.slice(i, gt + 1) }); i = gt + 1; continue; }
      }
      out.push({ t: 'c', s: html[i] }); i++;
    }
    return out;
  }
  function typeStep() {
    while (revealIdx < tokens.length) { const tk = tokens[revealIdx]; shown += tk.s; revealIdx++; if (tk.t === 'c') break; }
    const t = el('story-text'); if (t) t.innerHTML = shown;
    if (revealIdx < tokens.length) { typingTimer = setTimeout(typeStep, CHAR_MS); }
    else { onTypeDone(); }
  }
  function finishTyping() { if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; } shown = tokens.map(k => k.s).join(''); revealIdx = tokens.length; const t = el('story-text'); if (t) t.innerHTML = shown; onTypeDone(); }
  function onTypeDone() {
    typing = false;
    const ctc = el('story-ctc'); if (ctc) ctc.classList.remove('hidden');
    const ep = EPISODES[epIdx];
    if (autoOn() && idx < ep.panels.length - 1) { autoTimer = setTimeout(() => next(), AUTO_PAUSE); }
  }

  // ── 描画 ──
  function render() {
    clearTimers(); answered = false; typing = false;
    const ep = EPISODES[epIdx], p = ep.panels[idx], total = ep.panels.length;
    const dots = ep.panels.map((_, i) => `<span class="inline-block w-2 h-2 rounded-full ${i <= idx ? 'bg-cyan-400' : 'bg-slate-600'}"></span>`).join('');
    const rubyClass = rubyOn() ? '' : 'ruby-off';
    const figHtml = (!p.quiz && p.fig) ? `<div class="absolute top-4 right-3 sm:right-10 bg-white/95 rounded-2xl p-2 shadow-xl border border-cyan-200/40">
        <img src="assets/story/${p.fig}.png" class="w-24 sm:w-36 h-24 sm:h-36 object-contain rounded-xl" onerror="this.parentNode.style.display='none'"></div>` : '';
    let boxHtml;
    if (p.quiz) {
      boxHtml = `<div class="text-amber-300 text-xs sm:text-sm font-bold mb-2">❓ ${p.quiz.q}</div>
        <div id="story-choices" class="grid grid-cols-1 sm:grid-cols-2 gap-2">` +
        p.quiz.choices.map((c, i) => `<button onclick="StoryUI.answer(${i})" class="story-choice bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-2.5 px-3 rounded-xl text-base text-left transition-all active:scale-95">${c}</button>`).join('') +
        `</div><div id="story-explain" class="hidden mt-3 text-[13px] text-slate-200 bg-slate-900/70 rounded-lg p-3 leading-relaxed border border-slate-700"></div>`;
    } else {
      boxHtml = `<div id="story-text" class="text-base sm:text-lg leading-relaxed text-slate-100" style="min-height:3.2em"></div>
        <div id="story-ctc" class="hidden text-right text-cyan-300 text-lg animate-bounce -mb-1">▼</div>`;
    }
    el('screen-story').innerHTML = `
      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button onclick="StoryUI.toSelect()" class="text-slate-400 hover:text-white text-sm shrink-0">≡</button>
          <span class="text-[11px] font-black text-cyan-300 truncate">${ep.title}</span>
          <span class="flex gap-1 shrink-0">${dots}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button id="story-auto" onclick="StoryUI.toggleAuto()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold" title="オート">${autoOn() ? '▶auto' : '⏸auto'}</button>
          <button onclick="StoryUI.speak()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold" title="読み上げ">🔊</button>
          <button onclick="StoryUI.toggleRuby()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold" title="ふりがな">ふ</button>
          <button onclick="StoryUI.close()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-300 text-base leading-none">✕</button>
        </div>
      </div>
      <div class="flex-1 relative overflow-hidden">
        ${figHtml}
        <img src="assets/story/rika.png" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 max-h-[60%] h-auto object-contain drop-shadow-2xl select-none pointer-events-none"
          onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'absolute bottom-1/3 left-1/2 -translate-x-1/2 text-8xl',textContent:'🧚'}))">
        <div ${p.quiz ? '' : 'onclick="StoryUI.tap()"'} class="absolute bottom-2 left-0 right-0 px-3 ${p.quiz ? '' : 'cursor-pointer'}">
          <div class="bg-slate-900/95 border border-cyan-700/50 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-2xl mx-auto ${rubyClass}" id="story-box">
            <div class="inline-block -mt-7 mb-1 px-3 py-1 rounded-full bg-cyan-700 text-white text-xs font-black shadow">リカ</div>
            ${boxHtml}
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-t border-slate-800 shrink-0">
        <button onclick="StoryUI.back()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold active:scale-95">◀ もどる</button>
        <span class="text-[11px] text-slate-500">${idx + 1} / ${total}</span>
        <button id="story-next" onclick="StoryUI.next()" class="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black active:scale-95 ${p.quiz && !answered ? 'opacity-40 pointer-events-none' : ''}">${idx === total - 1 ? 'おわる' : 'つぎへ ▶'}</button>
      </div>`;
    if (!p.quiz) { tokens = tokenize(p.body); shown = ''; revealIdx = 0; typing = true; typeStep(); }
  }

  function tap() { if (typing) finishTyping(); else next(); }       // 文章ボックスのタップ＝飛ばす or 次へ
  function next() {
    clearTimers();
    const ep = EPISODES[epIdx], p = ep.panels[idx];
    if (p.quiz && !answered) return;
    if (idx >= ep.panels.length - 1) { renderSelect(); return; } // 最後＝エピソード一覧へ戻る
    idx++; render();
  }
  function back() { clearTimers(); if (idx > 0) { idx--; render(); } else renderSelect(); }
  function toSelect() { renderSelect(); }
  function answer(i) {
    if (answered) return; answered = true;
    const p = EPISODES[epIdx].panels[idx].quiz;
    document.querySelectorAll('#story-choices .story-choice').forEach((b, bi) => {
      if (bi === p.a) { b.className = 'story-choice bg-emerald-700 border border-emerald-400 text-white font-bold py-2.5 px-3 rounded-xl text-base text-left'; b.innerHTML = '✓ ' + p.choices[bi]; }
      else if (bi === i) { b.className = 'story-choice bg-rose-800 border border-rose-400 text-white font-bold py-2.5 px-3 rounded-xl text-base text-left'; }
      else { b.className = 'story-choice bg-slate-800 border border-slate-700 text-slate-400 font-bold py-2.5 px-3 rounded-xl text-base text-left'; }
      b.onclick = null;
    });
    // ネガティブFBゼロ: 正誤に関わらず解説を開き「つぎへ」を有効化（正解するまで再入力はしない）
    const ex = el('story-explain'); if (ex) { ex.classList.remove('hidden'); ex.innerHTML = '💡 ' + p.desc; }
    const nx = el('story-next'); if (nx) nx.classList.remove('opacity-40', 'pointer-events-none');
  }

  // ── トグル ──
  function toggleRuby() { try { localStorage.setItem(RUBY_KEY, rubyOn() ? '0' : '1'); } catch (e) {} const box = el('story-box'); if (box) box.classList.toggle('ruby-off'); }
  function toggleAuto() {
    const now = !autoOn(); try { localStorage.setItem(AUTO_KEY, now ? '1' : '0'); } catch (e) {}
    const btn = el('story-auto'); if (btn) btn.textContent = now ? '▶auto' : '⏸auto';
    if (now) { if (!typing) onTypeDone(); } else { if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; } }
  }
  // ── 音声読み上げ(Web Speech API・端末TTS・無料) ──
  function rubyStrip(html) { return html.replace(/<rt>.*?<\/rt>/g, '').replace(/<br\s*\/?>/g, '。').replace(/<\/?[^>]+>/g, ''); }
  function stopTTS() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
  function speak() {
    if (!window.speechSynthesis) return; stopTTS();
    const p = EPISODES[epIdx].panels[idx];
    const txt = p.quiz ? (p.quiz.q + '。' + p.quiz.choices.join('、')) : rubyStrip(p.body);
    try { const u = new SpeechSynthesisUtterance(txt); u.lang = 'ja-JP'; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {}
  }

  return { open, close, submitPass, start, toSelect, tap, next, back, answer, toggleRuby, toggleAuto, speak };
})();
