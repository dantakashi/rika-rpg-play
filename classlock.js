/* 授業中のパスワード（全ゲーム共通・2026-10-23 夜／10-24 本人）
   平日（月〜金・祝日を除く・夏休み/冬休み/春休みを除く）の授業の時間に開いたら、パスワードを聞く。時間帯（日本時間）:
    ①8:50〜9:40 ②9:50〜10:40 ③10:50〜11:40 ④11:50〜12:40 ⓪12:40〜13:15 ⑤13:40〜14:30 ⑥14:40〜15:30（始まりは含み、終わりは含まない）
   パスワード＝曜日の英語の頭文字＋（月日の4桁×3 を4桁にそろえた数）＋何時間目。10/23（金）5時間目 → F＋1023×3=3069＋5 → F30695。そのコマだけ開く
   休み（ロックしない）: 夏 7/18〜8/28（本人）・冬 12/26〜1/7・春 3/25〜4/5（冬と春は鈴が一般的な公立の形で決めた。VAC を直せば変わる）
   時刻は端末から読まない（本人）: このページのサーバー（GitHub Pages）の返す Date を1回取り、あとは performance.now()（端末の時計を変えても動かない経過時間）で進める。
    日本時間への変換も端末のタイムゾーンを使わない（UTC＋9時間を自分で足す）。10分ごとと、画面に戻ったときに取り直す
   時刻が取れないときは開けない（ネットにつないで「もう一度」）。file:// と localhost は開発用で止めない（?ggnow=2026-10-23T13:45 で時刻を決めて試せる）
   通ったら localStorage の gg_lock_ok に「日付#時間目」を書く＝同じサイトのどのゲームでも、そのコマのあいだ開く
   window.ggLocked＝ロック中（グラマー・ガードは戦いを止める）。window.GG_LOCK が先にあれば何もしない（2回入れても1回だけ動く）
   置き場所: 開発 rika-rpg-eng/rpg_v3/_english_draft/art2/classlock/classlock.js → 公開 rika-rpg-play/classlock.js（apply_play.py が写す）。グラマー・ガードには組み立てで中に入る */
