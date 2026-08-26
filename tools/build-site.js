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

/** 第②章插圖與首頁簡報圖：來源 → docs/assets 檔名 */
const ASSETS = [
  // 腰圍照片：由 design/腰圍量測-標示.inline.svg 疊上標示後內嵌顯示（見 mdToHtml 的 .inline.svg 分支）
  { src: path.join(ROOT, 'design', 'generated', 'waist-measure_20260824_070643.png'), out: 'waist-measure.png' },
  { src: path.join(ROOT, 'slides', 'export', 'slide1.png'), out: 'slide1.png' },
  { src: path.join(ROOT, 'slides', 'export', 'slide2.png'), out: 'slide2.png' },
  { src: path.join(ROOT, 'slides', 'export', 'slide3.png'), out: 'slide3.png' },
  { src: path.join(ROOT, 'slides', 'export', 'slide4.png'), out: 'slide4.png' },
];

/** 章末闖關小遊戲：每章 5 題四選一，題目與解說全部出自該章網站內容
 *  （⑤⑥⑦章仍在審訂中，題目跟著現行內容走；審稿若改口徑，這裡要同步） */
const QUIZ = {
  risk: {
    mascot: '🦉', name: '明白人五連闖', badge: '健康明白人',
    next: { href: 'check.html', label: '前往第②章：我需要管理體重嗎 →' },
    qs: [
      { q: '醫學上，肥胖是什麼？', o: ['意志力問題', '一種慢性疾病', '外表問題', '懶惰'], a: 1,
        w: '體重由大腦與荷爾蒙共同調控——肥胖可以被診斷、被治療，也值得看醫生。' },
      { q: '減掉原體重的多少就有感？', o: ['5–10%', '30%', '一半', '要瘦回 20 歲'], a: 0,
        w: '80 公斤的人減 4–8 公斤，血糖、血壓、脂肪肝、膝蓋都有看得見的改善。' },
      { q: 'BMI 24 到 27 之間算什麼？', o: ['健康體位', '過重', '輕度肥胖', '體重過輕'], a: 1,
        w: '台灣標準：24 以上過重、27 以上肥胖。' },
      { q: '男性腰圍標準是幾公分以下？', o: ['80', '85', '90', '100'], a: 2,
        w: '男 90、女 80 公分；超標代表內臟脂肪過多——BMI 正常也一樣有風險。' },
      { q: '減重加規律運動，糖尿病用藥可能？', o: ['由醫師評估後減量', '必須加倍', '要立刻自己停掉', '完全不能調整'], a: 0,
        w: '血糖穩定後用藥常可以跟著減量——但一定要由醫師評估，不可以自己停藥。' },
    ],
  },
  check: {
    mascot: '🐰', name: '量測五連闖', badge: '量測小達人',
    next: { href: 'check-tool.html', label: '用 30 秒自評工具算你的燈號 →' },
    qs: [
      { q: 'BMI 正常但腰圍超標的健康風險？', o: ['內臟脂肪增加', '完全沒有風險', '只是外觀問題', '骨質疏鬆'], a: 0,
        w: '俗稱「泡芙人」：肌肉少、內臟脂肪多，血糖血脂的風險不輸過重的人——BMI 和腰圍要一起看。' },
      { q: '量腰圍的位置大約在哪？', o: ['胸口下方', '與肚臍同高', '骨盆下方', '大腿最粗處'], a: 1,
        w: '肋骨下緣與骨盆上緣的中間點，皮尺水平、正常吐氣結束時讀數。' },
      { q: '女性腰圍標準是幾公分以下？', o: ['70', '90', '80', '100'], a: 2,
        w: '女 80、男 90 公分；腰圍量的是影響血糖血壓的內臟脂肪。' },
      { q: '哪一種情況建議就醫評估？', o: ['BMI 24 加上高血壓', 'BMI 22、腰圍沒超標', 'BMI 20 想再瘦一點', '體重比去年少 1 公斤'], a: 0,
        w: '紅燈＝BMI 27 以上，或 BMI 24 以上加上高血壓、血糖異常、脂肪肝等任一項。' },
      { q: '黃燈的下一步是什麼？', o: ['馬上吃藥', '先調整吃和動', '直接放棄', '斷食三天'], a: 1,
        w: '從第④章（吃）、第⑤章（動）開始調整，3 個月後再量一次。' },
    ],
  },
  model: {
    mascot: '🐻', name: '三腳凳五連闖', badge: '三腳凳大師',
    next: { href: 'eat.html', label: '前往第④章：吃 →' },
    qs: [
      { q: '減重三腳凳的主引擎是？', o: ['藥物', '運動', '飲食', '睡眠'], a: 2,
        w: '飲食決定體重會不會降；運動守肌肉、藥物是醫師評估下的助推器。' },
      { q: '運動在減重裡最重要的工作？', o: ['燒熱量', '保住肌肉', '流汗排毒', '練出腹肌'], a: 1,
        w: '肌肉是身體的引擎——引擎變小、代謝變慢，之後更容易復胖。' },
      { q: '狠狠節食之後常發生什麼？', o: ['一直瘦下去', '胖回去甚至更重', '變成肌肉', '不會怎樣'], a: 1,
        w: '身體把節食當飢荒：飢餓荷爾蒙上升、代謝下降，把體重拉回原點。' },
      { q: '藥物在三腳凳的角色是？', o: ['捷徑', '主角', '助推器', '裝飾品'], a: 2,
        w: '幫忙控制食慾、突破卡關——但一定要經過醫師評估。' },
      { q: '一杯含糖飲料抵銷多久快走？', o: ['5 分鐘', '半小時', '不會抵銷', '3 秒'], a: 1,
        w: '運動消耗的熱量比想像少——所以吃對，比狂動更關鍵。' },
    ],
  },
  eat: {
    mascot: '🐹', name: '吃對五連闖', badge: '點餐高手',
    next: { href: 'move.html', label: '前往第⑤章：動 →' },
    qs: [
      { q: '減重第一步是先戒掉什麼？', o: ['白飯', '含糖飲料', '水果', '雞蛋'], a: 1,
        w: '飲料的糖不佔胃、不會飽，是純多出來的熱量；換成水、無糖茶或黑咖啡。' },
      { q: '餐盤口訣：蔬菜要佔多少？', o: ['半盤', '一小格', '一口', '不用吃'], a: 0,
        w: '菜半盤、蛋白質一掌、飯一拳——自助餐、便當、家裡煮都套得上。' },
      { q: '吃的順序哪個對？', o: ['菜→蛋白質→飯', '飯→菜→肉', '甜點先吃', '順序不重要'], a: 0,
        w: '先菜再蛋白質最後飯，血糖比較平穩、也比較快有飽足感。' },
      { q: '大腦收到吃飽訊號要多久？', o: ['1 分鐘', '馬上', '15–20 分鐘', '2 小時'], a: 2,
        w: '所以要細嚼慢嚥——吃太快的人常在飽足感來之前就吃過量了。' },
      { q: '「一週瘦 5 公斤」掉的多是？', o: ['脂肪', '水分和肌肉', '骨頭', '內臟脂肪'], a: 1,
        w: '極端節食恢復吃飯就反彈，而且更難瘦——看到廣告先想起這一段。' },
    ],
  },
  move: {
    mascot: '🐶', name: '動起來五連闖', badge: '走路冠軍',
    next: { href: 'meds.html', label: '前往第⑥章：認識減重藥物 →' },
    qs: [
      { q: '零基礎運動的起點是？', o: ['每天走路 30 分鐘', '跑馬拉松', '重訓 2 小時', '買健身房會籍'], a: 0,
        w: '可拆成 3 次、每次 10 分鐘——走得到、走得久，比走得快重要。' },
      { q: '每週有氧目標累積幾分鐘？', o: ['30 分鐘', '60 分鐘', '150 分鐘', '600 分鐘'], a: 2,
        w: '大約每天快走 30 分鐘、一週 5 天；挑你不討厭的才做得久。' },
      { q: '「中等強度」的感覺是？', o: ['會喘但還能講話', '喘到說不出話', '完全不喘', '能邊跑邊唱歌'], a: 0,
        w: '能講話但唱不了歌，就是剛剛好的強度。' },
      { q: '肌力運動的建議是每週幾次？', o: ['0 次', '2 次', '7 次', '一個月 1 次'], a: 1,
        w: '每次 15–20 分鐘，在家徒手就夠：椅子起立、扶椅深蹲、橋式。' },
      { q: '運動隔天，哪種情況才要停？', o: ['肌肉痠', '關節痛', '流汗', '肚子餓'], a: 1,
        w: '肌肉痠是正常、代表有練到；痛在關節才要停下來。' },
    ],
  },
  meds: {
    mascot: '🐧', name: '安全用藥五連闖', badge: '不上當專家',
    next: { href: 'clinic.html', label: '前往第⑦章：何時該就醫 →' },
    qs: [
      { q: '「瘦瘦針」的正式類別是？', o: ['燃脂針', '維他命', '腸泌素類針劑', '美容針'], a: 2,
        w: '模擬飽足荷爾蒙讓食慾下降、容易飽——它不是燃脂針。' },
      { q: '什麼人才考慮用減重藥物？', o: ['想瘦就可以', '紅燈且努力過仍困難', '每個人', '未成年也行'], a: 1,
        w: '紅燈族群、且認真調整飲食運動後仍下不來，由醫師評估。' },
      { q: '網購來路不明瘦瘦筆的風險？', o: ['只是比較貴', '假藥與劑量錯誤', '效果更好', '沒有風險'], a: 1,
        w: '仿冒品有的不含有效成分；劑量沒人把關，處方藥轉讓也違法。' },
      { q: '用藥期間特別要顧什麼？', o: ['蛋白質和肌力', '多喝手搖飲', '少喝水', '不用回診'], a: 0,
        w: '食量變小時蛋白質要吃夠、肌力照練，否則瘦掉的有一部分是肌肉。' },
      { q: '停藥後會復胖嗎？', o: ['絕對不會', '有風險，尤其習慣沒建立', '一定會', '跟習慣無關'], a: 1,
        w: '治療期間的重點：讓藥幫你把「吃對、動起來」練成不需要藥的日常。' },
    ],
  },
  clinic: {
    mascot: '🐼', name: '就醫五連闖', badge: '起點勇者',
    next: { href: './', label: '回到總覽，看看你的徽章 →' },
    qs: [
      { q: '就醫在減重裡的定位是？', o: ['最後手段', '丟臉的事', '最有效率的起點', '沒有用'], a: 2,
        w: '自己摸索三年，不如專業陪你走三個月。' },
      { q: '減重門診第一次會做什麼？', o: ['只有開藥', '完整評估＋訂計畫', '量體重就結束', '推銷產品'], a: 1,
        w: '評估、找原因、一起訂計畫、定期回診——拿到的是做得到的計畫。' },
      { q: '去減重門診一定要吃藥嗎？', o: ['一定要', '要先買療程', '不是，需要時才討論', '要簽約'], a: 2,
        w: '多數計畫從飲食運動開始；用不用藥由你和醫師一起決定。' },
      { q: '減重就醫要掛哪一科？', o: ['皮膚科', '家醫科', '耳鼻喉科', '眼科'], a: 1,
        w: '掛家醫科；院所若有「減重門診」「體重管理門診」也可直接掛。' },
      { q: '就診前帶什麼最有幫助？', o: ['用藥清單和想問的問題', '空腹三天', '先自己買好藥', '漂亮衣服'], a: 0,
        w: '加上過去的減重經驗——失敗經驗是最有價值的線索。' },
    ],
  },
};

