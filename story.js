/* ============================================================
   story.js — ストーリーモード（先取り学習）MVP / βテスト
   方針(オーナー確定 2026-06-16): 物語性は薄く・オムニバス・1話だけ史実フック→授業・
     ナビ「リカ」・ふりがな・音声読み上げ(Web Speech)・報酬なし・パスワード(rikarika)で限定公開。
   作法: data/engine/ui の後にロードする自己完結IIFE。engine/ui/data は一切変更しない。
     状態は localStorage のみ（rika_story_unlock / rika_story_ruby）。関数内からのみ GameUI を呼ぶ(全読込後=安全)。
   ============================================================ */
const StoryUI = (function () {
  const UNLOCK_KEY = 'rika_story_unlock', RUBY_KEY = 'rika_story_ruby', PASS = 'rikarika';

  // ── 単元データ（MVP=化学「原子→分子→化学式」）──
  //  panel: {speaker, portrait(絵文字), body(html・<ruby>可)}  /  {quiz:{q, choices[], a, desc}}
  //  教師レビュー: 原子→分子→化学式 の順で概念を踏む。歴史は1コマだけのつかみ(想像→確かめた)。
  const UNIT = {
    id: 'chem_formula', title: '化学のはじまり：原子から化学式へ',
    panels: [
      { speaker: 'リカ', portrait: '🧪', body: 'こんにちは！わたしは<ruby>精霊<rt>せいれい</rt></ruby>のリカ。学校で習う<b>ちょっと先</b>を、いっしょにのぞいてみよう。きょうは「もののもと」のお話だよ。' },
      { speaker: 'リカ', portrait: '📜', body: '2000年もむかし、ギリシャのデモクリトスという人が<b>想像</b>したんだ。「ものを切って切って、もう切れない<ruby>粒<rt>つぶ</rt></ruby>があるはず」って。だれにも分からなかったけど…ずっとあとの科学者が<b>実験でたしかめた</b>。それが<b>原子</b>だよ。' },
      { speaker: 'リカ', portrait: '⚛️', body: '世界のものは、ぜんぶこの小さな<b>原子</b>でできてる。水も、空気も、キミの体も。原子にはいろんな<ruby>種類<rt>しゅるい</rt></ruby>があって、<ruby>水素<rt>すいそ</rt></ruby>・<ruby>酸素<rt>さんそ</rt></ruby>・<ruby>炭素<rt>たんそ</rt></ruby>…。これが<b>元素</b>の正体だよ。' },
      { speaker: 'リカ', portrait: '💧', body: 'すごいのはここから。原子は<b>きまった数で</b>くっつくんだ。水なら「水素2つ＋酸素1つ」。この、いちばん小さなまとまりを<b>分子</b>っていうよ。だから水はいつも同じ「水の分子」になるんだ。' },
      { quiz: { q: 'では、水の分子を表す「化学式」はどれ？（習いたてだけど予想でOK！）', choices: ['H₂O', 'HO', 'H₂O₂', 'H₃O'], a: 0, desc: '水素2つ＋酸素1つだから <b>H₂O</b>。小さな「2」は「水素の原子が2個」というしるしだよ。「HO」だと数が足りないし、「H₂O₂」は酸素が1つ多い<b>別の物質</b>（オキシドール）なんだ。' } },
      { speaker: 'リカ', portrait: '✨', body: '答えは<b>H₂O</b>！原子の<ruby>記号<rt>きごう</rt></ruby>と数で「どの原子がいくつか」を書いたものが<b>化学式</b>。じつは暗号じゃなくて、原子の数を書いただけなんだ。（道場で打つときは <b>H2O</b> のように書くよ）' },
      { speaker: 'リカ', portrait: '🎓', body: 'おつかれさま！きょうの先取りはここまで。学校で「原子・分子・化学式」を習ったら、<b>道場</b>でおさらいすると一気に強くなるよ。またのぞきに来てね！' }
    ]
  };

  let idx = 0;          // 現在のコマ
  let answered = false; // クイズ回答済みか
  const el = id => document.getElementById(id);
  function isUnlocked() { try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; } }
  function rubyOn() { try { return localStorage.getItem(RUBY_KEY) !== '0'; } catch (e) { return true; } } // 既定ON

  function open() {
    const scr = el('screen-story'); if (!scr) return;
    scr.classList.remove('hidden');
    if (isUnlocked()) { idx = 0; render(); } else { renderGate(); }
  }
  function close() {
    stopTTS();
    const scr = el('screen-story'); if (scr) scr.classList.add('hidden');
    if (window.GameUI && GameUI.showMenu) GameUI.showMenu();
  }

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
    const inp = el('story-pass');
    if (inp) { inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') submitPass(); }; }
  }
  function submitPass() {
    const v = ((el('story-pass') || {}).value || '').trim().toLowerCase();
    if (v === PASS) { try { localStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {} idx = 0; render(); }
    else { const m = el('story-pass-msg'); if (m) m.textContent = 'あいことばが ちがうみたい。'; }
  }

  // ── 紙芝居描画 ──
  function rubyStrip(html) { return html.replace(/<rt>.*?<\/rt>/g, '').replace(/<\/?[^>]+>/g, ''); } // 音声読み上げ用に素テキスト化
  function render() {
    stopTTS(); answered = false;
    const p = UNIT.panels[idx], total = UNIT.panels.length;
    const dots = UNIT.panels.map((_, i) => `<span class="inline-block w-2 h-2 rounded-full ${i <= idx ? 'bg-cyan-400' : 'bg-slate-600'}"></span>`).join('');
    const rubyClass = rubyOn() ? '' : 'ruby-off';
    let bodyHtml;
    if (p.quiz) {
      bodyHtml = `<div class="text-amber-300 text-xs font-bold mb-2">❓ ${p.quiz.q}</div>
        <div id="story-choices" class="grid grid-cols-1 sm:grid-cols-2 gap-2">` +
        p.quiz.choices.map((c, i) => `<button onclick="StoryUI.answer(${i})" class="story-choice bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-2.5 px-3 rounded-xl text-base text-left transition-all active:scale-95">${c}</button>`).join('') +
        `</div><div id="story-explain" class="hidden mt-3 text-[13px] text-slate-200 bg-slate-900/70 rounded-lg p-3 leading-relaxed border border-slate-700"></div>`;
    } else {
      bodyHtml = `<div class="text-base sm:text-lg leading-relaxed text-slate-100" style="max-width:26em">${p.body}</div>`;
    }
    el('screen-story').innerHTML = `
      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-[11px] font-black text-cyan-300 truncate">${UNIT.title}</span>
          <span class="flex gap-1 shrink-0">${dots}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="StoryUI.speak()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold" title="読み上げ">🔊</button>
          <button onclick="StoryUI.toggleRuby()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold" title="ふりがな ${rubyOn() ? 'OFF' : 'ON'}">ふ</button>
          <button onclick="StoryUI.close()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-300 text-base leading-none">✕</button>
        </div>
      </div>
      <div class="flex-1 relative overflow-y-auto flex items-end justify-center">
        <div class="absolute top-3 left-1/2 -translate-x-1/2 text-[4.5rem] sm:text-[7rem] select-none pointer-events-none">${p.portrait || '🧪'}</div>
        <div class="relative z-10 w-full max-w-2xl mx-auto mb-3 px-3">
          <div class="bg-slate-900/95 border border-cyan-700/50 rounded-2xl shadow-2xl p-4 sm:p-5">
            ${p.speaker ? `<div class="inline-block -mt-7 mb-1 px-3 py-1 rounded-full bg-cyan-700 text-white text-xs font-black shadow">${p.speaker}</div>` : ''}
            <div id="story-body" class="${rubyClass}">${bodyHtml}</div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-t border-slate-800 shrink-0">
        <button onclick="StoryUI.back()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold active:scale-95 ${idx === 0 ? 'opacity-40 pointer-events-none' : ''}">◀ もどる</button>
        <span class="text-[11px] text-slate-500">${idx + 1} / ${total}</span>
        <button id="story-next" onclick="StoryUI.next()" class="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black active:scale-95 ${p.quiz && !answered ? 'opacity-40 pointer-events-none' : ''}">${idx === total - 1 ? 'おわる' : 'つぎへ ▶'}</button>
      </div>`;
  }
  function next() {
    const total = UNIT.panels.length, p = UNIT.panels[idx];
    if (p.quiz && !answered) return;     // クイズ未回答は進めない
    if (idx >= total - 1) { close(); return; }
    idx++; render();
  }
  function back() { if (idx > 0) { idx--; render(); } }
  function answer(i) {
    if (answered) return; answered = true;
    const p = UNIT.panels[idx].quiz;
    const btns = document.querySelectorAll('#story-choices .story-choice');
    btns.forEach((b, bi) => {
      if (bi === p.a) { b.className = 'story-choice bg-emerald-700 border border-emerald-400 text-white font-bold py-2.5 px-3 rounded-xl text-base text-left'; b.innerHTML = '✓ ' + p.choices[bi]; }
      else if (bi === i) { b.className = 'story-choice bg-rose-800 border border-rose-400 text-white font-bold py-2.5 px-3 rounded-xl text-base text-left'; }
      else { b.className = 'story-choice bg-slate-800 border border-slate-700 text-slate-400 font-bold py-2.5 px-3 rounded-xl text-base text-left'; }
      b.onclick = null;
    });
    // ネガティブFBゼロ: 正誤に関わらず解説を開き「つぎへ」を有効化（正解するまで再入力はしない）
    const ex = el('story-explain'); if (ex) { ex.classList.remove('hidden'); ex.innerHTML = '💡 ' + p.desc; }
    const nx = el('story-next'); if (nx) nx.classList.remove('opacity-40', 'pointer-events-none');
  }
  // ── ふりがな ──
  function toggleRuby() { try { localStorage.setItem(RUBY_KEY, rubyOn() ? '0' : '1'); } catch (e) {} render(); }
  // ── 音声読み上げ（Web Speech API・端末TTS・無料）──
  function stopTTS() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
  function speak() {
    if (!window.speechSynthesis) return;
    stopTTS();
    const p = UNIT.panels[idx];
    const txt = p.quiz ? (p.quiz.q + '。' + p.quiz.choices.join('、')) : rubyStrip(p.body);
    try { const u = new SpeechSynthesisUtterance(txt); u.lang = 'ja-JP'; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {}
  }

  return { open, close, submitPass, next, back, answer, toggleRuby, speak };
})();