(function(){
  if (typeof window === 'undefined' || window.GG_LOCK) return;
  var PERIODS = [[1,530,580],[2,590,640],[3,650,700],[4,710,760],[0,760,795],[5,820,870],[6,880,930]]; // [何時間目, 始まり(分), 終わり(分)]＝日本時間の0時からの分
  var VAC = [[7,18,8,28],[12,26,1,7],[3,25,4,5]]; // 休み [始まりの月,日, 終わりの月,日]（終わりの日も休み・年をまたいでよい）
  var WD = ['S','M','T','W','T','F','S']; // 日〜土の英語の頭文字
  var DAY = 864e5, base = null, failed = false, timer = 0, dev = false, el = null;
  function jst(ms){ var d = new Date(ms + 9*36e5); return {y:d.getUTCFullYear(), m:d.getUTCMonth()+1, d:d.getUTCDate(), wd:d.getUTCDay(), min:d.getUTCHours()*60+d.getUTCMinutes(), hh:d.getUTCHours(), mm:d.getUTCMinutes()}; }
  // 祝日（固定の日・ハッピーマンデー・春分/秋分の式・振替休日・国民の休日）
  function nthMon(y, m, n){ var f = new Date(Date.UTC(y, m-1, 1)).getUTCDay(); return 1 + ((8 - f) % 7) + (n-1)*7; }
  function shunbun(y){ return Math.floor(20.8431 + 0.242194*(y-1980) - Math.floor((y-1980)/4)); }
  function shuubun(y){ return Math.floor(23.2488 + 0.242194*(y-1980) - Math.floor((y-1980)/4)); }
  function hol0(y, m, d){
    var md = m*100 + d;
    if(md===101||md===211||md===223||md===429||md===503||md===504||md===505||md===811||md===1103||md===1123) return true;
    if((m===1 && d===nthMon(y,1,2)) || (m===7 && d===nthMon(y,7,3)) || (m===9 && d===nthMon(y,9,3)) || (m===10 && d===nthMon(y,10,2))) return true;
    if((m===3 && d===shunbun(y)) || (m===9 && d===shuubun(y))) return true;
    return false;
  }
  function ymd(t){ var p = new Date(t); return [p.getUTCFullYear(), p.getUTCMonth()+1, p.getUTCDate(), p.getUTCDay()]; }
  function holiday(y, m, d){
    if(hol0(y, m, d)) return true;
    var t = Date.UTC(y, m-1, d), k = t - DAY, a;
    for(var i=0;i<7;i++){ a = ymd(k); if(!hol0(a[0], a[1], a[2])) break; if(a[3]===0) return true; k -= DAY; } // 振替休日（日曜の祝日のあと、祝日でない最初の日）
    var b = ymd(t - DAY), c = ymd(t + DAY);
    if(ymd(t)[3]!==0 && hol0(b[0], b[1], b[2]) && hol0(c[0], c[1], c[2])) return true; // 国民の休日（祝日にはさまれた日）
    return false;
  }
  function vacation(m, d){ var x = m*100 + d; for(var i=0;i<VAC.length;i++){ var s = VAC[i][0]*100 + VAC[i][1], e = VAC[i][2]*100 + VAC[i][3]; if(s<=e ? (x>=s && x<=e) : (x>=s || x<=e)) return true; } return false; }
  function periodOf(min){ for(var i=0;i<PERIODS.length;i++){ if(min>=PERIODS[i][1] && min<PERIODS[i][2]) return PERIODS[i]; } return null; }
  function pad2(n){ return (n<10?'0':'')+n; }
  function hm(min){ return Math.floor(min/60)+':'+pad2(min%60); }
  function pass(j, pd){ var n = (j.m*100 + j.d)*3; return WD[j.wd] + ('000'+n).slice(-4) + pd[0]; }
  function now(){ return base ? base.utc + (performance.now() - base.perf) : null; }
  function norm(s){ s = String(s||''); try{ s = s.normalize('NFKC'); }catch(e){} return s.replace(/\s+/g,'').toUpperCase(); }
  function okKey(){ try{ return localStorage.getItem('gg_lock_ok')||''; }catch(e){ return ''; } }
  function schoolDay(j){ return j.wd>=1 && j.wd<=5 && !holiday(j.y, j.m, j.d) && !vacation(j.m, j.d); }
  function judge(){
    var t = now(); if(t==null) return null;
    var j = jst(t), pd = schoolDay(j) ? periodOf(j.min) : null;
    var key = pd ? (j.y+'-'+pad2(j.m)+'-'+pad2(j.d)+'#'+pd[0]) : '';
    return {j:j, pd:pd, key:key, need:!!pd && okKey()!==key};
  }
  // サーバーの時刻（同じページへの HEAD の Date）。端末の時計は使わない
  function sync(done){
    var p0 = performance.now(), url = location.href.split('#')[0].split('?')[0] + '?ggt=' + Math.random().toString(36).slice(2);
    fetch(url, {method:'HEAD', cache:'no-store'}).then(function(r){
      var h = r.headers.get('Date'), ms = h ? Date.parse(h) : NaN; if(!isFinite(ms)) throw new Error('no date');
      base = {utc: ms + 500, perf: performance.now()}; failed = false; done && done(true);
    }).catch(function(){ if(!base) failed = true; done && done(false); });
  }
  var CSS = '#gglock{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 30%,#2b3550f2,#0d1220f7);color:#fff;font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic UI","Meiryo",sans-serif;box-sizing:border-box}'+
    '#gglock.on{display:flex}'+
    '#gglock .card{width:min(420px,100%);background:#fffaf0;color:#2d261c;border-radius:18px;padding:22px 20px 18px;box-shadow:0 18px 40px #0009;text-align:center;box-sizing:border-box}'+
    '#gglock .ic{font-size:40px;line-height:1}'+
    '#gglock h2{margin:8px 0 4px;font-size:20px;font-weight:900;color:#2d261c}'+
    '#gglock .pd{display:inline-block;margin:2px 0 10px;padding:3px 10px;border-radius:999px;background:#2f3a5c;color:#fff;font-size:13px;font-weight:800}'+
    '#gglock p{margin:0 0 12px;font-size:14px;line-height:1.55;color:#5d5345}'+
    '#gglock input{width:100%;box-sizing:border-box;font:900 24px/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:4px;text-align:center;text-transform:uppercase;padding:10px 12px;border-radius:12px;border:3px solid #d8ccb4;background:#fff;color:#2d261c;outline:none}'+
    '#gglock input:focus{border-color:#3f6fd8}'+
    '#gglock button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:12px;background:#3f6fd8;color:#fff;font-size:17px;font-weight:900;box-shadow:0 3px 0 #2a4ea3;cursor:pointer}'+
    '#gglock .er{min-height:20px;margin-top:8px;font-size:13px;font-weight:800;color:#c0392b}'+
    '#gglock .tm{margin-top:10px;font-size:12px;color:#8a7f6c}';
  function q(id){ return el.querySelector('#'+id); }
  function ui(){
    if(el) return el;
    var st = document.createElement('style'); st.textContent = CSS; (document.head||document.documentElement).appendChild(st);
    el = document.createElement('div'); el.id = 'gglock';
    el.innerHTML = '<div class="card"><div class="ic">🔒</div><h2 id="gglockH"></h2><div class="pd" id="gglockP"></div><p id="gglockT"></p>'+
      '<input id="gglockI" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="パスワード">'+
      '<button id="gglockB" type="button"></button><div class="er" id="gglockE"></div><div class="tm" id="gglockM"></div></div>';
    document.body.appendChild(el);
    q('gglockB').onclick = submit;
    q('gglockI').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); submit(); } });
    return el;
  }
  function show(r){
    ui(); window.ggLocked = true;
    var I = q('gglockI'), B = q('gglockB'), E = q('gglockE');
    if(!r){ // 時刻が取れない
      q('gglockH').textContent = '時刻を確かめられませんでした';
      q('gglockP').style.display = 'none';
      q('gglockT').textContent = 'ネットにつながっているか確かめて、「もう一度」を押してください。';
      I.style.display = 'none'; B.textContent = 'もう一度'; q('gglockM').textContent = '';
    } else {
      q('gglockH').textContent = '授業中はパスワードが必要です';
      var P = q('gglockP'); P.style.display = ''; P.textContent = (r.pd[0]===0 ? '昼の時間（' : r.pd[0]+'時間目（') + hm(r.pd[1]) + '〜' + hm(r.pd[2]) + '）';
      q('gglockT').textContent = '先生から聞いたパスワードを入れると、この時間のあいだ遊べます。';
      I.style.display = ''; B.textContent = 'ひらく';
      q('gglockM').textContent = 'いまの時刻 ' + r.j.hh + ':' + pad2(r.j.mm) + '（ネットの時刻）';
    }
    if(!el.classList.contains('on')){ el.classList.add('on'); E.textContent = ''; I.value = ''; try{ if(r) setTimeout(function(){ I.focus(); }, 50); }catch(e){} }
  }
  function hide(){ window.ggLocked = false; if(el) el.classList.remove('on'); }
  function submit(){
    if(failed || !base){ sync(function(){ check(); }); return; }
    var r = judge(); if(!r || !r.need){ check(); return; }
    var I = q('gglockI'), E = q('gglockE');
    if(norm(I.value) === pass(r.j, r.pd)){ try{ localStorage.setItem('gg_lock_ok', r.key); }catch(e){} E.textContent = ''; check(); }
    else { E.textContent = 'パスワードがちがいます。'; if(I.select) I.select(); }
  }
  function check(){
    if(!document.body) return;
    if(dev && !base) return hide();
    if(failed && !base) return show(null);
    var r = judge(); if(!r) return;
    if(r.need) show(r); else hide();
  }
  function start(){
    var href = String(location.href||''), qs = String(location.search||'');
    dev = href.indexOf('file:')===0 || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(href);
    var mq = qs.match(/[?&]ggnow=(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/);
    if(dev && mq){ base = {utc: Date.UTC(+mq[1], +mq[2]-1, +mq[3], +mq[4], +mq[5], +(mq[6]||0)) - 9*36e5, perf: performance.now()}; } // 開発用: 日本時間を決めて試す
    else if(dev) return; // 開発用（file:// と localhost）は止めない
    window.addEventListener('keydown', function(e){ if(window.ggLocked && !(e.target && e.target.id==='gglockI')){ e.stopPropagation(); if(e.key!=='Tab') e.preventDefault(); } }, true);
    if(!base) sync(function(){ check(); });
    clearInterval(timer); timer = setInterval(check, 5000);
    setInterval(function(){ if(!dev) sync(function(){ check(); }); }, 10*60*1000);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden && !dev) sync(function(){ check(); }); });
    check();
  }
  function init(){
    if(typeof document==='undefined' || !document.createElement || typeof fetch!=='function' && String(location.href||'').indexOf('file:')!==0) return;
    if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
  window.GG_LOCK = {init:init, judge:judge, pass:pass, holiday:holiday, vacation:vacation, periodOf:periodOf, jst:jst, setBase:function(utc){ base={utc:utc, perf:performance.now()}; }, check:check};
  if(!window.GG_LOCK_MANUAL) init(); // グラマー・ガードは組み立てで GG_LOCK_MANUAL を立てて、Game の後に init する
})();