/* ---------- 民眾版前處理：剝除編輯層 ---------- */
function transform(md) {
  // 審稿追蹤段整段移除
  md = md.replace(/\n## 審稿追蹤[\s\S]*$/, '\n');
  // 開頭 meta 引言（適用／狀態）移除
  md = md.replace(/^(# [^\n]*\n)\n?(?:>[^\n]*\n)+/, '$1\n');
  // 插圖路徑改寫（.inline.svg 不改寫：保留原路徑供 mdToHtml 讀檔內嵌）
  md = md.replace(/\.\.\/design\/generated\/waist-measure_[0-9_]+\.png/g, 'assets/waist-measure.png');

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
      // .inline.svg：把 SVG 內容直接寫進頁面。用 <img> 載入的 SVG 無法讀取外部圖檔，
      // 內嵌後 SVG 裡的 <image href="assets/..."> 才會以頁面網址為基準解析
      if (/\.inline\.svg$/.test(img[2])) {
        const svgPath = path.resolve(CONTENT, img[2]);
        if (fs.existsSync(svgPath)) {
          const svg = fs.readFileSync(svgPath, 'utf8').replace(/<\?xml[^>]*\?>\s*/, '');
          out.push(`<figure>${svg}<figcaption>${esc(img[1])}</figcaption></figure>`);
          i++; continue;
        }
        console.warn(`  ⚠ 找不到內嵌 SVG ${img[2]}，改用 <img>`);
      }
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
  font-size:17px;line-height:1.78;position:relative;
  background-image:linear-gradient(180deg,#fff 0,var(--paper) 420px)}
/* F 能量斜紋底圖（沿用病人版審定視覺）：集中右上、往左下淡出，濃度壓在可讀範圍 */
body::before{content:"";position:absolute;top:0;left:0;right:0;height:480px;
  pointer-events:none;opacity:.12;
  background:repeating-linear-gradient(-58deg,transparent 0 26px,var(--diet) 26px 34px,transparent 34px 44px,var(--rx) 44px 47px);
  -webkit-mask-image:radial-gradient(130% 115% at 100% 0%,#000 0%,transparent 62%);
          mask-image:radial-gradient(130% 115% at 100% 0%,#000 0%,transparent 62%)}
a{color:var(--rx)}
.wrap{max-width:940px;margin:0 auto;padding:0 20px}

.top{border-bottom:1px solid var(--line);background:rgba(255,255,255,.9);
  position:sticky;top:0;z-index:9;backdrop-filter:blur(6px)}
.top .wrap{display:flex;align-items:center;gap:14px;height:68px;font-size:14.5px}
.top a{color:var(--muted);text-decoration:none}
.top a:hover{color:var(--ink)}
.top .home{font-family:"LXGW WenKai TC","DFKai-SB",serif;
  font-weight:700;color:var(--ink);font-size:26px;letter-spacing:.02em}
.top .sp{flex:1}
/* 總覽：黃色立體按鈕（回首頁主要動線，手機也保留） */
.top .ovbtn{display:inline-block;background:linear-gradient(180deg,#FFD75E,#F2B63B);
  color:#5A4520;font-weight:700;font-size:16px;letter-spacing:.08em;
  padding:8px 22px;border-radius:11px;border:1px solid #DDA62C;text-decoration:none;
  box-shadow:0 3px 0 #C08A1F,0 5px 10px rgba(0,0,0,.15);transition:.12s}
.top .ovbtn:hover{filter:brightness(1.06);color:#5A4520}
.top .ovbtn:active{transform:translateY(2px);box-shadow:0 1px 0 #C08A1F,0 2px 5px rgba(0,0,0,.15)}

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

/* 首頁簡報四格（寬版容器，視覺主角） */
.wrapwide{max-width:1240px;margin:0 auto;padding:0 20px}
.slides{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}
@media(max-width:900px){.slides{grid-template-columns:1fr}}

/* 自評工具橫幅（與簡報區同寬，上半版面的行動入口） */
.toolban{display:flex;align-items:center;gap:28px;background:var(--move-soft);
  border:1px solid var(--line);border-left:6px solid var(--move);border-radius:14px;
  padding:28px 34px;text-decoration:none;color:inherit;transition:.16s;margin-bottom:8px}
.toolban:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.10);border-color:#C9C9BA;border-left-color:var(--move)}
.toolban .tb-txt{flex:1}
.toolban .lv{font-size:13px;font-weight:700;letter-spacing:.1em;color:var(--move)}
.toolban h3{margin:6px 0 8px;font-size:26px;font-family:"LXGW WenKai TC",serif}
.toolban p{margin:0;font-size:16px;color:var(--muted);line-height:1.7;max-width:56ch}
.toolban .tb-go{flex:0 0 auto;display:inline-block;background:linear-gradient(180deg,#FFD75E,#F2B63B);
  color:#5A4520;font-weight:700;font-size:19px;letter-spacing:.08em;
  padding:14px 34px;border-radius:13px;border:1px solid #DDA62C;
  box-shadow:0 4px 0 #C08A1F,0 6px 12px rgba(0,0,0,.15);transition:.12s;white-space:nowrap}
.toolban:hover .tb-go{filter:brightness(1.06)}
.toolban:active .tb-go{transform:translateY(3px);box-shadow:0 1px 0 #C08A1F,0 2px 5px rgba(0,0,0,.15)}
@media(max-width:700px){
  .toolban{flex-direction:column;align-items:flex-start;gap:16px;padding:22px 22px}
  .toolban h3{font-size:22px}
  .toolban .tb-go{align-self:stretch;text-align:center}
}
.slides a{display:block;border-radius:12px;overflow:hidden;border:1px solid var(--line);
  transition:.16s;background:#fff}
.slides a:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.12);border-color:#C9C9BA}
.slides img{display:block;width:100%;height:auto}
.dl{font-size:13.5px;color:var(--muted);margin-top:10px}

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

/* 章末闖關小遊戲（可愛風，移植自姊妹站病人版） */
.quiz{margin:0 0 46px}
.quiz-box{background:linear-gradient(160deg,#FFFDF4,#FDF1DE);border:2px solid #F0D9A8;
  border-radius:24px;padding:24px 26px 28px;box-shadow:0 10px 30px rgba(154,107,42,.08);
  position:relative;overflow:hidden}
.quiz-box::before{content:"✦";position:absolute;top:14px;right:20px;font-size:20px;
  color:#E8B83C;opacity:.55;animation:qtwinkle 2.2s ease-in-out infinite}
.quiz-box::after{content:"✦";position:absolute;bottom:18px;left:16px;font-size:13px;
  color:#E8B83C;opacity:.4;animation:qtwinkle 2.2s ease-in-out infinite 1.1s}
@keyframes qtwinkle{0%,100%{opacity:.2;transform:scale(.85)}50%{opacity:.7;transform:scale(1.1)}}
.quiz-head{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.quiz-mascot{font-size:46px;line-height:1;filter:drop-shadow(0 3px 4px rgba(0,0,0,.12));
  animation:qbob 2.6s ease-in-out infinite}
.quiz-mascot img{width:86px;height:86px;border-radius:26px;display:block;
  border:2.5px solid #fff;box-shadow:0 5px 14px rgba(154,107,42,.22)}
/* 通關獎牌：吉祥物照片嵌進 CSS 畫的金牌（金環＋緞帶），不需另外生徽章圖 */
.qmedalwrap{position:relative;width:150px;margin:10px auto 4px;animation:qpop .6s}
.qmedalwrap::before,.qmedalwrap::after{content:"";position:absolute;bottom:-16px;width:26px;height:44px;
  background:linear-gradient(180deg,#3FA76B,#0A8A4D);z-index:0}
.qmedalwrap::before{left:38px;transform:rotate(9deg);clip-path:polygon(0 0,100% 0,100% 100%,50% 74%,0 100%)}
.qmedalwrap::after{right:38px;transform:rotate(-9deg);clip-path:polygon(0 0,100% 0,100% 100%,50% 74%,0 100%)}
.qmedal{position:relative;z-index:1;width:150px;height:150px;object-fit:cover;border-radius:50%;
  display:block;background:#fff;border:7px solid #E8B83C;
  box-shadow:0 0 0 3px #C79320,0 7px 20px rgba(154,107,42,.3),inset 0 0 0 2px #FFF3CE}
@keyframes qbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.quiz-kicker{font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--gold)}
.quiz-title{font-family:"LXGW WenKai TC",serif;margin:2px 0 4px;font-size:22px}
.quiz-sub{margin:0;color:var(--muted);font-size:14.5px}
.quiz-stars{display:flex;gap:6px;margin-left:auto}
.quiz-stars i{width:34px;height:34px;border-radius:50%;background:#fff;border:2px dashed #E3CFA2;
  display:flex;align-items:center;justify-content:center;font-style:normal;font-size:16px;
  color:#D8C49B;transition:.2s}
.quiz-stars i.on{border-style:solid;border-color:#E8B83C;background:#FFF3CE;animation:qpop .45s}
@keyframes qpop{0%{transform:scale(.4)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
.qcard{background:#fff;border:1.5px solid #EFE3C8;border-radius:18px;padding:16px 18px 18px;
  margin-top:16px;animation:qin .4s}
@keyframes qin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.qnum{display:inline-block;background:var(--move-soft);color:var(--move);font-weight:700;
  font-size:12.5px;border-radius:99px;padding:2px 11px}
.qtext{font-size:17.5px;font-weight:700;margin:9px 0 12px}
.qopts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.qopts button{font:inherit;font-size:15.5px;text-align:left;background:#FDFBF3;
  border:1.5px solid #E7DDC2;border-radius:99px;padding:8px 16px 8px 8px;cursor:pointer;
  transition:.15s;display:flex;align-items:center;gap:10px}
.qopts button i{width:27px;height:27px;border-radius:50%;background:#F4E7C8;color:#8A6215;
  font-style:normal;font-weight:700;font-size:13px;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;transition:.15s}
.qopts button:hover:not(:disabled){transform:translateY(-2px) rotate(-.4deg);
  border-color:var(--move);background:#fff;box-shadow:0 4px 12px rgba(10,138,77,.12)}
.qopts button:hover:not(:disabled) i{background:var(--move-soft);color:var(--move)}
.qopts button:disabled{cursor:default}
.qopts button.no{opacity:.5;background:#F4F1E7;animation:qshake .4s}
.qopts button.no i{background:#DDD8C8;color:#8B8674}
.qopts button.no::after{content:"💦";margin-left:auto}
.qopts button.yes{background:var(--move-soft);border-color:var(--move);color:#0A6B3D;font-weight:700}
.qopts button.yes i{background:var(--move);color:#fff}
.qopts button.yes::after{content:"⭕";margin-left:auto}
@keyframes qshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.qmiss{margin-top:9px;font-size:13.5px;color:#A8834B}
.qwhy{margin-top:10px;background:var(--gold-soft);color:#5A4520;border-radius:10px;
  padding:8px 12px;font-size:14px;line-height:1.7}
.quiz-done{margin-top:18px;background:linear-gradient(180deg,#FFFDF4,#FFF4D8);
  border:2px solid #E8B83C;border-radius:18px;
  padding:22px 20px;text-align:center;animation:qin .5s}
.quiz-done .party span{display:inline-block;font-size:26px;margin:0 3px;animation:qbob 1.2s ease-in-out infinite}
.quiz-done .party span:nth-child(2){animation-delay:.15s}
.quiz-done .party span:nth-child(3){animation-delay:.3s}
.quiz-done .party span:nth-child(4){animation-delay:.45s}
.quiz-done .party span:nth-child(5){animation-delay:.6s}
.quiz-done h3{font-family:"LXGW WenKai TC",serif;font-size:21px;margin:8px 0 4px}
.quiz-done p{margin:0 0 14px;color:var(--muted);font-size:14.5px}
.qbtn{display:inline-block;font:inherit;font-size:15px;font-weight:700;border-radius:99px;
  padding:8px 20px;cursor:pointer;text-decoration:none;margin:0 5px 6px;transition:.15s}
.qbtn:hover{transform:translateY(-2px)}
.qbtn.go{background:var(--move);border:2px solid var(--move);color:#fff;
  animation:qpulse 1.8s ease-in-out infinite}
@keyframes qpulse{0%,100%{box-shadow:0 0 0 0 rgba(10,138,77,.35)}50%{box-shadow:0 0 0 7px rgba(10,138,77,0)}}
.qbtn.again{background:#fff;border:2px solid var(--line);color:var(--muted)}
.qbadge{position:absolute;top:10px;right:12px;background:#FFF3CE;border:1.5px solid #E8B83C;
  color:#8A6215;font-size:11.5px;font-weight:700;border-radius:99px;padding:1px 9px}

@media(max-width:640px){
  .qopts{grid-template-columns:1fr}
  .quiz-box{padding:18px 16px 22px;border-radius:18px}
  .quiz-stars{margin-left:0}
  .top .wrap{height:58px;gap:10px}
  .top .home{font-size:21px}
  .top .ovbtn{font-size:14.5px;padding:6px 16px}
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

/** 遊戲圖檔（吉祥物貼圖與徽章）：來源在 design/assets-quiz/，build 時複製進 docs/assets/quiz/ */
const QUIZ_ASSETS = path.join(ROOT, 'design', 'assets-quiz');
const hasAsset = name => fs.existsSync(path.join(QUIZ_ASSETS, name));

/** 產生章末闖關小遊戲區塊（含互動腳本；一頁一個，資料內嵌） */
function quizHtml(slug) {
  const z = QUIZ[slug];
  if (!z) return '';
  const stars = z.qs.map(() => '<i>☆</i>').join('');
  const mascotImg = hasAsset(`${slug}-mascot.png`)
    ? `<img src="assets/quiz/${slug}-mascot.png" alt="" loading="lazy">`
    : z.mascot;
  // 有專屬徽章圖就用；否則把吉祥物嵌進 CSS 金牌框
  const medalSrc = hasAsset(`${slug}-badge.png`) ? `${slug}-badge.png`
    : hasAsset(`${slug}-mascot.png`) ? `${slug}-mascot.png` : '';
  const medalImg = medalSrc
    ? `<div class="qmedalwrap"><img class="qmedal" src="assets/quiz/${medalSrc}" alt="通關獎牌"></div>`
    : '';
  // 內嵌腳本不用樣板字串，避免與外層樣板衝突
  const js = '(function(){' +
    'var Q=' + JSON.stringify(z.qs) + ';' +
    'var box=document.getElementById("quiz");if(!box)return;' +
    'var qs=box.querySelector(".quiz-qs"),stars=box.querySelectorAll(".quiz-stars i"),done=box.querySelector(".quiz-done"),slug=box.getAttribute("data-slug");' +
    'function reset(){qs.innerHTML="";done.hidden=true;for(var i=0;i<stars.length;i++){stars[i].textContent="\\u2606";stars[i].className="";}show(0);}' +
    'function finish(){done.hidden=false;try{localStorage.setItem("hw-quiz-"+slug,"1");}catch(e){}done.scrollIntoView({behavior:"smooth",block:"nearest"});}' +
    'function show(i){var q=Q[i];var card=document.createElement("div");card.className="qcard";' +
    'var h=\'<span class="qnum">\\u7b2c \'+(i+1)+\' \\u984c</span><div class="qtext"></div><div class="qopts">\';' +
    'for(var j=0;j<q.o.length;j++)h+=\'<button type="button" data-j="\'+j+\'"><i>\'+"ABCD"[j]+\'</i><span></span></button>\';' +
    'h+=\'</div><div class="qmiss" hidden>\\u5dee\\u4e00\\u9ede\\uff0c\\u63db\\u4e00\\u500b\\u8a66\\u8a66\\uff01</div><div class="qwhy" hidden></div>\';' +
    'card.innerHTML=h;card.querySelector(".qtext").textContent=q.q;' +
    'var btns=card.querySelectorAll(".qopts button");' +
    'for(var k=0;k<btns.length;k++)btns[k].querySelector("span").textContent=q.o[k];' +
    'qs.appendChild(card);if(i>0)card.scrollIntoView({behavior:"smooth",block:"nearest"});' +
    'for(var k2=0;k2<btns.length;k2++)(function(b){b.addEventListener("click",function(){' +
    'if(+b.getAttribute("data-j")===q.a){b.className="yes";for(var x=0;x<btns.length;x++)btns[x].disabled=true;' +
    'card.querySelector(".qmiss").hidden=true;var w=card.querySelector(".qwhy");w.textContent="\\ud83d\\udca1 "+q.w;w.hidden=false;' +
    'stars[i].textContent="\\u2b50";stars[i].className="on";' +
    'setTimeout(function(){if(i+1<Q.length)show(i+1);else finish();},700);' +
    '}else{b.className="no";b.disabled=true;card.querySelector(".qmiss").hidden=false;}' +
    '});})(btns[k2]);}' +
    'var again=done.querySelector(".again");if(again)again.addEventListener("click",reset);' +
    'show(0);})();';
  return `<section class="quiz" id="quiz" data-slug="${slug}">
  <div class="quiz-box">
    <div class="quiz-head">
      <div class="quiz-mascot">${mascotImg}</div>
      <div>
        <div class="quiz-kicker">讀完來玩</div>
        <h2 class="quiz-title">${z.name}</h2>
        <p class="quiz-sub">一次一題、四選一，答對才會出現下一題。答錯不扣分，放心作答！</p>
      </div>
      <span class="quiz-stars">${stars}</span>
    </div>
    <div class="quiz-qs"></div>
    <div class="quiz-done" hidden>
      <div class="party"><span>🎉</span><span>${z.mascot}</span><span>⭐</span><span>${z.mascot}</span><span>🎉</span></div>
      ${medalImg}
      <h3>五題全通關！獲得稱號「${z.badge}」</h3>
      <p>把答案講給家人聽一遍，記得更牢喔。</p>
      <div>
        <a class="qbtn go" href="${z.next.href}">${z.next.label}</a>
        <button class="qbtn again" type="button">再玩一次</button>
      </div>
    </div>
  </div>
  <script>${js}</script>
</section>`;
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

// 遊戲圖檔：design/assets-quiz/*.png → docs/assets/quiz/
if (fs.existsSync(QUIZ_ASSETS)) {
  const quizOut = path.join(DOCS, 'assets', 'quiz');
  fs.mkdirSync(quizOut, { recursive: true });
  for (const f of fs.readdirSync(QUIZ_ASSETS).filter(f => f.endsWith('.png'))) {
    fs.copyFileSync(path.join(QUIZ_ASSETS, f), path.join(quizOut, f));
  }
}

let built = 0;
CHAPTERS.forEach((b, idx) => {
  const src = path.join(CONTENT, b.md);
  if (!fs.existsSync(src)) { console.warn(`  ⚠ 找不到 ${b.md}，略過`); return; }
  const raw = fs.readFileSync(src, 'utf8');
  const isDraft = /^> 狀態：\*\*草稿\*\*/m.test(raw);
  const md = transform(raw);
  const crumb = `<span class="crumb">${esc(b.title)}</span><a class="ovbtn" href="./">總覽</a>`;
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
    body: `<div class="wrap"><article>${withToc}</article>${quizHtml(b.slug)}${chnav}</div>`,
  });
  fs.writeFileSync(path.join(DOCS, `${b.slug}.html`), html, 'utf8');
  built++;
});

// 自評工具頁
fs.writeFileSync(path.join(DOCS, 'check-tool.html'), page({
  title: 'BMI／腰圍 30 秒自評｜健康體重管理',
  desc: '輸入身高、體重、腰圍，依國健署標準（BMI 24/27、腰圍男90／女80）算出你的體位分級與綠黃紅燈建議。純前端計算，不收集任何資料。',
  crumb: '<span class="crumb">自評工具</span><a class="ovbtn" href="./">總覽</a>',
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
    <p>寫給一般民眾的健康體重管理指南。不是「少吃多動」四個字，而是講清楚為什麼、怎麼自我評估、飲食運動具體怎麼做、藥物什麼時候找誰談。七章按順序讀，或挑你需要的看。每章讀完有五題小遊戲，全對就能收集通關徽章 🏅。</p>
  </div>

</div>

<div class="wrapwide">
  <div class="sec">先做這個</div>
  <a class="toolban" href="check-tool.html">
    <div class="tb-txt">
      <span class="lv">30 秒・不上傳任何資料</span>
      <h3>BMI／腰圍自評工具</h3>
      <p>輸入身高、體重、腰圍三個數字，馬上知道你是綠燈、黃燈還是紅燈，以及下一步該做什麼。</p>
    </div>
    <span class="tb-go">開始測 →</span>
  </a>

  <div class="sec">一分鐘看懂（點任一頁進對應章節）</div>
  <div class="slides">
    <a href="risk.html"><img src="assets/slide1.png" alt="為什麼要管理體重：肥胖是慢性病，減 5–10% 就有感" loading="lazy"></a>
    <a href="check-tool.html"><img src="assets/slide2.png" alt="30 秒自我評估：BMI 與腰圍，綠黃紅燈" loading="lazy"></a>
    <a href="model.html"><img src="assets/slide3.png" alt="正確的減重模式：飲食、運動、藥物三腳凳" loading="lazy"></a>
    <a href="clinic.html"><img src="assets/slide4.png" alt="現在就開始：三步行動與就醫指引" loading="lazy"></a>
  </div>
  <p class="dl">這四頁可自由下載使用：<a href="https://github.com/philia81301-commits/healthy-weight-public/raw/master/slides/%E5%81%A5%E5%BA%B7%E9%AB%94%E9%87%8D%E7%AE%A1%E7%90%86-4%E9%A0%81%E7%B0%A1%E5%A0%B1.pptx">簡報檔（PPTX）</a></p>
</div>

<div class="wrap">

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
</div>
<script>
/* 通關徽章：讀 localStorage 幫已通關的章節卡片掛上徽章 */
(function(){
  try{
    var cs=document.querySelectorAll('a.card');
    for(var i=0;i<cs.length;i++){
      var m=(cs[i].getAttribute('href')||'').match(/^(risk|check|model|eat|move|meds|clinic)\\.html$/);
      if(m&&localStorage.getItem('hw-quiz-'+m[1])==='1'){
        var b=document.createElement('span');b.className='qbadge';b.textContent='🏅 已通關';cs[i].appendChild(b);
      }
    }
  }catch(e){}
})();
</script>`,
});
fs.writeFileSync(path.join(DOCS, 'index.html'), home, 'utf8');
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '', 'utf8');

console.log(`✅ 已產出 docs/：${built} 篇章節頁、1 個自評工具、1 個首頁、${ASSETS.length} 張插圖`);
