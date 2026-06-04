# 引き継ぎ書 — 理科RPG 問題増強（生物・地学の選択問題）

> このファイルは、スマホでの作業内容を**家のPCのClaude（または自分）に引き継ぐ**ためのメモです。
> Web版とPC版のClaudeは記憶を共有しないため、新しいセッションでは最初にこのファイルを読んでもらってください。

---

## 0. このプロジェクトの全体像

- **理科RPG** … 中学生向けの理科（化学・物理・生物・地学）の用語をタイピング／選択で覚えるブラウザRPG。
- **配布URL（GitHub Pages）**: https://dantakashi.github.io/rika-rpg-play/
  - Pages は **`main` ブランチのルート**から配信。`gh-pages` ブランチや GitHub Actions は無い。
  - `main` にマージ → 1〜2分でPagesに自動反映。
- **リポジトリ**: `dantakashi/rika-rpg-play`（README 曰く「生徒配布用の公開ミラー」。開発は本来別の非公開リポジトリ）。
- **主要ファイル**
  | ファイル | 役割 |
  |---|---|
  | `data.js` | 全データベース（問題・ボス・ガチャ・装備）。`GameData` |
  | `engine.js` | ゲームロジック・戦闘・入力処理。`GameEngine` |
  | `ui.js` | 画面描画・UI。`GameUI` |
  | `index.html` | 画面構造＋初期化＋グローバル関数公開 |
  | `proposed-questions-bio-earth.js` | **★今回作成した問題案ファイル（未反映）** |

---

## 1. これまでに完了した作業（このブランチ経由）

作業ブランチ: **`claude/hide-debug-mode-button-Ar56X`**

| PR | 内容 | 状態 |
|---|---|---|
| #1 | デバッグモードボタン（チート）を `index.html` でコメントアウト非表示 | **mainにマージ済** |
| #2 | スマホ対応：選択問題でソフトキーボードを抑止＋「選択式推奨」注記（`ui.js`） | **mainにマージ済** |

### スマホ対応（#2）の要点（関連知識）
- 戦闘中ずっと隠し入力欄 `#hidden-input`（`type=text`）にフォーカスしていたのが、スマホで選択問題でもキーボードが出る原因だった。
- `ui.js` の `focusHiddenInput()` に `IS_MOBILE && 選択問題/ボスクイズ` のとき `blur()` するガードを追加。入力導線は全て `focusHiddenInput()` を経由するため1箇所で全カバー。
- 出題形式トグル（`形式:`）4箇所に共通ヘルパー `_mobileChoiceNote()` でスマホ時のみ注記を表示。

---

## 2. 今回の作業：生物・地学の選択問題を大量作成（★まだ未反映）

### やったこと
- 新ファイル **`proposed-questions-bio-earth.js`** を作成（`data.js` は一切変更していない）。
- **合計235問**（生物129問 / 地学106問）の選択問題（`type:'choice'`）。基礎〜発展まで。
- `node --check` 構文OK / 構造チェックOK（正解index範囲・選択肢重複なし・必須項目あり）。
- **正解位置を均等分散**（a=0,1,2,3 がそれぞれ約59問ずつ）。

### 分野×難易度の内訳（今回の235問）
```
bio_plant   (植物)        junior 24 / mid 16 / senior 7
bio_human   (動物・人体)   junior 18 / mid 17 / senior 8
bio_cell    (細胞・生殖遺伝) mid 9 / senior 12
bio_eco     (生態系・分類)  junior 10 / mid 8
earth_land  (大地)         junior 22 / mid 14 / senior 7
earth_weather (天気)       junior 15 / mid 11 / senior 6
earth_space (天体)         mid 16 / senior 15
```

---

## 3. 問題データの形式（data.js と同一）

```js
{ subject:'biology'|'earth', genre:<下表>, diff:'junior'|'mid'|'senior',
  type:'choice', q:'問題文', c:['選択肢...'], a:正解index(0始まり), desc:'解説' }
```

- `genre` と使える `diff`（`GENRES` 定義に合わせること。範囲外の diff を使うと `GENRE_GRADES` の学年が引けない）:
  | genre | 教科 | 使える diff |
  |---|---|---|
  | `bio_plant` | biology | junior / mid / senior |
  | `bio_human` | biology | junior / mid / senior |
  | `bio_cell` | biology | mid / senior |
  | `bio_eco` | biology | junior / mid |
  | `earth_land` | earth | junior / mid / senior |
  | `earth_weather` | earth | junior / mid / senior |
  | `earth_space` | earth | mid / senior |
- `diff` の表示ラベルは基礎/応用/発展/受験（`DIFFICULTIES`）。学年は `GENRE_GRADES`（data.js 78行付近）で定義。

### ⚠️ 重要な仕様（正解位置を分散した理由）
- **道場モード**: `engine.js` の `_reduceDojoChoices()`（816行付近）が4択を**2択に絞り、正解位置をランダム化**する。
- **ボス戦・図書館**: 4択のまま表示し、**並びは固定**（シャッフルしない）。
- → よって**正解を常に先頭(a:0)にするとボス戦で答えが読まれてしまう**。既存問題は全て a:0 だが、今回の新問は a を 0〜3 に分散させた（ユーザー指示）。
- 既存問題の a:0 偏りも、将来 `renderChoiceButtons()`（engine.js 868付近）で4択時にシャッフルする改修を入れれば一括で解決できる（任意・未対応）。

