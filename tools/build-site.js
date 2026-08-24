#!/usr/bin/env node
/**
 * 把 content/*.md 轉成 docs/ 底下的靜態網站（GitHub Pages 用）。
 * 改造自姊妹專案 obesity-education-clinic 的 build-site.js（零相依極簡 markdown 轉換）。
 * 民眾版差異：
 *   - 「醫師備註」是編輯層資訊，build 時剝除不上站；「出處」轉為模組末小字
 *   - 「民眾版」bullet 解開成正文；審稿追蹤段與開頭 meta 引言不上站
 *   - 支援圖片語法；第②章插圖複製進 docs/assets 並改寫路徑
 *   - 多一頁 check-tool.html：BMI／腰圍自評工具（純前端計算，不回傳任何資料）
 * 用法：node tools/build-site.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const DOCS = path.join(ROOT, 'docs');

/** 章目錄：檔名 → 輸出網址、標題 */
const CHAPTERS = [
  { md: '01-體重與健康風險.md', slug: 'risk', level: '第①章', title: '為什麼要管理體重', desc: '肥胖是慢性病，不是意志力問題。減掉 5–10%，血糖、血壓、脂肪肝、膝蓋都有感。' },
  { md: '02-我需要管理體重嗎.md', slug: 'check', level: '第②章', title: '我需要管理體重嗎', desc: 'BMI＋腰圍，30 秒自我評估；綠黃紅燈告訴你下一步。含腰圍正確量法圖解。' },
  { md: '03-正確的減重模式.md', slug: 'model', level: '第③章', title: '正確的減重模式', desc: '三腳凳：飲食是主引擎、運動守護肌肉、藥物是醫師評估下的助推器——缺一隻腳都站不穩。' },
  { md: '04-吃-飲食實作.md', slug: 'eat', level: '第④章', title: '吃：不是吃少，是吃對', desc: '先戒喝的熱量；菜半盤、蛋白質一掌、飯一拳；外食族與超商族都做得到。' },
  { md: '05-動-運動實作.md', slug: 'move', level: '第⑤章', title: '動：不是苦練，是動得對', desc: '從每天走路開始，每週 150 分鐘＋肌力 2 次；膝蓋不好也有安全的動法。' },
  { md: '06-認識減重藥物.md', slug: 'meds', level: '第⑥章', title: '認識減重藥物', desc: '三類藥物地圖與「瘦瘦針」解析：誰適合、治療長什麼樣、為什麼絕對不要網購。' },
  { md: '07-何時該就醫.md', slug: 'clinic', level: '第⑦章', title: '何時該就醫', desc: '就醫不是最後手段，是最有效率的起點。就診前準備與最常見的三個顧慮。' },
];

/** 第②章插圖：來源 → docs/assets 檔名 */
const ASSETS = [
  { src: path.join(ROOT, 'design', 'generated', 'waist-measure_20260824_070643.png'), out: 'waist-measure.png' },
  { src: path.join(ROOT, 'design', '腰圍量測-插圖.svg'), out: 'waist-diagram.svg' },
];

/* ---------- 民眾版前處理：剝除編輯層 ---------- */
function transform(md) {
  // 審稿追蹤段整段移除
  md = md.replace(/\n## 審稿追蹤[\s\S]*$/, '\n');
  // 開頭 meta 引言（適用／狀態）移除
  md = md.replace(/^(# [^\n]*\n)\n?(?:>[^\n]*\n)+/, '$1\n');
  // 插圖路徑改寫
  md = md.replace(/\.\.\/design\/generated\/waist-measure_[0-9_]+\.png/g, 'assets/waist-measure.png');
  md = md.replace(/\.\.\/design\/腰圍量測-插圖\.svg/g, 'assets/waist-diagram.svg');

  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // 醫師備註：連同縮排續行一起剝除
    if (/^- \*\*醫師備註\*\*/.test(l)) {
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1])) i++;
      continue;
    }
    // 出處：轉為小字標記（⚠️審稿旗標不上站）
    if (/^- \*\*出處\*\*：/.test(l)) {
      const t = l.replace(/^- \*\*出處\*\*：/, '').replace(/\s*⚠️.*$/, '').trim();
      if (t) out.push(`※出處：${t}`);
      continue;
    }
    // 民眾版 bullet 解開成正文，縮排續行退兩格
    // （空行後若仍是縮排內容——如表格前的空行——也要繼續吃進來，否則表格保持縮排、解析不出來）
    if (/^- \*\*民眾版\*\*：/.test(l)) {
      out.push(l.replace(/^- \*\*民眾版\*\*：/, ''));
      while (i + 1 < lines.length &&
        (/^\s{2,}/.test(lines[i + 1]) ||
         (lines[i + 1].trim() === '' && i + 2 < lines.length && /^\s{2,}/.test(lines[i + 2])))) {
        i++;
        out.push(lines[i].replace(/^  /, ''));
      }
      continue;
    }
    out.push(l);
  }
  return out.join('\n');
}

