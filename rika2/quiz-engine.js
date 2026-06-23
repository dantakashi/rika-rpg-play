/* ============================================================
   理科RPG2 ─ 問題エンジン (quiz-engine.js)  ★問題エンジンチームの管轄★
   (このファイルはJS。demo.html が <script src="quiz-engine.js"> で読み込む)
   このファイルだけ触る。demo.html(ゲーム側チーム)は触らない。
   ── 接点(契約) ──
     ① 出題: Quiz.ask({ subjects:[教科/分野キー], ctxFn?:()=>文脈html, ctx?, onResult:(correct)=>{}, onContinue:()=>{} })
        呼び出し側(ゲーム)は『出題範囲を渡し、正誤を受け取る』だけ。判定/表示/解説/答え方UIは全部ここが持つ。
     ② 出題の器のHTML: #qOverlay #qctx #qq #qimg #qans #qfeed は demo.html 側に固定の枠(契約)。ここはその中身をJSで入れる。
     ③ 分野タグ語彙: SUBJECTS(教科/分野キー+表示)はここが定義=正典。ゲーム側は敵.attrsでこのキーを参照する。
     ④ テーマ色: --gold 等のCSS変数は demo.html の :root 定義を使う(配色は世界観共有)。新しい答え方のCSSは必要ならここで<style>注入。
   ── 今後の管轄 ── カフート式の答え方(並べ替え/画像タッチ等)・画像問題・未修(教える問題)・復習(SRS)・実力測定・練習。
   ============================================================ */
let curQ=null, answered=false;   // 出題中の問題と回答済みフラグ(問題エンジンの状態)

const SUBJECTS = { physics:{jp:'物理',emoji:'⚙️',color:'#60a5fa'}, chemistry:{jp:'化学',emoji:'⚗️',color:'#34d399'},
  biology:{jp:'生物',emoji:'🌿',color:'#a3e635'}, earth:{jp:'地学',emoji:'🪨',color:'#fbbf24'} };
