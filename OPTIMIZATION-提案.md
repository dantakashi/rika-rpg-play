# 最適化・高速化メモ（理科RPG）

> リスクの低いものは **テスト版（`ui-test.js` / `test.html`）に反映済み**。
> 中〜高リスクのものは **提案のみ**（本番・テストとも未実装）。
> 本番URLは無変更。確認は 🧪 https://dantakashi.github.io/rika-rpg-play/test.html

---

## A. テスト版に反映済み（低リスク）— インベントリ高速化

対象ファイル: **`ui-test.js`**（`ui.js` のテスト用コピー。本番 `ui.js` は無変更）

### A-1. 装備アイコン画像の遅延読み込み（`_equipIcon`）
- `<img>` に **`loading="lazy"` `decoding="async"`** を付与。
- 効果: インベントリを開いた瞬間に全カードの画像（assets/equip/*.png、各約100KB・49種）を一斉ロード／デコードしていたのを、**画面に見えているカードだけ**に。大量所持時の「開くと重い」を大きく改善。
- リスク: 低（非対応ブラウザは従来どおり即時読み込みにフォールバック。見た目・挙動は不変）。

### A-2. DocumentFragment でまとめて挿入（`renderInventoryGrid` / `renderEquippedSlots`）
- カードを1個ずつ `appendChild`（毎回リフロー）していたのを、`DocumentFragment` に集約して**最後に1回だけ**挿入。
- 効果: カード数に比例していたレイアウト再計算を1回に。
- リスク: 低（生成物は同一）。

### A-3. 装備中判定の集合化（`renderInventoryGrid`）
- カードごとに `Object.values(equipped).some(...)`（毎回5件走査）していたのを、ループ前に `Set` を1回作成して `has()` 参照に。
- リスク: 低。

### → 本番への移植（家で）
`ui.js` に上記3点（`ui-test.js` と同じ差分）を当てるだけ。`git diff ui.js ui-test.js` で差分を確認できる（コメント `[TEST最適化]` が目印）。移植後は `ui-test.js` / `test.html` の `ui-test.js` 参照は不要なら削除可。

---

## B. 提案のみ（中リスク・要検証）

### B-1. `getEffectiveStats()` のメモ化 ★効果大
- 現状: `engine.js` の `getEffectiveStats()` は**戦闘ループ（setInterval）の毎ティック**や `updateBattleUI` など多数の箇所で呼ばれ、毎回 装備3周＋全17ステータスの `getStatGainTotal` を再計算している。
- 提案: 結果をキャッシュし、**装備変更・強化・超越・売却・ステ振り・ロード時にだけ無効化**（dirtyフラグ）。
  ```js
  let _effCache = null, _effDirty = true;
  function invalidateEff(){ _effDirty = true; }
  function getEffectiveStats(t){
    if (t !== undefined && t !== player) return _computeEff(t); // 他プレイヤーは都度計算
    if (_effDirty || !_effCache){ _effCache = _computeEff(player); _effDirty = false; }
    return _effCache;
  }
  ```
  `equipEquip` / `upgradeEquip` / `transcendEquip` / `sellEquip` / `setPlayerGrade` / ステ振り / `loadUserData` / `applySaveCode` などで `invalidateEff()` を呼ぶ。
- リスク: 中（**無効化漏れがあると戦闘力やHPが更新されないバグ**になる。呼び出し点の洗い出しが要）。戦闘中の装備変更は無いはずなので、ティックごと再計算の削減効果は大きい。

### B-2. インベントリのイベント委譲（onclick集約）
- 現状: カード1枚ごとに `btn.onclick = () => openEquipModal(item)` のクロージャを生成。
- 提案: グリッドに**1つだけ**クリックリスナーを置き、`data-uid` から対象 item を引く。生成コスト・GC負荷を軽減。
- リスク: 中（クリック対象の特定ロジックを正しく実装する必要）。A-1/A-2 ほど体感差は出ないかも。

### B-3. インベントリの仮想スクロール（超大量所持時）
- 現状: 所持数ぶんの DOM を一括生成。数百〜千件で生成自体が重い。
- 提案: 表示範囲だけ描画する仮想リスト化、または「もっと見る」ページング。
- リスク: 中〜高（スクロール処理の作り込み・フィルタとの整合）。所持数がそこまで多くなければ後回しでよい。

### B-4. `innerHTML` 文字列一括生成
- 現状: `createElement` を多用。`renderInventoryGrid` を**HTML文字列を組み立てて1回 `innerHTML`** に変更すると、createElement より速い場合がある（ただし onclick は B-2 のイベント委譲が前提）。
- リスク: 中（B-2 とセットで実施）。

---

## C. 計測のすすめ
- まずテスト版で A の体感を確認。さらに詰めるなら、Chrome DevTools の Performance でインベントリ open のフレームを記録し、`renderInventoryGrid` と画像デコードの比率を見る。
- B-1（メモ化）は戦闘中のカクつき・発熱に効く可能性が高いので、効果を測ってから本番へ。

---

## まとめ
| 項目 | リスク | 状態 |
|---|---|---|
| A-1 画像 lazy/async | 低 | ✅ テスト反映済 |
| A-2 DocumentFragment | 低 | ✅ テスト反映済 |
| A-3 装備中判定の集合化 | 低 | ✅ テスト反映済 |
| B-1 getEffectiveStats メモ化 | 中 | 📝 提案 |
| B-2 イベント委譲 | 中 | 📝 提案 |
| B-3 仮想スクロール | 中〜高 | 📝 提案 |
| B-4 innerHTML一括 | 中 | 📝 提案 |