/* ---------- 極簡 markdown → HTML（同病人版，加圖片支援） ---------- */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[^"'>=\w])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  const headings = [];
  const usedIds = new Set();
  let i = 0;
  let listType = null;

  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { closeList(); i++; continue; }

    // 出處小字
    if (/^※出處：/.test(line)) {
      closeList();
      out.push(`<p class="src">${inline(line.replace(/^※/, ''))}</p>`);
      i++; continue;
    }

    // 表格
    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) {
      closeList();
      const cells = r => r.split('|').slice(1, -1).map(c => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push('<div class="tw"><table><thead><tr>' + head.map(c => `<th>${c}</th>`).join('') +
        '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    // 標題
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      const text = inline(h[2]);
      let id = h[2].replace(/[^\w一-鿿-]/g, '').slice(0, 40) || `h${headings.length}`;
      while (usedIds.has(id)) id += '-';
      usedIds.add(id);
      if (lvl === 2 || lvl === 3) headings.push({ lvl, id, text: h[2].replace(/\*\*/g, '') });
      out.push(`<h${lvl} id="${id}">${text}</h${lvl}>`);
      i++; continue;
    }

    // 引言區塊
    if (/^>\s?/.test(line)) {
      closeList();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^>\s?/, ''))); i++; }
      out.push(`<blockquote>${buf.join('<br>')}</blockquote>`);
      continue;
    }

    // 分隔線
    if (/^---+$/.test(line)) { closeList(); out.push('<hr>'); i++; continue; }

    // 圖片獨立成段
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      closeList();
      out.push(`<figure><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy"><figcaption>${esc(img[1])}</figcaption></figure>`);
      i++; continue;
    }

    // 清單
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const want = /^\d/.test(li[2]) ? 'ol' : 'ul';
      if (listType !== want) { closeList(); out.push(`<${want}>`); listType = want; }
      let text = li[3];
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i + 1])) {
        i++; text += '<br>' + lines[i].trim();
      }
      out.push(`<li>${inline(text)}</li>`);
      i++; continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeList();
  return { html: out.join('\n'), headings };
}