const QUESTIONS = [
  { s:'chemistry', type:'typing', q:"「水素分子」の化学式を書こう", answer:"H2", accept:["h2"], desc:"水素原子2個でできた、最も軽い無色の気体。" },
  { s:'chemistry', type:'typing', q:"「水素イオン」の化学式を書こう", answer:"H+", accept:["h+"], desc:"水素原子が電子を1個失った陽イオン。酸性の正体。" },
  { s:'chemistry', type:'choice', q:"点火時に開くねじは？", choices:["空気調節ねじ","ガス調節ねじ","元栓","コック"], answer:1, desc:"元栓・コックを開けた後、マッチの火を近づけながらガス調節ねじを開けて点火する。" },
  { s:'chemistry', type:'choice', q:"1種類に分かれる変化は？", choices:["還元","中和","分解","化合"], answer:2, desc:"1種類の物質が複数に分かれる変化が分解。加熱や電流によって起こる。" },
  { s:'chemistry', type:'choice', q:"固体の説明として正しいものはどれ？", choices:["形も体積もほぼ決まっている","形は決まらず体積も決まらない","入れ物いっぱいに広がる","必ず透明である"], answer:0, desc:"固体は形と体積がほぼ決まっている状態です。" },
  { s:'chemistry', type:'typing', q:"「酸素分子」の化学式を書こう", answer:"O2", accept:["o2"], desc:"酸素原子2個でできた気体。ものを燃やすはたらきがある。" },
  { s:'chemistry', type:'typing', q:"「ナトリウムイオン」の化学式を書こう", answer:"Na+", accept:["na+"], desc:"ナトリウム原子が電子1個を失った陽イオン。" },
  { s:'chemistry', type:'choice', q:"炎を青くする操作は？", choices:["ガス調節ねじを閉じる","元栓を閉じる","空気調節ねじを開けて空気を増やす","水をかける"], answer:2, desc:"オレンジの炎は空気（酸素）不足。空気調節ねじを開けて空気を増やすと完全燃焼し青い炎になる。" },
  { s:'chemistry', type:'choice', q:"物質が酸素と結びつく化学変化を何というか。", choices:["還元","分解","蒸発","酸化"], answer:3, desc:"物質が酸素と結びつく変化を酸化、酸化物が酸素をうばわれる変化を還元という。" },
  { s:'chemistry', type:'choice', q:"水のような液体の説明として正しいものはどれ？", choices:["形も体積も決まっている","入れ物に合わせて形が変わる","必ず空気中に広がる","つかんでも形がくずれない"], answer:1, desc:"液体は体積はほぼ決まっていますが、形は入れ物に合わせて変わります。" },
  { s:'chemistry', type:'typing', q:"「窒素分子」の化学式を書こう", answer:"N2", accept:["n2"], desc:"空気の約8割をしめる気体。窒素原子2個でできる。" },
  { s:'chemistry', type:'typing', q:"「カリウムイオン」の化学式を書こう", answer:"K+", accept:["k+"], desc:"カリウム原子が電子1個を失った陽イオン。" },
  { s:'chemistry', type:'choice', q:"試験管に入れた液体を加熱するとき、正しい操作はどれか？", choices:["口を自分に向ける","一点だけを強く熱し続ける","試験管の口を人のいない方へ向ける","液体を満杯まで入れる"], answer:2, desc:"突沸して中身が飛び出す危険があるため、口は人のいない方向へ向ける。" },
  { s:'chemistry', type:'choice', q:"酸化のうち、熱や光を出しながら激しく進むものを何というか。", choices:["燃焼","還元","蒸留","溶解"], answer:0, desc:"熱や光を出す激しい酸化を燃焼という。木炭やマグネシウムの燃焼など。" },
  { s:'chemistry', type:'choice', q:"気体の説明として正しいものはどれ？", choices:["形だけ決まっている","体積だけ決まっている","入れ物いっぱいに広がる","必ず目で見える"], answer:2, desc:"気体は形も体積も決まらず、入れ物いっぱいに広がります。" },
  { s:'chemistry', type:'typing', q:"「ヘリウム」の化学式を書こう", answer:"He", accept:["he"], desc:"原子1個で安定している気体（単原子分子）。風船に使われることがあり、空気より軽い。" },
  { s:'chemistry', type:'typing', q:"「カルシウムイオン」の化学式を書こう", answer:"Ca2+", accept:["ca2+"], desc:"カルシウム原子が電子2個を失った陽イオン。塩化カルシウムなどにふくまれる。" },
  { s:'chemistry', type:'choice', q:"薬品のにおいを確認するときの正しい方法はどれか？", choices:["鼻を直接つけて深く吸う","手であおいでかぐ","加熱してからかぐ","容器を振ってからかぐ"], answer:1, desc:"有害な気体もあるため、手であおいで少量を確認する。" },
  { s:'chemistry', type:'choice', q:"酸化物が酸素をうばわれる化学変化を何というか。", choices:["燃焼","還元","酸化","化合"], answer:1, desc:"酸化銅が炭素によって酸素をうばわれ銅になるような変化が還元。酸化と還元は同時に起こる。" },
  { s:'chemistry', type:'choice', q:"氷が水になる変化を何という？", choices:["凝固","蒸発","凝縮","融解"], answer:3, desc:"固体が液体になる変化を融解といいます。" },
  { s:'chemistry', type:'typing', q:"「塩素分子」の化学式を書こう", answer:"Cl2", accept:["cl2"], desc:"黄緑色で刺激臭のある有毒な気体。塩素原子2個。" },
  { s:'chemistry', type:'typing', q:"「マグネシウムイオン」の化学式を書こう", answer:"Mg2+", accept:["mg2+"], desc:"マグネシウム原子が電子2個を失った陽イオン。金属原子は電子を失って陽イオンになりやすい。" },
  { s:'chemistry', type:'choice', q:"液体を加熱する前に沸騰石を入れる理由はどれか？", choices:["早く沸騰させるため","急な沸騰（突沸）を防ぐため","色をつけるため","においを消すため"], answer:1, desc:"沸騰石は突沸を防ぎ、おだやかに沸騰させるために入れる。" },
  { s:'chemistry', type:'choice', q:"結びついて1つになる変化は？", choices:["還元","蒸発","化合","分解"], answer:2, desc:"鉄と硫黄が結びついて硫化鉄ができるように、結びついて別の物質ができる変化を化合という。" },
  { s:'chemistry', type:'choice', q:"水が氷になる変化を何という？", choices:["凝固","融解","蒸発","昇華"], answer:0, desc:"液体が固体になる変化を凝固といいます。" },
  { s:'chemistry', type:'typing', q:"「水分子」の化学式を書こう", answer:"H2O", accept:["h2o"], desc:"水素2・酸素1からできる。すべての生物に不可欠。" },
  { s:'chemistry', type:'typing', q:"「亜鉛イオン」の化学式を書こう", answer:"Zn2+", accept:["zn2+"], desc:"亜鉛原子が電子2個を失った陽イオン。酸と反応すると水溶液中でZn2+になる。" },
  { s:'chemistry', type:'choice', q:"上皿てんびんの分銅を扱うとき、正しい方法はどれか？", choices:["手で持つ","ピンセットで持つ","水でぬらして持つ","息を吹きかけてから持つ"], answer:1, desc:"手の脂やさびを防ぐため、分銅はピンセットで扱う。" },
  { s:'chemistry', type:'choice', q:"反応前後で保たれる量は？", choices:["定比例の法則","フックの法則","オームの法則","質量保存の法則"], answer:3, desc:"化学変化の前後で原子の数や種類は変わらないため、全体の質量は保存される（質量保存の法則）。" },
  { s:'chemistry', type:'choice', q:"水たまりの水が少しずつ水蒸気になる変化を何という？", choices:["凝縮","蒸発","凝固","融解"], answer:1, desc:"液体が気体になる変化を蒸発といいます。" },
  { s:'chemistry', type:'typing', q:"「二酸化炭素分子」の化学式を書こう", answer:"CO2", accept:["co2"], desc:"炭素1・酸素2。石灰水を白くにごらせる。" },
  { s:'chemistry', type:'typing', q:"「銅イオン」の化学式を書こう", answer:"Cu2+", accept:["cu2+"], desc:"水溶液中で青色を示す陽イオン。塩化銅や硫酸銅の水溶液で見られる。" },
  { s:'chemistry', type:'choice', q:"メスシリンダーで体積をはかるとき、目盛りの読み方はどれか？", choices:["上から見下ろして読む","液面の最も高い所を読む","液面の最も低い所を真横から読む","斜め上から読む"], answer:2, desc:"目の高さを液面に合わせ、へこんだ最下部を真横から読む。" },
  { s:'chemistry', type:'choice', q:"熱を出す反応は？", choices:["発熱反応","吸熱反応","中和","分解"], answer:0, desc:"熱を放出する反応が発熱反応（鉄の酸化を利用したかいろなど）。熱を吸収するのが吸熱反応。" },
  { s:'chemistry', type:'choice', q:"水滴は水蒸気が何になった？", choices:["氷","水蒸気","水","金属"], answer:2, desc:"気体の水蒸気が液体の水になる変化を凝縮といいます。" },
  { s:'chemistry', type:'typing', q:"「アンモニア分子」の化学式を書こう", answer:"NH3", accept:["nh3"], desc:"窒素1・水素3。刺激臭がありアルカリ性を示す。" },
  { s:'chemistry', type:'typing', q:"「バリウムイオン」の化学式を書こう", answer:"Ba2+", accept:["ba2+"], desc:"バリウム原子が電子2個を失った陽イオン。硫酸イオンと結びつくと白色沈殿をつくる。" },
  { s:'chemistry', type:'choice', q:"薬品が手についたときの正しい対処はどれか？", choices:["ふき取って放置する","すぐに大量の水で洗い流す","こすって落とす","別の薬品で中和する"], answer:1, desc:"まず大量の水で洗い流すのが基本。その後、先生に伝える。" },
  { s:'chemistry', type:'choice', q:"まわりから熱を吸収して温度が下がる反応を何というか。", choices:["酸化","吸熱反応","発熱反応","燃焼"], answer:1, desc:"まわりの熱を吸収する反応が吸熱反応。クエン酸と炭酸水素ナトリウムの反応などが例。" },
  { s:'chemistry', type:'choice', q:"ドライアイスが液体にならず気体になる変化を何という？", choices:["蒸発","凝固","融解","昇華"], answer:3, desc:"固体が直接気体になる変化を昇華といいます。" },
  { s:'physics', type:'choice', q:"光が鏡に当たってはね返る現象を何という？", choices:["反射","屈折","回折","蒸発"], answer:0, desc:"光が鏡などの表面ではね返る現象を反射という。" },
  { s:'physics', type:'choice', q:"力の単位はどれ？", choices:["N","A","V","J"], answer:0, desc:"力の単位はニュートンで、記号はNで表す。" },
  { s:'physics', type:'choice', q:"電流の単位はどれ？", choices:["A","V","Ω","W"], answer:0, desc:"電流の単位はアンペアで、記号はAで表す。" },
  { s:'physics', type:'choice', q:"物体が20mを4秒で進んだときの速さは何m/s？", choices:["4m/s","5m/s","16m/s","80m/s"], answer:1, desc:"速さ=距離÷時間なので、20m÷4s=5m/s。" },
  { s:'physics', type:'choice', q:"反射の角度関係は？", choices:["入射角と反射角は等しい","入射角は反射角の2倍","反射角はいつも0度","入射角と反射角は無関係"], answer:0, desc:"反射の法則では、入射角と反射角は等しくなる。" },
  { s:'physics', type:'choice', q:"地球が物体を引く力を何という？", choices:["重力","摩擦力","弾性力","磁力"], answer:0, desc:"地球が物体を地球の中心へ向かって引く力を重力という。" },
  { s:'physics', type:'choice', q:"電圧の単位はどれ？", choices:["V","A","N","J"], answer:0, desc:"電圧の単位はボルトで、記号はVで表す。" },
  { s:'physics', type:'choice', q:"速さ3m/sで10秒進むと、進む距離は何m？", choices:["3m","10m","13m","30m"], answer:3, desc:"距離=速さ×時間なので、3m/s×10s=30m。" },
  { s:'physics', type:'choice', q:"光の向き変化の名は？", choices:["反射","屈折","凝結","放電"], answer:1, desc:"光が異なる物質へ進むとき、進む向きが変わる現象を屈折という。" },
  { s:'physics', type:'choice', q:"運動を妨げる力は？", choices:["摩擦力","浮力","重力","電力"], answer:0, desc:"接している面の間で、すべりをさまたげる向きにはたらく力を摩擦力という。" },
  { s:'physics', type:'choice', q:"抵抗の単位はどれ？", choices:["Ω","A","V","m/s"], answer:0, desc:"抵抗の単位はオームで、記号はΩで表す。" },
  { s:'physics', type:'choice', q:"距離60mを速さ12m/sで進むと、かかる時間は何秒？", choices:["5秒","12秒","48秒","720秒"], answer:0, desc:"時間=距離÷速さなので、60m÷12m/s=5s。" },
  { s:'physics', type:'choice', q:"凸レンズに平行な光を当てると、光は主にどこに集まる？", choices:["焦点","中心の真上","レンズの端","光源の後ろ"], answer:0, desc:"凸レンズに軸に平行な光を当てると、屈折して焦点に集まる。" },
  { s:'physics', type:'choice', q:"ばねやゴムがもとの形に戻ろうとしてはたらく力を何という？", choices:["弾性力","電流","圧力","音波"], answer:0, desc:"変形したばねやゴムがもとの形に戻ろうとしてはたらく力を弾性力という。" },
  { s:'physics', type:'choice', q:"直列回路で、各部分を流れる電流について正しいものはどれ？", choices:["どこでも同じ大きさ","電源から遠いほど大きい","枝分かれごとに必ず0になる","抵抗と無関係に変わる"], answer:0, desc:"直列回路では電流の通り道が1本なので、各部分を流れる電流は同じ大きさになる。" },
  { s:'physics', type:'choice', q:"一定の速さで一直線上を進む運動を何という？", choices:["等速直線運動","自由落下だけ","反射","放電"], answer:0, desc:"速さが一定で、向きも変わらず一直線上を進む運動を等速直線運動という。" },
  { s:'physics', type:'choice', q:"音は何によって生じる？", choices:["物体の振動","物体の色","光の反射","水の蒸発"], answer:0, desc:"音は物体が振動することで発生し、空気などを通して伝わる。" },
  { s:'physics', type:'choice', q:"水中の物体にはたらく、上向きの力を何という？", choices:["浮力","摩擦力","重力","電圧"], answer:0, desc:"水や空気などの中にある物体には、上向きの浮力がはたらく。" },
  { s:'physics', type:'choice', q:"並列回路で、各枝に加わる電圧について正しいものはどれ？", choices:["電源の電圧と等しい","枝が多いほど必ず0になる","電流と必ず同じ単位になる","抵抗があると電圧は存在しない"], answer:0, desc:"並列回路では、それぞれの枝に電源と同じ電圧が加わる。" },
  { s:'physics', type:'choice', q:"力の向きに物体を動かしたときの仕事を求める式はどれ？", choices:["仕事=力×移動距離","仕事=電圧÷電流","仕事=面積÷力","仕事=振動数×音速"], answer:0, desc:"力の向きに物体が動いたとき、仕事[J]=力[N]×移動距離[m]で求める。" },
  { s:'physics', type:'choice', q:"音の大きさに最も関係が深いものはどれ？", choices:["振幅","振動数","温度の単位","光の速さ"], answer:0, desc:"音の大きさは振動の幅である振幅が大きいほど大きくなる。" },
  { s:'physics', type:'choice', q:"磁石が鉄を引きつける力はどれ？", choices:["磁力","重力","浮力","圧力"], answer:0, desc:"磁石が鉄などを引きつけたり、磁石どうしが引き合ったり反発したりする力を磁力という。" },
  { s:'physics', type:'choice', q:"電力の単位はどれ？", choices:["W","A","V","Ω"], answer:0, desc:"電力の単位はワットで、記号はWで表す。電力は電気器具が1秒あたりに使う電気エネルギーの量を表す。" },
  { s:'physics', type:'choice', q:"10Nの力で物体を力の向きに2m動かした。仕事は何J？", choices:["5J","10J","20J","40J"], answer:2, desc:"仕事=力×移動距離なので、10N×2m=20J。" },
  { s:'physics', type:'choice', q:"音の高さに最も関係が深いものはどれ？", choices:["振動数","質量","面積","電圧"], answer:0, desc:"音の高さは1秒間の振動回数である振動数が多いほど高くなる。" },
  { s:'physics', type:'choice', q:"静止を続ける2力は？", choices:["2力がつり合っている","2力が同じ向きである","力がまったくない","重力だけが2倍になる"], answer:0, desc:"物体が静止し続ける場合、はたらく力がつり合っていることがある。2力のつり合いでは大きさが等しく向きが反対になる。" },
  { s:'physics', type:'choice', q:"電流が流れる導線のまわりにできるものはどれ？", choices:["磁界","真空","焦点","水圧"], answer:0, desc:"電流が流れる導線のまわりには磁界ができる。" },
  { s:'physics', type:'choice', q:"40Jの仕事を8秒で行ったときの仕事率は何W？", choices:["5W","8W","32W","320W"], answer:0, desc:"仕事率=仕事÷時間なので、40J÷8s=5W。" },
  { s:'physics', type:'choice', q:"真空中で音が伝わらない理由として正しいものはどれ？", choices:["音を伝える物質がないから","光がないから","温度が必ず0度だから","重力がないから"], answer:0, desc:"音は空気や水などの物質の振動として伝わるため、真空中では伝わらない。" },
  { s:'physics', type:'choice', q:"ばねののびと加えた力の関係として、範囲内で正しいものはどれ？", choices:["力が大きいほどのびは大きい","力が大きいほどのびは小さい","のびは力と無関係","力を加えると必ず縮む"], answer:0, desc:"ばねは限度内で、加えた力が大きいほどのびが大きくなる。" },
  { s:'physics', type:'choice', q:"電磁石を強くする方法として正しいものはどれ？", choices:["コイルの巻き数を増やす","電流を小さくする","鉄しんを必ず外す","導線を切る"], answer:0, desc:"電磁石は、コイルの巻き数を増やしたり電流を大きくしたりすると強くなる。" },
  { s:'physics', type:'choice', q:"道具を使っても、摩擦などを無視すると変わらない量はどれ？", choices:["必要な仕事の総量","必ず必要な力","必ず移動距離","物体の質量が0になること"], answer:0, desc:"滑車や斜面などを使うと力の大きさや動かす距離は変えられるが、摩擦を無視すると仕事の総量は変わらない。" },
  { s:'physics', type:'choice', q:"空気中の音の速さとして最も近い値はどれ？", choices:["約34m/s","約340m/s","約3400m/s","約30万km/s"], answer:1, desc:"中学理科では、空気中の音の速さをおよそ340m/sとして扱う。" },
  { s:'physics', type:'choice', q:"圧力を大きくする方法として正しいものはどれ？", choices:["同じ力で押す面積を小さくする","同じ力で押す面積を大きくする","力を0にする","物体の色を変える"], answer:0, desc:"圧力は力を面積で割った量なので、同じ力なら面積が小さいほど圧力は大きい。" },
  { s:'physics', type:'choice', q:"抵抗3Ωに6Vの電圧を加えると、流れる電流は何A？", choices:["0.5A","2A","3A","18A"], answer:1, desc:"オームの法則V=IRより、I=V÷R=6V÷3Ω=2A。" },
  { s:'physics', type:'choice', q:"等速の距離時間グラフは？", choices:["原点を通る直線","水平な直線だけ","ぎざぎざの線だけ","必ず円"], answer:0, desc:"速さが一定なら、進んだ距離は時間に比例するため、距離-時間グラフは直線になる。" },
  { s:'physics', type:'choice', q:"水面にうつった景色が見える主な理由はどれ？", choices:["水面で光が反射するから","水が音を吸収するから","水が電気を流すから","水が重力を消すから"], answer:0, desc:"水面で光が反射し、その反射した光が目に入るため景色が見える。" },
  { s:'physics', type:'choice', q:"大気の重さによって生じる圧力を何という？", choices:["大気圧","水圧","電圧","音圧"], answer:0, desc:"空気にも重さがあり、その重さによって大気圧が生じる。" },
  { s:'biology', type:'choice', q:"花のつくりで、花粉をつくる部分はどれか。", choices:["おしべ","めしべ","がく","花弁"], answer:0, desc:"おしべの先にあるやくで花粉がつくられます。めしべは受粉後に種子や果実に関係する部分です。" },
  { s:'biology', type:'choice', q:"だ液に含まれ、デンプンを分解する消化酵素はどれか。", choices:["アミラーゼ","ペプシン","ヘモグロビン","インスリン"], answer:0, desc:"だ液中のアミラーゼはデンプンを分解します。消化酵素は決まった物質にはたらく性質があります。" },
  { s:'biology', type:'choice', q:"細胞の中にあり、遺伝に関係する染色体を含む部分はどれか。", choices:["核","細胞膜","液胞","細胞壁"], answer:0, desc:"核には染色体があり、遺伝に関係する情報を含みます。多くの細胞で重要なはたらきを調節しています。" },
  { s:'biology', type:'choice', q:"植物のように、無機物から有機物をつくる生物を何というか。", choices:["生産者","消費者","分解者","捕食者"], answer:0, desc:"植物は光合成によって有機物をつくるため、生態系の生産者と呼ばれます。" },
  { s:'biology', type:'choice', q:"受粉とは、花粉がどこにつくことか。", choices:["めしべの柱頭","子房","胚珠","花弁"], answer:0, desc:"受粉は花粉がめしべの柱頭につくことです。その後、胚珠が種子になり、子房が果実になります。" },
  { s:'biology', type:'choice', q:"胃で主にタンパク質の消化に関わる消化酵素はどれか。", choices:["ペプシン","アミラーゼ","リパーゼ","胆汁"], answer:0, desc:"胃液に含まれるペプシンはタンパク質の消化に関わります。胆汁は消化酵素ではありません。" },
  { s:'biology', type:'choice', q:"植物細胞にあり、動物細胞にはふつう見られないつくりはどれか。", choices:["細胞壁","細胞膜","細胞質","核"], answer:0, desc:"植物細胞には細胞壁や葉緑体、大きな液胞が見られます。細胞膜、細胞質、核は動物細胞にも見られます。" },
  { s:'biology', type:'choice', q:"動物のように、ほかの生物を食べて生活する生物を何というか。", choices:["消費者","生産者","分解者","無機物"], answer:0, desc:"動物は植物やほかの動物を食べて有機物を得るため、消費者と呼ばれます。" },
  { s:'biology', type:'choice', q:"光合成で主にデンプンがつくられる場所はどこか。", choices:["葉緑体","細胞壁","根毛","道管"], answer:0, desc:"光合成は葉の細胞にある葉緑体で行われます。光を受けて二酸化炭素と水からデンプンなどをつくります。" },
  { s:'biology', type:'choice', q:"小腸の内側にある、養分の吸収面積を広げるつくりはどれか。", choices:["柔毛","肺胞","気孔","腎臓"], answer:0, desc:"小腸の内側には柔毛があり、表面積を広げて消化された養分を効率よく吸収します。" },
  { s:'biology', type:'choice', q:"1つの細胞からできている生物を何というか。", choices:["単細胞生物","多細胞生物","脊椎動物","被子植物"], answer:0, desc:"単細胞生物は1つの細胞だけで生命活動を行います。ゾウリムシやミカヅキモなどが例です。" },
  { s:'biology', type:'choice', q:"生物どうしの「食べる・食べられる」のつながりを何というか。", choices:["食物連鎖","細胞分裂","光合成","肺循環"], answer:0, desc:"食物連鎖は生物どうしの食べる・食べられる関係を表します。実際の自然界では多くの連鎖が網の目のようにつながります。" },
  { s:'biology', type:'choice', q:"植物の光合成で、材料として使われるものの組み合わせはどれか。", choices:["二酸化炭素と水","酸素とデンプン","窒素と酸素","水素と酸素"], answer:0, desc:"光合成では二酸化炭素と水を材料にしてデンプンなどをつくり、酸素を放出します。" },
  { s:'biology', type:'choice', q:"肺でガス交換をする小袋は？", choices:["肺胞","心房","柔毛","腎小体"], answer:0, desc:"肺胞は非常に薄い壁をもつ小さな袋で、まわりの毛細血管との間で気体の交換を行います。" },
  { s:'biology', type:'choice', q:"精子と卵が合体することを何というか。", choices:["受精","分裂","発芽","蒸散"], answer:0, desc:"受精は精子と卵が合体することです。受精によってできた細胞を受精卵といいます。" },
  { s:'biology', type:'choice', q:"落ち葉や死がいを分解する細菌や菌類などを何というか。", choices:["分解者","生産者","一次消費者","肉食動物"], answer:0, desc:"分解者は生物の死がいやふんなどの有機物を分解し、物質を自然界に戻すはたらきをします。" },
  { s:'biology', type:'choice', q:"植物の葉で、水蒸気が主に出入りする小さな穴を何というか。", choices:["気孔","維管束","根毛","胚珠"], answer:0, desc:"気孔は葉の表皮にある小さな穴で、蒸散や気体の出入りに関係します。" },
  { s:'biology', type:'choice', q:"血液中で酸素を運ぶはたらきが大きい成分はどれか。", choices:["赤血球","白血球","血小板","血しょう"], answer:0, desc:"赤血球にはヘモグロビンが含まれ、酸素と結びついて全身へ運びます。" },
  { s:'biology', type:'choice', q:"親と同じ形質の子が、受精をせずにできるふえ方はどれか。", choices:["無性生殖","有性生殖","受粉","減数分裂"], answer:0, desc:"無性生殖では受精をせずに新しい個体ができます。親と同じ形質になりやすいことが特徴です。" },
  { s:'biology', type:'choice', q:"食物連鎖のはじめに位置することが多い生物はどれか。", choices:["植物","肉食動物","分解者","大型の魚"], answer:0, desc:"多くの食物連鎖は、光合成で有機物をつくる植物から始まります。植物は生産者です。" },
  { s:'biology', type:'choice', q:"根から吸収した水や無機養分を運ぶ管はどれか。", choices:["道管","師管","気孔","子房"], answer:0, desc:"道管は根から吸収した水や無機養分を上へ運びます。師管は光合成でできた養分を運びます。" },
  { s:'biology', type:'choice', q:"背骨をもつ動物を何というか。", choices:["脊椎動物","無脊椎動物","節足動物","軟体動物"], answer:0, desc:"背骨をもつ動物を脊椎動物といいます。魚類、両生類、は虫類、鳥類、哺乳類が含まれます。" },
  { s:'biology', type:'choice', q:"核内で見やすいひも状のものは？", choices:["染色体","気孔","師管","柔毛"], answer:0, desc:"細胞分裂のとき、核の中の染色体が見えやすくなります。染色体には遺伝に関係する情報が含まれます。" },
  { s:'biology', type:'choice', q:"食物網とは何を表したものか。", choices:["複数の食物連鎖が網の目のようにつながった関係","一つの細胞のつくり","血液の流れ","花のつくり"], answer:0, desc:"自然界では生物が一種類だけを食べるとは限らないため、食物連鎖が複雑につながった食物網として考えます。" },
  { s:'biology', type:'choice', q:"胚珠が子房内にある植物は？", choices:["被子植物","裸子植物","シダ植物","コケ植物"], answer:0, desc:"被子植物は胚珠が子房に包まれている種子植物です。裸子植物は胚珠がむき出しです。" },
  { s:'biology', type:'choice', q:"心臓から全身へ血液を送り出す部屋はどれか。", choices:["左心室","右心室","左心房","右心房"], answer:0, desc:"左心室は酸素を多く含む血液を全身へ送り出します。心臓の中でも壁が厚い部屋です。" },
  { s:'biology', type:'choice', q:"植物細胞だけにあるつくりは？", choices:["核","細胞膜","細胞壁","細胞質"], answer:2, desc:"細胞壁・葉緑体・大きな液胞は植物の細胞に見られ、動物の細胞にはありません。細胞壁はからだを支えます。" },
  { s:'biology', type:'choice', q:"自然界で分解者が少なくなると起こりやすいことはどれか。", choices:["死がいや落ち葉が分解されにくくなる","光合成がすべて止まる","動物がすべて生産者になる","酸素が水に変わる"], answer:0, desc:"分解者は死がいや落ち葉を分解して物質の循環を支えます。少なくなると有機物が分解されにくくなります。" },
  { s:'biology', type:'choice', q:"単子葉類に多く見られる葉脈の特徴はどれか。", choices:["平行脈","網状脈","葉脈がない","輪状に広がる脈"], answer:0, desc:"単子葉類の葉脈は平行脈が多く、双子葉類は網状脈が多いです。" },
  { s:'biology', type:'choice', q:"全身から心臓へ戻った血液が最初に入る部屋はどれか。", choices:["右心房","右心室","左心房","左心室"], answer:0, desc:"全身をめぐった血液は大静脈を通って右心房に戻ります。その後、右心室から肺へ送られます。" },
  { s:'biology', type:'choice', q:"植物が光合成を行う、細胞内の緑色の粒を何というか。", choices:["葉緑体","核","液胞","細胞膜"], answer:0, desc:"葉緑体は緑色の色素(クロロフィル)をふくみ、光合成を行う場所です。" },
  { s:'biology', type:'choice', q:"外来種について正しい説明はどれか。", choices:["もともとその地域にいなかったが、人の活動などで入ってきた生物","必ず絶滅した生物","すべての地域にもともといる生物","光合成をしない植物"], answer:0, desc:"外来種はもともとその地域にいなかった生物が人の活動などで入ってきたものです。在来の生物に影響することがあります。" },
  { s:'biology', type:'choice', q:"ヨウ素液を使って調べる物質はどれか。", choices:["デンプン","酸素","タンパク質","二酸化炭素"], answer:0, desc:"ヨウ素液はデンプンがあると青紫色に変化します。光合成でデンプンができたかを調べる実験に使います。" },
  { s:'biology', type:'choice', q:"心臓と肺を往復する流れは？", choices:["肺循環","体循環","消化","反射"], answer:0, desc:"肺循環は心臓と肺の間をめぐる血液の流れです。全身をめぐる流れは体循環です。" },
  { s:'biology', type:'choice', q:"染色体を含む丸いつくりは？", choices:["液胞","核","細胞壁","細胞膜"], answer:1, desc:"核の中には遺伝情報をもつ染色体(DNA)があり、酢酸カーミンなどの染色液で赤く染まります。" },
  { s:'biology', type:'choice', q:"植物の光合成と動物の呼吸の関係として正しいものはどれか。", choices:["酸素や二酸化炭素の循環に関係する","水だけを一方的に増やす","炭素の循環とは無関係である","生物どうしの関係には入らない"], answer:0, desc:"植物の光合成は二酸化炭素を取り入れて酸素を出し、動物の呼吸は酸素を使って二酸化炭素を出します。物質の循環に関係します。" },
  { s:'biology', type:'choice', q:"葉の一部を覆う主目的は？", choices:["光が必要かを比べるため","水が必要かを比べるため","酸素が出るかを比べるため","葉の温度を下げるため"], answer:0, desc:"アルミはくで光をさえぎった部分と光が当たった部分を比べることで、光合成に光が必要かを調べられます。" },
  { s:'biology', type:'choice', q:"尿をつくり、血液中の不要物を取り除く器官はどれか。", choices:["腎臓","肝臓","胃","肺"], answer:0, desc:"腎臓は血液中の不要物や余分な水分などをこし取り、尿をつくります。" },
  { s:'earth', type:'choice', q:"地下にある高温でどろどろにとけた物質を何というか。", choices:["マグマ","溶岩","火山灰","軽石"], answer:0, desc:"地下にあるとけた岩石をマグマといいます。地表に出たものは溶岩と呼ばれます。" },
  { s:'earth', type:'choice', q:"空気中に含むことができる水蒸気の最大量を何というか。", choices:["飽和水蒸気量","露点","湿度","気圧"], answer:0, desc:"飽和水蒸気量は空気が含むことのできる水蒸気の最大量です。温度が高いほど大きくなります。" },
  { s:'earth', type:'choice', q:"自転による見かけの動きは？", choices:["日周運動","年周運動","公転","満ち欠け"], answer:0, desc:"地球が自転しているため、太陽や星は一日の間に東から西へ動くように見えます。これを日周運動といいます。" },
  { s:'earth', type:'choice', q:"ねばりけの小さいマグマでできやすい火山の形はどれか。", choices:["傾きがゆるやかな火山","盛り上がったドーム状の火山","急で高い火山","噴火しない火山"], answer:0, desc:"ねばりけの小さいマグマは流れやすく、傾きがゆるやかな火山をつくりやすいです。" },
  { s:'earth', type:'choice', q:"水滴になり始める温度は？", choices:["露点","湿度","気圧","風力"], answer:0, desc:"露点は空気中の水蒸気が凝結し始める温度です。露点以下になると水滴ができやすくなります。" },
  { s:'earth', type:'choice', q:"太陽や星が一日のうちに動いて見える向きはどれか。", choices:["東から西","西から東","北から南だけ","南から北だけ"], answer:0, desc:"地球が西から東へ自転しているため、天体は見かけ上、東から西へ動いて見えます。" },
  { s:'earth', type:'choice', q:"火山灰を観察したときに見られる、小さな粒の主な正体はどれか。", choices:["鉱物や火山ガラス","花粉だけ","食塩だけ","生物の細胞だけ"], answer:0, desc:"火山灰には鉱物の結晶や火山ガラスの小さな粒が含まれます。顕微鏡で形や色を観察できます。" },
  { s:'earth', type:'choice', q:"気圧を表す単位として使われるものはどれか。", choices:["hPa","℃","％","m/s"], answer:0, desc:"気圧はヘクトパスカル、記号hPaで表します。天気図では等圧線とともに使われます。" },
  { s:'earth', type:'choice', q:"地球が太陽のまわりを回る運動を何というか。", choices:["公転","自転","日食","月食"], answer:0, desc:"地球が太陽のまわりを約1年で1周する運動を公転といいます。季節の変化にも関係します。" },
  { s:'earth', type:'choice', q:"地震で最初に伝わり、初期微動を起こす波はどれか。", choices:["P波","S波","音波","電波"], answer:0, desc:"P波はS波より速く伝わり、最初に到着して初期微動を起こします。S波は主要動に関係します。" },
  { s:'earth', type:'choice', q:"まわりより気圧が高いところを何というか。", choices:["高気圧","低気圧","前線","露点"], answer:0, desc:"まわりより気圧が高いところを高気圧といいます。一般に下降気流が起こり、晴れやすいです。" },
  { s:'earth', type:'choice', q:"地球の地軸は、公転面に垂直な方向から約何度傾いているか。", choices:["23.4度","3.14度","66.6度","90度"], answer:0, desc:"地軸は公転面に垂直な方向から約23.4度傾いています。この傾きが季節による太陽高度の変化に関係します。" },
  { s:'earth', type:'choice', q:"地震で、あとから伝わり主要動を起こす波はどれか。", choices:["S波","P波","光波","水蒸気"], answer:0, desc:"S波はP波より遅く伝わりますが、到着すると大きなゆれである主要動を起こします。" },
  { s:'earth', type:'choice', q:"まわりより気圧が低いところを何というか。", choices:["低気圧","高気圧","等圧線","季節風"], answer:0, desc:"まわりより気圧が低いところを低気圧といいます。一般に上昇気流が起こり、雲ができやすいです。" },
  { s:'earth', type:'choice', q:"太陽表面の暗い部分は？", choices:["黒点","満月","銀河","コロナだけ"], answer:0, desc:"黒点は太陽の表面に見える暗い部分で、まわりより温度が低いため暗く見えます。" },
  { s:'earth', type:'choice', q:"地震そのものの規模を表す値はどれか。", choices:["マグニチュード","震度","気圧","湿度"], answer:0, desc:"マグニチュードは地震の規模を表します。震度はある場所でのゆれの強さを表します。" },
  { s:'earth', type:'choice', q:"風向は何を表すか。", choices:["風が吹いてくる方向","風が吹いていく方向","雲が動く速さ","気圧の高さ"], answer:0, desc:"風向は風が吹いてくる方向で表します。北風は北から南へ向かって吹く風です。" },
  { s:'earth', type:'choice', q:"地球が地軸を中心に1日に1回転する運動を何というか。", choices:["公転","自転","満ち欠け","年周運動"], answer:1, desc:"地球は西から東へ1日1回自転します。これにより太陽や星は東から西へ動いて見えます。" },
  { s:'earth', type:'choice', q:"粒の大きさが2mm以上の粒を多く含む堆積岩はどれか。", choices:["れき岩","砂岩","泥岩","石灰岩"], answer:0, desc:"れき岩は2mm以上のれきを多く含む堆積岩です。砂岩や泥岩はより小さい粒からできています。" },
  { s:'earth', type:'choice', q:"雲ができる主なしくみとして正しいものはどれか。", choices:["空気が上昇して冷え、水蒸気が水滴や氷の粒になる","空気が下降して必ず温まる","水蒸気がすべて酸素に変わる","気圧が高いほど必ず雲が増える"], answer:0, desc:"空気が上昇すると膨張して冷え、露点に達すると水蒸気が凝結して雲の粒になります。" },
  { s:'earth', type:'choice', q:"太陽の1日の動きは？", choices:["日周運動","年周運動","公転","満ち欠け"], answer:0, desc:"地球の自転により、太陽や星は1日で東→南→西へと動いて見えます。これを日周運動といいます。" },
  { s:'earth', type:'choice', q:"マグマが地表付近で急に冷えてできる火成岩を何というか。", choices:["火山岩","深成岩","堆積岩","変成岩"], answer:0, desc:"火山岩はマグマが地表付近で急に冷えてできた岩石です。斑状組織を示すことが多いです。" },
  { s:'earth', type:'choice', q:"冷たい空気が暖かい空気を押し上げて進む前線はどれか。", choices:["寒冷前線","温暖前線","停滞前線","閉そく前線"], answer:0, desc:"寒冷前線では冷たい空気が暖かい空気の下にもぐりこみ、暖かい空気を急に押し上げます。" },
  { s:'earth', type:'choice', q:"地球が太陽のまわりを1年に1回まわる運動を何というか。", choices:["自転","公転","日周運動","満ち欠け"], answer:1, desc:"地球は太陽のまわりを1年で1周公転します。地軸がかたむいたまま公転するため季節が生じます。" },
  { s:'earth', type:'choice', q:"マグマが地下深くでゆっくり冷えてできる火成岩を何というか。", choices:["深成岩","火山岩","凝灰岩","石灰岩"], answer:0, desc:"深成岩は地下深くでゆっくり冷えてでき、結晶が大きく育ちやすいため等粒状組織になります。" },
  { s:'earth', type:'choice', q:"暖かい空気が冷たい空気の上にはい上がって進む前線はどれか。", choices:["温暖前線","寒冷前線","停滞前線","等圧線"], answer:0, desc:"温暖前線では暖かい空気が冷たい空気の上をゆるやかにはい上がります。広い範囲で雨が降りやすいです。" },
  { s:'earth', type:'choice', q:"太陽のように、みずから光を出す天体を何というか。", choices:["惑星","衛星","恒星","すい星"], answer:2, desc:"みずから光り輝く天体を恒星といいます。太陽は恒星です。惑星や衛星は太陽の光を反射しています。" },
  { s:'earth', type:'choice', q:"斑状の火山岩組織は？", choices:["斑状組織","等粒状組織","柱状組織","層状組織"], answer:0, desc:"火山岩は急に冷えるため、先にできた大きな結晶と細かな石基からなる斑状組織になりやすいです。" },
  { s:'earth', type:'choice', q:"梅雨の時期に日本付近にできやすい前線はどれか。", choices:["停滞前線","寒冷前線","温暖前線","閉そく前線"], answer:0, desc:"梅雨の時期には、性質の異なる気団の間に停滞前線ができやすく、雨の日が続きます。" },
  { s:'earth', type:'choice', q:"地球のまわりを公転し、満ち欠けして見える天体はどれか。", choices:["太陽","月","北極星","火星"], answer:1, desc:"月は地球のまわりを公転する衛星で、太陽の光を反射し、位置関係によって満ち欠けして見えます。" },
  { s:'earth', type:'choice', q:"花こう岩の特徴として正しいものはどれか。", choices:["深成岩で等粒状組織をもつ","火山岩で斑状組織をもつ","堆積岩で化石を多く含む","火山灰が固まった岩石である"], answer:0, desc:"花こう岩は地下深くでゆっくり冷えてできた深成岩で、等粒状組織をもちます。" },
  { s:'earth', type:'choice', q:"冬の日本付近に強く影響する、冷たく乾いた気団はどれか。", choices:["シベリア気団","小笠原気団","オホーツク海気団","赤道気団"], answer:0, desc:"シベリア気団は冷たく乾いた大陸性の気団で、冬の日本の季節風に大きく関係します。" },
];
// ★タイピング問題は廃止(テンポが悪い／全角半角の誤りが理不尽・聖典記載の方針)＝化学式タイピングを4択に自動変換(内容は残す)。
(function(){ const typ=QUESTIONS.filter(q=>q.type==='typing'); const all=[...new Set(typ.map(q=>q.answer))]; const isIon=a=>/[+\-]/.test(a);
  typ.forEach(q=>{ const ans=q.answer; let fam=all.filter(a=>a!==ans && isIon(a)===isIon(ans)); if(fam.length<3)fam=all.filter(a=>a!==ans);   // 分子は分子/イオンはイオンから誤答を作る
    for(let i=fam.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [fam[i],fam[j]]=[fam[j],fam[i]]; }
    q.type='choice'; q.choices=[ans,...fam.slice(0,3)]; q.answer=0; q.q=q.q.replace('を書こう','はどれ？'); });   // 表示順はdrawの shuffleOrder で更にシャッフルされる
})();
let _lastQ=null;
function drawQuestion(subjects){ const cand=QUESTIONS.filter(q=>q.type!=='typing'&&subjects.includes(q.s)); let pool=cand.filter(q=>q!==_lastQ); if(!pool.length)pool=cand.length?cand:QUESTIONS.filter(q=>q.type!=='typing');
  const q=pool[Math.floor(Math.random()*pool.length)]; _lastQ=q; return q; }