---

## 4. data.js への取り込み手順（家でやる作業）

1. `proposed-questions-bio-earth.js` を開き、`PROPOSED_BIO` と `PROPOSED_EARTH` の中身（問題オブジェクト群）をレビュー・必要なら修正。
2. `data.js` の **`const QUESTION_DB = [` （158行付近）〜 末尾の `];`（現状1384行付近）** のうち、**末尾 `];` の直前**に、問題オブジェクトを貼り付ける。
   - 既存の生物問題は 833行付近〜、地学はその後に並んでいるので、その近くに足してもよい（フラット配列なので位置はどこでもよい）。
   - 各オブジェクトは行末カンマ必須。
3. `node --check data.js` で構文確認。
4. ブラウザで `index.html` を開き、**図書館 → 教科を生物/地学**にして問題が表示されること、解説（💡）が出ることを確認。道場でも実際に出題されるか確認。
5. 問題なければ `main` へPR・マージ → Pages反映（1〜2分）。

> 取り込み補助として `proposed-questions-bio-earth.js` は `module.exports` でも吐いているので、
> 必要なら Node スクリプトで `QUESTION_DB` に機械的に合流させることも可能。

---

## 5. 決定事項（ユーザーとの合意ログ）

- 「各分野200問程度」は厳密な数字ではなく「**とにかくたくさん**」。基礎レベル（例：「ウサギは何動物か→セキツイ動物」「魚類を選べ：サバ/イカ/ヒト/ウマ」）から発展まで幅広く。
- 出力は **別ファイル・データ形式**で。`data.js` は上書きしない。**今回は反映（マージ/デプロイ）しない**。
- 正解位置は **分散**（a:0〜3）。

---

## 6. 残作業・次にやるとよいこと（任意）

- [ ] 235問のレビュー（用語・言い回し・選択肢の妥当性チェック）。
- [ ] もっと増やす（特に bio_plant/senior 7問、earth系 senior が薄め。bio_cell、earth_space は発展も充実）。
- [ ] 既存問題との重複チェック（topic は近くても表現・答えは変えてあるが、念のため）。
- [ ] （任意）`renderChoiceButtons()` に4択シャッフルを実装し、既存の a:0 偏り問題を根本解決。
- [ ] 取り込み後、`main` へマージしてPages反映。

---

## 7. 作業を再開するときの一言プロンプト例（家のPCで）

> 「`HANDOFF-問題増強.md` と `proposed-questions-bio-earth.js` を読んで。理科RPGの生物・地学の選択問題を増やす作業の続き。まずは235問をレビューして、問題なければ data.js の QUESTION_DB に取り込んで、ブラウザで表示確認したい。」

---

## 8. 追記：化学・物理の補強＋テスト配信版（その後の作業）

### 追加した問題案
- **`proposed-questions-chem-physics.js`** … 化学・物理の補強問題 **113問**（化学61・物理52）。
  - 選択式103問＋**計算タイピング10問**（物理の `type:'typing', plain:true`：オームの法則・電力・速さ・仕事など）。
  - 選択式の正解位置は a:0〜3 に均等分散済み。
  - 化学の選択式は `name` フィールドあり（既存の実験問題に合わせた）。物理の選択式は `name` なし。

### テスト配信版（新URLで実機確認できる版）
本番（`index.html`／`data.js`）は**一切変更せず**、別URLで新問入りを試せるようにした。
- **`test-extra-questions.js`**（自動生成・直接編集しない）
  - `proposed-questions-bio-earth.js` と `proposed-questions-chem-physics.js` の全問（**計348問**）を
    `data.js` 読み込み後に `GameData.QUESTION_DB` へ push するブラウザ用スクリプト。
- **`test.html`**（`index.html` から自動生成）
  - `index.html` と同じ中身に、`data.js` の直後で `test-extra-questions.js` を読み込む1行と、
    上部の「🧪 TEST版」バナーを足しただけ。エンジン・UIは本番と共通ファイルを参照。
- **テストURL（main にマージ後・Pages反映）**: https://dantakashi.github.io/rika-rpg-play/test.html
  - 本番URL（`/` ＝ index.html）は無変更のまま。

### 本番へ取り込む（家での作業）
1. テストURLで新問の表示・出題・解説を確認（図書館で各教科、道場・ボスでも）。
2. OKなら、`proposed-questions-bio-earth.js` と `proposed-questions-chem-physics.js` の中身を
   `data.js` の `QUESTION_DB` の末尾 `];` 直前に貼り付け（生物・地学・化学・物理ぶんすべて）。
3. `node --check data.js` → ブラウザ（本番 index.html）で確認 → main へPR・マージ。
4. テスト用ファイル（`test.html` / `test-extra-questions.js`）は、本番反映後は不要なら削除してよい。

### 再生成のしかた（問題案を直したとき）
- `test-extra-questions.js` は proposal 2ファイルから生成している。問題案を直したら作り直す:
  - Nodeで両 proposal を require → 全問を JSON 化 → `GameData.QUESTION_DB` へ push する IIFE を書き出す。
  - `test.html` は `index.html` を読み、`data.js` の script タグ直後に `test-extra-questions.js` を挿入＋バナー追加で生成。

### 数のまとめ（新問の合計）
| 教科 | 新問数 |
|---|---|
| 生物 | 129 |
| 地学 | 106 |
| 化学 | 61 |
| 物理 | 52 |
| **合計** | **348** |