function buildToc(headings) {
  const secs = [];
  for (const h of headings) {
    if (h.lvl === 2) secs.push({ ...h, kids: [] });
    else if (secs.length) secs[secs.length - 1].kids.push(h);
  }
  if (secs.length < 2) return '';
  const shorten = t => t.split(/[：（(]/)[0].trim();
  const rows = secs.map(s => {
    const kids = s.kids.length
      ? `<div class="toc-k">${s.kids.map(k => `<a href="#${k.id}">${esc(shorten(k.text))}</a>`).join('')}</div>`
      : '';
    return `<div class="toc-s"><a class="toc-h" href="#${s.id}">${esc(s.text)}</a>${kids}</div>`;
  }).join('');
  return `<nav class="toc"><div class="toc-t">本頁內容</div>${rows}</nav>`;
}

/* ---------- 版型（沿用病人版視覺識別） ---------- */
const CSS = `
:root{
  --ink:#21281F; --muted:#66705F; --line:#DFDFD4; --paper:#FBFAF4;
  --diet:#C2620A; --diet-soft:#FCE9D4;
  --move:#0A8A4D; --move-soft:#DCF3E5;
  --rx:#3563C9;   --rx-soft:#E1E9FB;
  --flag:#C82D1B;
  --gold:#9A6B2A; --gold-soft:#F5EDDD;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;
  font-size:17px;line-height:1.78;
  background-image:linear-gradient(180deg,#fff 0,var(--paper) 420px)}
a{color:var(--rx)}
.wrap{max-width:940px;margin:0 auto;padding:0 20px}

.top{border-bottom:1px solid var(--line);background:rgba(255,255,255,.9);
  position:sticky;top:0;z-index:9;backdrop-filter:blur(6px)}
.top .wrap{display:flex;align-items:center;gap:14px;height:62px;font-size:14.5px}
.top a{color:var(--muted);text-decoration:none}
.top a:hover{color:var(--ink)}
.top .home{font-family:"LXGW WenKai TC","DFKai-SB",serif;
  font-weight:700;color:var(--ink);font-size:21px;letter-spacing:.02em}
.top .sp{flex:1}

.hero{padding:44px 0 26px}
.hero h1{font-family:"LXGW WenKai TC",serif;font-size:32px;margin:0 0 10px;letter-spacing:.02em}
.hero p{margin:0;color:var(--muted);font-size:16px;max-width:62ch}
.pill{display:inline-block;background:var(--move-soft);color:var(--move);
  border-radius:99px;padding:2px 13px;font-size:12.5px;font-weight:700;letter-spacing:.06em;margin-bottom:12px}

.sec{margin:34px 0 10px;font-size:13px;font-weight:700;letter-spacing:.12em;color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:16px}
.card{display:block;background:#fff;border:1px solid var(--line);border-radius:12px;
  padding:18px 20px;text-decoration:none;color:inherit;transition:.16s;position:relative;overflow:hidden}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.09);border-color:#C9C9BA}
.card .lv{font-size:11.5px;font-weight:700;letter-spacing:.08em;color:var(--move)}
.card h3{margin:5px 0 7px;font-size:19px;font-family:"LXGW WenKai TC",serif}
.card p{margin:0;font-size:14.5px;color:var(--muted);line-height:1.68}
.card::after{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--move)}
.card.eat::after{background:var(--diet)}   .card.eat .lv{color:var(--diet)}
.card.meds::after{background:var(--rx)}    .card.meds .lv{color:var(--rx)}
.card.clinic::after{background:var(--flag)}.card.clinic .lv{color:var(--flag)}
.card.tool{background:var(--move-soft)}
.card.tool::after{background:var(--move)}

article{background:#fff;border:1px solid var(--line);border-radius:14px;
  padding:34px 40px 44px;margin:26px 0 40px}
article h1{font-family:"LXGW WenKai TC",serif;font-size:29px;margin:0 0 6px;padding-bottom:14px;border-bottom:2px solid var(--ink)}
article h2{font-family:"LXGW WenKai TC",serif;font-size:22px;margin:36px 0 10px;
  padding-left:11px;border-left:5px solid var(--move)}
article h3{font-size:17.5px;margin:26px 0 6px;color:var(--diet);letter-spacing:.01em}
article p{margin:.5em 0}
article ul,article ol{padding-left:1.35em;margin:.5em 0}
article li{margin:.3em 0}
article blockquote{margin:16px 0;padding:13px 18px;background:var(--gold-soft);
  border-radius:8px;color:#5A4520;font-size:15px}
article hr{border:0;border-top:1px solid var(--line);margin:30px 0}
article code{background:#F0F0E7;border-radius:4px;padding:1px 5px;font-size:.9em}
article strong{font-weight:700}
article figure{margin:18px 0;text-align:center}
article img{max-width:100%;height:auto;border-radius:10px;border:1px solid var(--line)}
article figcaption{font-size:13.5px;color:var(--muted);margin-top:6px}
.src{font-size:13px;color:var(--muted);margin:.2em 0 1.2em;border-left:3px solid var(--line);padding-left:10px}
.draft{background:var(--gold-soft);border-left:4px solid var(--gold);border-radius:8px;
  padding:10px 16px;font-size:14px;color:#5A4520;margin:0 0 20px}
.tw{overflow-x:auto;margin:14px 0}
table{border-collapse:collapse;width:100%;font-size:14.5px;min-width:460px}
th,td{border:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}
th{background:#F4F4EC;font-weight:700;white-space:nowrap}

.toc{background:#F7F7EF;border:1px solid var(--line);border-radius:10px;
  padding:14px 18px 15px;margin:0 0 26px;max-height:40vh;overflow-y:auto;overscroll-behavior:contain}
.toc-t{font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin-bottom:8px}
.toc-s{margin-bottom:7px}
.toc-s:last-child{margin-bottom:0}
.toc-h{display:inline-block;font-weight:700;font-size:15.5px;color:var(--ink);text-decoration:none;line-height:1.5}
.toc-h:hover{color:var(--move)}
.toc-k{display:flex;flex-wrap:wrap;gap:3px 14px;margin:1px 0 0 2px}
.toc-k a{font-size:13.6px;color:var(--muted);text-decoration:none;line-height:1.65}
.toc-k a:hover{color:var(--move);text-decoration:underline}
article h2,article h3{scroll-margin-top:76px}

/* 章間導航 */
.chnav{display:flex;justify-content:space-between;gap:12px;margin:0 0 40px}
.chnav a{flex:1;background:#fff;border:1px solid var(--line);border-radius:10px;
  padding:12px 16px;text-decoration:none;color:var(--ink);font-size:14.5px;transition:.16s}
.chnav a:hover{border-color:var(--move);color:var(--move)}
.chnav .next{text-align:right}

/* 自評工具 */
.calc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px 32px;margin:26px 0}
.calc .row{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0}
.calc label{display:block;font-size:14px;font-weight:700;margin-bottom:5px}
.calc .f{flex:1;min-width:130px}
.calc input[type=number]{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:8px;
  font-size:17px;font-family:inherit;background:var(--paper)}
.calc .seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.calc .seg button{flex:1;padding:9px 0;border:0;background:#fff;font-size:15px;font-family:inherit;cursor:pointer;color:var(--muted)}
.calc .seg button.on{background:var(--move);color:#fff;font-weight:700}
.calc .cbs{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:15px}
.calc .cbs label{font-weight:400;display:flex;align-items:center;gap:6px;margin:0}
.calc .go{margin-top:18px;width:100%;padding:13px 0;border:0;border-radius:10px;
  background:var(--move);color:#fff;font-size:17px;font-weight:700;font-family:inherit;cursor:pointer}
.calc .go:hover{filter:brightness(1.06)}
#res{display:none;margin-top:22px;border-radius:12px;padding:20px 24px;line-height:1.8}
#res.g{display:block;background:var(--move-soft)}
#res.y{display:block;background:#FBF3D9}
#res.r{display:block;background:#FDECEA}
#res.u{display:block;background:var(--rx-soft)}
#res .big{font-size:21px;font-weight:700;margin-bottom:6px}
#res .nums{font-size:15px;color:var(--muted);margin-bottom:10px}
.priv{font-size:13.5px;color:var(--muted);margin-top:14px}

footer{border-top:1px solid var(--line);margin-top:20px;padding:26px 0 46px;
  font-size:14px;color:var(--muted)}
footer b{color:var(--ink)}
.warn{background:#FDECEA;border-left:4px solid var(--flag);border-radius:8px;
  padding:14px 18px;font-size:15px;margin:20px 0;color:#7A2016;line-height:1.7}

.totop{position:fixed;right:20px;bottom:20px;width:44px;height:44px;border-radius:50%;
  border:1px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;
  box-shadow:0 4px 14px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;
  opacity:0;visibility:hidden;transition:.18s;z-index:20;padding:0}
.totop.on{opacity:1;visibility:visible}
.totop:hover{border-color:var(--move);color:var(--move)}
.totop svg{width:20px;height:20px}

@media(max-width:640px){
  .top .wrap{height:56px;gap:10px}
  .top .home{font-size:18px}
  .top .crumb{display:none}
  .hero h1{font-size:26px}
  article{padding:24px 20px 32px;border-radius:10px}
  article h1{font-size:22px}
  .calc{padding:20px 18px}
  .toc{padding:12px 14px 13px;margin-bottom:20px;max-height:38vh}
  .totop{right:14px;bottom:14px}
}
`;

function page({ title, body, crumb = '', desc = '' }) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap">
<style>${CSS}</style>
</head>
<body>
<nav class="top"><div class="wrap">
  <a class="home" href="./">健康體重管理</a>
  <span class="sp"></span>
  ${crumb}
  <a href="https://philia81301-commits.github.io/">← 工具集首頁</a>
</div></nav>
${body}
<footer><div class="wrap">
  <b>潘湘如醫師｜家醫科</b>　·　一般民眾健康體重管理衛教<br>
  本站內容為衛教參考，不能取代個別醫療評估；用藥請務必與醫師討論。本站不收集任何個人資料。<br>
  想深入了解 GLP-1 減重治療？請見 <a href="https://philia81301-commits.github.io/obesity-education-clinic/">GLP-1 減重衛教（病人版）</a>　·
  原始碼：<a href="https://github.com/philia81301-commits/healthy-weight-public">GitHub</a>
</div></footer>
<button class="totop" type="button" aria-label="回到頂端">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
</button>
<script>
(function(){
  var b=document.querySelector('.totop');
  if(!b)return;
  var show=function(){ b.classList.toggle('on', window.scrollY>420); };
  window.addEventListener('scroll', show, {passive:true});
  show();
  b.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });
})();
</script>
</body>
</html>`;
}

/* ---------- 自評工具頁 ---------- */
const TOOL_BODY = `<div class="wrap">
<article>
<h1>BMI／腰圍 30 秒自我評估</h1>
<p>輸入三個數字，馬上知道你在<a href="check.html">第②章</a>的哪一燈。
所有計算都在你的手機／電腦上完成，<strong>不會上傳任何資料</strong>。</p>
<div class="calc">
  <div class="row">
    <div class="f"><label for="h">身高（公分）</label><input id="h" type="number" inputmode="decimal" min="100" max="230" placeholder="165"></div>
    <div class="f"><label for="w">體重（公斤）</label><input id="w" type="number" inputmode="decimal" min="25" max="300" placeholder="70"></div>
    <div class="f"><label for="wc">腰圍（公分，可留空）</label><input id="wc" type="number" inputmode="decimal" min="40" max="220" placeholder="85"></div>
  </div>
  <div class="row">
    <div class="f"><label>生理性別（腰圍標準用）</label>
      <div class="seg" id="sex">
        <button type="button" data-v="m" class="on">男（標準 90 cm）</button>
        <button type="button" data-v="f">女（標準 80 cm）</button>
      </div>
    </div>
  </div>
  <div class="row"><div class="f">
    <label>是否有以下任一情況？（醫師告知過的）</label>
    <div class="cbs">
      <label><input type="checkbox" class="co" value="高血壓">高血壓</label>
      <label><input type="checkbox" class="co" value="血糖異常">血糖偏高／糖尿病</label>
      <label><input type="checkbox" class="co" value="血脂異常">血脂異常</label>
      <label><input type="checkbox" class="co" value="脂肪肝">脂肪肝</label>
    </div>
  </div></div>
  <button class="go" type="button" id="go">看結果</button>
  <div id="res" role="status"></div>
  <p class="priv">依據：衛福部國健署成人體位標準（BMI 24 過重／27 肥胖；腰圍男 90、女 80 公分）。結果僅供參考，不能取代醫療評估。</p>
