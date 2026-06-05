/* =====================================================================
 *  mathbank.js — 数学バカゲー共通「問題自販機」
 *  役割: どのゲームからでも MathBank.next({genres, level}) を呼ぶと
 *        2択問題を1問返す。問題の“正しさ”はこのファイルが保証する。
 *  返り値: { q, choices:[s0,s1], answer, vals:[n0,n1], genre, level }
 *    q       … 表示する問題文（例: "7×8 と 50、大きいのは？"）
 *    choices … 2つのボタン表示（例: ["7×8","50"]）
 *    answer  … 正解の選択肢インデックス(0/1)
 *    vals    … 各選択肢の数値（検算・自己テスト用）
 *  ゲーム側は演出に集中できる。問題は乱数で無限生成（手書きしない）。
 *
 *  §0 ユーティリティ
 *  §1 ジャンル別ジェネレータ（compare=A大小 …今後 parity/round/inverse を追加）
 *  §2 公開API（next / selfCheck）
 * ===================================================================== */
const MathBank = (function () {

  // ---- §0 ユーティリティ -------------------------------------------
  const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rnd(0, arr.length - 1)];

  // 2つの数値から「大きいのはどっち？」問題を組み立てる共通ヘルパ。
  // 同値は呼び出し側で除外済みの前提（answer が一意になる）。
  function buildCompare(leftStr, leftVal, rightStr, rightVal) {
    const answer = leftVal > rightVal ? 0 : 1;
    return {
      q: `${leftStr} と ${rightStr}、大きいのは？`,
      choices: [leftStr, rightStr],
      answer,
      vals: [leftVal, rightVal],
      genre: 'compare',
    };
  }

  // ---- §1 ジャンル別ジェネレータ -----------------------------------

  // A. 大小（compare）: レベルに応じて見せ方を変える。
  //   答えは必ず「式を計算した値」で決まる＝計算前にざっくり当てる力＝数感覚。
  function genCompare(level) {
    level = level || 1;
    // レベルごとに使えるサブタイプを広げる
    const types = level <= 1 ? ['num', 'mult-round']
                : level <= 2 ? ['mult-round', 'add-num', 'sub-num']
                : level <= 3 ? ['mult-round', 'mult-mult', 'add-num']
                :              ['mult-round', 'mult-mult', 'big-num'];

    for (let tries = 0; tries < 20; tries++) {
      const t = pick(types);
      let L, Lv, R, Rv;

      if (t === 'num') {                       // 素の2数（2桁同士）
        Lv = rnd(11, 99); Rv = rnd(11, 99);
        L = `${Lv}`; R = `${Rv}`;
      } else if (t === 'mult-round') {         // a×b と キリ数
        const a = rnd(3, 12), b = rnd(3, 12);
        Lv = a * b; L = `${a}×${b}`;
        const base = Math.round(Lv / 10) * 10; // 近いキリ数
        Rv = base + pick([-10, 10, 0]) || base;
        if (Rv <= 0) Rv = base + 10;
        R = `${Rv}`;
      } else if (t === 'mult-mult') {          // a×b と c×d
        const a = rnd(3, 12), b = rnd(3, 12), c = rnd(3, 12), d = rnd(3, 12);
        Lv = a * b; Rv = c * d; L = `${a}×${b}`; R = `${c}×${d}`;
      } else if (t === 'add-num') {            // a+b と c
        const a = rnd(15, 80), b = rnd(15, 80);
        Lv = a + b; L = `${a}+${b}`;
        Rv = Lv + pick([-12, -8, 8, 12]); R = `${Rv}`;
      } else if (t === 'sub-num') {            // a−b と c
        const a = rnd(40, 99), b = rnd(5, 35);
        Lv = a - b; L = `${a}−${b}`;
        Rv = Lv + pick([-9, -6, 6, 9]); R = `${Rv}`;
      } else {                                  // big-num: 3〜4桁の素の大小
        Lv = rnd(100, 9999); Rv = rnd(100, 9999);
        L = `${Lv}`; R = `${Rv}`;
      }

      if (Lv !== Rv) return buildCompare(L, Lv, R, Rv); // 同値は捨てて引き直す
    }
    // 保険（理論上ほぼ来ない）
    return buildCompare('5', 5, '3', 3);
  }

  const GENERATORS = {
    compare: genCompare,
    // parity: genParity,  round: genRound,  inverse: genInverse,  ← 今後追加
  };

  // ---- §2 公開API --------------------------------------------------

  // 1問もらう。genres から1つ選び、そのジャンルの問題を返す。
  function next(opts) {
    opts = opts || {};
    const genres = (opts.genres && opts.genres.length) ? opts.genres : ['compare'];
    const g = pick(genres);
    const gen = GENERATORS[g] || GENERATORS.compare;
    const p = gen(opts.level || 1);
    p.level = opts.level || 1;
    return p;
  }

  // 自己テスト: N問生成し「answer が本当に大きい方を指しているか」を検算。
  // コンソールで MathBank.selfCheck() を呼ぶと誤答ゼロを確認できる（誤問を配らないため）。
  function selfCheck(n) {
    n = n || 2000;
    let bad = 0;
    for (let i = 0; i < n; i++) {
      for (let lv = 1; lv <= 4; lv++) {
        const p = next({ genres: ['compare'], level: lv });
        const correct = p.vals[0] > p.vals[1] ? 0 : 1;
        if (p.answer !== correct || p.vals[0] === p.vals[1]) bad++;
      }
    }
    const ok = bad === 0;
    console.log(`MathBank.selfCheck: ${ok ? 'OK ✅' : 'NG ❌'}  誤り ${bad} / ${n * 4} 問`);
    return ok;
  }

  return { next, selfCheck };
})();

// Node から require された場合にも使えるように（任意・テスト用）
if (typeof module !== 'undefined' && module.exports) module.exports = MathBank;