const TILE=[{c:'#e0413e',s:'▲'},{c:'#1368ce',s:'◆'},{c:'#d89e00',s:'●'},{c:'#26890c',s:'■'}];
function shuffleOrder(n){ const a=[]; for(let i=0;i<n;i++)a.push(i); for(let i=n-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }   // 選択肢の表示順シャッフル(Fisher-Yates)
function answerLabel(q){ return q.type==='choice'?q.choices[q.answer]:q.answer; }

/* ===== 問題エンジン(Quiz)＝戦闘から分離。combat も 練習/復習/実力測定 も同じ窓口 Quiz.ask を呼ぶ(戦闘を知らない) ===== */
// Quiz.ask({ subjects:[出題範囲], ctxFn?:()=>文脈html, ctx?:文脈html, onResult:(correct)=>{}, onContinue:()=>{} })
// 正誤の判定・表示・解説(無罰)は Quiz が持つ。呼び出し側は『範囲を渡し、正誤を受け取る』だけ。
const Quiz = { _onResult:null, _onContinue:null,
  ask(opts){ Quiz._onResult=opts.onResult||null; Quiz._onContinue=opts.onContinue||null; answered=false;
    curQ=drawQuestion(opts.subjects||['chemistry']); Quiz._render(opts.ctxFn?opts.ctxFn(curQ):(opts.ctx||'')); },   // ctxFnには出題された問題を渡す(ゲーム側はcurQグローバルを読まなくてよい)
  _render(ctxHtml){ const q=curQ, subj=SUBJECTS[q.s];
    document.getElementById('qctx').innerHTML=ctxHtml;
    document.getElementById('qq').textContent=q.q;
    document.getElementById('qimg').innerHTML=`<div style="text-align:center;"><div style="font-size:62px;line-height:1;">${subj.emoji}</div><div style="font-size:13px;color:${subj.color};margin-top:8px;font-weight:700;">${subj.jp}</div></div>`;
    document.getElementById('qfeed').innerHTML='';
    const order=shuffleOrder(q.choices.length);   // ★表示順シャッフル(data-iは元index＝判定は正しい)
    document.getElementById('qans').innerHTML=`<div class="tiles">`+order.map((oi,pos)=>{ const t=TILE[pos%4];
      return `<button class="tile" data-i="${oi}" style="background:${t.c};" onclick="quizPick(${oi})"><span class="shape">${t.s}</span>${q.choices[oi]}</button>`; }).join('')+`</div>`;
    document.getElementById('qOverlay').classList.add('show'); },
  _pick(i){ if(answered)return; answered=true; const q=curQ;
    document.querySelectorAll('.tile').forEach(b=>{ const bi=+b.dataset.i; if(bi===q.answer)b.classList.add('ok'); else b.classList.add('ng'); b.disabled=true; });
    setTimeout(()=>Quiz._resolve(i===q.answer),460); },
  _resolve(correct){ if(correct){ hideOverlay(); if(Quiz._onResult)Quiz._onResult(true); }   // 正解=即・呼び出し側へ
    else { if(Quiz._onResult)Quiz._onResult(false);   // 誤答=先に結果(combatはcharge-等)→解説表示(無罰)
      document.querySelectorAll('.tile').forEach(b=>b.disabled=true);
      document.getElementById('qfeed').innerHTML=`<div class="wrongttl">おしい！ 正解は「${answerLabel(curQ)}」</div><div class="desc">💡 ${curQ.desc}</div><button class="next" onclick="Quiz._continue()">つぎへ ▶</button>`;
      document.getElementById('qctx').innerHTML='まちがえても大丈夫。HPは減りません。'; } },
  _continue(){ if(Quiz._onContinue)Quiz._onContinue(); } };
function quizPick(i){ Quiz._pick(i); }
function answerChoice(i){ Quiz._pick(i); }   // 旧名alias(互換)
function hideOverlay(){ document.getElementById('qOverlay').classList.remove('show'); }