</div>
</article>
<div class="chnav">
  <a href="check.html">← 第②章：怎麼量、怎麼看</a>
  <a class="next" href="model.html">第③章：正確的減重模式 →</a>
</div>
</div>
<script>
(function(){
  var sex='m';
  var seg=document.getElementById('sex');
  seg.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return;
    sex=b.dataset.v;
    seg.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});
  });
  document.getElementById('go').addEventListener('click',function(){
    var h=parseFloat(document.getElementById('h').value);
    var w=parseFloat(document.getElementById('w').value);
    var wc=parseFloat(document.getElementById('wc').value);
    var res=document.getElementById('res');
    if(!(h>=100&&h<=230)||!(w>=25&&w<=300)){
      res.className='u';
      res.innerHTML='<div class="big">請先填身高與體重</div>身高 100–230 公分、體重 25–300 公斤之間的數字才算得出來。';
      return;
    }
    var bmi=w/Math.pow(h/100,2);
    var b1=Math.round(bmi*10)/10;
    var cut=sex==='f'?80:90;
    var wcHigh=(wc>=40&&wc<=220)?(wc>=cut):null;
    var grade=bmi<18.5?'體重過輕':bmi<24?'健康體位':bmi<27?'過重':bmi<30?'輕度肥胖':bmi<35?'中度肥胖':'重度肥胖';
    var co=[].slice.call(document.querySelectorAll('.co:checked')).map(function(x){return x.value;});
    var nums='BMI <strong>'+b1+'</strong>（'+grade+'）'+(wcHigh===null?'｜腰圍未填':'｜腰圍 '+wc+' cm（標準：未滿 '+cut+' cm）');
    var html='';
    if(bmi<18.5){
      res.className='u';
      html='<div class="big">體重過輕</div><div class="nums">'+nums+'</div>本站的減重建議不適用於你。體重過輕也有健康風險，建議找醫師評估原因。';
    }else if(bmi>=27||(bmi>=24&&(co.length>0))){
      res.className='r';
      html='<div class="big">🔴 紅燈｜建議就醫評估</div><div class="nums">'+nums+(co.length?'｜合併：'+co.join('、'):'')+'</div>'
        +'符合減重門診的評估條件。這不是最後手段，是最有效率的起點——完整評估、個人化計畫，需要時才討論藥物。'
        +'<br>下一步：<a href="clinic.html">第⑦章：何時該就醫</a>';
    }else if(bmi>=24||wcHigh===true){
      res.className='y';
      html='<div class="big">🟡 黃燈｜開始調整</div><div class="nums">'+nums+'</div>'
        +(wcHigh===true&&bmi<24?'BMI 正常但腰圍超標——內臟脂肪偏多，第②章說的「泡芙人」就是這個情況。':'還不需要急著就醫，但現在正是開始的好時機。')
        +'<br>下一步：<a href="eat.html">第④章：吃</a>＋<a href="move.html">第⑤章：動</a>，三個月後再量一次。'
        +(co.length===0?'<br><small>若之後健檢發現血壓、血糖、血脂異常或脂肪肝，建議直接就醫評估。</small>':'');
    }else{
      res.className='g';
      html='<div class="big">🟢 綠燈｜維持現況</div><div class="nums">'+nums+'</div>'
        +'目前體位在健康範圍'+(wcHigh===null?'（建議也量個腰圍，見<a href="check.html">第②章</a>的量法）':'，腰圍也未超標')+'。'
        +'保持現在的生活型態，之後定期再量就好。';
    }
    res.innerHTML=html;
  });
})();
</script>`;

/* ---------- 產出 ---------- */
fs.mkdirSync(DOCS, { recursive: true });
fs.mkdirSync(path.join(DOCS, 'assets'), { recursive: true });

for (const a of ASSETS) {
  if (!fs.existsSync(a.src)) { console.warn(`  ⚠ 找不到插圖 ${a.src}，略過`); continue; }
  fs.copyFileSync(a.src, path.join(DOCS, 'assets', a.out));
}

let built = 0;
CHAPTERS.forEach((b, idx) => {
  const src = path.join(CONTENT, b.md);
  if (!fs.existsSync(src)) { console.warn(`  ⚠ 找不到 ${b.md}，略過`); return; }
  const raw = fs.readFileSync(src, 'utf8');
  const isDraft = /^> 狀態：\*\*草稿\*\*/m.test(raw);
  const md = transform(raw);
  const crumb = `<span class="crumb"><a href="./">總覽</a><span style="color:#C9C9BA"> / </span>${esc(b.title)}</span>`;
  const { html: bodyHtml, headings } = mdToHtml(md);
  const draftNote = isDraft ? '<div class="draft">本章內容仍在最終審訂中，細節可能調整。</div>' : '';
  let withToc = bodyHtml.replace(/(<\/h1>)/, `$1\n${draftNote}${buildToc(headings)}`);
  // 第②章文末加工具連結
  if (b.slug === 'check') {
    withToc += '\n<div class="warn" style="background:var(--move-soft);border-left-color:var(--move);color:#0B4A2C"><b>懶得自己算？</b>用 <a href="check-tool.html">30 秒自評工具</a>，輸入三個數字直接看你的燈號（純本機計算，不上傳資料）。</div>';
  }
  const prev = CHAPTERS[idx - 1], next = CHAPTERS[idx + 1];
  const chnav = `<div class="chnav">${prev ? `<a href="${prev.slug}.html">← ${prev.level}：${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next" href="${next.slug}.html">${next.level}：${esc(next.title)} →</a>` : `<a class="next" href="check-tool.html">30 秒自評工具 →</a>`}</div>`;
  const html = page({
    title: `${b.title}｜健康體重管理`,
    desc: b.desc,
    crumb,
    body: `<div class="wrap"><article>${withToc}</article>${chnav}</div>`,
  });
  fs.writeFileSync(path.join(DOCS, `${b.slug}.html`), html, 'utf8');
  built++;
});

// 自評工具頁
fs.writeFileSync(path.join(DOCS, 'check-tool.html'), page({
  title: 'BMI／腰圍 30 秒自評｜健康體重管理',
  desc: '輸入身高、體重、腰圍，依國健署標準（BMI 24/27、腰圍男90／女80）算出你的體位分級與綠黃紅燈建議。純前端計算，不收集任何資料。',
  crumb: '<span class="crumb"><a href="./">總覽</a><span style="color:#C9C9BA"> / </span>自評工具</span>',
  body: TOOL_BODY,
}), 'utf8');

// 首頁
const cardHtml = (cls, lv, title, desc, href) =>
  `<a class="card ${cls}" href="${href}"><span class="lv">${lv}</span><h3>${title}</h3><p>${desc}</p></a>`;

const home = page({
  title: '健康體重管理｜民眾衛教',
  desc: '寫給一般民眾的健康體重管理指南：為什麼體重重要、BMI 腰圍自評、正確的減重模式（飲食×運動×合適的藥物）、外食實作、認識瘦瘦針，以及何時該就醫。',
  crumb: '',
  body: `<div class="wrap">
  <div class="hero">
    <span class="pill">民眾衛教</span>
    <h1>體重管理，用對方法就不辛苦</h1>
    <p>寫給一般民眾的健康體重管理指南。不是「少吃多動」四個字，而是講清楚為什麼、怎麼自我評估、飲食運動具體怎麼做、藥物什麼時候找誰談。七章按順序讀，或挑你需要的看。</p>
  </div>

  <div class="sec">先做這個</div>
  <div class="cards">
    ${cardHtml('tool', '30 秒', 'BMI／腰圍自評工具', '輸入三個數字，馬上知道你是綠燈、黃燈還是紅燈。純本機計算，不上傳任何資料。', 'check-tool.html')}
  </div>

  <div class="sec">七章指南</div>
  <div class="cards">
    ${CHAPTERS.map(b => {
      const cls = b.slug === 'eat' ? 'eat' : b.slug === 'meds' ? 'meds' : b.slug === 'clinic' ? 'clinic' : '';
      return cardHtml(cls, b.level, b.title, b.desc, `${b.slug}.html`);
    }).join('\n    ')}
  </div>

  <div class="warn">
    <b>提醒</b>：本站內容以一般成年人的情況撰寫，是衛教參考、不是醫療處方。若你已有慢性病、正在用藥、懷孕或未成年，請以你的醫師建議為準。
  </div>
</div>`,
});
fs.writeFileSync(path.join(DOCS, 'index.html'), home, 'utf8');
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '', 'utf8');

console.log(`✅ 已產出 docs/：${built} 篇章節頁、1 個自評工具、1 個首頁、${ASSETS.length} 張插圖`);
